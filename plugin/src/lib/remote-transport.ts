/**
 * Outbound WebSocket transport for Web Remote.
 *
 * One socket, multiplexed by frame `id`. The transport owns the connection
 * lifecycle (hello, heartbeat, backoff, token acquisition) and routes frames:
 *
 *   relay -> device  `req`  -> `onRequest(op, args)`  -> `res`
 *   relay -> device  `open` -> `onStream(op, args, stream)`
 *   device -> relay  `request(op, args)` (unary)
 *
 * It deliberately knows nothing about DSH sessions or approvals; the bridge
 * supplies those behaviors.
 */
import { randomUUID } from 'node:crypto'
import type { KeyObject } from 'node:crypto'

import type { Logger } from '../host/dsh.ts'
import type { EndReason } from './remote-protocol.ts'
import {
  DEFAULT_LIMITS,
  ProtocolError,
  cancelFrame,
  decodeFrame,
  encodeFrame,
  endFrame,
  errorResponseFrame,
  helloFrame,
  itemFrame,
  pingFrame,
  pongFrame,
  requestFrame,
  responseFrame,
  toWireError,
} from './remote-protocol.ts'
import { makeNonce, signHello } from './remote-device.ts'

/** Socket `readyState` values the transport compares against. */
const READY_STATES = { connecting: 0, open: 1, closing: 2, closed: 3 } as const

/** Swallows log lines when the caller supplies no logger. */
const NOOP_LOGGER: Logger = { info() {}, warn() {}, error() {} }

/** Every connection state the transport reports. */
export type TransportStatus =
  | 'idle'
  | 'connecting'
  | 'reconnecting'
  | 'ready'
  | 'stopped'
  | 'revoked'
  | 'auth-required'

/** One status notification: the state plus the detail that caused it. */
export interface TransportStatusEvent {
  status: TransportStatus
  /** Set when the relay rejected the token: the failure message. */
  error?: string
  /** Set when the connection was lost: why. */
  reason?: string
  /** Relay clock from `hello.ok`. */
  serverTime?: number
  [key: string]: unknown
}

/** The detail `#setStatus` merges into a notification. */
export type TransportStatusDetail = Omit<TransportStatusEvent, 'status'>

/** The device identity a `hello` frame is signed with. */
export interface TransportIdentity {
  deviceId: string
  privateKey: KeyObject
}

/** One relay-opened stream handed to `onStream`. */
export interface IncomingStream {
  id: string
  readonly closed: boolean
  push(item: unknown, seq?: number): boolean
  end(reason?: string): void
  onCancel(listener: (reason?: string) => void): () => void
}

/** The socket events the transport reads; a DOM `WebSocket` satisfies this. */
export interface WebSocketLike {
  readyState: number
  send(data: string): void
  close(): void
  addEventListener(type: 'open', listener: () => void): void
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void
  addEventListener(type: 'close', listener: (event: { code?: number }) => void): void
  addEventListener(type: 'error', listener: (event: SocketErrorEvent) => void): void
}

/** The error-event fields the transport logs; a DOM `ErrorEvent` satisfies it. */
export interface SocketErrorEvent {
  message?: unknown
  error?: { message?: unknown }
  [key: string]: unknown
}

/** The WebSocket constructor the transport instantiates. */
export type WebSocketConstructor = new (url: string, protocols?: string | string[]) => WebSocketLike

/** Per-request deadline and cancellation. */
export interface TransportRequestOptions {
  timeoutMs?: number
  signal?: AbortSignal
}

/** Everything `new RemoteTransport(...)` accepts. */
export interface RemoteTransportOptions {
  /** WebSocket URL. */
  url: string
  /** Device identity every `hello` is signed with. */
  identity: TransportIdentity
  /** Access token acquisition; `null` or an empty string reports `auth-required`. */
  getAccessToken?: () => Promise<string | null> | string | null
  /** Socket implementation; defaults to the global `WebSocket`. */
  WebSocket?: WebSocketConstructor
  /** Serves a relay `req`; its answer becomes the `res`. */
  onRequest?: (op: string, args: Record<string, unknown>) => unknown | Promise<unknown>
  /** Serves a relay `open`; the handler pushes items through `stream`. */
  onStream?: (op: string, args: Record<string, unknown>, stream: IncomingStream) => unknown
  /** Observes every connection state change. */
  onStatus?: (state: TransportStatusEvent) => void
  /** Called when the relay rejects the access token. */
  onAuthRequired?: (error: unknown) => void
  /** Logger; defaults to a no-op. */
  logger?: Logger
  /** Clock, for tests. */
  now?: () => number
  /** Jitter source for the reconnect backoff, for tests. */
  random?: () => number
  setTimeout?: typeof setTimeout
  clearTimeout?: typeof clearTimeout
  setInterval?: typeof setInterval
  clearInterval?: typeof clearInterval
  maxFrameBytes?: number
  maxStreams?: number
  maxInflight?: number
  heartbeatMs?: number
  /** How long a `hello` may stay unanswered before the socket is dropped. */
  helloTimeoutMs?: number
  requestTimeoutMs?: number
  /** Reconnect backoff bounds. */
  reconnect?: { minMs?: number; maxMs?: number }
}

