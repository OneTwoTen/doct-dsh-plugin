/**
 * Web Remote protocol v1: frame builders, strict validation, and the error
 * catalogue shared by the DSH bridge and any relay implementation.
 *
 * The wire contract is documented in `protocol/README.md`. This module is the
 * runtime half: it never imports a DSH package so a relay can reuse the same
 * file, and it tolerates unknown extra fields so a newer peer does not crash an
 * older one.
 */

export const PROTOCOL_VERSION = 1

/** v1 limits; a relay may advertise lower values in `hello.ok`. */
export const DEFAULT_LIMITS = Object.freeze({
  maxFrameBytes: 262144,
  maxStreams: 8,
  maxInflight: 32,
  heartbeatMs: 25000,
  requestTimeoutMs: 60000,
  approvalTimeoutMs: 300000,
  questionTimeoutMs: 300000,
})

export const APPROVAL_OUTCOMES = Object.freeze(['allowed-once', 'rejected', 'cancelled', 'unavailable'])

export const END_REASONS = Object.freeze(['complete', 'cancelled', 'overflow', 'error', 'revoked', 'shutdown'])

/** Every frame type the v1 codec accepts. */
export const FRAME_TYPES = Object.freeze([
  'hello',
  'hello.ok',
  'req',
  'res',
  'open',
  'item',
  'end',
  'cancel',
  'ping',
  'pong',
  'error',
])

/** Unary operations a web client may ask the device to perform. */
export const CLIENT_OPS = Object.freeze([
  'session.list',
  'session.state',
  'session.create',
  'session.rename',
  'session.prompt',
  'session.cancel',
  'session.events',
  'session.modelCatalog',
  'session.selectModel',
])

/** Streaming operations a web client may open. */
export const STREAM_OPS = Object.freeze(['session.follow', 'session.control'])

/** Operations the device initiates towards the web client. */
export const DEVICE_OPS = Object.freeze(['approval.ask', 'question.ask', 'relay.ping'])

/**
 * Stable error codes and their default retryability. `retryable` in a response
 * wins over this table so a relay can tighten or relax one answer.
 */
export const ERROR_CATALOG = Object.freeze({
  'bad-frame': false,
  'bad-request': false,
  unsupported: false,
  internal: true,
  'auth/invalid-token': false,
  'auth/expired': true,
  'auth/replay': false,
  'device/pending': true,
  'device/revoked': false,
  'session/not-found': false,
  'stream/limit': false,
  'stream/overflow': false,
  'approval/expired': false,
  'rate/limited': true,
  'transport/not-ready': true,
  'transport/timeout': true,
  'transport/closed': true,
  'transport/cancelled': false,
  relay: false,
})

export class ProtocolError extends Error {
  /**
   * @param {string} code one of `ERROR_CATALOG`
   * @param {string} message human-readable, already safe to log
   * @param {{ retryable?: boolean, cause?: unknown }} [options]
   */
  constructor(code, message, options = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'ProtocolError'
    this.code = code
    this.retryable = options.retryable ?? ERROR_CATALOG[code] ?? false
  }
}

/** @param {unknown} value */
export function isProtocolError(value) {
  return value instanceof ProtocolError
}

/** Normalize any thrown value into the wire error shape. */
export function toWireError(error) {
  if (error instanceof ProtocolError) {
    return { code: error.code, message: error.message, retryable: error.retryable }
  }
  return {
    code: 'internal',
    message: error instanceof Error ? error.message : String(error),
    retryable: true,
  }
}

const OPS_PATTERN = /^[a-z][a-z0-9]*\.[a-zA-Z][a-zA-Z0-9]*$/

function badFrame(message) {
  return new ProtocolError('bad-frame', message)
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireObject(frame, field, { optional = false } = {}) {
  const value = frame[field]
  if (value === undefined && optional) return
  if (!isObject(value)) throw badFrame(`"${field}" must be an object`)
}

function requireString(frame, field, { min = 1, max = 4096, optional = false } = {}) {
  const value = frame[field]
  if (value === undefined && optional) return
  if (typeof value !== 'string') throw badFrame(`"${field}" must be a string`)
  if (value.length < min || value.length > max) throw badFrame(`"${field}" has an invalid length`)
}

function requireInteger(frame, field, { min = 0, optional = false } = {}) {
  const value = frame[field]
  if (value === undefined && optional) return
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    throw badFrame(`"${field}" must be a number >= ${min}`)
  }
}

function requireBoolean(frame, field) {
  if (typeof frame[field] !== 'boolean') throw badFrame(`"${field}" must be a boolean`)
}

function requireId(frame) {
  requireString(frame, 'id', { min: 1, max: 128 })
}

function requireOp(frame) {
  requireString(frame, 'op', { min: 3, max: 64 })
  if (!OPS_PATTERN.test(frame.op)) throw badFrame('"op" must look like "<namespace>.<verb>"')
}

/**
 * Validate one decoded frame without mutating it.
 * @param {unknown} frame
 * @returns {Record<string, any>}
 */
