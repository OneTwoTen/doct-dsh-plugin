/**
 * Bridges DSH Session services to the Web Remote wire protocol.
 *
 * The bridge is transport-agnostic: it receives an object shaped like
 * `RemoteTransport` (a `status` string and a `request(op, args, options)`
 * method) so tests can drive it without a socket. `features/web-remote.ts`
 * owns identity, pairing, and the real transport.
 */
import { randomUUID } from 'node:crypto'

import type { Logger } from '../host/dsh.ts'
import { APPROVAL_OUTCOMES, ProtocolError } from './remote-protocol.ts'

const PROMPT_TEXT_LIMIT = 100_000

/** The wire outcomes an approval answer may carry, as a plain string list. */
const APPROVAL_OUTCOME_LIST: readonly string[] = APPROVAL_OUTCOMES

/** Per-call deadline and cancellation a transport request accepts. */
export interface BridgeRequestOptions {
  timeoutMs?: number
  signal?: AbortSignal
}

/** The transport surface the bridge drives; `RemoteTransport` satisfies it. */
export interface BridgeTransport {
  status: string
  request(op: string, args?: Record<string, unknown>, options?: BridgeRequestOptions): Promise<unknown>
}

/** The `sessionController` service, as the web client uses it. */
export interface WebRemoteSessionController {
  list(request: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
  state(request: { sessionId: string }, signal?: AbortSignal): Promise<unknown>
  create(request: Record<string, unknown>): Promise<unknown>
  rename(request: { sessionId: string; title: string }): Promise<unknown>
  prompt(request: PromptRequest, signal?: AbortSignal): Promise<unknown>
  cancel(request: { sessionId: string }): Promise<unknown>
  events(request: EventsRequest, signal?: AbortSignal): Promise<unknown>
  modelCatalog(): Promise<unknown>
  selectModel(request: SelectModelRequest, signal?: AbortSignal): Promise<unknown>
  follow(request: FollowRequest, signal: AbortSignal): AsyncIterable<FollowFrame>
  control(signal: AbortSignal): AsyncIterable<FollowFrame>
  [key: string]: unknown
}

/** One `session.prompt` request. */
export interface PromptRequest {
  requestId: string
  sessionId: string
  mode: 'steer' | 'queue'
  content: { type: 'text'; text: string }[]
  clientTimeZone: string
}

/** One `session.events` request. */
export interface EventsRequest {
  address: { kind: string; sessionId: string }
  maxMessages?: number
  throughSeq?: number
  beforeSeq?: number
}

/** One `session.selectModel` request. */
export interface SelectModelRequest {
  sessionId: string
  provider: string
  model: string
  reasoningEffort?: string
}

/** One `session.follow` request. */
export interface FollowRequest {
  address: { kind: string; sessionId: string }
  activate: boolean
  assistantStream: boolean
  maxMessages?: number
}

/** One frame of `sessionController.follow` or `control`. */
export interface FollowFrame {
  type?: string
  event?: { seq?: number; [key: string]: unknown }
  [key: string]: unknown
}

/** The stream a bridge handler pushes items into. */
export interface BridgeStream {
  push(item: unknown, seq?: number): boolean
  end(reason?: string): void
  closed: boolean
  onCancel(listener: (reason?: string) => void): () => void
}

/** The approval payload the Harness asks the bridge to answer. */
export interface ApprovalRequestLike {
  agent?: { session?: { id?: string } }
  toolName?: unknown
  callId?: unknown
  reason?: unknown
  displayReason?: unknown
  [key: string]: unknown
}

/** The question payload the Harness asks the bridge to answer. */
export interface QuestionRequestLike {
  agent?: { session?: { id?: string } }
  questions?: unknown
  wait?: { callId?: unknown }
  [key: string]: unknown
}

/** One client-facing question option; only the label and description are kept. */
interface QuestionOptionLike {
  label: string
  description?: unknown
  [key: string]: unknown
}

/** One client-facing question forwarded to the web. */
export interface SanitizedQuestion {
  id: string
  question: string
  header?: string
  detail?: string
  options?: { label: string; description?: string }[]
  multiSelect?: boolean
}

/** One answer batch the web returns, validated against what was sent. */
export interface NormalizedAnswer {
  id: string
  selected: string[]
  custom?: string
}

/** The bridge's own knobs; the feature passes its normalized config through. */
export interface BridgeConfig {
  approvalTimeoutMs?: number
  questionTimeoutMs?: number
  defaultCwd?: string
  [key: string]: unknown
}

/** Everything `new WebRemoteBridge(...)` accepts. */
export interface WebRemoteBridgeOptions {
  /** The DSH `sessionController` service. */
  sessionController: WebRemoteSessionController
  transport: BridgeTransport
  config?: BridgeConfig
  logger?: Logger
  now?: () => number
}

export class WebRemoteBridge {
  sessionController: WebRemoteSessionController
  transport: BridgeTransport
  approvalTimeoutMs: number
  questionTimeoutMs: number
  defaultCwd: string | undefined
  logger: Logger
  now: () => number
  clientTimeZone: string

