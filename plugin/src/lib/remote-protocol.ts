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

/** The v1 resource limits a peer advertises in `hello.ok`. */
export interface ProtocolLimits {
  maxFrameBytes: number
  maxStreams: number
  maxInflight: number
  heartbeatMs: number
  requestTimeoutMs: number
  approvalTimeoutMs: number
  questionTimeoutMs: number
}

/** v1 limits; a relay may advertise lower values in `hello.ok`. */
export const DEFAULT_LIMITS: Readonly<ProtocolLimits> = Object.freeze({
  maxFrameBytes: 262144,
  maxStreams: 8,
  maxInflight: 32,
  heartbeatMs: 25000,
  requestTimeoutMs: 60000,
  approvalTimeoutMs: 300000,
  questionTimeoutMs: 300000,
})

/** Every way an approval prompt can end. */
export type ApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'

export const APPROVAL_OUTCOMES: readonly ApprovalOutcome[] = Object.freeze([
  'allowed-once',
  'rejected',
  'cancelled',
  'unavailable',
] as const)

/** Every reason a stream can end with. */
export type EndReason = 'complete' | 'cancelled' | 'overflow' | 'error' | 'revoked' | 'shutdown'

export const END_REASONS: readonly EndReason[] = Object.freeze([
  'complete',
  'cancelled',
  'overflow',
  'error',
  'revoked',
  'shutdown',
] as const)

/** Every frame type the v1 codec accepts. */
export type FrameType =
  | 'hello'
  | 'hello.ok'
  | 'req'
  | 'res'
  | 'open'
  | 'item'
  | 'end'
  | 'cancel'
  | 'ping'
  | 'pong'
  | 'error'

export const FRAME_TYPES: readonly FrameType[] = Object.freeze([
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
] as const)