export function validateFrame(frame) {
  if (!isObject(frame)) throw badFrame('a frame must be a JSON object')
  if (typeof frame.t !== 'string' || !FRAME_TYPES.includes(frame.t)) {
    throw badFrame('unknown frame type')
  }

  switch (frame.t) {
    case 'hello': {
      if (frame.v !== PROTOCOL_VERSION) throw badFrame('unsupported protocol version')
      requireString(frame, 'deviceId', { min: 1, max: 128 })
      requireInteger(frame, 'ts')
      requireString(frame, 'nonce', { min: 8, max: 128 })
      requireString(frame, 'sig', { min: 40, max: 256 })
      return frame
    }
    case 'hello.ok': {
      if (frame.v !== PROTOCOL_VERSION) throw badFrame('unsupported protocol version')
      requireInteger(frame, 'serverTime')
      requireObject(frame, 'limits', { optional: true })
      return frame
    }
    case 'req':
    case 'open': {
      requireId(frame)
      requireOp(frame)
      requireObject(frame, 'args', { optional: true })
      return frame
    }
    case 'res': {
      requireId(frame)
      requireBoolean(frame, 'ok')
      if (frame.ok === true) {
        if (!Object.prototype.hasOwnProperty.call(frame, 'value')) {
          throw badFrame('a successful response must carry "value"')
        }
        return frame
      }
      if (!isObject(frame.error)) throw badFrame('a failed response must carry "error"')
      requireString(frame.error, 'code', { min: 1, max: 64 })
      requireString(frame.error, 'message', { min: 0, max: 8192 })
      if (frame.error.retryable !== undefined && typeof frame.error.retryable !== 'boolean') {
        throw badFrame('"error.retryable" must be a boolean')
      }
      return frame
    }
    case 'item': {
      requireId(frame)
      if (!Object.prototype.hasOwnProperty.call(frame, 'item')) throw badFrame('"item" is required')
      requireInteger(frame, 'seq', { optional: true })
      return frame
    }
    case 'end': {
      requireId(frame)
      if (frame.reason !== undefined && !END_REASONS.includes(frame.reason)) {
        throw badFrame('"reason" is not a known end reason')
      }
      return frame
    }
    case 'cancel': {
      requireId(frame)
      return frame
    }
    case 'ping':
    case 'pong': {
      requireString(frame, 'nonce', { min: 0, max: 128, optional: true })
      return frame
    }
    case 'error': {
      requireString(frame, 'code', { min: 1, max: 64 })
      requireString(frame, 'message', { min: 0, max: 8192 })
      if (frame.retryable !== undefined && typeof frame.retryable !== 'boolean') {
        throw badFrame('"retryable" must be a boolean')
      }
      return frame
    }
    /* v8 ignore next -- FRAME_TYPES is closed and checked above. */
    default:
      throw badFrame('unknown frame type')
  }
}

/**
 * Parse one wire frame.
 * @param {string} text
 * @param {{ maxFrameBytes?: number }} [options]
 */
export function decodeFrame(text, options = {}) {
  if (typeof text !== 'string') throw badFrame('a wire frame must be text')
  const maxFrameBytes = options.maxFrameBytes ?? DEFAULT_LIMITS.maxFrameBytes
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > maxFrameBytes) {
    throw new ProtocolError('stream/overflow', `frame is ${bytes} bytes, limit is ${maxFrameBytes}`)
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new ProtocolError('bad-frame', 'frame is not valid JSON', { cause: error })
  }
  return validateFrame(parsed)
}

/**
 * Validate then serialize one frame, enforcing the byte budget.
 * @param {unknown} frame
 * @param {{ maxFrameBytes?: number }} [options]
 */
export function encodeFrame(frame, options = {}) {
  validateFrame(frame)
  const text = JSON.stringify(frame)
  const maxFrameBytes = options.maxFrameBytes ?? DEFAULT_LIMITS.maxFrameBytes
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > maxFrameBytes) {
    throw new ProtocolError('stream/overflow', `frame is ${bytes} bytes, limit is ${maxFrameBytes}`)
  }
  return text
}

export function helloFrame({ deviceId, ts, nonce, sig }) {
  return { t: 'hello', v: PROTOCOL_VERSION, deviceId, ts, nonce, sig }
}

export function helloOkFrame({ serverTime, limits } = {}) {
  return {
    t: 'hello.ok',
    v: PROTOCOL_VERSION,
    serverTime: serverTime ?? Date.now(),
    ...(limits === undefined ? {} : { limits }),
  }
}

export function requestFrame(id, op, args = {}) {
  return { t: 'req', id, op, args }
}

export function responseFrame(id, value) {
  return { t: 'res', id, ok: true, value: value ?? null }
}

export function errorResponseFrame(id, code, message, options = {}) {
  return {
    t: 'res',
    id,
    ok: false,
    error: {
      code,
      message,
      ...(options.retryable === undefined ? {} : { retryable: options.retryable }),
    },
  }
}

export function openFrame(id, op, args = {}) {
  return { t: 'open', id, op, args }
}

export function itemFrame(id, item, seq) {
  return { t: 'item', id, item, ...(seq === undefined ? {} : { seq }) }
}

export function endFrame(id, reason = 'complete') {
  return { t: 'end', id, reason }
}

export function cancelFrame(id) {
  return { t: 'cancel', id }
}

export function pingFrame(nonce) {
  return { t: 'ping', ...(nonce === undefined ? {} : { nonce }) }
}

export function pongFrame(nonce) {
  return { t: 'pong', ...(nonce === undefined ? {} : { nonce }) }
}

export function errorFrame(code, message, options = {}) {
  return {
    t: 'error',
    code,
    message,
    ...(options.retryable === undefined ? {} : { retryable: options.retryable }),
  }
}

/** Whether an op is served by the built-in bridge. */
export function isKnownOp(op) {
  return CLIENT_OPS.includes(op) || STREAM_OPS.includes(op) || DEVICE_OPS.includes(op)
}