  /** Cancels every service call that accepts a signal. */
  #lifecycle: AbortController

  /** sessionId -> number of open follow streams */
  #watched: Map<string, number>
  /** AbortControllers for every open stream, so dispose can stop them all. */
  #followers: Set<AbortController>

  /**
   * @param options session controller, transport, and optional config/logger/clock.
   */
  constructor({ sessionController, transport, config = {}, logger = console, now = Date.now }: WebRemoteBridgeOptions) {
    this.sessionController = sessionController
    this.transport = transport
    this.approvalTimeoutMs = config.approvalTimeoutMs ?? 300000
    this.questionTimeoutMs = config.questionTimeoutMs ?? 300000
    this.defaultCwd = config.defaultCwd
    this.logger = logger
    this.now = now
    this.clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    this.#lifecycle = new AbortController()
    this.#watched = new Map()
    this.#followers = new Set()
  }

  /** Session IDs a web client is currently following. */
  get watchedSessions(): string[] {
    return [...this.#watched.keys()]
  }

  /** Stop every open stream. */
  dispose(): void {
    try {
      this.#lifecycle.abort()
    } catch {
      // Ignore.
    }
    for (const controller of [...this.#followers]) {
      try {
        controller.abort()
      } catch {
        // Abort is best-effort during teardown.
      }
    }
    this.#followers.clear()
    this.#watched.clear()
  }

  /**
   * Serve one unary operation requested by the web client.
   * @param op operation name
   * @param args validated arguments read off the wire
   */
  async handleOp(op: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const controller = this.sessionController

    switch (op) {
      case 'relay.ping':
        return { time: this.now() }

      case 'session.list':
        return controller.list({}, this.#lifecycle.signal)

      case 'session.state':
        return controller.state({ sessionId: requireSessionId(args) }, this.#lifecycle.signal)

      case 'session.create': {
        const request: Record<string, unknown> = {}
        if (nonEmptyString(args.cwd)) request.cwd = args.cwd
        if (nonEmptyString(args.workspaceId)) request.workspaceId = args.workspaceId
        if (nonEmptyString(args.agentPreset)) request.agentPreset = args.agentPreset
        if (nonEmptyString(args.sessionId)) request.sessionId = args.sessionId
        if (request.cwd === undefined && request.workspaceId === undefined) {
          request.cwd = this.defaultCwd ?? process.cwd()
        }
        return controller.create(request)
      }

      case 'session.rename':
        return controller.rename({
          sessionId: requireSessionId(args),
          title: requireString(args.title, 'title', 1, 200),
        })

      case 'session.prompt':
        return this.#prompt(args)

      case 'session.cancel':
        return controller.cancel({ sessionId: requireSessionId(args) })

      case 'session.events': {
        const request: EventsRequest = { address: { kind: 'session', sessionId: requireSessionId(args) } }
        if (isInteger(args.maxMessages)) request.maxMessages = args.maxMessages
        if (isInteger(args.throughSeq)) request.throughSeq = args.throughSeq
        if (isInteger(args.beforeSeq)) request.beforeSeq = args.beforeSeq
        return controller.events(request, this.#lifecycle.signal)
      }

      case 'session.modelCatalog':
        return controller.modelCatalog()

      case 'session.selectModel': {
        const request: SelectModelRequest = {
          sessionId: requireSessionId(args),
          provider: requireString(args.provider, 'provider', 1, 200),
          model: requireString(args.model, 'model', 1, 200),
        }
        if (nonEmptyString(args.reasoningEffort)) request.reasoningEffort = args.reasoningEffort
        return controller.selectModel(request, this.#lifecycle.signal)
      }

      default:
        throw new ProtocolError('unsupported', `${op} is not supported by this bridge`)
    }
  }

  /**
   * Serve one stream the web client opened.
   * @param op stream operation name
   * @param args validated arguments read off the wire
   * @param stream the stream the handler pushes into
   */
  handleStream(op: string, args: Record<string, unknown> = {}, stream: BridgeStream): void {
    if (op === 'session.follow') {
      this.#follow(args, stream)
      return
    }
    if (op === 'session.control') {
      this.#control(stream)
      return
    }
    stream.end('error')
  }

  /**
   * Answerer for `approval/request`: forward to the web only while a client is
   * following the asking Session; otherwise delegate to the desktop answerer.
   * A timeout or a malformed answer also delegates, so the local UI still gets
   * its chance and the request never fails open.
   */
  async handleApproval(payload: unknown, next: unknown): Promise<unknown> {
    const request = payloadObject<ApprovalRequestLike>(payload)
    const sessionId = request?.agent?.session?.id
    if (!this.#canForward(sessionId)) return delegate(next)

    const approvalId = `ap_${randomUUID()}`
    const toolName = typeof request.toolName === 'string' ? request.toolName : 'unknown'
    const callId = request.callId
    const reason = request.reason
    const displayReason = request.displayReason
    const args: Record<string, unknown> = {
      approvalId,
      sessionId,
      toolName,
      ...(nonEmptyString(callId) ? { callId } : {}),
      ...(nonEmptyString(reason) ? { reason } : {}),
      ...(displayReason && typeof displayReason === 'object' ? { displayReason } : {}),
    }

    try {
      const value = await this.transport.request('approval.ask', args, { timeoutMs: this.approvalTimeoutMs })
      const outcome = isRecord(value) ? value.outcome : undefined
      if (typeof outcome === 'string' && APPROVAL_OUTCOME_LIST.includes(outcome)) return outcome
      this.logger.warn('web-remote: approval.ask returned an unknown outcome, delegating')
      return delegate(next)
    } catch (error) {
      this.#logDelegation('approval', error)
      return delegate(next)
    }
  }

  /**
   * Answerer for `user-questions/request`. The web returns the same answer
   * batch the DSH tool expects; anything malformed falls back to the desktop.
   */
  async handleQuestion(payload: unknown, next: unknown): Promise<unknown> {
    const request = payloadObject<QuestionRequestLike>(payload)
    const sessionId = request?.agent?.session?.id
    if (!this.#canForward(sessionId)) return delegate(next)

    const questions = sanitizeQuestions(request.questions)
    if (questions === undefined) return delegate(next)

    const waitCallId = request.wait?.callId
    const args: Record<string, unknown> = {
      questionId: `q_${randomUUID()}`,
      sessionId,
      questions,
      ...(nonEmptyString(waitCallId) ? { callId: waitCallId } : {}),
    }

    try {
      const value = await this.transport.request('question.ask', args, { timeoutMs: this.questionTimeoutMs })
      const answers = normalizeAnswers(questions, isRecord(value) ? value.answers : undefined)
      if (answers !== undefined) return { answers }
      this.logger.warn('web-remote: question.ask returned a malformed answer, delegating')
      return delegate(next)
    } catch (error) {
      this.#logDelegation('question', error)
      return delegate(next)
    }
  }

  async #prompt(args: Record<string, unknown>): Promise<unknown> {
    const sessionId = requireSessionId(args)
    const text = requireString(args.text, 'text', 1, PROMPT_TEXT_LIMIT)
    if (text.trim().length === 0) throw new ProtocolError('bad-request', '"text" must not be blank')
    const request: PromptRequest = {
      requestId: nonEmptyString(args.requestId) ? args.requestId : randomUUID(),
      sessionId,
      mode: args.mode === 'steer' ? 'steer' : 'queue',
      content: [{ type: 'text', text }],
      clientTimeZone: this.clientTimeZone,
    }
    return this.sessionController.prompt(request, this.#lifecycle.signal)
  }

  async #follow(args: Record<string, unknown>, stream: BridgeStream): Promise<void> {
    const sessionId = requireSessionId(args)
    const abort = new AbortController()
    this.#followers.add(abort)
    this.#watch(sessionId)
    stream.onCancel(() => abort.abort())

    const request: FollowRequest = {
      address: { kind: 'session', sessionId },
      activate: args.activate === true,
      assistantStream: args.assistantStream === true,
    }
    if (isInteger(args.maxMessages)) request.maxMessages = args.maxMessages

    try {
      for await (const frame of this.sessionController.follow(request, abort.signal)) {
        if (stream.closed) break
        const seq = frame?.type === 'event' && isInteger(frame.event?.seq) ? frame.event?.seq : undefined
        if (!stream.push(frame, seq)) break
      }
      if (!stream.closed) stream.end('complete')
    } catch (error) {
      if (abort.signal.aborted) {
        if (!stream.closed) stream.end('cancelled')
      } else if (stream.closed) {
        // Cancelled by the peer while the iterator unwound.
      } else {
        this.logger.warn('web-remote: follow failed: %s', error instanceof Error ? error.message : error)
        stream.end('error')
      }
    } finally {
      this.#followers.delete(abort)
      this.#unwatch(sessionId)
    }
  }

  async #control(stream: BridgeStream): Promise<void> {
    const abort = new AbortController()
    this.#followers.add(abort)
    stream.onCancel(() => abort.abort())

    try {
      for await (const frame of this.sessionController.control(abort.signal)) {
        if (stream.closed) break
        if (!stream.push(frame)) break
      }
      if (!stream.closed) stream.end('complete')
    } catch (error) {
      if (abort.signal.aborted) {
        if (!stream.closed) stream.end('cancelled')
      } else if (!stream.closed) {
        this.logger.warn('web-remote: control failed: %s', error instanceof Error ? error.message : error)
        stream.end('error')
      }
    } finally {
      this.#followers.delete(abort)
    }
  }

  #canForward(sessionId: unknown): sessionId is string {
    if (!nonEmptyString(sessionId)) return false
    if (!this.#watched.has(sessionId)) return false
    return this.transport?.status === 'ready'
  }

  #watch(sessionId: string): void {
    this.#watched.set(sessionId, (this.#watched.get(sessionId) ?? 0) + 1)
  }

  #unwatch(sessionId: string): void {
    const count = this.#watched.get(sessionId)
    if (count === undefined) return
    if (count <= 1) this.#watched.delete(sessionId)
    else this.#watched.set(sessionId, count - 1)
  }

  #logDelegation(kind: string, error: unknown): void {
    if (error instanceof ProtocolError && error.code === 'transport/timeout') {
      this.logger.info('web-remote: %s timed out on the web, delegating to the desktop', kind)
      return
    }
    this.logger.warn(
      'web-remote: %s forwarding failed (%s), delegating to the desktop',
      kind,
      error instanceof Error ? error.message : error,
    )
  }
}

function delegate(next: unknown): unknown {
  return typeof next === 'function' ? (next as () => unknown)() : 'unavailable'
}

/** Read an event payload as an object; a non-object payload carries no fields. */
function payloadObject<T extends object>(value: unknown): T {
  return value !== null && typeof value === 'object' ? (value as T) : ({} as T)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** `Number.isInteger` as a type guard, for values read off the wire. */
function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function requireString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new ProtocolError('bad-request', `"${field}" must be a string`)
  const length = value.length
  if (length < min || length > max) {
    throw new ProtocolError('bad-request', `"${field}" must be ${min}-${max} characters`)
  }
  return value
}

function requireSessionId(args: Record<string, unknown>): string {
  return requireString(args?.sessionId, 'sessionId', 1, 200)
}

/** Keep only the client-facing question fields; drop Agent/Functions/callbacks. */
export function sanitizeQuestions(questions: unknown): SanitizedQuestion[] | undefined {
  if (!Array.isArray(questions) || questions.length === 0) return undefined
  const list: unknown[] = questions
  const result: SanitizedQuestion[] = []
  for (const question of list) {
    if (!isRecord(question) || typeof question.id !== 'string' || typeof question.question !== 'string') {
      return undefined
    }
    const options = Array.isArray(question.options)
      ? question.options
        .filter((option): option is QuestionOptionLike => isRecord(option) && typeof option.label === 'string')
        .map((option) => ({
          label: option.label,
          ...(typeof option.description === 'string' ? { description: option.description } : {}),
        }))
      : undefined
    result.push({
      id: question.id,
      question: question.question,
      ...(typeof question.header === 'string' ? { header: question.header } : {}),
      ...(typeof question.detail === 'string' ? { detail: question.detail } : {}),
      ...(options === undefined ? {} : { options }),
      ...(question.multiSelect === true ? { multiSelect: true } : {}),
    })
  }
  return result
}

/** Validate a web answer batch against the questions that were sent. */
export function normalizeAnswers(
  questions: SanitizedQuestion[],
  answers: unknown,
): NormalizedAnswer[] | undefined {
  if (!Array.isArray(answers) || answers.length !== questions.length) return undefined
  const list: unknown[] = answers
  const byId = new Map(questions.map((question) => [question.id, question]))
  const seen = new Set<string>()
  const result: NormalizedAnswer[] = []
  for (const answer of list) {
    if (!isRecord(answer) || typeof answer.id !== 'string' || !byId.has(answer.id) || seen.has(answer.id)) {
      return undefined
    }
    if (!Array.isArray(answer.selected)) return undefined
    const selected: unknown[] = answer.selected
    if (!selected.every((item): item is string => typeof item === 'string')) {
      return undefined
    }
    const question = byId.get(answer.id)
    if (question === undefined) return undefined
    const labels = new Set((question.options ?? []).map((option) => option.label))
    if (labels.size > 0 && !selected.every((item) => labels.has(item))) return undefined
    if (answer.custom !== undefined && typeof answer.custom !== 'string') return undefined
    const custom: string | undefined = typeof answer.custom === 'string' ? answer.custom : undefined
    seen.add(answer.id)
    result.push({
      id: answer.id,
      selected: [...selected],
      ...(custom === undefined ? {} : { custom }),
    })
  }
  return result.length === questions.length ? result : undefined
}