/** A frame the send path forwards; whatever the codec accepts. */
type OutgoingFrame = Parameters<typeof encodeFrame>[0]

/** One decoded wire frame, narrowed to the fields the transport reads. */
type WireFrame =
  | { t: 'hello.ok'; serverTime?: number; limits?: WireLimits }
  | { t: 'ping'; nonce?: string }
  | { t: 'pong'; nonce?: string }
  | { t: 'res'; id: string; ok: boolean; value?: unknown; error?: WireError }
  | { t: 'req'; id: string; op: string; args?: Record<string, unknown> }
  | { t: 'open'; id: string; op: string; args?: Record<string, unknown> }
  | { t: 'item'; id: string; item?: unknown; seq?: number }
  | { t: 'end'; id: string; reason?: string }
  | { t: 'cancel'; id: string }
  | { t: 'error'; code: string; message: string }

/** Limits a relay may advertise in `hello.ok`. */
interface WireLimits {
  maxFrameBytes?: number
  maxStreams?: number
  maxInflight?: number
}

/** The failure a `res` frame carries. */
interface WireError {
  code?: string
  message?: string
  retryable?: boolean
}

/** One unary request waiting for its `res`. */
interface PendingRequest {
  op: string
  resolve(value: unknown): void
  reject(error: unknown): void
}

/** One stream this device opened, plus its cancel listeners. */
interface StreamRecord {
  id: string
  closed: boolean
  cancelHandlers: Set<(reason?: string) => void>
}

export class RemoteTransport {
  url: string
  identity: TransportIdentity
  getAccessToken: () => Promise<string | null> | string | null
  WebSocketImpl: WebSocketConstructor
  onRequest: RemoteTransportOptions['onRequest']
  onStream: RemoteTransportOptions['onStream']
  onStatus: RemoteTransportOptions['onStatus']
  onAuthRequired: RemoteTransportOptions['onAuthRequired']
  logger: Logger
  now: () => number
  random: () => number
  setTimeoutImpl: typeof setTimeout
  clearTimeoutImpl: typeof clearTimeout
  setIntervalImpl: typeof setInterval
  clearIntervalImpl: typeof clearInterval
  maxFrameBytes: number
  maxStreams: number
  maxInflight: number
  heartbeatMs: number
  helloTimeoutMs: number
  requestTimeoutMs: number
  reconnect: { minMs: number; maxMs: number }

  #status: TransportStatus
  #started: boolean
  #stopped: boolean
  #attempt: number
  #generation: number
  #inflight: number
  #lastSeen: number
  #socket: WebSocketLike | undefined
  #pending: Map<string, PendingRequest>
  #streams: Map<string, StreamRecord>
  #helloTimer: ReturnType<typeof setTimeout> | undefined
  #heartbeatTimer: ReturnType<typeof setInterval> | undefined
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined
  #counter = 0

