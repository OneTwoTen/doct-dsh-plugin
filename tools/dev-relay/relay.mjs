/**
 * Development relay for Web Remote v1 â€” single user, in-memory, no TLS.
 *
 * It is intentionally not production: it exists so the Host bridge and the
 * protocol can be exercised end to end before the Zig relay exists. The frame
 * codec is imported from the plugin so both sides cannot drift.
 *
 * Run `node tools/dev-relay/index.mjs` and open the printed WebChat URL.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_LIMITS,
  decodeFrame,
  encodeFrame,
  endFrame,
  errorResponseFrame,
  helloOkFrame,
  pongFrame,
} from '../../plugin/src/lib/remote-protocol.ts'
import { verifyHello } from '../../plugin/src/lib/remote-device.ts'
import { attachWebSocketServer } from './ws-server.mjs'
import {
  fingerprintFor,
  generateAccessToken,
  generateDeviceCode,
  generateRefreshToken,
  generateUserCode,
  isValidPublicKey,
  normalizeUserCode,
  summarizeDevice,
  tokenEquals,
} from './pairing.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_DIR = join(HERE, 'web')
const BODY_LIMIT = 64 * 1024
const HELLO_SKEW_MS = 300_000
const PAIRING_TTL_MS = 600_000
const ACCESS_TTL_S = 900

/**
 * @param {{ webToken?: string, webTokens?: string[], publicUrl?: string, pairingTtlMs?: number }} [options]
 */
