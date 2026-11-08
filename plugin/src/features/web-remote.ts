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
import type { KeyObject } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { hostname } from 'node:os'
import { join } from 'node:path'

import type { DshContext, Disposer, Logger } from '../host/dsh.ts'
import type { WebRemoteConfig } from '../lib/config.ts'
import { expandHome, pluginDataDir } from '../lib/paths.ts'
import { loadOrCreateIdentity } from '../lib/remote-device.ts'
import { PairingError, pairDevice, refreshAccessToken, relayEndpoints } from '../lib/remote-pairing.ts'
import { ProtocolError } from '../lib/remote-protocol.ts'
import { RemoteTransport } from '../lib/remote-transport.ts'
import type {
  RemoteTransportOptions,
  TransportRequestOptions,
  TransportStatusEvent,
  WebSocketConstructor,
} from '../lib/remote-transport.ts'
import { JsonStateStore, writeJsonFile } from '../lib/state-store.ts'
import { WebRemoteBridge } from '../lib/web-remote-bridge.ts'
import type { BridgeTransport, WebRemoteSessionController } from '../lib/web-remote-bridge.ts'

const REFRESH_CREDENTIAL = 'DSH_WEB_REMOTE_REFRESH_TOKEN'
const STATUS_INTERVAL_MS = 500
const SUPPORTED_METHODS = ['list', 'state', 'create', 'prompt', 'cancel', 'follow', 'control']

/** The device identity `loadOrCreateIdentity` answers with. */
export interface DeviceIdentity {
  deviceId: string
  privateKey: KeyObject
  publicKeyBase64: string
  fingerprint: string
}

/** One pairing code surfaced in the status file. */
export interface PairingStatus {
  code: string
  uri: string
  expiresAt: string
}

/** The observable runtime status written to `status.json`. */
export interface WebRemoteStatus {
  state: string
  updatedAt?: string
  deviceId?: string
  fingerprint?: string
  deviceName?: string
  relayUrl?: string
  pairedAt?: string
  connectedAt?: string
  pairing?: PairingStatus | null
  pairingStatus?: string
  watching?: string[]
  lastError?: string | null
  [key: string]: unknown
}

/** The durable state kept in `state.json`. */
interface WebRemoteState {
  deviceId: string
  relayUrl: string
  pairedAt: number
}

/** The transport surface the feature drives; `RemoteTransport` satisfies it. */
export interface WebRemoteTransport {
  readonly status: string
  start(): void
  stop(reason?: string): void
  request(op: string, args?: Record<string, unknown>, options?: TransportRequestOptions): Promise<unknown>
}

/** What `apply` may hand the feature: logging plus the test seams. */
export interface WebRemoteDeps {
  logger?: Logger
  now?: () => number
  identity?: DeviceIdentity
  fetchImpl?: typeof fetch
  /** Pairing poll interval for tests; 0 or undefined uses the relay's interval. */
  pairingPollMs?: number
  WebSocket?: WebSocketConstructor
  createTransport?: (options: RemoteTransportOptions) => WebRemoteTransport
}

/** The `workingDirectory` service, read for the bridge's default folder. */
interface WorkingDirectoryLike {
  defaultDirectory?: string
}

/** The `credentials` service, used for the refresh token. */
interface CredentialsLike {
  resolve?(ref: string): Promise<{ value?: string } | undefined>
  set?(ref: string, value: string): Promise<unknown>
  unset?(ref: string): Promise<unknown>
}

/** One answerer the Harness asks before a tool runs or a question is shown. */
type AnswererListener = (request: unknown, next: unknown) => unknown

/** How the Harness registers an answerer: `ctx.on(event, listener)`. */
type AnswererRegistrar = (event: string, listener: AnswererListener) => Disposer

/**
 * Mount the Web Remote feature.
 *
 * @param ctx Harness plugin context.
 * @param config the normalized `webRemote` slice.
 * @param deps logger plus the optional test seams.
 * @returns disposer that stops the transport and withdraws every listener
 */