  /**
   * @param options transport configuration; `url` is required.
   */
  constructor(options: RemoteTransportOptions) {
    if (typeof options?.url !== 'string' || options.url.length === 0) {
      throw new TypeError('RemoteTransport requires a url')
    }
    this.url = options.url
    this.identity = options.identity
    this.getAccessToken = options.getAccessToken ?? (() => null)
    this.WebSocketImpl = options.WebSocket ?? globalThis.WebSocket
    this.onRequest = options.onRequest
    this.onStream = options.onStream
    this.onStatus = options.onStatus
    this.onAuthRequired = options.onAuthRequired
    this.logger = options.logger ?? NOOP_LOGGER
    this.now = options.now ?? Date.now
    this.random = options.random ?? Math.random
    this.setTimeoutImpl = options.setTimeout ?? setTimeout
    this.clearTimeoutImpl = options.clearTimeout ?? clearTimeout
    this.setIntervalImpl = options.setInterval ?? setInterval
    this.clearIntervalImpl = options.clearInterval ?? clearInterval
    this.maxFrameBytes = options.maxFrameBytes ?? DEFAULT_LIMITS.maxFrameBytes
    this.maxStreams = options.maxStreams ?? DEFAULT_LIMITS.maxStreams
    this.maxInflight = options.maxInflight ?? DEFAULT_LIMITS.maxInflight
    this.heartbeatMs = options.heartbeatMs ?? DEFAULT_LIMITS.heartbeatMs
    this.helloTimeoutMs = options.helloTimeoutMs ?? 10000
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_LIMITS.requestTimeoutMs
    this.reconnect = {
      minMs: 1000,
      maxMs: 30000,
      ...(options.reconnect ?? {}),
    }

    this.#status = 'idle'
    this.#started = false
    this.#stopped = false
    this.#attempt = 0
    this.#generation = 0
    this.#inflight = 0
    this.#lastSeen = 0
    this.#pending = new Map()
    this.#streams = new Map()
  }

  get status(): TransportStatus {
    return this.#status
  }

  get ready(): boolean {
    return this.#status === 'ready'
  }

  /** Open the socket; reconnects automatically until `stop()`. */
  start(): void {
    if (this.#started) return
    this.#started = true
    this.#stopped = false
    this.#attempt = 0
    void this.#connect()
  }

  /** Stop reconnecting and close the socket. */
  stop(reason = 'stopped'): void {
    this.#stopped = true
    this.#generation += 1
    this.#clearTimers()
    this.#rejectPending('transport/closed', 'transport stopped')
    this.#closeStreams(reason)
    const socket = this.#socket
    this.#socket = undefined
    if (socket !== undefined) this.#closeSocket(socket)
    this.#setStatus('stopped', { reason })
  }

  /**
   * Send one unary request and await its response.
   * @param op operation name, `<namespace>.<verb>`
   * @param args arguments forwarded verbatim
   * @param options deadline override and cancellation
   */
  request(
    op: string,
    args: Record<string, unknown> = {},
    options: TransportRequestOptions = {},
  ): Promise<unknown> {
    if (this.#status !== 'ready') {
      return Promise.reject(new ProtocolError('transport/not-ready', 'the relay connection is not ready'))
    }
    if (this.#pending.size >= this.maxInflight) {
      return Promise.reject(new ProtocolError('rate/limited', 'too many requests are waiting for a response'))
    }

    const id = `d_${randomUUID()}`
    const timeoutMs = options.timeoutMs ?? this.requestTimeoutMs
    const signal = options.signal

    return new Promise<unknown>((resolve, reject) => {
      const settle = (action: () => void): void => {
        if (!this.#pending.has(id)) return
        this.#pending.delete(id)
        if (timer !== undefined) this.clearTimeoutImpl(timer)
        signal?.removeEventListener('abort', onAbort)
        action()
      }
      const timer = this.setTimeoutImpl(() => {
        settle(() => reject(new ProtocolError('transport/timeout', `no response to ${op} within ${timeoutMs} ms`)))
      }, timeoutMs)
      timer?.unref?.()

      const onAbort = (): void => {
        settle(() => reject(new ProtocolError('transport/cancelled', 'request was cancelled')))
      }
      signal?.addEventListener('abort', onAbort, { once: true })

      this.#pending.set(id, {
        op,
        resolve: (value) => settle(() => resolve(value)),
        reject: (error) => settle(() => reject(error)),
      })

      try {
        this.#send(requestFrame(id, op, args))
      } catch (error) {
        settle(() => reject(error))
      }
    })
  }

