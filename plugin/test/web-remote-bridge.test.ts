// @ts-nocheck -- ported from the JavaScript Web Remote tests; behavior is covered at runtime.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ProtocolError } from '../src/lib/remote-protocol.ts'
import { WebRemoteBridge, normalizeAnswers, sanitizeQuestions } from '../src/lib/web-remote-bridge.ts'
import { waitFor } from '../test-support/fake-websocket.ts'

function abortError() {
  const error = new Error('aborted')
  error.name = 'AbortError'
  return error
}

function controllerFixture(overrides = {}) {
  const calls = []
  return {
    calls,
    list: async (request, signal) => ({ sessions: [{ id: 's1' }], request, signalAborted: signal?.aborted }),
    state: async (request) => ({ sessionId: request.sessionId, cursor: 3, running: false }),
    create: async (request) => ({ sessionId: 's_new', request }),
    rename: async (request) => ({ title: request.title, seq: 4 }),
    prompt: async (request) => {
      calls.push(request)
      return { accepted: true }
    },
    cancel: async (request) => ({ accepted: true, ...request }),
    events: async (request) => ({ cursor: 1, records: [], hasMore: false, request }),
    modelCatalog: async () => ({ groups: [] }),
    selectModel: async (request) => ({ selected: { provider: request.provider, model: request.model } }),
    async *follow(request, signal) {
      yield { type: 'snapshot', cursor: 0, records: [], hasMore: false }
      yield { type: 'event', event: { type: 'assistant/message', seq: 1, time: 1, data: {} } }
      if (overrides.stayOpen === true) {
        await new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(abortError()), { once: true })
        })
      }
    },
    async *control(signal) {
      yield { type: 'baseline', value: { projections: {} } }
    },
    ...overrides.methods,
  }
}

function fakeStream() {
  const stream = {
    id: 'stream_1',
    closed: false,
    items: [],
    ends: [],
    cancelHandlers: [],
    push(item, seq) {
      if (stream.closed) return false
      stream.items.push({ item, seq })
      return true
    },
    end(reason = 'complete') {
      if (stream.closed) return
      stream.closed = true
      stream.ends.push(reason)
    },
    onCancel(listener) {
      stream.cancelHandlers.push(listener)
      return () => {}
    },
  }
  return stream
}

function fakeTransport({ status = 'ready', handler } = {}) {
  const calls = []
  return {
    status,
    calls,
    async request(op, args, options) {
      calls.push({ op, args, options })
      if (handler !== undefined) return handler(op, args, options)
      return { outcome: 'allowed-once' }
    },
  }
}

function approvalRequest(sessionId = 's1') {
  return {
    agent: { session: { id: sessionId } },
    toolName: 'bash',
    callId: 'call_1',
    reason: 'run npm test',
    displayReason: { en: 'Run tests', vi: 'ChÃ¡ÂºÂ¡y kiÃ¡Â»Æ’m thÃ¡Â»Â­' },
  }
}

test('unary operations map onto sessionController with validated arguments', async () => {
  const controller = controllerFixture()
  const bridge = new WebRemoteBridge({ sessionController: controller, transport: fakeTransport() })

  assert.deepEqual(await bridge.handleOp('session.list', {}), {
    sessions: [{ id: 's1' }],
    request: {},
    signalAborted: false,
  })
  assert.equal((await bridge.handleOp('session.state', { sessionId: 's1' })).cursor, 3)
  assert.equal((await bridge.handleOp('session.create', { cwd: 'C:\\x', ignored: 'drop' })).request.cwd, 'C:\\x')
  assert.equal((await bridge.handleOp('session.rename', { sessionId: 's1', title: 'MÃ¡Â»â€ºi' })).title, 'MÃ¡Â»â€ºi')
  assert.equal((await bridge.handleOp('relay.ping', {})).time > 0, true)
  assert.equal((await bridge.handleOp('session.cancel', { sessionId: 's1' })).accepted, true)
  assert.equal((await bridge.handleOp('session.selectModel', {
    sessionId: 's1',
    provider: 'deepseek',
    model: 'chat',
  })).selected.model, 'chat')

  await assert.rejects(
    () => bridge.handleOp('nope.nope', {}),
    (error) => error instanceof ProtocolError && error.code === 'unsupported',
  )
  await assert.rejects(
    () => bridge.handleOp('session.state', {}),
    (error) => error.code === 'bad-request',
  )
  await assert.rejects(
    () => bridge.handleOp('session.rename', { sessionId: 's1', title: '' }),
    (error) => error.code === 'bad-request',
  )
})

