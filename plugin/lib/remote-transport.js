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
} from './remote-protocol.js'
import { makeNonce, signHello } from './remote-device.js'

const READY_STATES = { connecting: 0, open: 1, closing: 2, closed: 3 }

const NOOP_LOGGER = { info() {}, warn() {}, error() {} }

/**
 * @typedef {object} IncomingStream
 * @property {string} id
 * @property {boolean} closed
 * @property {(item: unknown, seq?: number) => boolean} push
 * @property {(reason?: string) => void} end
 * @property {(listener: () => void) => () => void} onCancel
 */

export class RemoteTransport {
  /**
   * @param {object} options
   * @param {string} options.url WebSocket URL
   * @param {{ deviceId: string, privateKey: import('node:crypto').KeyObject }} options.identity
   * @param {() => Promise<string | null> | string | null} options.getAccessToken
   * @param {typeof WebSocket} [options.WebSocket]
   * @param {(op: string, args: Record<string, unknown>) => unknown | Promise<unknown>} [options.onRequest]
   * @param {(op: string, args: Record<string, unknown>, stream: IncomingStream) => unknown} [options.onStream]
   * @param {(state: { status: string, [key: string]: unknown }) => void} [options.onStatus]
   * @param {(error: unknown) => void} [options.onAuthRequired]
   * @param {object} [options.logger]
   */
  constructor(options) {
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

  #status
  #started
  #stopped
  #attempt
  #generation
  #inflight
  #lastSeen
  #socket
  #pending
  #streams
  #helloTimer
  #heartbeatTimer
  #reconnectTimer
  #counter = 0

  get status() {
    return this.#status
  }

  get ready() {
    return this.#status === 'ready'
  }

  /** Open the socket; reconnects automatically until `stop()`. */
  start() {
    if (this.#started) return
    this.#started = true
    this.#stopped = false
    this.#attempt = 0
    void this.#connect()
  }

  /** Stop reconnecting and close the socket. */
  stop(reason = 'stopped') {
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
   * @param {string} op
   * @param {Record<string, unknown>} [args]
   * @param {{ timeoutMs?: number, signal?: AbortSignal }} [options]
   */
  request(op, args = {}, options = {}) {
    if (this.#status !== 'ready') {
      return Promise.reject(new ProtocolError('transport/not-ready', 'the relay connection is not ready'))
    }
    if (this.#pending.size >= this.maxInflight) {
      return Promise.reject(new ProtocolError('rate/limited', 'too many requests are waiting for a response'))
    }

    const id = `d_${randomUUID()}`
    const timeoutMs = options.timeoutMs ?? this.requestTimeoutMs
    const signal = options.signal

    return new Promise((resolve, reject) => {
      const settle = (action) => {
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

      const onAbort = () => {
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

  /** @returns {Promise<void>} resolves once a `hello.ok` arrived */
  async #connect() {
    if (this.#stopped) return
    const generation = ++this.#generation
    this.#setStatus(this.#attempt === 0 ? 'connecting' : 'reconnecting')

    let token
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

    let socket
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

  #sendHello() {
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

  #receive(data) {
    let frame
    try {
      frame = decodeFrame(normalizeIncoming(data), { maxFrameBytes: this.maxFrameBytes })
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

  #onHelloOk(frame) {
    if (this.#helloTimer !== undefined) {
      this.clearTimeoutImpl(this.#helloTimer)
      this.#helloTimer = undefined
    }
    if (typeof frame.limits?.maxFrameBytes === 'number') {
      this.maxFrameBytes = Math.min(this.maxFrameBytes, frame.limits.maxFrameBytes)
    }
    if (typeof frame.limits?.maxStreams === 'number') {
      this.maxStreams = Math.min(this.maxStreams, frame.limits.maxStreams)
    }
    if (typeof frame.limits?.maxInflight === 'number') {
      this.maxInflight = Math.min(this.maxInflight, frame.limits.maxInflight)
    }
    this.#attempt = 0
    this.#setStatus('ready', { serverTime: frame.serverTime })
    this.#startHeartbeat()
  }

  #onResponse(frame) {
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

  #onIncomingRequest(frame) {
    if (this.#inflight >= this.maxInflight) {
      this.#safeSend(errorResponseFrame(frame.id, 'rate/limited', 'too many requests are in flight'))
      return
    }
    if (typeof this.onRequest !== 'function') {
      this.#safeSend(errorResponseFrame(frame.id, 'unsupported', `${frame.op} is not supported`))
      return
    }

    this.#inflight += 1
    Promise.resolve()
      .then(() => this.onRequest(frame.op, frame.args ?? {}))
      .then((value) => this.#safeSend(responseFrame(frame.id, value)))
      .catch((error) => this.#safeSend(errorResponseFrame(frame.id, ...wireErrorTuple(error))))
      .finally(() => {
        this.#inflight -= 1
      })
  }

  #onIncomingStream(frame) {
    if (this.#streams.size >= this.maxStreams) {
      this.#safeSend(endFrame(frame.id, 'overflow'))
      return
    }
    if (typeof this.onStream !== 'function') {
      this.#safeSend(endFrame(frame.id, 'error'))
      return
    }

    const record = {
      id: frame.id,
      closed: false,
      cancelHandlers: new Set(),
    }
    this.#streams.set(frame.id, record)

    const stream = {
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
      Promise.resolve(this.onStream(frame.op, frame.args ?? {}, stream)).catch((error) => {
        this.logger.warn('web-remote: stream handler failed: %s', error instanceof Error ? error.message : error)
        stream.end('error')
      })
    } catch (error) {
      this.logger.warn('web-remote: stream handler threw: %s', error instanceof Error ? error.message : error)
      stream.end('error')
    }
  }

  #onStreamItem(frame) {
    const record = this.#streams.get(frame.id)
    if (record === undefined || record.closed) return
    // Device-opened streams do not exist in v1; an item for an unknown stream
    // is a relay bug, not something worth tearing the connection down for.
    this.logger.warn('web-remote: unexpected item for stream %s', frame.id)
  }

  #onStreamEnd(frame, reason) {
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

  #finishStream(id, reason, sendEnd) {
    const record = this.#streams.get(id)
    if (record === undefined) return
    record.closed = true
    this.#streams.delete(id)
    if (sendEnd) this.#safeSend(endFrame(id, reason))
  }

  #startHeartbeat() {
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

  #lost(reason) {
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

  #retry(generation) {
    if (this.#stopped || generation !== this.#generation) return
    const delay = this.#nextDelay()
    this.#reconnectTimer = this.setTimeoutImpl(() => {
      this.#reconnectTimer = undefined
      void this.#connect()
    }, delay)
    this.#reconnectTimer?.unref?.()
    this.logger.info('web-remote: reconnecting in %d ms', delay)
  }

  #nextDelay() {
    const { minMs, maxMs } = this.reconnect
    const ceiling = Math.min(maxMs, minMs * 2 ** this.#attempt)
    this.#attempt += 1
    return Math.max(minMs, Math.floor(this.random() * ceiling))
  }

  #authFailure(error, generation) {
    if (generation !== this.#generation || this.#stopped) return
    const code = error instanceof ProtocolError ? error.code : 'auth/invalid-token'
    this.#setStatus(code === 'device/revoked' ? 'revoked' : 'auth-required', {
      error: error instanceof Error ? error.message : String(error),
    })
    this.onAuthRequired?.(error)
  }

  #rejectPending(code, message) {
    // `pending.reject` unwraps through `settle`, which removes the entry; do not
    // delete it here or `settle` would skip the rejection.
    for (const pending of [...this.#pending.values()]) {
      pending.reject(new ProtocolError(code, message))
    }
  }

  #closeStreams(reason) {
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

  #clearTimers() {
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

  #clearHeartbeat() {
    if (this.#heartbeatTimer !== undefined) {
      this.clearIntervalImpl(this.#heartbeatTimer)
      this.#heartbeatTimer = undefined
    }
  }

  #send(frame) {
    if (this.#status !== 'ready') throw new ProtocolError('transport/not-ready', 'the relay connection is not ready')
    this.#rawSend(frame)
  }

  #safeSend(frame) {
    try {
      this.#send(frame)
    } catch {
      // A frame racing connection loss is dropped; the stream ends with the socket.
    }
  }

  #rawSend(frame) {
    const socket = this.#socket
    if (socket === undefined) throw new ProtocolError('transport/closed', 'the socket is closed')
    if (typeof socket.readyState === 'number' && socket.readyState !== READY_STATES.open) {
      throw new ProtocolError('transport/closed', 'the socket is not open')
    }
    socket.send(encodeFrame(frame, { maxFrameBytes: this.maxFrameBytes }))
  }

  #closeSocket(socket) {
    try {
      if (typeof socket.readyState === 'number' && socket.readyState >= READY_STATES.closing) return
      socket.close()
    } catch {
      // Already closed.
    }
  }

  #setStatus(status, detail = {}) {
    if (this.#status === status && Object.keys(detail).length === 0) return
    this.#status = status
    try {
      this.onStatus?.({ status, ...detail })
    } catch (error) {
      this.logger.warn('web-remote: status listener failed: %s', error instanceof Error ? error.message : error)
    }
  }
}

function normalizeIncoming(data) {
  if (typeof data === 'string') return data
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8')
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8')
  return String(data)
}

function wireErrorTuple(error) {
  const wire = toWireError(error)
  return [wire.code, wire.message, { retryable: wire.retryable }]
}