  /** Resolves once a `hello.ok` arrived. */
  async #connect(): Promise<void> {
    if (this.#stopped) return
    const generation = ++this.#generation
    this.#setStatus(this.#attempt === 0 ? 'connecting' : 'reconnecting')

    let token: string | null
    try {
      token = await this.getAccessToken()
    } catch (error) {
      this.#authFailure(error, generation)
      return
    }
    if (this.#stopped || generation !== this.#generation) return
    if (typeof token !== 'string' || token.length === 0) {
      this.#authFailure(new ProtocolError('auth/invalid-token', 'no access token is available'), generation)
      return
    }

    const protocols = ['dsh-remote.v1', `bearer.${token}`]
    if (typeof this.identity?.deviceId === 'string') protocols.push(`device.${this.identity.deviceId}`)

    let socket: WebSocketLike
    try {
      socket = new this.WebSocketImpl(this.url, protocols)
    } catch (error) {
      this.logger.warn('web-remote: cannot construct WebSocket: %s', error instanceof Error ? error.message : error)
      this.#retry(generation)
      return
    }
    if (this.#stopped || generation !== this.#generation) {
      this.#closeSocket(socket)
      return
    }

    this.#socket = socket
    this.#lastSeen = this.now()
    socket.addEventListener('open', () => {
      if (generation !== this.#generation || this.#stopped) return
      this.#sendHello()
    })
    socket.addEventListener('message', (event) => {
      if (generation !== this.#generation || this.#stopped) return
      this.#receive(event?.data)
    })
    socket.addEventListener('close', (event) => {
      if (generation !== this.#generation || this.#stopped) return
      this.logger.info('web-remote: socket closed (%s)', event?.code ?? 'no-code')
      this.#lost('socket closed')
    })
    socket.addEventListener('error', (event) => {
      if (generation !== this.#generation || this.#stopped) return
      this.logger.warn('web-remote: socket error: %s', event?.message ?? event?.error?.message ?? 'unknown')
      // A close event follows on every conforming implementation.
    })
  }

  #sendHello(): void {
    try {
      const hello = helloFrame(signHello(this.identity, { ts: this.now() }))
      this.#rawSend(hello)
    } catch (error) {
      this.logger.warn('web-remote: cannot send hello: %s', error instanceof Error ? error.message : error)
      this.#lost('hello send failed')
      return
    }
    this.#helloTimer = this.setTimeoutImpl(() => {
      if (this.#status !== 'ready') this.#lost('hello timed out')
    }, this.helloTimeoutMs)
    this.#helloTimer?.unref?.()
  }

  #receive(data: unknown): void {
    let frame: WireFrame
    try {
      frame = decodeFrame(normalizeIncoming(data), { maxFrameBytes: this.maxFrameBytes }) as unknown as WireFrame
    } catch (error) {
      this.logger.warn('web-remote: dropped a frame: %s', error instanceof Error ? error.message : error)
      if (error?.code === 'stream/overflow') this.#lost('frame overflow')
      return
    }

    this.#lastSeen = this.now()

    switch (frame.t) {
      case 'hello.ok':
        this.#onHelloOk(frame)
        return
      case 'ping':
        this.#safeSend(pongFrame(frame.nonce))
        return
      case 'pong':
        return
      case 'res':
        this.#onResponse(frame)
        return
      case 'req':
        this.#onIncomingRequest(frame)
        return
      case 'open':
        this.#onIncomingStream(frame)
        return
      case 'item':
        this.#onStreamItem(frame)
        return
      case 'end':
        this.#onStreamEnd(frame, frame.reason ?? 'complete')
        return
      case 'cancel':
        this.#onStreamEnd(frame, 'cancelled')
        return
      case 'error':
        this.logger.warn('web-remote: relay error %s: %s', frame.code, frame.message)
        if (frame.code === 'auth/invalid-token' || frame.code === 'device/revoked') {
          this.#lost(frame.code)
        }
        return
      /* v8 ignore next -- closed frame union. */
      default:
        return
    }
  }

  #onHelloOk(frame: Extract<WireFrame, { t: 'hello.ok' }>): void {
    if (this.#helloTimer !== undefined) {
      this.clearTimeoutImpl(this.#helloTimer)
      this.#helloTimer = undefined
    }
    const maxFrameBytes = frame.limits?.maxFrameBytes
    const maxStreams = frame.limits?.maxStreams
    const maxInflight = frame.limits?.maxInflight
    if (typeof maxFrameBytes === 'number') {
      this.maxFrameBytes = Math.min(this.maxFrameBytes, maxFrameBytes)
    }
    if (typeof maxStreams === 'number') {
      this.maxStreams = Math.min(this.maxStreams, maxStreams)
    }
    if (typeof maxInflight === 'number') {
      this.maxInflight = Math.min(this.maxInflight, maxInflight)
    }
    this.#attempt = 0
    this.#setStatus('ready', { serverTime: frame.serverTime })
    this.#startHeartbeat()
  }

  #onResponse(frame: Extract<WireFrame, { t: 'res' }>): void {
    const pending = this.#pending.get(frame.id)
    if (pending === undefined) return
    if (frame.ok === true) {
      pending.resolve(frame.value)
      return
    }
    const error = frame.error
    pending.reject(new ProtocolError(
      typeof error?.code === 'string' ? error.code : 'internal',
      typeof error?.message === 'string' ? error.message : 'remote request failed',
      { retryable: error?.retryable },
    ))
  }

  #onIncomingRequest(frame: Extract<WireFrame, { t: 'req' }>): void {
    if (this.#inflight >= this.maxInflight) {
      this.#safeSend(errorResponseFrame(frame.id, 'rate/limited', 'too many requests are in flight'))
      return
    }
    const onRequest = this.onRequest
    if (typeof onRequest !== 'function') {
      this.#safeSend(errorResponseFrame(frame.id, 'unsupported', `${frame.op} is not supported`))
      return
    }

    this.#inflight += 1
    Promise.resolve()
      .then(() => onRequest(frame.op, frame.args ?? {}))
      .then((value) => this.#safeSend(responseFrame(frame.id, value)))
      .catch((error) => this.#safeSend(errorResponseFrame(frame.id, ...wireErrorTuple(error))))
      .finally(() => {
        this.#inflight -= 1
      })
  }

  #onIncomingStream(frame: Extract<WireFrame, { t: 'open' }>): void {
    if (this.#streams.size >= this.maxStreams) {
      this.#safeSend(endFrame(frame.id, 'overflow'))
      return
    }
    const onStream = this.onStream
    if (typeof onStream !== 'function') {
      this.#safeSend(endFrame(frame.id, 'error'))
      return
    }

    const record: StreamRecord = {
      id: frame.id,
      closed: false,
      cancelHandlers: new Set(),
    }
    this.#streams.set(frame.id, record)

    const stream: IncomingStream = {
      id: frame.id,
      get closed() {
        return record.closed
      },
      push: (item, seq) => {
        if (record.closed) return false
        try {
          this.#send(itemFrame(frame.id, item, seq))
          return true
        } catch (error) {
          this.logger.warn('web-remote: cannot push stream item: %s', error instanceof Error ? error.message : error)
          return false
        }
      },
      end: (reason = 'complete') => {
        this.#finishStream(frame.id, reason, true)
      },
      onCancel: (listener) => {
        record.cancelHandlers.add(listener)
        return () => record.cancelHandlers.delete(listener)
      },
    }

    try {
      Promise.resolve(onStream(frame.op, frame.args ?? {}, stream)).catch((error) => {
        this.logger.warn('web-remote: stream handler failed: %s', error instanceof Error ? error.message : error)
        stream.end('error')
      })
    } catch (error) {
      this.logger.warn('web-remote: stream handler threw: %s', error instanceof Error ? error.message : error)
      stream.end('error')
    }
  }

  #onStreamItem(frame: Extract<WireFrame, { t: 'item' }>): void {
    const record = this.#streams.get(frame.id)
    if (record === undefined || record.closed) return
    // Device-opened streams do not exist in v1; an item for an unknown stream
    // is a relay bug, not something worth tearing the connection down for.
    this.logger.warn('web-remote: unexpected item for stream %s', frame.id)
  }