export function createRelayServer(options = {}) {
  const webTokens = new Set([options.webToken, ...(options.webTokens ?? [])].filter((token) => typeof token === 'string' && token.length > 0))
  if (webTokens.size === 0) webTokens.add(generateAccessToken())

  const devices = new Map()
  const pairingsByCode = new Map()
  const pairingsByDeviceCode = new Map()
  const webClients = new Set()
  const streams = new Map()
  const pending = new Map()
  const pairingTtlMs = options.pairingTtlMs ?? PAIRING_TTL_MS

  const httpServer = createServer((request, response) => {
    void route(request, response).catch((error) => {
      sendJson(response, 500, { error: { code: 'relay/internal', message: messageOf(error) } })
    })
  })

  const wsServer = attachWebSocketServer(httpServer, {
    path: '/ws',
    maxFrameBytes: DEFAULT_LIMITS.maxFrameBytes,
    verifyClient: (request, url, protocols) => verifyUpgrade(protocols),
  })

  const sweeper = setInterval(() => {
    const now = Date.now()
    for (const [id, entry] of [...pending]) {
      if (now - entry.at > 15 * 60_000) pending.delete(id)
    }
    for (const [id, stream] of [...streams]) {
      if (now - stream.at > 60 * 60_000) streams.delete(id)
    }
    for (const [code, pairing] of [...pairingsByCode]) {
      if ((pairing.status === 'consumed' || pairing.status === 'denied' || pairing.status === 'expired')
        && now - pairing.createdAt > 60 * 60_000) {
        pairingsByCode.delete(code)
        pairingsByDeviceCode.delete(pairing.deviceCode)
      }
      if (pairing.status === 'pending' && now > pairing.expiresAt + 60 * 60_000) {
        pairingsByCode.delete(code)
        pairingsByDeviceCode.delete(pairing.deviceCode)
      }
    }
  }, 60_000)
  sweeper.unref?.()

  function verifyUpgrade(protocols) {
    if (!protocols.includes('dsh-remote.v1')) {
      return { ok: false, status: 400, message: 'dsh-remote.v1 subprotocol is required' }
    }
    const webToken = protocolValue(protocols, 'webbearer.')
    if (webToken !== undefined) {
      if (!webTokens.has(webToken)) return { ok: false, status: 401, message: 'invalid web token' }
      return {
        ok: true,
        protocol: 'dsh-remote.v1',
        context: { role: 'web' },
        onConnection: (connection) => onWebConnection(connection),
      }
    }

    const accessToken = protocolValue(protocols, 'bearer.')
    const deviceId = protocolValue(protocols, 'device.')
    if (accessToken === undefined || deviceId === undefined) {
      return { ok: false, status: 401, message: 'device bearer token and device id are required' }
    }
    const device = devices.get(deviceId)
    if (device === undefined || device.status === 'revoked') {
      return { ok: false, status: 403, message: 'device is unknown or revoked' }
    }
    if (device.accessToken === null || !tokenEquals(device.accessToken, accessToken)) {
      return { ok: false, status: 401, message: 'invalid access token' }
    }
    return {
      ok: true,
      protocol: 'dsh-remote.v1',
      context: { role: 'device', device },
      onConnection: (connection) => onDeviceConnection(connection, device),
    }
  }

  // ---------------------------------------------------------------- device --

  function onDeviceConnection(connection, device) {
    if (device.ws !== undefined) device.ws.close(4001, 'replaced by a newer connection')
    device.ws = connection
    device.lastSeenAt = Date.now()
    let authenticated = false

    const helloTimer = setTimeout(() => {
      if (!authenticated) connection.close(4001, 'hello timed out')
    }, 10_000)
    helloTimer.unref?.()

    const keepAlive = startKeepAlive(connection)
    connection.on('pong', () => bump(device))
    connection.on('message', (text) => {
      bump(device)
      let frame
      try {
        frame = decodeFrame(text)
      } catch (error) {
        connection.close(1002, messageOf(error))
        return
      }

      if (!authenticated) {
        if (frame.t !== 'hello') {
          connection.close(4001, 'hello must be the first frame')
          return
        }
        const failure = verifyDeviceHello(device, frame)
        if (failure !== undefined) {
          connection.close(4001, failure)
          return
        }
        authenticated = true
        clearTimeout(helloTimer)
        send(connection, helloOkFrame({
          serverTime: Date.now(),
          limits: {
            maxFrameBytes: DEFAULT_LIMITS.maxFrameBytes,
            maxStreams: DEFAULT_LIMITS.maxStreams,
            maxInflight: DEFAULT_LIMITS.maxInflight,
          },
        }))
        return
      }

      routeDeviceFrame(device, connection, frame)
    })

    connection.on('close', () => {
      clearTimeout(helloTimer)
      keepAlive.stop()
      if (device.ws === connection) device.ws = undefined
      failWebWorkForDevice(device.id)
    })
  }

  function verifyDeviceHello(device, frame) {
    if (frame.deviceId !== device.id) return 'device id does not match the token'
    if (Math.abs(Date.now() - frame.ts) > HELLO_SKEW_MS) return 'clock skew is too large'
    const nonceKey = `${frame.ts}:${frame.nonce}`
    if (device.nonces?.has(nonceKey) === true) return 'nonce was already used'
    if (!verifyHello(device.pubkey, frame)) return 'signature is invalid'
    device.nonces ??= new Map()
    device.nonces.set(nonceKey, Date.now())
    const cutoff = Date.now() - HELLO_SKEW_MS * 2
    for (const [key, at] of device.nonces) {
      if (at < cutoff) device.nonces.delete(key)
      else break
    }
    return undefined
  }

  function routeDeviceFrame(device, connection, frame) {
    switch (frame.t) {
      case 'res': {
        const entry = pending.get(frame.id)
        if (entry === undefined || entry.to !== 'web') return
        pending.delete(frame.id)
        send(entry.connection, frame)
        return
      }
      case 'item': {
        const stream = streams.get(frame.id)
        if (stream === undefined) return
        if (!send(stream.connection, frame)) {
          send(connection, endFrame(frame.id, 'overflow'))
          streams.delete(frame.id)
        }
        return
      }
      case 'end': {
        const stream = streams.get(frame.id)
        if (stream === undefined) return
        streams.delete(frame.id)
        send(stream.connection, frame)
        return
      }
      case 'req': {
        const target = firstWebClient()
        if (target === undefined) {
          send(connection, errorResponseFrame(frame.id, 'transport/not-ready', 'no web client is connected'))
          return
        }
        if (pending.size >= DEFAULT_LIMITS.maxInflight * 4) {
          send(connection, errorResponseFrame(frame.id, 'rate/limited', 'too many pending requests'))
          return
        }
        pending.set(frame.id, { to: 'device', connection, deviceId: device.id, at: Date.now() })
        send(target, frame)
        return
      }
      case 'ping':
        send(connection, pongFrame(frame.nonce))
        return
      case 'pong':
        return
      default:
        send(connection, errorResponseFrame(frame.id ?? 'relay', 'unsupported', `cannot route ${frame.t} from a device`))
    }
  }

  function failWebWorkForDevice(deviceId) {
    for (const [id, entry] of [...pending]) {
      if (entry.to !== 'web') continue
      pending.delete(id)
      send(entry.connection, errorResponseFrame(id, 'transport/closed', 'the device disconnected'))
    }
    for (const [id, stream] of [...streams]) {
      if (stream.deviceId !== deviceId) continue
      streams.delete(id)
      send(stream.connection, endFrame(id, 'error'))
    }
  }

  // ------------------------------------------------------------------- web --

  function onWebConnection(connection) {
    webClients.add(connection)
    send(connection, helloOkFrame({
      serverTime: Date.now(),
      limits: {
        maxFrameBytes: DEFAULT_LIMITS.maxFrameBytes,
        maxStreams: DEFAULT_LIMITS.maxStreams,
        maxInflight: DEFAULT_LIMITS.maxInflight,
      },
    }))
    const keepAlive = startKeepAlive(connection)

    connection.on('message', (text) => {
      let frame
      try {
        frame = decodeFrame(text)
      } catch (error) {
        connection.close(1002, messageOf(error))
        return
      }
      routeWebFrame(connection, frame)
    })

    connection.on('close', () => {
      keepAlive.stop()
      webClients.delete(connection)
      for (const [id, stream] of [...streams]) {
        if (stream.connection !== connection) continue
        streams.delete(id)
        const device = devices.get(stream.deviceId)
        if (device?.ws !== undefined) send(device.ws, { t: 'cancel', id })
      }
      for (const [id, entry] of [...pending]) {
        if (entry.connection !== connection) continue
        pending.delete(id)
        if (entry.to === 'device') {
          const device = devices.get(entry.deviceId)
          if (device?.ws !== undefined) {
            send(device.ws, errorResponseFrame(id, 'transport/closed', 'the web client disconnected'))
          }
        }
      }
    })
  }

  function routeWebFrame(connection, frame) {
    const device = firstOnlineDevice()
    switch (frame.t) {
      case 'req': {
        if (device === undefined) {
          send(connection, errorResponseFrame(frame.id, 'transport/not-ready', 'no device is connected'))
          return
        }
        pending.set(frame.id, { to: 'web', connection, at: Date.now() })
        send(device.ws, frame)
        return
      }
      case 'open': {
        if (device === undefined) {
          send(connection, endFrame(frame.id, 'error'))
          return
        }
        if (streams.size >= DEFAULT_LIMITS.maxStreams * 4) {
          send(connection, endFrame(frame.id, 'overflow'))
          return
        }
        streams.set(frame.id, { connection, deviceId: device.id, at: Date.now() })
        send(device.ws, frame)
        return
      }
      case 'cancel': {
        const stream = streams.get(frame.id)
        if (stream === undefined) return
        streams.delete(frame.id)
        const target = devices.get(stream.deviceId)
        if (target?.ws !== undefined) send(target.ws, frame)
        return
      }
      case 'res': {
        const entry = pending.get(frame.id)
        if (entry === undefined || entry.to !== 'device') return
        pending.delete(frame.id)
        const target = devices.get(entry.deviceId)
        if (target?.ws !== undefined) send(target.ws, frame)
        return
      }
      case 'ping':
        send(connection, pongFrame(frame.nonce))
        return
      case 'pong':
        return
      default:
        send(connection, errorResponseFrame(frame.id ?? 'relay', 'unsupported', `cannot route ${frame.t} from the web`))
    }
  }

  // --------------------------------------------------------------- pairings --

  async function route(request, response) {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return serveFile(response, 'index.html', 'text/html; charset=utf-8')
    }
    if (request.method === 'GET' && url.pathname === '/app.js') {
      return serveFile(response, 'app.js', 'text/javascript; charset=utf-8')
    }
    if (request.method === 'GET' && url.pathname === '/style.css') {
      return serveFile(response, 'style.css', 'text/css; charset=utf-8')
    }
    if (request.method === 'GET' && url.pathname === '/healthz') {
      return sendJson(response, 200, { ok: true, devices: devices.size, web: webClients.size })
    }
    if (request.method === 'GET' && url.pathname === '/pair') {
      return servePairPage(response, url)
    }

    if (request.method === 'POST' && url.pathname === '/v1/device/authorize') {
      return authorizeDevice(request, response)
    }
    if (request.method === 'POST' && url.pathname === '/v1/device/token') {
      return pollDeviceToken(request, response)
    }
    if (request.method === 'POST' && url.pathname === '/v1/token/refresh') {
      return refreshDeviceToken(request, response)
    }
    if (request.method === 'POST' && (url.pathname === '/v1/pair/approve' || url.pathname === '/v1/pair/deny')) {
      return decidePairing(request, response, url.pathname.endsWith('approve'))
    }

    if (url.pathname === '/v1/devices' && request.method === 'GET') {
      if (!isWebAuthorized(request, url)) return sendJson(response, 401, { error: { code: 'auth/invalid-token', message: 'web token required' } })
      return sendJson(response, 200, { items: [...devices.values()].map(summarizeDevice) })
    }
    const revoke = /^\/v1\/devices\/([^/]+)\/revoke$/.exec(url.pathname)
    if (revoke !== null && request.method === 'POST') {
      if (!isWebAuthorized(request, url)) return sendJson(response, 401, { error: { code: 'auth/invalid-token', message: 'web token required' } })
      return revokeDevice(response, decodeURIComponent(revoke[1]))
    }

    sendJson(response, 404, { error: { code: 'relay/not-found', message: 'not found' } })
  }

  async function authorizeDevice(request, response) {
    const body = await readBody(request)
    if (!isValidPublicKey(body.pubkey)) {
      return sendJson(response, 400, { error: { code: 'pair/invalid-pubkey', message: 'pubkey must be base64 SPKI' } })
    }
    const requestedId = typeof body.device_id === 'string' && /^dev_[0-9a-f]{8,64}$/.test(body.device_id)
      ? body.device_id
      : `dev_${randomBytes(8).toString('hex')}`
    if (devices.has(requestedId) && devices.get(requestedId).status === 'active') {
      return sendJson(response, 409, { error: { code: 'device/exists', message: 'device is already paired' } })
    }

    const userCode = generateUserCode()
    const deviceCode = generateDeviceCode()
    const now = Date.now()
    const device = {
      id: requestedId,
      name: typeof body.name === 'string' && body.name.length > 0 ? body.name.slice(0, 120) : 'DSH device',
      platform: typeof body.platform === 'string' ? body.platform.slice(0, 40) : 'unknown',
      pubkey: body.pubkey,
      fingerprint: fingerprintFor(body.pubkey),
      scopes: Array.isArray(body.scopes) ? body.scopes.filter((item) => typeof item === 'string') : [],
      status: 'pending',
      createdAt: now,
      accessToken: null,
      refreshToken: null,
      ws: undefined,
    }
    devices.set(device.id, device)

    const pairing = {
      code: userCode,
      normalizedCode: normalizeUserCode(userCode),
      deviceCode,
      deviceId: device.id,
      status: 'pending',
      createdAt: now,
      expiresAt: now + pairingTtlMs,
      interval: 5,
    }
    pairingsByCode.set(pairing.normalizedCode, pairing)
    pairingsByDeviceCode.set(deviceCode, pairing)
    options.onPairing?.({ code: userCode, device })

    const origin = options.publicUrl ?? `${request.socket.encrypted ? 'https' : 'http'}://${request.headers.host ?? '127.0.0.1'}`
    sendJson(response, 201, {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${origin}/pair`,
      expires_in: Math.floor(pairingTtlMs / 1000),
      interval: pairing.interval,
    })
  }

  async function pollDeviceToken(request, response) {
    const body = await readBody(request)
    const pairing = pairingsByDeviceCode.get(body.device_code)
    if (pairing === undefined) {
      return sendJson(response, 400, { error: 'invalid_grant' })
    }
    if (pairing.status === 'pending' && Date.now() > pairing.expiresAt) pairing.status = 'expired'
    if (pairing.status === 'pending') return sendJson(response, 200, { error: 'authorization_pending' })
    if (pairing.status === 'denied') return sendJson(response, 400, { error: 'access_denied' })
    if (pairing.status === 'expired') return sendJson(response, 410, { error: 'expired_token' })
    if (pairing.status === 'consumed') return sendJson(response, 400, { error: 'invalid_grant' })

    const device = devices.get(pairing.deviceId)
    if (device === undefined) return sendJson(response, 400, { error: 'invalid_grant' })
    const tokens = rotateTokens(device)
    pairing.status = 'consumed'
    sendJson(response, 200, {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_S,
      device_id: device.id,
      account: { id: 'dev_user', email: null },
    })
  }

  async function refreshDeviceToken(request, response) {
    const body = await readBody(request)
    const token = typeof body.refresh_token === 'string' ? body.refresh_token : ''
    const device = [...devices.values()].find((item) => item.refreshToken !== null && tokenEquals(item.refreshToken, token))
    if (device === undefined || device.status === 'revoked') {
      return sendJson(response, 401, { error: 'invalid_grant' })
    }
    const tokens = rotateTokens(device)
    sendJson(response, 200, {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_S,
    })
  }

  async function decidePairing(request, response, approve) {
    const body = await readBody(request)
    const code = normalizeUserCode(body.code ?? body.user_code)
    const pairing = pairingsByCode.get(code)
    if (pairing === undefined) return sendHtml(response, 404, pairResultPage('KhÃ´ng tÃ¬m tháº¥y mÃ£', 'MÃ£ ghÃ©p cáº·p khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ dÃ¹ng.'))
    if (pairing.status === 'pending' && Date.now() > pairing.expiresAt) pairing.status = 'expired'
    if (pairing.status !== 'pending') {
      return sendHtml(response, 409, pairResultPage('MÃ£ Ä‘Ã£ dÃ¹ng', 'MÃ£ nÃ y Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t, tá»« chá»‘i, hoáº·c háº¿t háº¡n.'))
    }
    const device = devices.get(pairing.deviceId)
    if (device === undefined) return sendHtml(response, 404, pairResultPage('Thiáº¿t bá»‹ khÃ´ng tá»“n táº¡i', 'HÃ£y táº¡o mÃ£ má»›i trÃªn mÃ¡y DSH.'))

    if (approve) {
      pairing.status = 'approved'
      device.status = 'active'
      device.approvedAt = Date.now()
    } else {
      pairing.status = 'denied'
      device.status = 'revoked'
    }

    if (wantsJson(request)) {
      return sendJson(response, 200, { ok: true, device: summarizeDevice(device) })
    }
    sendHtml(response, 200, pairResultPage(
      approve ? 'ÄÃ£ duyá»‡t thiáº¿t bá»‹' : 'ÄÃ£ tá»« chá»‘i thiáº¿t bá»‹',
      approve ? `${device.name} sáº½ káº¿t ná»‘i trong vÃ i giÃ¢y. Báº¡n cÃ³ thá»ƒ Ä‘Ã³ng tab nÃ y.` : 'Thiáº¿t bá»‹ khÃ´ng Ä‘Æ°á»£c cáº¥p quyá»n.',
    ))
  }

  function revokeDevice(response, deviceId) {
    const device = devices.get(deviceId)
    if (device === undefined) return sendJson(response, 404, { error: { code: 'device/unknown', message: 'device not found' } })
    device.status = 'revoked'
    device.accessToken = null
    device.refreshToken = null
    device.ws?.close(4003, 'device revoked')
    failWebWorkForDevice(device.id)
    sendJson(response, 200, { ok: true, device: summarizeDevice(device) })
  }

  async function servePairPage(response, url) {
    const code = normalizeUserCode(url.searchParams.get('code'))
    const pairing = code.length > 0 ? pairingsByCode.get(code) : undefined
    if (code.length > 0 && pairing === undefined) {
      return sendHtml(response, 404, pairResultPage('KhÃ´ng tÃ¬m tháº¥y mÃ£', 'MÃ£ ghÃ©p cáº·p khÃ´ng tá»“n táº¡i. HÃ£y Ä‘á»c láº¡i mÃ£ trÃªn mÃ¡y DSH.'))
    }
    if (pairing !== undefined && Date.now() > pairing.expiresAt && pairing.status === 'pending') {
      return sendHtml(response, 410, pairResultPage('MÃ£ Ä‘Ã£ háº¿t háº¡n', 'MÃ£ ghÃ©p cáº·p chá»‰ sá»‘ng 10 phÃºt. HÃ£y táº¡o mÃ£ má»›i trÃªn mÃ¡y DSH.'))
    }
    const device = pairing === undefined ? undefined : devices.get(pairing.deviceId)
    const body = device === undefined
      ? pairEntryPage()
      : pairDevicePage(pairing, device)
    sendHtml(response, 200, body)
  }

  async function serveFile(response, name, type) {
    try {
      const data = await readFile(join(WEB_DIR, normalize(name)))
      response.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' })
      response.end(data)
    } catch {
      sendJson(response, 404, { error: { code: 'relay/not-found', message: `${name} not found` } })
    }
  }

  // --------------------------------------------------------------- helpers --

  function firstOnlineDevice() {
    return [...devices.values()].find((device) => device.status === 'active' && device.ws !== undefined)
  }

  function firstWebClient() {
    return [...webClients][0]
  }

  function rotateTokens(device) {
    const accessToken = generateAccessToken()
    const refreshToken = generateRefreshToken()
    device.accessToken = accessToken
    device.refreshToken = refreshToken
    device.lastSeenAt = Date.now()
    return { accessToken, refreshToken }
  }

  function isWebAuthorized(request, url) {
    const bearer = String(request.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
    if (bearer.length > 0 && webTokens.has(bearer)) return true
    const query = url.searchParams.get('token')
    return query !== null && webTokens.has(query)
  }

  function startKeepAlive(connection) {
    let lastPong = Date.now()
    connection.on('pong', () => {
      lastPong = Date.now()
    })
    const timer = setInterval(() => {
      if (Date.now() - lastPong > 62_500) {
        connection.close(4000, 'heartbeat timeout')
        return
      }
      connection.ping()
    }, 25_000)
    timer.unref?.()
    return {
      stop() {
        clearInterval(timer)
      },
    }
  }

  function send(connection, frame) {
    if (connection === undefined || connection.closed) return false
    try {
      return connection.sendText(encodeFrame(frame, { maxFrameBytes: DEFAULT_LIMITS.maxFrameBytes }))
    } catch {
      return false
    }
  }

  function bump(device) {
    device.lastSeenAt = Date.now()
  }

  return {
    server: httpServer,
    webTokens,
    webToken: [...webTokens][0],
    devices,
    pairings: pairingsByCode,
    listen(port = 8787, host = '127.0.0.1') {
      return new Promise((resolve, reject) => {
        httpServer.once('error', reject)
        httpServer.listen(port, host, () => {
          httpServer.off('error', reject)
          resolve(httpServer.address())
        })
      })
    },
    async close() {
      clearInterval(sweeper)
      wsServer.closeAll()
      for (const device of devices.values()) device.ws?.close(1001, 'relay closing')
      await new Promise((resolve) => httpServer.close(resolve))
    },
  }
}

// ------------------------------------------------------------------- utils --

function protocolValue(protocols, prefix) {
  for (const protocol of protocols) {
    if (protocol.startsWith(prefix)) return protocol.slice(prefix.length)
  }
  return undefined
}

async function readBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > BODY_LIMIT) throw new Error('request body is too large')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.length === 0) return {}
  const type = String(request.headers['content-type'] ?? '')
  if (type.includes('application/json')) {
    try {
      return JSON.parse(text)
    } catch {
      return {}
    }
  }
  return Object.fromEntries(new URLSearchParams(text))
}

function wantsJson(request) {
  return String(request.headers.accept ?? '').includes('application/json')
}

function sendJson(response, status, value) {
  if (response.writableEnded) return
  const body = `${JSON.stringify(value)}\n`
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  response.end(body)
}

function sendHtml(response, status, html) {
  if (response.writableEnded) return
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(html)
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function page(title, body) {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #f6f7f9; color: #14161a; }
  main { width: min(480px, 100%); background: #fff; border: 1px solid #e3e6ea; border-radius: 16px;
    padding: 24px; box-shadow: 0 8px 30px rgb(0 0 0 / 6%); }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { margin: 0 0 16px; color: #4a5058; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; margin: 20px 0; }
  dt { color: #6b7280; }
  dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #f1f3f5;
    padding: 2px 6px; border-radius: 6px; }
  .actions { display: flex; gap: 12px; margin-top: 24px; }
  button { flex: 1; padding: 14px; font-size: 16px; border-radius: 12px; border: 1px solid #d5d9df;
    background: #fff; color: #14161a; cursor: pointer; }
  button.primary { background: #14161a; border-color: #14161a; color: #fff; }
  form { margin: 0; }
  @media (prefers-color-scheme: dark) {
    body { background: #0f1115; color: #e9ecf1; }
    main { background: #171a20; border-color: #2a2f38; }
    p, dt { color: #9aa3ae; }
    code { background: #232830; }
    button { background: #171a20; color: #e9ecf1; border-color: #343a45; }
    button.primary { background: #e9ecf1; color: #14161a; border-color: #e9ecf1; }
  }
</style>
</head>
<body><main>${body}</main></body>
</html>`
}

function pairEntryPage() {
  return page('GhÃ©p cáº·p thiáº¿t bá»‹', `
  <h1>GhÃ©p cáº·p thiáº¿t bá»‹</h1>
  <p>Má»Ÿ DSH trÃªn mÃ¡y tÃ­nh, báº­t Web Remote, rá»“i nháº­p mÃ£ 8 kÃ½ tá»± hiá»ƒn thá»‹ á»Ÿ Ä‘Ã³.</p>
  <form method="get" action="/pair">
    <input name="code" inputmode="text" autocapitalize="characters" autocomplete="one-time-code"
      placeholder="ABCD-EFGH" style="width:100%;padding:14px;font-size:20px;letter-spacing:2px;border:1px solid #d5d9df;border-radius:12px;background:transparent;color:inherit">
    <div class="actions"><button class="primary" type="submit">Xem thiáº¿t bá»‹</button></div>
  </form>`)
}

function pairDevicePage(pairing, device) {
  return page('Duyá»‡t thiáº¿t bá»‹', `
  <h1>Thiáº¿t bá»‹ yÃªu cáº§u káº¿t ná»‘i</h1>
  <p>Chá»‰ duyá»‡t náº¿u báº¡n vá»«a má»Ÿ DSH trÃªn chÃ­nh mÃ¡y nÃ y vÃ  Ä‘á»c Ä‘Æ°á»£c mÃ£ bÃªn dÆ°á»›i.</p>
  <dl>
    <dt>MÃ¡y</dt><dd>${escapeHtml(device.name)}</dd>
    <dt>Ná»n táº£ng</dt><dd>${escapeHtml(device.platform)}</dd>
    <dt>Fingerprint</dt><dd><code>${escapeHtml(device.fingerprint)}</code></dd>
    <dt>MÃ£</dt><dd><code>${escapeHtml(pairing.code)}</code></dd>
    <dt>Háº¿t háº¡n</dt><dd>${escapeHtml(new Date(pairing.expiresAt).toLocaleString('vi-VN'))}</dd>
  </dl>
  <div class="actions">
    <form method="post" action="/v1/pair/deny">
      <input type="hidden" name="code" value="${escapeHtml(pairing.code)}">
      <button type="submit">Tá»« chá»‘i</button>
    </form>
    <form method="post" action="/v1/pair/approve">
      <input type="hidden" name="code" value="${escapeHtml(pairing.code)}">
      <button class="primary" type="submit">Duyá»‡t thiáº¿t bá»‹</button>
    </form>
  </div>`)
}

function pairResultPage(title, text) {
  return page(title, `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(text)}</p>
  <div class="actions"><button class="primary" onclick="location.href='/pair'">GhÃ©p cáº·p thiáº¿t bá»‹ khÃ¡c</button></div>`)
}
