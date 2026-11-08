import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createRelayServer } from '../relay.mjs'
import { normalizeConfig } from '../../../plugin/lib/config.js'
import { mountWebRemote } from '../../../plugin/features/web-remote.js'

const WEB_TOKEN = 'web_feature_token'
const quiet = { info() {}, warn() {}, error() {} }

function abortError() {
  const error = new Error('aborted')
  error.name = 'AbortError'
  return error
}

function fakeSessionController() {
  return {
    list: async () => ({ items: [{ sessionId: 's1', running: false, blank: false, agentAvailable: true, updatedAt: Date.now() }] }),
    state: async () => ({ cursor: 0, active: true, running: false, queue: [], pendingInput: [] }),
    create: async () => ({ sessionId: 's1' }),
    prompt: async () => ({ accepted: true }),
    cancel: async () => ({ accepted: true }),
    async *follow(_request, signal) {
      yield { type: 'snapshot', cursor: 0, records: [], hasMore: false, projections: { asOfSeq: 0, values: {} } }
      await new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(abortError()), { once: true })
      })
    },
    async *control() {},
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

async function waitFor(predicate, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs
  while (!(await predicate())) {
    if (Date.now() > deadline) throw new Error('condition was not reached')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

async function readStatus(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return undefined
  }
}

test('mountWebRemote pairs with the dev relay, serves sessions, and answers approvals', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-feature-e2e-'))
  let resolveCode
  const codePromise = new Promise((resolve) => {
    resolveCode = resolve
  })

  const relay = createRelayServer({
    webToken: WEB_TOKEN,
    onPairing: ({ code }) => resolveCode(code),
  })
  const address = await relay.listen(0, '127.0.0.1')
  const base = `http://127.0.0.1:${address.port}`
  const wsBase = `ws://127.0.0.1:${address.port}/ws`

  const listeners = new Map()
  const ctx = {
    get(name) {
      return name === 'sessionController' ? fakeSessionController() : undefined
    },
    on(event, listener) {
      listeners.set(event, listener)
      return () => listeners.delete(event)
    },
  }

  const config = normalizeConfig({
    webRemote: {
      enabled: true,
      relayUrl: base,
      dataDir: dir,
      autoPair: true,
      approvalTimeoutMs: 5000,
      questionTimeoutMs: 5000,
    },
  }).webRemote

  let dispose
  let web
  try {
    dispose = mountWebRemote(ctx, config, { logger: quiet, pairingPollMs: 1 })

    const code = await codePromise
    assert.match(code, /^[0-9A-Z]{4}-[0-9A-Z]{4}$/)

    const approved = await fetch(`${base}/v1/pair/approve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ code }),
    })
    assert.equal(approved.status, 200)

    const statusFile = join(dir, 'status.json')
    await waitFor(async () => (await readStatus(statusFile))?.state === 'connected')
    const status = await readStatus(statusFile)
    assert.match(status.deviceId, /^dev_/)

    const tokenFile = JSON.parse(await readFile(join(dir, 'refresh-token.json'), 'utf8'))
    assert.equal(typeof tokenFile.refresh_token, 'string')

    web = await openSocket(wsBase, ['dsh-remote.v1', `webbearer.${WEB_TOKEN}`])
    await web.next((frame) => frame.t === 'hello.ok')

    web.send({ t: 'req', id: 'list_1', op: 'session.list', args: {} })
    const list = await web.next((frame) => frame.t === 'res' && frame.id === 'list_1')
    assert.equal(list.value.items[0].sessionId, 's1')

    web.send({ t: 'open', id: 'follow_1', op: 'session.follow', args: { sessionId: 's1' } })
    const snapshot = await web.next((frame) => frame.t === 'item' && frame.id === 'follow_1')
    assert.equal(snapshot.item.type, 'snapshot')

    const approval = listeners.get('approval/request')({
      agent: { session: { id: 's1' } },
      toolName: 'bash',
      callId: 'call_1',
      reason: 'run tests',
    }, async () => 'unavailable')

    const asked = await web.next((frame) => frame.t === 'req' && frame.op === 'approval.ask')
    web.send({ t: 'res', id: asked.id, ok: true, value: { outcome: 'allowed-once' } })
    assert.equal(await approval, 'allowed-once')
  } finally {
    dispose?.()
    web?.close()
    await relay.close()
    await new Promise((resolve) => setTimeout(resolve, 50))
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
  }
})