  #onStreamEnd(frame: { id: string }, reason: string): void {
    const record = this.#streams.get(frame.id)
    if (record === undefined) return
    record.closed = true
    this.#streams.delete(frame.id)
    for (const listener of [...record.cancelHandlers]) {
      try {
        listener(reason)
      } catch (error) {
        this.logger.warn('web-remote: stream cancel listener failed: %s', error instanceof Error ? error.message : error)
      }
    }
  }

  #finishStream(id: string, reason: string, sendEnd: boolean): void {
    const record = this.#streams.get(id)
    if (record === undefined) return
    record.closed = true
    this.#streams.delete(id)
    // The codec rejects a reason outside `END_REASONS`; `#safeSend` then drops
    // the frame, which is what an unknown reason has always done here.
    if (sendEnd) this.#safeSend(endFrame(id, reason as EndReason))
  }

  #startHeartbeat(): void {
    this.#clearHeartbeat()
    this.#heartbeatTimer = this.setIntervalImpl(() => {
      if (this.#status !== 'ready') return
      if (this.now() - this.#lastSeen > this.heartbeatMs * 2.5) {
        this.#lost('heartbeat timeout')
        return
      }
      this.#safeSend(pingFrame(makeNonce()))
    }, this.heartbeatMs)
    this.#heartbeatTimer?.unref?.()
  }

  #lost(reason: string): void {
    if (this.#stopped) return
    const generation = ++this.#generation
    this.#clearTimers()
    const socket = this.#socket
    this.#socket = undefined
    if (socket !== undefined) this.#closeSocket(socket)
    this.#rejectPending('transport/closed', `connection lost: ${reason}`)
    this.#closeStreams('cancelled')

    if (reason === 'device/revoked') {
      this.#setStatus('revoked', { reason })
      return
    }
    if (reason === 'auth/invalid-token') {
      this.#setStatus('auth-required', { reason })
      this.onAuthRequired?.(new ProtocolError('auth/invalid-token', 'the relay rejected the access token'))
      return
    }

    this.#setStatus('reconnecting', { reason })
    this.#retry(generation)
  }

  #retry(generation: number): void {
    if (this.#stopped || generation !== this.#generation) return
    const delay = this.#nextDelay()
    this.#reconnectTimer = this.setTimeoutImpl(() => {
      this.#reconnectTimer = undefined
      void this.#connect()
    }, delay)
    this.#reconnectTimer?.unref?.()
    this.logger.info('web-remote: reconnecting in %d ms', delay)
  }

  #nextDelay(): number {
    const { minMs, maxMs } = this.reconnect
    const ceiling = Math.min(maxMs, minMs * 2 ** this.#attempt)
    this.#attempt += 1
    return Math.max(minMs, Math.floor(this.random() * ceiling))
  }

  #authFailure(error: unknown, generation: number): void {
    if (generation !== this.#generation || this.#stopped) return
    const code = error instanceof ProtocolError ? error.code : 'auth/invalid-token'
    this.#setStatus(code === 'device/revoked' ? 'revoked' : 'auth-required', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.onAuthRequired?.(error)
  }

  #rejectPending(code: string, message: string): void {
    // `pending.reject` unwraps through `settle`, which removes the entry; do not
    // delete it here or `settle` would skip the rejection.
    for (const pending of [...this.#pending.values()]) {
      pending.reject(new ProtocolError(code, message))
    }
  }

  #closeStreams(reason: string): void {
    for (const [id, record] of [...this.#streams]) {
      record.closed = true
      this.#streams.delete(id)
      for (const listener of [...record.cancelHandlers]) {
        try {
          listener(reason)
        } catch {
          // Cleanup listeners are best-effort during teardown.
        }
      }
    }
  }

  #clearTimers(): void {
    if (this.#helloTimer !== undefined) {
      this.clearTimeoutImpl(this.#helloTimer)
      this.#helloTimer = undefined
    }
    if (this.#reconnectTimer !== undefined) {
      this.clearTimeoutImpl(this.#reconnectTimer)
      this.#reconnectTimer = undefined
    }
    this.#clearHeartbeat()
  }

  #clearHeartbeat(): void {
    if (this.#heartbeatTimer !== undefined) {
      this.clearIntervalImpl(this.#heartbeatTimer)
      this.#heartbeatTimer = undefined
    }
  }

  #send(frame: OutgoingFrame): void {
    if (this.#status !== 'ready') throw new ProtocolError('transport/not-ready', 'the relay connection is not ready')
    this.#rawSend(frame)
  }

  #safeSend(frame: OutgoingFrame): void {
    try {
      this.#send(frame)
    } catch {
      // A frame racing connection loss is dropped; the stream ends with the socket.
    }
  }

  #rawSend(frame: OutgoingFrame): void {
    const socket = this.#socket
    if (socket === undefined) throw new ProtocolError('transport/closed', 'the socket is closed')
    if (typeof socket.readyState === 'number' && socket.readyState !== READY_STATES.open) {
      throw new ProtocolError('transport/closed', 'the socket is not open')
    }
    socket.send(encodeFrame(frame, { maxFrameBytes: this.maxFrameBytes }))
  }

  #closeSocket(socket: WebSocketLike): void {
    try {
      if (typeof socket.readyState === 'number' && socket.readyState >= READY_STATES.closing) return
      socket.close()
    } catch {
      // Already closed.
    }
  }

  #setStatus(status: TransportStatus, detail: TransportStatusDetail = {}): void {
    if (this.#status === status && Object.keys(detail).length === 0) return
    this.#status = status
    try {
      this.onStatus?.({ status, ...detail })
    } catch (error) {
      this.logger.warn('web-remote: status listener failed: %s', error instanceof Error ? error.message : error)
    }
  }
}

function normalizeIncoming(data: unknown): string {
  if (typeof data === 'string') return data
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8')
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8')
  return String(data)
}

function wireErrorTuple(error: unknown) {
  const wire = toWireError(error)
  return [wire.code, wire.message, { retryable: wire.retryable }] as const
}

