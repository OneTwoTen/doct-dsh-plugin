/**
 * Device pairing (RFC 8628 reduced) and token refresh against a Web Remote
 * relay. Pure HTTP: no DSH import, injectable `fetch` and clock so the bridge
 * tests do not touch the network.
 */

/** Extra options a pairing failure may carry. */
export interface PairingErrorOptions {
  cause?: unknown
}

export class PairingError extends Error {
  code: string

  constructor(code: string, message: string, options: PairingErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'PairingError'
    this.code = code
  }
}

/** The HTTP API base and WebSocket URL derived from one relay URL. */
export interface RelayEndpoints {
  apiBase: string
  wsUrl: string
}

/**
 * Resolve the HTTP API base and WebSocket URL from one configured relay URL.
 *
 * Accepted inputs: `https://chat.example.com`, `http://127.0.0.1:8787`,
 * `wss://chat.example.com/ws`, or a reverse-proxied prefix such as
 * `https://example.com/dsh`.
 */
export function relayEndpoints(relayUrl: string): RelayEndpoints {
  const raw = typeof relayUrl === 'string' ? relayUrl.trim() : ''
  if (raw.length === 0) throw new PairingError('pair/invalid-url', 'relayUrl is empty')
  let url: URL
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Read a JSON body as a record; anything else reads as empty. */
function asRecord(value: unknown): Record<string, unknown> {
  return isObject(value) ? value : {}
}

function errorCodeOf(body: unknown): string | undefined {
  const error = asRecord(body).error
  if (typeof error === 'string') return error
  if (isObject(error) && typeof error.code === 'string') return error.code
  return undefined
}

function messageOf(body: unknown, fallback: string): string {
  const error = asRecord(body).error
  if (isObject(error) && typeof error.message === 'string' && error.message.length > 0) return error.message
  return fallback
}

async function readBody(response: { text(): Promise<string> }): Promise<unknown> {
  const text = await response.text()
  if (text.length === 0) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Options one JSON request accepts. */
export interface RequestJsonOptions {
  method?: string
  body?: unknown
  token?: string
  signal?: AbortSignal
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

/** One HTTP answer with its parsed body, which stays `unknown` until narrowed. */
export interface JsonResponse {
  status: number
  body: unknown
}

/**
 * One JSON request with a bounded deadline and optional caller cancellation.
 */
export async function requestJson(url: string, options: RequestJsonOptions = {}): Promise<JsonResponse> {
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
  const headers: Record<string, string> = { accept: 'application/json' }
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (typeof token === 'string' && token.length > 0) headers.authorization = `Bearer ${token}`

  let response: Response
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

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
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

/** The short code and verification URL shown while pairing. */
export interface PairingCode {
  userCode: string
  verificationUri: string
  expiresIn: number
  intervalMs: number
}

/** One progress note emitted while polling. */
export interface PairingStatus {
  code: string
  message: string
}

/** Everything `pairDevice` needs; `fetchImpl` and `now` are injectable for tests. */
export interface PairDeviceOptions {
  relayUrl: string
  /** Machine name shown to the approver. */
  name: string
  platform?: string
  /** Base64 SPKI public key. */
  pubkey: string
  deviceId?: string
  scopes?: string[]
  onCode?: (code: PairingCode) => void
  onStatus?: (status: PairingStatus) => void
  signal?: AbortSignal
  fetchImpl?: typeof fetch
  now?: () => number
  pollIntervalMs?: number
}

/** A token pair as the relay returns it. */
export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  device_id?: string
  account?: unknown
  /** Forward compatibility: the relay may return extra fields. */
  [extra: string]: unknown
}

/** The result of a completed pairing: both tokens are present. */
export interface PairingResult extends TokenResponse {
  refresh_token: string
}

/** Whether a parsed body carries a usable access token. */
function hasAccessToken(body: unknown): body is TokenResponse {
  return isObject(body) && typeof body.access_token === 'string'
}

/**
 * Runs flow B: device authorizes, shows a short code, polls until the account
 * owner approves on the web.
 */
export async function pairDevice(options: PairDeviceOptions): Promise<PairingResult> {
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

  const authorizedBody = asRecord(authorized.body)
  const deviceCode = authorizedBody.device_code
  const userCode = authorizedBody.user_code
  const expiresIn = Number(authorizedBody.expires_in)
  if (typeof deviceCode !== 'string' || deviceCode.length === 0) {
    throw new PairingError('pair/invalid-response', 'relay did not return device_code')
  }
  if (typeof userCode !== 'string' || userCode.length === 0) {
    throw new PairingError('pair/invalid-response', 'relay did not return user_code')
  }

  const verificationUri = typeof authorizedBody.verification_uri === 'string'
    ? authorizedBody.verification_uri
    : `${apiBase}/pair`
  const serverInterval = Number(authorizedBody.interval)
  let intervalMs = typeof pollIntervalMs === 'number' && Number.isFinite(pollIntervalMs) && pollIntervalMs > 0
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

    if (polled.status === 200 && hasAccessToken(polled.body)) {
      if (typeof polled.body.refresh_token !== 'string') {
        throw new PairingError('pair/invalid-response', 'relay did not return refresh_token')
      }
      // The runtime check above proves the token is present; the body keeps its
      // original shape (and identity) for the caller.
      return polled.body as PairingResult
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

/** Options for rotating a refresh token. */
export interface RefreshAccessTokenOptions {
  relayUrl: string
  refreshToken?: string
  fetchImpl?: typeof fetch
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * Rotate the refresh token and obtain a fresh access token.
 */
export async function refreshAccessToken({
  relayUrl,
  refreshToken,
  fetchImpl,
  signal,
  timeoutMs,
}: RefreshAccessTokenOptions = { relayUrl: '' }): Promise<TokenResponse> {
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
  if (response.status !== 200 || !hasAccessToken(response.body)) {
    const code = errorCodeOf(response.body) ?? 'auth/invalid-token'
    throw new PairingError(code, messageOf(response.body, `token refresh failed with HTTP ${response.status}`))
  }
  return response.body
}