/** Unary operations a web client may ask the device to perform. */
export const CLIENT_OPS: readonly string[] = Object.freeze([
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
export const STREAM_OPS: readonly string[] = Object.freeze(['session.follow', 'session.control'])

/** Operations the device initiates towards the web client. */
export const DEVICE_OPS: readonly string[] = Object.freeze(['approval.ask', 'question.ask', 'relay.ping'])

/** The wire shape of a failed response or a standalone `error` frame. */
export interface WireError {
  code: string
  message: string
  retryable?: boolean
  /** Forward compatibility: unknown fields are tolerated. */
  [extra: string]: unknown
}

/**
 * One decoded v1 frame. Only `t` is common to every frame type, so the other
 * fields stay optional and each validator branch narrows the ones it needs.
 */
export interface Frame {
  t: FrameType
  v?: number
  deviceId?: string
  ts?: number
  nonce?: string
  sig?: string
  serverTime?: number
  limits?: Partial<ProtocolLimits>
  id?: string
  op?: string
  args?: Record<string, unknown>
  ok?: boolean
  value?: unknown
  error?: WireError
  item?: unknown
  seq?: number
  reason?: EndReason
  code?: string
  message?: string
  retryable?: boolean
  /** Forward compatibility: a newer peer may add fields. */
  [extra: string]: unknown
}

/**
 * Stable error codes and their default retryability. `retryable` in a response
 * wins over this table so a relay can tighten or relax one answer.
 */
export const ERROR_CATALOG: Readonly<Record<string, boolean>> = Object.freeze({
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

/** Extra options one protocol error may carry. */
export interface ProtocolErrorOptions {
  retryable?: boolean
  cause?: unknown
}

export class ProtocolError extends Error {
  code: string
  retryable: boolean

  /**
   * @param code one of `ERROR_CATALOG`
   * @param message human-readable, already safe to log
   */
  constructor(code: string, message: string, options: ProtocolErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'ProtocolError'
    this.code = code
    this.retryable = options.retryable ?? ERROR_CATALOG[code] ?? false
  }
}

/** Whether `value` is a `ProtocolError`. */
export function isProtocolError(value: unknown): value is ProtocolError {
  return value instanceof ProtocolError
}

/** Normalize any thrown value into the wire error shape. */
export function toWireError(error: unknown): WireError {
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

function badFrame(message: string): ProtocolError {
  return new ProtocolError('bad-frame', message)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFrameType(value: unknown): value is FrameType {
  return typeof value === 'string' && FRAME_TYPES.includes(value as FrameType)
}

function requireObject(
  frame: Record<string, unknown>,
  field: string,
  { optional = false }: { optional?: boolean } = {},
): void {
  const value = frame[field]
  if (value === undefined && optional) return
  if (!isObject(value)) throw badFrame(`"${field}" must be an object`)
}

function requireString(
  frame: Record<string, unknown>,
  field: string,
  { min = 1, max = 4096, optional = false }: { min?: number; max?: number; optional?: boolean } = {},
): void {
  const value = frame[field]
  if (value === undefined && optional) return
  if (typeof value !== 'string') throw badFrame(`"${field}" must be a string`)
  if (value.length < min || value.length > max) throw badFrame(`"${field}" has an invalid length`)
}

function requireInteger(
  frame: Record<string, unknown>,
  field: string,
  { min = 0, optional = false }: { min?: number; optional?: boolean } = {},
): void {
  const value = frame[field]
  if (value === undefined && optional) return
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    throw badFrame(`"${field}" must be a number >= ${min}`)
  }
}

function requireBoolean(frame: Record<string, unknown>, field: string): void {
  if (typeof frame[field] !== 'boolean') throw badFrame(`"${field}" must be a boolean`)
}

function requireId(frame: Record<string, unknown>): void {
  requireString(frame, 'id', { min: 1, max: 128 })
}

function requireOp(frame: Record<string, unknown>): void {
  requireString(frame, 'op', { min: 3, max: 64 })
  const op = frame.op
  if (typeof op !== 'string' || !OPS_PATTERN.test(op)) throw badFrame('"op" must look like "<namespace>.<verb>"')
}

/**
 * Validate one decoded frame without mutating it.
 */
export function validateFrame(value: unknown): Frame {
  if (!isObject(value)) throw badFrame('a frame must be a JSON object')
  if (!isFrameType(value.t)) {
    throw badFrame('unknown frame type')
  }

  const frame = value as Frame

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
      const error = frame.error
      if (!isObject(error)) throw badFrame('a failed response must carry "error"')
      requireString(error, 'code', { min: 1, max: 64 })
      requireString(error, 'message', { min: 0, max: 8192 })
      if (error.retryable !== undefined && typeof error.retryable !== 'boolean') {
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

/** Byte budget shared by `decodeFrame` and `encodeFrame`. */
export interface FrameByteOptions {
  maxFrameBytes?: number
}

/**
 * Parse one wire frame.
 */
export function decodeFrame(text: string, options: FrameByteOptions = {}): Frame {
  if (typeof text !== 'string') throw badFrame('a wire frame must be text')
  const maxFrameBytes = options.maxFrameBytes ?? DEFAULT_LIMITS.maxFrameBytes
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > maxFrameBytes) {
    throw new ProtocolError('stream/overflow', `frame is ${bytes} bytes, limit is ${maxFrameBytes}`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new ProtocolError('bad-frame', 'frame is not valid JSON', { cause: error })
  }
  return validateFrame(parsed)
}

/**
 * Validate then serialize one frame, enforcing the byte budget.
 */
export function encodeFrame(frame: unknown, options: FrameByteOptions = {}): string {
  validateFrame(frame)
  // Validation guarantees a JSON object, so stringify always yields text.
  const text = JSON.stringify(frame) as string
  const maxFrameBytes = options.maxFrameBytes ?? DEFAULT_LIMITS.maxFrameBytes
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > maxFrameBytes) {
    throw new ProtocolError('stream/overflow', `frame is ${bytes} bytes, limit is ${maxFrameBytes}`)
  }
  return text
}

/** The fields a `hello` frame is built from. */
export interface HelloFields {
  deviceId: string
  ts: number
  nonce: string
  sig: string
}

export function helloFrame({ deviceId, ts, nonce, sig }: HelloFields): Frame {
  return { t: 'hello', v: PROTOCOL_VERSION, deviceId, ts, nonce, sig }
}

/** The fields a `hello.ok` frame is built from. */
export interface HelloOkFields {
  serverTime?: number
  limits?: Partial<ProtocolLimits>
}

export function helloOkFrame({ serverTime, limits }: HelloOkFields = {}): Frame {
  return {
    t: 'hello.ok',
    v: PROTOCOL_VERSION,
    serverTime: serverTime ?? Date.now(),
    ...(limits === undefined ? {} : { limits }),
  }
}

export function requestFrame(id: string, op: string, args: Record<string, unknown> = {}): Frame {
  return { t: 'req', id, op, args }
}

export function responseFrame(id: string, value: unknown): Frame {
  return { t: 'res', id, ok: true, value: value ?? null }
}

/** Options an error-bearing frame accepts. */
export interface RetryableOptions {
  retryable?: boolean
}

export function errorResponseFrame(id: string, code: string, message: string, options: RetryableOptions = {}): Frame {
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

export function openFrame(id: string, op: string, args: Record<string, unknown> = {}): Frame {
  return { t: 'open', id, op, args }
}

export function itemFrame(id: string, item: unknown, seq?: number): Frame {
  return { t: 'item', id, item, ...(seq === undefined ? {} : { seq }) }
}

export function endFrame(id: string, reason: EndReason = 'complete'): Frame {
  return { t: 'end', id, reason }
}

export function cancelFrame(id: string): Frame {
  return { t: 'cancel', id }
}

export function pingFrame(nonce?: string): Frame {
  return { t: 'ping', ...(nonce === undefined ? {} : { nonce }) }
}

export function pongFrame(nonce?: string): Frame {
  return { t: 'pong', ...(nonce === undefined ? {} : { nonce }) }
}

export function errorFrame(code: string, message: string, options: RetryableOptions = {}): Frame {
  return {
    t: 'error',
    code,
    message,
    ...(options.retryable === undefined ? {} : { retryable: options.retryable }),
  }
}

/** Whether an op is served by the built-in bridge. */
export function isKnownOp(op: string): boolean {
  return CLIENT_OPS.includes(op) || STREAM_OPS.includes(op) || DEVICE_OPS.includes(op)
}
