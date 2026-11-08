/**
 * Bridges DSH Session services to the Web Remote wire protocol.
 *
 * The bridge is transport-agnostic: it receives an object shaped like
 * `RemoteTransport` (a `status` string and a `request(op, args, options)`
 * method) so tests can drive it without a socket. `features/web-remote.js`
 * owns identity, pairing, and the real transport.
 */
import { randomUUID } from 'node:crypto'
import { APPROVAL_OUTCOMES, ProtocolError } from './remote-protocol.js'

const PROMPT_TEXT_LIMIT = 100_000

/**
 * @typedef {object} BridgeTransport
 * @property {string} status
 * @property {(op: string, args?: Record<string, unknown>, options?: object) => Promise<any>} request
 */

export class WebRemoteBridge {
  /**
   * @param {object} options
   * @param {object} options.sessionController the DSH `sessionController` service
   * @param {BridgeTransport} options.transport
   * @param {{ approvalTimeoutMs?: number, questionTimeoutMs?: number, defaultCwd?: string }} [options.config]
   * @param {object} [options.logger]
   * @param {() => number} [options.now]
   */
  constructor({ sessionController, transport, config = {}, logger = console, now = Date.now }) {
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

  /** Cancels every service call that accepts a signal. */
  #lifecycle

  /** sessionId -> number of open follow streams */
  #watched
  /** AbortControllers for every open stream, so dispose can stop them all. */
  #followers

  /** Session IDs a web client is currently following. */
  get watchedSessions() {
    return [...this.#watched.keys()]
  }

  /** Stop every open stream. */
  dispose() {
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
   * @param {string} op
   * @param {Record<string, any>} args
   */
  async handleOp(op, args = {}) {
    const controller = this.sessionController

    switch (op) {
      case 'relay.ping':
        return { time: this.now() }

      case 'session.list':
        return controller.list({}, this.#lifecycle.signal)

      case 'session.state':
        return controller.state({ sessionId: requireSessionId(args) }, this.#lifecycle.signal)

      case 'session.create': {
        const request = {}
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
        const request = { address: { kind: 'session', sessionId: requireSessionId(args) } }
        if (Number.isInteger(args.maxMessages)) request.maxMessages = args.maxMessages
        if (Number.isInteger(args.throughSeq)) request.throughSeq = args.throughSeq
        if (Number.isInteger(args.beforeSeq)) request.beforeSeq = args.beforeSeq
        return controller.events(request, this.#lifecycle.signal)
      }

      case 'session.modelCatalog':
        return controller.modelCatalog()

      case 'session.selectModel': {
        const request = {
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
   * @param {string} op
   * @param {Record<string, any>} args
   * @param {{ push: (item: unknown, seq?: number) => boolean, end: (reason?: string) => void, closed: boolean, onCancel: (listener: (reason?: string) => void) => () => void }} stream
   */
  handleStream(op, args = {}, stream) {
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
  async handleApproval(request, next) {
    const sessionId = request?.agent?.session?.id
    if (!this.#canForward(sessionId)) return delegate(next)

    const approvalId = `ap_${randomUUID()}`
    const args = {
      approvalId,
      sessionId,
      toolName: typeof request.toolName === 'string' ? request.toolName : 'unknown',
      ...(nonEmptyString(request.callId) ? { callId: request.callId } : {}),
      ...(nonEmptyString(request.reason) ? { reason: request.reason } : {}),
      ...(request.displayReason && typeof request.displayReason === 'object'
        ? { displayReason: request.displayReason }
        : {}),
    }

    try {
      const value = await this.transport.request('approval.ask', args, { timeoutMs: this.approvalTimeoutMs })
      const outcome = value?.outcome
      if (APPROVAL_OUTCOMES.includes(outcome)) return outcome
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
  async handleQuestion(request, next) {
    const sessionId = request?.agent?.session?.id
    if (!this.#canForward(sessionId)) return delegate(next)

    const questions = sanitizeQuestions(request.questions)
    if (questions === undefined) return delegate(next)

    const args = {
      questionId: `q_${randomUUID()}`,
      sessionId,
      questions,
      ...(nonEmptyString(request.wait?.callId) ? { callId: request.wait.callId } : {}),
    }

    try {
      const value = await this.transport.request('question.ask', args, { timeoutMs: this.questionTimeoutMs })
      const answers = normalizeAnswers(questions, value?.answers)
      if (answers !== undefined) return { answers }
      this.logger.warn('web-remote: question.ask returned a malformed answer, delegating')
      return delegate(next)
    } catch (error) {
      this.#logDelegation('question', error)
      return delegate(next)
    }
  }

  async #prompt(args) {
    const sessionId = requireSessionId(args)
    const text = requireString(args.text, 'text', 1, PROMPT_TEXT_LIMIT)
    if (text.trim().length === 0) throw new ProtocolError('bad-request', '"text" must not be blank')
    const request = {
      requestId: nonEmptyString(args.requestId) ? args.requestId : randomUUID(),
      sessionId,
      mode: args.mode === 'steer' ? 'steer' : 'queue',
      content: [{ type: 'text', text }],
      clientTimeZone: this.clientTimeZone,
    }
    return this.sessionController.prompt(request, this.#lifecycle.signal)
  }

  async #follow(args, stream) {
    const sessionId = requireSessionId(args)
    const abort = new AbortController()
    this.#followers.add(abort)
    this.#watch(sessionId)
    stream.onCancel(() => abort.abort())

    const request = {
      address: { kind: 'session', sessionId },
      activate: args.activate === true,
      assistantStream: args.assistantStream === true,
    }
    if (Number.isInteger(args.maxMessages)) request.maxMessages = args.maxMessages

    try {
      for await (const frame of this.sessionController.follow(request, abort.signal)) {
        if (stream.closed) break
        const seq = frame?.type === 'event' && Number.isInteger(frame.event?.seq) ? frame.event.seq : undefined
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

  async #control(stream) {
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

  #canForward(sessionId) {
    if (!nonEmptyString(sessionId)) return false
    if (!this.#watched.has(sessionId)) return false
    return this.transport?.status === 'ready'
  }

  #watch(sessionId) {
    this.#watched.set(sessionId, (this.#watched.get(sessionId) ?? 0) + 1)
  }

  #unwatch(sessionId) {
    const count = this.#watched.get(sessionId)
    if (count === undefined) return
    if (count <= 1) this.#watched.delete(sessionId)
    else this.#watched.set(sessionId, count - 1)
  }

  #logDelegation(kind, error) {
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

function delegate(next) {
  return typeof next === 'function' ? next() : 'unavailable'
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function requireString(value, field, min, max) {
  if (typeof value !== 'string') throw new ProtocolError('bad-request', `"${field}" must be a string`)
  const length = value.length
  if (length < min || length > max) {
    throw new ProtocolError('bad-request', `"${field}" must be ${min}-${max} characters`)
  }
  return value
}

function requireSessionId(args) {
  return requireString(args?.sessionId, 'sessionId', 1, 200)
}

/** Keep only the client-facing question fields; drop Agent/Functions/callbacks. */
export function sanitizeQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return undefined
  const result = []
  for (const question of questions) {
    if (typeof question?.id !== 'string' || typeof question?.question !== 'string') return undefined
    const options = Array.isArray(question.options)
      ? question.options
        .filter((option) => typeof option?.label === 'string')
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
export function normalizeAnswers(questions, answers) {
  if (!Array.isArray(answers) || answers.length !== questions.length) return undefined
  const byId = new Map(questions.map((question) => [question.id, question]))
  const seen = new Set()
  const result = []
  for (const answer of answers) {
    if (typeof answer?.id !== 'string' || !byId.has(answer.id) || seen.has(answer.id)) return undefined
    if (!Array.isArray(answer.selected) || !answer.selected.every((item) => typeof item === 'string')) {
      return undefined
    }
    const question = byId.get(answer.id)
    const labels = new Set((question.options ?? []).map((option) => option.label))
    if (labels.size > 0 && !answer.selected.every((item) => labels.has(item))) return undefined
    if (answer.custom !== undefined && typeof answer.custom !== 'string') return undefined
    seen.add(answer.id)
    result.push({
      id: answer.id,
      selected: [...answer.selected],
      ...(answer.custom === undefined ? {} : { custom: answer.custom }),
    })
  }
  return result.length === questions.length ? result : undefined
}