export function mountWebRemote(ctx: DshContext, config: WebRemoteConfig, deps: WebRemoteDeps = {}): Disposer {
  const logger: Logger = deps.logger ?? console
  const resolvedController = ctx.get<WebRemoteSessionController>('sessionController')
  if (resolvedController === undefined) {
    logger.warn('web-remote: sessionController is absent; feature not mounted')
    return () => {}
  }
  // A non-optional alias, so the nested bridge keeps the narrowed type.
  const sessionController: WebRemoteSessionController = resolvedController

  const now = deps.now ?? Date.now
  const dataDir = config.dataDir
    ? expandHome(config.dataDir)
    : join(pluginDataDir('personal-hub'), 'web-remote')
  const statusFile = join(dataDir, 'status.json')
  const tokenFile = join(dataDir, 'refresh-token.json')
  const stateStore = new JsonStateStore<WebRemoteState>(join(dataDir, 'state.json'), {
    deviceId: '',
    relayUrl: '',
    pairedAt: 0,
  })

  const deviceName = config.deviceName || hostname()
  const lifecycle = new AbortController()
  const disposers: Disposer[] = []

  let identity: DeviceIdentity
  let transport: WebRemoteTransport | undefined
  let bridge: WebRemoteBridge | undefined
  let bridgeRegistered = false
  let refreshToken = ''
  let accessToken = ''
  let accessExpiresAt = 0
  let stopped = false
  let published: WebRemoteStatus = { state: 'starting' }
  let lastPublished = ''
  let writeChain: Promise<void> = Promise.resolve()
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
  function publish(patch: Partial<WebRemoteStatus>): void {
    published = { ...published, ...patch, updatedAt: new Date(now()).toISOString() }
    const snapshot = { ...published }
    const text = JSON.stringify(snapshot)
    if (text === lastPublished) return
    lastPublished = text
    writeChain = writeChain
      .then(() => writeJsonFile(statusFile, snapshot))
      .catch((error) => logger.warn('web-remote: cannot write status file: %s', message(error)))
  }

  async function initialize(): Promise<void> {
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

  async function pair(): Promise<boolean | undefined> {
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
        ...(typeof deps.pairingPollMs === 'number' && deps.pairingPollMs > 0
          ? { pollIntervalMs: deps.pairingPollMs }
          : {}),
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
  const transportProxy: BridgeTransport = {
    get status(): string {
      return transport?.status ?? 'idle'
    },
    request(op, args, options) {
      if (transport === undefined) {
        return Promise.reject(new ProtocolError('transport/not-ready', 'the relay connection is not ready'))
      }
      return transport.request(op, args, options)
    },
  }

  /**
   * One bridge and one pair of approval/question listeners for the feature's
   * lifetime; reconnects only replace the transport underneath.
   */
  function ensureBridge(): WebRemoteBridge {
    if (bridge === undefined) {
      bridge = new WebRemoteBridge({
        sessionController,
        transport: transportProxy,
        config: {
          ...config,
          defaultCwd: ctx.get<WorkingDirectoryLike>('workingDirectory')?.defaultDirectory ?? process.cwd(),
        },
        logger,
        now,
      })
    }
    if (!bridgeRegistered) {
      const active = bridge
      register(ctx, 'approval/request', (request, next) => active.handleApproval(request, next))
      register(ctx, 'user-questions/request', (request, next) => active.handleQuestion(request, next))
      bridgeRegistered = true
    }
    return bridge
  }

  async function connect(): Promise<void> {
    if (stopped) return
    transport?.stop('reconnecting')
    const endpoints = relayEndpoints(config.relayUrl)
    const transportOptions: RemoteTransportOptions = {
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

  function register(context: DshContext, event: string, listener: AnswererListener): void {
    if (typeof context.on !== 'function') {
      logger.warn('web-remote: ctx.on is unavailable; cannot listen to %s', event)
      return
    }
    try {
      // `DshContext.on` types its payload as `never` because the Harness event
      // catalog is not part of this bundle; these events pass two arguments.
      const subscribe = context.on as unknown as AnswererRegistrar
      const dispose = subscribe(event, listener)
      if (typeof dispose === 'function') disposers.push(dispose)
    } catch (error) {
      logger.warn('web-remote: cannot listen to %s: %s', event, message(error))
    }
  }

  function onTransportStatus(state: TransportStatusEvent): void {
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

  async function onAuthRequired(error: unknown): Promise<void> {
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

  async function getAccessToken(): Promise<string> {
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

  async function readRefreshToken(): Promise<string> {
    const credentials = ctx.get<CredentialsLike>('credentials')
    if (credentials?.resolve) {
      try {
        const hit = await credentials.resolve(REFRESH_CREDENTIAL)
        if (typeof hit?.value === 'string' && hit.value.trim().length > 0) return hit.value.trim()
      } catch (error) {
        logger.warn('web-remote: cannot read credential: %s', message(error))
      }
    }
    try {
      const stored: unknown = JSON.parse(await readFile(tokenFile, 'utf8'))
      if (isRecord(stored) && typeof stored.refresh_token === 'string' && stored.refresh_token.length > 0) {
        return stored.refresh_token
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') logger.warn('web-remote: cannot read token file: %s', message(error))
    }
    return ''
  }

  async function writeRefreshToken(token: string): Promise<void> {
    const credentials = ctx.get<CredentialsLike>('credentials')
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

  async function clearRefreshToken(): Promise<void> {
    refreshToken = ''
    accessToken = ''
    accessExpiresAt = 0
    const credentials = ctx.get<CredentialsLike>('credentials')
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

  function reportError(context: string, error: unknown): void {
    const text = message(error)
    publish({ state: 'error', lastError: `${context}: ${text}` })
    logger.error('web-remote: %s: %s', context, text)
  }

  function dispose(): void {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function message(error: unknown): string {
  if (error instanceof PairingError || error instanceof ProtocolError) return `${error.code}: ${error.message}`
  return error instanceof Error ? error.message : String(error)
}