test('a prompt is forwarded with a client request id and text content only', async () => {
  const controller = controllerFixture()
  const bridge = new WebRemoteBridge({ sessionController: controller, transport: fakeTransport() })

  assert.deepEqual(await bridge.handleOp('session.prompt', { sessionId: 's1', text: 'xin chÃƒÂ o' }), {
    accepted: true,
  })
  const sent = controller.calls.at(-1)
  assert.equal(sent.sessionId, 's1')
  assert.equal(sent.mode, 'queue')
  assert.deepEqual(sent.content, [{ type: 'text', text: 'xin chÃƒÂ o' }])
  assert.match(sent.requestId, /^[0-9a-f-]{36}$/)
  assert.equal(typeof sent.clientTimeZone, 'string')

  assert.deepEqual(
    await bridge.handleOp('session.prompt', { sessionId: 's1', text: 'x', mode: 'steer', requestId: 'req_1' }),
    { accepted: true },
  )
  assert.equal(controller.calls.at(-1).mode, 'steer')
  assert.equal(controller.calls.at(-1).requestId, 'req_1')

  await assert.rejects(
    () => bridge.handleOp('session.prompt', { sessionId: 's1', text: '   ' }),
    (error) => error.code === 'bad-request',
  )
})

test('follow forwards snapshot and events, tags seq, and stops watching at the end', async () => {
  const bridge = new WebRemoteBridge({ sessionController: controllerFixture(), transport: fakeTransport() })
  const stream = fakeStream()

  bridge.handleStream('session.follow', { sessionId: 's1' }, stream)
  await waitFor(() => stream.ends.length > 0)

  assert.equal(stream.items.length, 2)
  assert.equal(stream.items[0].item.type, 'snapshot')
  assert.equal(stream.items[1].item.type, 'event')
  assert.equal(stream.items[1].seq, 1)
  assert.deepEqual(stream.ends, ['complete'])
  assert.deepEqual(bridge.watchedSessions, [])
})

test('an unknown stream op ends with an error instead of hanging', () => {
  const bridge = new WebRemoteBridge({ sessionController: controllerFixture(), transport: fakeTransport() })
  const stream = fakeStream()
  bridge.handleStream('session.nope', {}, stream)
  assert.deepEqual(stream.ends, ['error'])
})

test('approval is forwarded only while a client follows that session', async () => {
  const controller = controllerFixture({ stayOpen: true })
  const transport = fakeTransport()
  const bridge = new WebRemoteBridge({ sessionController: controller, transport, approvalTimeoutMs: 1000 })
  const follow = fakeStream()
  bridge.handleStream('session.follow', { sessionId: 's1' }, follow)
  await waitFor(() => bridge.watchedSessions.includes('s1'))

  const outcome = await bridge.handleApproval(approvalRequest('s1'), async () => 'unavailable')
  assert.equal(outcome, 'allowed-once')
  const call = transport.calls[0]
  assert.equal(call.op, 'approval.ask')
  assert.equal(call.args.sessionId, 's1')
  assert.equal(call.args.toolName, 'bash')
  assert.equal(call.args.callId, 'call_1')
  assert.equal(call.args.reason, 'run npm test')
  assert.match(call.args.approvalId, /^ap_/)

  let delegated = 0
  assert.equal(
    await bridge.handleApproval(approvalRequest('s_not_watched'), async () => {
      delegated += 1
      return 'rejected'
    }),
    'rejected',
  )
  assert.equal(delegated, 1)

  bridge.dispose()
  await waitFor(() => follow.ends.length > 0)
  assert.equal(follow.ends[0], 'cancelled')
})

