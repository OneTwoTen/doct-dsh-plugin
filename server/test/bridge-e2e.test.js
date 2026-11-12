// The real plugin bridge, transport, and the Zig relay: one chat and one
// approval round trip. Runs against an already-running relay:
//
//   RELAY_E2E=1 RELAY_HTTP=http://127.0.0.1:18787 RELAY_DEV_TOKEN=dev_... \
//     node --test test/bridge-e2e.test.js
//
// The relay must be started with the same dev token (`auth.dev_token`).
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { loadOrCreateIdentity } from '../../plugin/src/lib/remote-device.ts'
import { RemoteTransport } from '../../plugin/src/lib/remote-transport.ts'
import { WebRemoteBridge } from '../../plugin/src/lib/web-remote-bridge.ts'

const base = process.env.RELAY_HTTP ?? 'http://127.0.0.1:18787'
const devToken = process.env.RELAY_DEV_TOKEN ?? 'dev_test_token_123'
const wsBase = base.replace(/^http/, 'ws') + '/ws'
const enabled = process.env.RELAY_E2E === '1'
const quiet = { info() {}, warn() {}, error() {} }

function abortError() {
  const error = new Error('aborted')
  error.name = 'AbortError'
  return error
}

function fakeSessionController(calls) {
  return {
    list: async () => ({ items: [{ sessionId: 's1', running: false, blank: false, agentAvailable: true, updatedAt: Date.now() }] }),
    prompt: async (request) => {
      calls.prompts.push(request)
      return { accepted: true }
    },
    cancel: async () => ({ accepted: true }),
    state: async () => ({ cursor: 1, active: true, running: false, queue: [], pendingInput: [] }),
    async *follow(_request, signal) {
      yield {
        type: 'snapshot',
        header: { id: 's1' },
        cursor: 0,
        records: [],
        hasMore: false,
        projections: { asOfSeq: 0, values: { title: 'Phiên thử' } },
      }
      yield {
        type: 'event',
        event: {
          type: 'assistant/message',
          seq: 1,
          time: Date.now(),
          data: { message: { id: 'm1', content: [{ type: 'text', text: 'Chào từ DSH' }] } },
        },
      }
      await new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(abortError()), { once: true })
      })
    },
  }
}

function openSocket(url, protocols) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, protocols)
    const client = { socket, queue: [], waiters: [] }
    socket.addEventListener('open', () => resolve(client))
    socket.addEventListener('error', () => reject(new Error('WebSocket failed to open')))
    socket.addEventListener('message', (event) => {
      const frame = JSON.parse(event.data)
      const index = client.waiters.findIndex((waiter) => waiter.predicate(frame))
      if (index >= 0) {
        const [waiter] = client.waiters.splice(index, 1)
        clearTimeout(waiter.timer)
        waiter.resolve(frame)
        return
      }
      client.queue.push(frame)
    })
    client.send = (frame) => socket.send(JSON.stringify(frame))
    client.next = (predicate, timeoutMs = 5000) => {
      const index = client.queue.findIndex(predicate)
      if (index >= 0) return Promise.resolve(client.queue.splice(index, 1)[0])
      return new Promise((resolveNext, rejectNext) => {
        const timer = setTimeout(() => rejectNext(new Error('timeout waiting for a frame')), timeoutMs)
        client.waiters.push({ predicate, resolve: resolveNext, reject: rejectNext, timer })
      })
    }
    client.close = () => socket.close()
  })
}

async function waitFor(predicate, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('condition was not reached')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(options.auth === true ? { authorization: `Bearer ${devToken}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  return { status: response.status, body: text.length === 0 ? undefined : JSON.parse(text) }
}

test('the plugin bridge chats and approves through the Zig relay', { skip: !enabled && 'set RELAY_E2E=1 with a running relay' }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-zig-relay-e2e-'))
  const calls = { prompts: [] }
  let transport
  let bridge
  let web

  try {
    const identity = await loadOrCreateIdentity({ dir })

    const authorized = await fetchJson(`${base}/v1/device/authorize`, {
      method: 'POST',
      body: {
        name: 'E2E-PC',
        platform: 'test',
        pubkey: identity.publicKeyBase64,
        device_id: identity.deviceId,
        scopes: ['chat', 'approval'],
      },
    })
    assert.equal(authorized.status, 201)

    const approved = await fetchJson(`${base}/v1/pair/approve`, {
      method: 'POST',
      auth: true,
      body: { code: authorized.body.user_code },
    })
    assert.equal(approved.status, 200)

    const tokens = await fetchJson(`${base}/v1/device/token`, {
      method: 'POST',
      body: { device_code: authorized.body.device_code },
    })
    assert.equal(tokens.status, 200)

    bridge = new WebRemoteBridge({
      sessionController: fakeSessionController(calls),
      transport: undefined,
      config: { approvalTimeoutMs: 5000, questionTimeoutMs: 5000, defaultCwd: process.cwd() },
      logger: quiet,
    })

    transport = new RemoteTransport({
      url: wsBase,
      identity,
      getAccessToken: () => tokens.body.access_token,
      WebSocket: WebSocket,
      heartbeatMs: 60000,
      requestTimeoutMs: 5000,
      logger: quiet,
      onRequest: (op, args) => bridge.handleOp(op, args),
      onStream: (op, args, stream) => bridge.handleStream(op, args, stream),
    })
    bridge.transport = transport
    transport.start()
    await waitFor(() => transport.status === 'ready')

    web = await openSocket(wsBase, ['dsh-remote.v1', `webbearer.${devToken}`])
    await web.next((frame) => frame.t === 'hello.ok')

    web.send({ t: 'req', id: 'list_1', op: 'session.list', args: {} })
    const list = await web.next((frame) => frame.t === 'res' && frame.id === 'list_1')
    assert.equal(list.value.items[0].sessionId, 's1')

    web.send({ t: 'open', id: 'follow_1', op: 'session.follow', args: { sessionId: 's1' } })
    const snapshot = await web.next((frame) => frame.t === 'item' && frame.id === 'follow_1')
    assert.equal(snapshot.item.type, 'snapshot')
    assert.equal(snapshot.item.projections.values.title, 'Phiên thử')

    const event = await web.next((frame) => frame.t === 'item' && frame.id === 'follow_1' && frame.seq === 1)
    assert.equal(event.item.event.type, 'assistant/message')

    web.send({
      t: 'req',
      id: 'prompt_1',
      op: 'session.prompt',
      args: { sessionId: 's1', text: 'xin chào' },
    })
    const accepted = await web.next((frame) => frame.t === 'res' && frame.id === 'prompt_1')
    assert.equal(accepted.value.accepted, true)
    assert.equal(calls.prompts.length, 1)

    const approval = bridge.handleApproval({
      agent: { session: { id: 's1' } },
      toolName: 'bash',
      callId: 'call_1',
      reason: 'run tests',
    }, async () => 'unavailable')

    const asked = await web.next((frame) => frame.t === 'req' && frame.op === 'approval.ask')
    assert.equal(asked.args.sessionId, 's1')
    web.send({ t: 'res', id: asked.id, ok: true, value: { outcome: 'allowed-once' } })
    assert.equal(await approval, 'allowed-once')
  } finally {
    bridge?.dispose()
    transport?.stop()
    web?.close()
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
  }
})

