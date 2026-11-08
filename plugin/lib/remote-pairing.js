/**
 * Device pairing (RFC 8628 reduced) and token refresh against a Web Remote
 * relay. Pure HTTP: no DSH import, injectable `fetch` and clock so the bridge
 * tests do not touch the network.
 */

export class PairingError extends Error {
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'PairingError'
    this.code = code
  }
}

/**
 * Resolve the HTTP API base and WebSocket URL from one configured relay URL.
 *
 * Accepted inputs: `https://chat.example.com`, `http://127.0.0.1:8787`,
 * `wss://chat.example.com/ws`, or a reverse-proxied prefix such as
 * `https://example.com/dsh`.
 *
 * @param {string} relayUrl
 */
export function relayEndpoints(relayUrl) {
  const raw = typeof relayUrl === 'string' ? relayUrl.trim() : ''
  if (raw.length === 0) throw new PairingError('pair/invalid-url', 'relayUrl is empty')
  let url
  try {
    url = new URL(raw)
  } catch (error) {
    throw new PairingError('pair/invalid-url', `relayUrl is not a URL: ${raw}`, { cause: error })
  }

  const secure = url.protocol === 'https:' || url.protocol === 'wss:'
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
    throw new PairingError('pair/invalid-url', `relayUrl must be http(s) or ws(s): ${raw}`)
  }
  if (url.search.length > 0 || url.hash.length > 0) {
    throw new PairingError('pair/invalid-url', 'relayUrl must not carry a query or fragment')
  }

  const path = url.pathname.replace(/\/+$/, '')
  const basePath = path.endsWith('/ws') ? path.slice(0, -3) : path
  const apiBase = `${secure ? 'https' : 'http'}://${url.host}${basePath}`
  const wsUrl = `${secure ? 'wss' : 'ws'}://${url.host}${basePath}/ws`
  return { apiBase, wsUrl }
}

function errorCodeOf(body) {
  const error = body?.error
  if (typeof error === 'string') return error
  if (error && typeof error.code === 'string') return error.code
  return undefined
}

function messageOf(body, fallback) {
  const error = body?.error
  if (error && typeof error.message === 'string' && error.message.length > 0) return error.message
  return fallback
}

async function readBody(response) {
  const text = await response.text()
  if (text.length === 0) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * One JSON request with a bounded deadline and optional caller cancellation.
 * @returns {Promise<{ status: number, body: any }>}
 */
export async function requestJson(url, options = {}) {
  const {
    method = 'GET',
    body,
    token,
    signal,
    timeoutMs = 15000,
    fetchImpl = globalThis.fetch,
  } = options

  if (typeof fetchImpl !== 'function') {
    throw new PairingError('pair/network', 'fetch is not available in this runtime')
  }

  const timeout = AbortSignal.timeout(timeoutMs)
  const combined = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  const headers = { accept: 'application/json' }
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (typeof token === 'string' && token.length > 0) headers.authorization = `Bearer ${token}`

  let response
  try {
    response = await fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: combined,
    })
  } catch (error) {
    if (error?.name === 'AbortError' && signal?.aborted) {
      throw new PairingError('pair/aborted', 'request was cancelled', { cause: error })
    }
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new PairingError('pair/network', `request timed out after ${timeoutMs} ms`, { cause: error })
    }
    throw new PairingError('pair/network', `cannot reach ${url}: ${error?.message ?? error}`, { cause: error })
  }

  return { status: response.status, body: await readBody(response) }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new PairingError('pair/aborted', 'pairing was cancelled'))
      return
    }
    const timer = setTimeout(done, Math.max(0, ms))
    function done() {
      cleanup()
      resolve()
    }
    function onAbort() {
      cleanup()
      reject(new PairingError('pair/aborted', 'pairing was cancelled'))
    }
    function cleanup() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Runs flow B: device authorizes, shows a short code, polls until the account
 * owner approves on the web.
 *
 * @param {object} options
 * @param {string} options.relayUrl
 * @param {string} options.name machine name shown to the approver
 * @param {string} options.platform
 * @param {string} options.pubkey base64 SPKI
 * @param {string[]} [options.scopes]
 * @param {(code: { userCode: string, verificationUri: string, expiresIn: number, intervalMs: number }) => void} [options.onCode]
 * @param {(issue: { code: string, message: string }) => void} [options.onStatus]
 * @param {AbortSignal} [options.signal]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {() => number} [options.now]
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number, device_id: string, account?: unknown }>}
 */
