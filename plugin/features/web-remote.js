/**
 * Web Remote — feature 3 of the personal hub.
 *
 * Runs entirely inside the DSH Host:
 *   1. loads (or creates) the device Ed25519 key,
 *   2. pairs with a relay through a short code (RFC 8628 reduced),
 *   3. keeps one outbound WebSocket to the relay with backoff,
 *   4. serves Session operations and unary approval/question requests.
 *
 * No port is opened on this machine. See `docs/dac-ta-v1-pairing-va-xac-thuc.md`
 * and `protocol/README.md`.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { hostname } from 'node:os'
import { join } from 'node:path'

import { expandHome, pluginDataDir } from '../lib/paths.js'
import { loadOrCreateIdentity } from '../lib/remote-device.js'
import { PairingError, pairDevice, refreshAccessToken, relayEndpoints } from '../lib/remote-pairing.js'
import { ProtocolError } from '../lib/remote-protocol.js'
import { RemoteTransport } from '../lib/remote-transport.js'
import { JsonStateStore, writeJsonFile } from '../lib/state-store.js'
import { WebRemoteBridge } from '../lib/web-remote-bridge.js'

const REFRESH_CREDENTIAL = 'DSH_WEB_REMOTE_REFRESH_TOKEN'
const STATUS_INTERVAL_MS = 500
const SUPPORTED_METHODS = ['list', 'state', 'create', 'prompt', 'cancel', 'follow', 'control']

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {ReturnType<typeof import('../lib/config.js').normalizeConfig>['webRemote']} config
 */