test('a transport failure or an unknown outcome falls back to the desktop answerer', async () => {
  const bridge = new WebRemoteBridge({
    sessionController: controllerFixture({ stayOpen: true }),
    transport: fakeTransport({
      handler: async () => {
        throw new ProtocolError('transport/timeout', 'no answer')
      },
    }),
  })
  const follow = fakeStream()
  bridge.handleStream('session.follow', { sessionId: 's1' }, follow)
  await waitFor(() => bridge.watchedSessions.includes('s1'))

  let delegated = 0
  assert.equal(
    await bridge.handleApproval(approvalRequest('s1'), async () => {
      delegated += 1
      return 'unavailable'
    }),
    'unavailable',
  )
  assert.equal(delegated, 1)

  const odd = new WebRemoteBridge({
    sessionController: controllerFixture(),
    transport: fakeTransport({ handler: async () => ({ outcome: 'maybe' }) }),
  })
  odd.handleStream('session.follow', { sessionId: 's1' }, fakeStream())
  await waitFor(() => odd.watchedSessions.includes('s1'))
  assert.equal(await odd.handleApproval(approvalRequest('s1'), async () => 'rejected'), 'rejected')
  bridge.dispose()
  odd.dispose()
})

test('questions are sanitized, forwarded, and validated before use', async () => {
  const message = (answers) => ({ answers })
  const transport = fakeTransport({
    handler: async () => message([{ id: 'scope', selected: ['TÃ¡Â»â€¡p'] }]),
  })
  const bridge = new WebRemoteBridge({
    sessionController: controllerFixture({ stayOpen: true }),
    transport,
    questionTimeoutMs: 1000,
  })
  bridge.handleStream('session.follow', { sessionId: 's1' }, fakeStream())
  await waitFor(() => bridge.watchedSessions.includes('s1'))

  const request = {
    agent: { session: { id: 's1' } },
    questions: [{
      id: 'scope',
      question: 'ChÃ¡Â»Ân phÃ¡ÂºÂ¡m vi',
      header: 'PhÃ¡ÂºÂ¡m vi',
      detail: 'Chi tiÃ¡ÂºÂ¿t',
      options: [{ label: 'TÃ¡Â»â€¡p', description: 'mÃ¡Â»â„¢t tÃ¡Â»â€¡p' }, { label: 'ThÃ†Â° mÃ¡Â»Â¥c' }],
      multiSelect: false,
      internal: 'drop me',
    }],
    wait: { callId: 'call_2' },
  }

  assert.deepEqual(await bridge.handleQuestion(request, async () => ({ answers: [] })), {
    answers: [{ id: 'scope', selected: ['TÃ¡Â»â€¡p'] }],
  })
  assert.deepEqual(transport.calls[0].args.questions, [{
    id: 'scope',
    question: 'ChÃ¡Â»Ân phÃ¡ÂºÂ¡m vi',
    header: 'PhÃ¡ÂºÂ¡m vi',
    detail: 'Chi tiÃ¡ÂºÂ¿t',
    options: [{ label: 'TÃ¡Â»â€¡p', description: 'mÃ¡Â»â„¢t tÃ¡Â»â€¡p' }, { label: 'ThÃ†Â° mÃ¡Â»Â¥c' }],
  }])
  assert.equal(transport.calls[0].args.callId, 'call_2')

  const malformed = new WebRemoteBridge({
    sessionController: controllerFixture({ stayOpen: true }),
    transport: fakeTransport({ handler: async () => message([{ id: 'scope', selected: ['KhÃƒÂ´ng cÃƒÂ³'] }]) }),
  })
  malformed.handleStream('session.follow', { sessionId: 's1' }, fakeStream())
  await waitFor(() => malformed.watchedSessions.includes('s1'))
  assert.equal(
    await malformed.handleQuestion(request, async () => 'delegated'),
    'delegated',
  )
  bridge.dispose()
  malformed.dispose()
})

test('sanitizeQuestions and normalizeAnswers enforce the contract', () => {
  assert.equal(sanitizeQuestions([]), undefined)
  assert.equal(sanitizeQuestions([{ id: 1 }]), undefined)
  const questions = sanitizeQuestions([{ id: 'q', question: 'Q?', options: [{ label: 'A' }] }])
  assert.deepEqual(questions, [{ id: 'q', question: 'Q?', options: [{ label: 'A' }] }])

  assert.equal(normalizeAnswers(questions, []), undefined)
  assert.equal(normalizeAnswers(questions, [{ id: 'other', selected: ['A'] }]), undefined)
  assert.equal(normalizeAnswers(questions, [{ id: 'q', selected: ['B'] }]), undefined)
  assert.equal(normalizeAnswers(questions, [{ id: 'q', selected: ['A'] }])?.length, 1)
})