export async function pairDevice(options) {
  const {
    relayUrl,
    name,
    platform = process.platform,
    pubkey,
    deviceId,
    scopes = ['chat', 'approval'],
    onCode,
    onStatus,
    signal,
    fetchImpl,
    now = Date.now,
    pollIntervalMs,
  } = options

  const { apiBase } = relayEndpoints(relayUrl)

  if (typeof pubkey !== 'string' || pubkey.length === 0) {
    throw new PairingError('pair/invalid-pubkey', 'pairing requires an Ed25519 public key')
  }

  const authorized = await requestJson(`${apiBase}/v1/device/authorize`, {
    method: 'POST',
    body: {
      name,
      platform,
      pubkey,
      scopes,
      ...(typeof deviceId === 'string' && deviceId.length > 0 ? { device_id: deviceId } : {}),
    },
    signal,
    fetchImpl,
  })

  if (authorized.status !== 200 && authorized.status !== 201) {
    const code = errorCodeOf(authorized.body) ?? 'pair/authorize-failed'
    throw new PairingError(code, messageOf(authorized.body, `relay answered HTTP ${authorized.status}`))
  }

  const deviceCode = authorized.body?.device_code
  const userCode = authorized.body?.user_code
  const expiresIn = Number(authorized.body?.expires_in)
  if (typeof deviceCode !== 'string' || deviceCode.length === 0) {
    throw new PairingError('pair/invalid-response', 'relay did not return device_code')
  }
  if (typeof userCode !== 'string' || userCode.length === 0) {
    throw new PairingError('pair/invalid-response', 'relay did not return user_code')
  }

  const verificationUri = typeof authorized.body?.verification_uri === 'string'
    ? authorized.body.verification_uri
    : `${apiBase}/pair`
  const serverInterval = Number(authorized.body?.interval)
  let intervalMs = Number.isFinite(pollIntervalMs) && pollIntervalMs > 0
    ? pollIntervalMs
    : Math.max(1, Number.isFinite(serverInterval) ? serverInterval : 5) * 1000
  const effectiveExpiresIn = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 600
  const deadline = now() + effectiveExpiresIn * 1000

  onCode?.({
    userCode,
    verificationUri,
    expiresIn: effectiveExpiresIn,
    intervalMs,
  })

  for (;;) {
    if (now() >= deadline) {
      throw new PairingError('pair/expired', 'the pairing code expired before it was approved')
    }
    await sleep(intervalMs, signal)

    const polled = await requestJson(`${apiBase}/v1/device/token`, {
      method: 'POST',
      body: { device_code: deviceCode },
      signal,
      fetchImpl,
    })

    if (polled.status === 200 && typeof polled.body?.access_token === 'string') {
      if (typeof polled.body?.refresh_token !== 'string') {
        throw new PairingError('pair/invalid-response', 'relay did not return refresh_token')
      }
      return polled.body
    }

    const code = errorCodeOf(polled.body)
    if (code === 'authorization_pending' || code === 'device/pending') {
      onStatus?.({ code: 'authorization_pending', message: 'waiting for approval on the web' })
      continue
    }
    if (code === 'slow_down') {
      intervalMs += 5000
      onStatus?.({ code: 'slow_down', message: 'relay asked the device to poll more slowly' })
      continue
    }
    if (code === 'access_denied' || code === 'device/denied') {
      throw new PairingError('pair/denied', 'the pairing request was denied')
    }
    if (code === 'expired_token' || code === 'pair/expired') {
      throw new PairingError('pair/expired', 'the pairing code expired')
    }
    if (polled.status === 429) {
      throw new PairingError('rate/limited', messageOf(polled.body, 'relay rate-limited pairing'))
    }
    throw new PairingError(
      code ?? 'pair/token-failed',
      messageOf(polled.body, `relay answered HTTP ${polled.status} while polling for a token`),
    )
  }
}

/**
 * Rotate the refresh token and obtain a fresh access token.
 * @returns {Promise<{ access_token: string, refresh_token?: string, expires_in?: number }>}
 */
export async function refreshAccessToken({ relayUrl, refreshToken, fetchImpl, signal, timeoutMs } = {}) {
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    throw new PairingError('auth/invalid-token', 'no refresh token is stored')
  }
  const { apiBase } = relayEndpoints(relayUrl)
  const response = await requestJson(`${apiBase}/v1/token/refresh`, {
    method: 'POST',
    body: { refresh_token: refreshToken },
    fetchImpl,
    signal,
    timeoutMs,
  })
  if (response.status !== 200 || typeof response.body?.access_token !== 'string') {
    const code = errorCodeOf(response.body) ?? 'auth/invalid-token'
    throw new PairingError(code, messageOf(response.body, `token refresh failed with HTTP ${response.status}`))
  }
  return response.body
}