export function mountWebRemote(ctx, config, deps = {}) {
  const logger = deps.logger ?? console
  const sessionController = ctx.get('sessionController')
  if (sessionController === undefined) {
    logger.warn('web-remote: sessionController is absent; feature not mounted')
    return () => {}
  }

  const now = deps.now ?? Date.now
  const dataDir = config.dataDir
    ? expandHome(config.dataDir)
    : join(pluginDataDir('personal-hub'), 'web-remote')
  const statusFile = join(dataDir, 'status.json')
  const tokenFile = join(dataDir, 'refresh-token.json')
  const stateStore = new JsonStateStore(join(dataDir, 'state.json'), {
    deviceId: '',
    relayUrl: '',
    pairedAt: 0,
  })

  const deviceName = config.deviceName || hostname()
  const lifecycle = new AbortController()
  const disposers = []

  let identity
  let transport
  let bridge
  let bridgeRegistered = false
  let refreshToken = ''
  let accessToken = ''
  let accessExpiresAt = 0
  let stopped = false
  let published = { state: 'starting' }
  let lastPublished = ''
  let writeChain = Promise.resolve()
  let pairingAttempt = 0

  logger.info('web-remote: mounted, data directory %s', dataDir)

  // Surface API drift early: the bridge feature-detects at call time, but a
  // missing `follow` would leave the web UI with an empty conversation.
  const missing = SUPPORTED_METHODS.filter((method) => typeof sessionController[method] !== 'function')
  if (missing.length > 0) {
    logger.warn('web-remote: sessionController is missing %s; some operations will fail', missing.join(', '))
  }

  const ready = initialize().catch((error) => {
    reportError('initialization failed', error)
  })

  /**
   * Publish the observable runtime status. Writes are serialized and diffed so
   * a 25-second heartbeat does not rewrite the file.
   */
  function publish(patch) {
    published = { ...published, ...patch, updatedAt: new Date(now()).toISOString() }
    const snapshot = { ...published }
    const text = JSON.stringify(snapshot)
    if (text === lastPublished) return
    lastPublished = text
    writeChain = writeChain
      .then(() => writeJsonFile(statusFile, snapshot))
      .catch((error) => logger.warn('web-remote: cannot write status file: %s', message(error)))
  }

  async function initialize() {
    await mkdir(dataDir, { recursive: true, mode: 0o700 })
    identity = deps.identity ?? await loadOrCreateIdentity({ dir: dataDir })
    await stateStore.load()

    const previousRelay = stateStore.state.relayUrl
    if (previousRelay !== config.relayUrl && previousRelay !== '') {
      // A token is scoped to the relay that issued it; a new relay means a new pairing.
      await clearRefreshToken()
    }
    await stateStore.update((state) => {
      state.deviceId = identity.deviceId
      state.relayUrl = config.relayUrl
    })

    publish({
      state: config.relayUrl.length > 0 ? 'starting' : 'waiting-relay',
      deviceId: identity.deviceId,
      fingerprint: identity.fingerprint,
      deviceName,
      relayUrl: config.relayUrl,
    })

    if (config.relayUrl.length === 0) {
      logger.info('web-remote: no relayUrl configured; waiting for one in the plugin settings')
      return
    }
    try {
      relayEndpoints(config.relayUrl)
    } catch (error) {
      publish({ state: 'error', lastError: message(error) })
      logger.error('web-remote: invalid relayUrl: %s', message(error))
      return
    }

    refreshToken = await readRefreshToken()
    if (refreshToken.length === 0) {
      if (!config.autoPair) {
        publish({ state: 'waiting-pairing' })
        logger.info('web-remote: no credential yet; set webRemote.autoPair or pair explicitly')
        return
      }
      const paired = await pair()
      if (!paired) return
    }

    await connect()
  }

  async function pair() {
    if (stopped) return
    pairingAttempt += 1
    publish({ state: 'pairing' })
    logger.info(
      'web-remote: pairing device %s (%s) with %s',
      deviceName,
      identity.deviceId,
      config.relayUrl,
    )

    try {
      const tokens = await pairDevice({
        relayUrl: config.relayUrl,
        name: deviceName,
        platform: process.platform,
        pubkey: identity.publicKeyBase64,
        deviceId: identity.deviceId,
        scopes: config.scopes,
        fetchImpl: deps.fetchImpl,
        signal: lifecycle.signal,
        now,
        ...(deps.pairingPollMs > 0 ? { pollIntervalMs: deps.pairingPollMs } : {}),
        onCode: (code) => {
          logger.info(
            'web-remote: open %s and enter code %s (expires in %d minutes)',
            code.verificationUri,
            code.userCode,
            Math.round(code.expiresIn / 60),
          )
          publish({
            state: 'pairing',
            pairing: {
              code: code.userCode,
              uri: code.verificationUri,
              expiresAt: new Date(now() + code.expiresIn * 1000).toISOString(),
            },
          })
        },
        onStatus: (issue) => {
          publish({ pairingStatus: issue.code, lastError: null })
        },
      })

      refreshToken = tokens.refresh_token
      await writeRefreshToken(refreshToken)
      accessToken = tokens.access_token
      accessExpiresAt = now() + (Number(tokens.expires_in) || 900) * 1000
      await stateStore.update((state) => {
        state.pairedAt = now()
        state.deviceId = identity.deviceId
        state.relayUrl = config.relayUrl
      })
      publish({
        state: 'paired',
        pairedAt: new Date(now()).toISOString(),
        pairing: undefined,
        lastError: null,
      })
      logger.info('web-remote: paired; connecting to relay')
      return true
    } catch (error) {
      if (stopped || error?.code === 'pair/aborted') return false
      reportError('pairing failed', error)
      publish({ state: 'pairing-required', pairing: undefined })
      return false
    }
  }

  /** Stable façade so the bridge can outlive individual sockets. */
  const transportProxy = {
    get status() {
      return transport?.status ?? 'idle'
    },
    request: (...args) => {
      if (transport === undefined) {
        return Promise.reject(new ProtocolError('transport/not-ready', 'the relay connection is not ready'))
      }
      return transport.request(...args)
    },
  }

  /**
   * One bridge and one pair of approval/question listeners for the feature's
   * lifetime; reconnects only replace the transport underneath.
   */
  function ensureBridge() {
    if (bridge === undefined) {
      bridge = new WebRemoteBridge({
        sessionController,
        transport: transportProxy,
        config: {
          ...config,
          defaultCwd: ctx.get('workingDirectory')?.defaultDirectory ?? process.cwd(),
        },
        logger,
        now,
      })
    }
    if (!bridgeRegistered) {
      register(ctx, 'approval/request', (request, next) => bridge.handleApproval(request, next))
      register(ctx, 'user-questions/request', (request, next) => bridge.handleQuestion(request, next))
      bridgeRegistered = true
    }
    return bridge
  }

  async function connect() {
    if (stopped) return
    transport?.stop('reconnecting')
    const endpoints = relayEndpoints(config.relayUrl)
    const transportOptions = {
      url: endpoints.wsUrl,
      identity,
      getAccessToken,
      WebSocket: deps.WebSocket,
      heartbeatMs: config.heartbeatMs,
      requestTimeoutMs: config.requestTimeoutMs,
      reconnect: { minMs: config.reconnectMinMs, maxMs: config.reconnectMaxMs },
      logger,
      onRequest: (op, args) => ensureBridge().handleOp(op, args),
      onStream: (op, args, stream) => ensureBridge().handleStream(op, args, stream),
      onStatus: (state) => onTransportStatus(state),
      onAuthRequired: (error) => onAuthRequired(error),
    }
    transport = deps.createTransport
      ? deps.createTransport(transportOptions)
      : new RemoteTransport(transportOptions)

    ensureBridge()
    publish({ state: 'connecting' })
    transport.start()
  }

  function register(context, event, listener) {
    if (typeof context.on !== 'function') {
      logger.warn('web-remote: ctx.on is unavailable; cannot listen to %s', event)
      return
    }
    try {
      const dispose = context.on(event, listener)
      if (typeof dispose === 'function') disposers.push(dispose)
    } catch (error) {
      logger.warn('web-remote: cannot listen to %s: %s', event, message(error))
    }
  }

  function onTransportStatus(state) {
    const status = state.status
    if (status === 'ready') {
      publish({
        state: 'connected',
        connectedAt: new Date(now()).toISOString(),
        lastError: null,
        watching: bridge?.watchedSessions ?? [],
      })
      return
    }
    if (status === 'connecting' || status === 'reconnecting') {
      publish({ state: status, connectedAt: undefined, watching: bridge?.watchedSessions ?? [] })
      return
    }
    if (status === 'auth-required') {
      publish({ state: 'auth-required', lastError: state.error ?? 'relay rejected the access token' })
      return
    }
    if (status === 'revoked') {
      publish({ state: 'revoked', lastError: 'this device was revoked from the web' })
      return
    }
    if (status === 'stopped') publish({ state: 'stopped' })
  }

  async function onAuthRequired(error) {
    accessToken = ''
    accessExpiresAt = 0
    if (error instanceof ProtocolError && error.code === 'device/revoked') return
    if (!config.autoPair || stopped) return
    // The stored refresh token was rejected or the relay lost the device. Drop
    // it once, then re-run flow B; refrain from an unbounded retry loop.
    if (pairingAttempt >= 2) {
      publish({ state: 'auth-required', lastError: 'pairing failed twice; not retrying automatically' })
      return
    }
    await clearRefreshToken()
    const attempt = pairingAttempt
    setTimeout(() => {
      if (stopped) return
      void pair()
        .then((paired) => (paired ? connect() : undefined))
        .catch((failure) => reportError('re-pairing failed', failure))
    }, Math.min(30000, 1500 * Math.max(1, attempt))).unref?.()
  }

  async function getAccessToken() {
    if (accessToken.length > 0 && now() < accessExpiresAt - 60000) return accessToken
    if (refreshToken.length === 0) refreshToken = await readRefreshToken()
    if (refreshToken.length === 0) {
      throw new ProtocolError('auth/invalid-token', 'no refresh token is stored')
    }
    const refreshed = await refreshAccessToken({
      relayUrl: config.relayUrl,
      refreshToken,
      fetchImpl: deps.fetchImpl,
    })
    accessToken = refreshed.access_token
    accessExpiresAt = now() + (Number(refreshed.expires_in) || 900) * 1000
    if (typeof refreshed.refresh_token === 'string' && refreshed.refresh_token !== refreshToken) {
      refreshToken = refreshed.refresh_token
      await writeRefreshToken(refreshToken)
    }
    return accessToken
  }

  async function readRefreshToken() {
    const credentials = ctx.get('credentials')
    if (credentials?.resolve) {
      try {
        const hit = await credentials.resolve(REFRESH_CREDENTIAL)
        if (typeof hit?.value === 'string' && hit.value.trim().length > 0) return hit.value.trim()
      } catch (error) {
        logger.warn('web-remote: cannot read credential: %s', message(error))
      }
    }
    try {
      const stored = JSON.parse(await readFile(tokenFile, 'utf8'))
      if (typeof stored?.refresh_token === 'string' && stored.refresh_token.length > 0) {
        return stored.refresh_token
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') logger.warn('web-remote: cannot read token file: %s', message(error))
    }
    return ''
  }

  async function writeRefreshToken(token) {
    const credentials = ctx.get('credentials')
    if (credentials?.set) {
      try {
        await credentials.set(REFRESH_CREDENTIAL, token)
        return
      } catch (error) {
        logger.warn('web-remote: cannot write credential, falling back to file: %s', message(error))
      }
    }
    await writeFile(tokenFile, `${JSON.stringify({ refresh_token: token })}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    })
  }

  async function clearRefreshToken() {
    refreshToken = ''
    accessToken = ''
    accessExpiresAt = 0
    const credentials = ctx.get('credentials')
    if (credentials?.unset) {
      try {
        await credentials.unset(REFRESH_CREDENTIAL)
      } catch {
        // A credential that was never written is not an error.
      }
    }
    try {
      await writeFile(tokenFile, '', { encoding: 'utf8', mode: 0o600 })
    } catch {
      // The file may not exist.
    }
  }

  function reportError(context, error) {
    const text = message(error)
    publish({ state: 'error', lastError: `${context}: ${text}` })
    logger.error('web-remote: %s: %s', context, text)
  }

  function dispose() {
    if (stopped) return
    stopped = true
    lifecycle.abort()
    try {
      transport?.stop('plugin-disposed')
    } catch (error) {
      logger.warn('web-remote: transport stop failed: %s', message(error))
    }
    try {
      bridge?.dispose()
    } catch {
      // Ignore teardown failures.
    }
    for (const disposeListener of disposers) {
      try {
        disposeListener()
      } catch (error) {
        logger.warn('web-remote: listener dispose failed: %s', message(error))
      }
    }
    publish({ state: 'stopped' })
  }

  // Keep `ready` referenced so a rejected initialization is observable in logs
  // rather than becoming an unhandled rejection.
  void ready

  return dispose
}

function message(error) {
  if (error instanceof PairingError || error instanceof ProtocolError) return `${error.code}: ${error.message}`
  return error instanceof Error ? error.message : String(error)
}
