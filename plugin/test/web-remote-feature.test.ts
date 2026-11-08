// @ts-nocheck -- ported from the JavaScript Web Remote tests; behavior is covered at runtime.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { normalizeConfig } from '../src/lib/config.ts'
import { mountWebRemote } from '../src/features/web-remote.ts'
import { waitFor } from '../test-support/fake-websocket.ts'

const quietLogger = { info() {}, warn() {}, error() {} }

function jsonResponse(status, body) {
  return { status, text: async () => (body === undefined ? '' : JSON.stringify(body)) }
}

function pairingFetch() {
  return async (url, init) => {
    if (url.endsWith('/v1/device/authorize')) {
      assert.equal(JSON.parse(init.body).device_id.length > 0, true)
      return jsonResponse(200, {
        device_code: 'dc_1',
        user_code: 'ABCD-EFGH',
        verification_uri: 'https://relay.test/pair',
        expires_in: 600,
        interval: 1,
      })
    }
    if (url.endsWith('/v1/device/token')) {
      return jsonResponse(200, {
        access_token: 'at_1',
        refresh_token: 'rt_1',
        expires_in: 900,
        device_id: 'dev_1',
      })
    }
    throw new Error(`unexpected request ${url}`)
  }
}

function fakeContext(controller, services = {}) {
  const listeners = new Map()
  return {
    listeners,
    ctx: {
      get(name) {
        if (name === 'sessionController') return controller
        return services[name]
      },
      on(event, listener) {
        listeners.set(event, listener)
        return () => listeners.delete(event)
      },
    },
  }
}

/** A Connection registry that keeps every route the feature registers. */
function fakeConnection() {
  const routes = new Map()
  return {
    routes,
    service: {
      fetch: {
        register(route) {
          if (routes.has(route.path)) throw new Error(`duplicate route ${route.path}`)
          routes.set(route.path, route)
          return () => routes.delete(route.path)
        },
      },
    },
    async call(endpoint, payload) {
      const route = routes.get(`/api/personal-hub-web-remote/${endpoint}`)
      assert.ok(route, `route ${endpoint} is registered`)
      const request = new Request(`http://dsh.internal/api/personal-hub-web-remote/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      })
      return await route.fetch(request).then((response) => response.json())
    },
  }
}

/** A configuration editor whose row is read and rewritten in memory. */
function fakeConfigEditor(row = {}) {
  let current = row
  return {
    entries: () => [{ options: { name: '@local/personal-hub' } }],
    edit: async (_entry, change) => {
      current = change(current)
    },
    row: () => current,
  }
}

test('normalizeConfig fills every webRemote default without touching other features', () => {
  const normalized = normalizeConfig({ webRemote: { enabled: 'true', relayUrl: ' https://relay.test/ ' } })
  assert.equal(normalized.webRemote.enabled, true)
  assert.equal(normalized.webRemote.relayUrl, 'https://relay.test/')
  assert.equal(normalized.webRemote.autoPair, true)
  assert.deepEqual(normalized.webRemote.scopes, ['chat', 'approval'])
  assert.equal(normalized.webRemote.approvalTimeoutMs, 300000)
  assert.ok(normalized.webRemote.reconnectMaxMs >= normalized.webRemote.reconnectMinMs)
  assert.equal(normalized.telegram.enabled, true)
  assert.equal(normalized.git.enabled, true)
})

test('the feature pairs, connects, registers answerers, and disposes cleanly', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-web-remote-'))
  const { ctx, listeners } = fakeContext({
    list: async () => ({ sessions: [] }),
    state: async () => ({}),
    async *follow() {},
    async *control() {},
  })

  let transportOptions
  let starts = 0
  let stops = 0
  const deps = {
    logger: quietLogger,
    fetchImpl: pairingFetch(),
    pairingPollMs: 1,
    createTransport: (options) => {
      transportOptions = options
      return {
        status: 'idle',
        start() {
          starts += 1
          options.onStatus({ status: 'ready', serverTime: 1 })
        },
        stop() {
          stops += 1
        },
        async request() {
          return { outcome: 'allowed-once' }
        },
      }
    },
  }

  const config = normalizeConfig({
    webRemote: {
      enabled: true,
      relayUrl: 'https://relay.test',
      dataDir: dir,
      autoPair: true,
    },
  }).webRemote

  const dispose = mountWebRemote(ctx, config, deps)
  try {
    await waitFor(() => starts === 1, { timeoutMs: 10000 })
    assert.equal(transportOptions.url, 'wss://relay.test/ws')
    assert.equal(typeof transportOptions.getAccessToken, 'function')
    assert.equal(typeof transportOptions.onRequest, 'function')
    assert.equal(typeof listeners.get('approval/request'), 'function')
    assert.equal(typeof listeners.get('user-questions/request'), 'function')

    const statusFile = join(dir, 'status.json')
    await waitFor(async () => {
      try {
        const status = JSON.parse(await readFile(statusFile, 'utf8'))
        return status.state === 'connected'
      } catch {
        return false
      }
    }, { timeoutMs: 10000 })

    const status = JSON.parse(await readFile(statusFile, 'utf8'))
    assert.equal(status.relayUrl, 'https://relay.test')
    assert.match(status.deviceId, /^dev_/)
    assert.equal(status.pairing, undefined)

    const state = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'))
    assert.equal(state.pairedAt > 0, true)
  } finally {
    dispose()
    // The final status write is asynchronous; let it settle before deleting the directory.
    await new Promise((resolve) => setTimeout(resolve, 50))
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
  }

  assert.equal(stops, 1)
  assert.equal(listeners.size, 0)
})

test('autoPair false leaves the feature idle until a credential exists', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-web-remote-'))
  const { ctx, listeners } = fakeContext({ list: async () => ({}) })
  let creates = 0
  const dispose = mountWebRemote(
    ctx,
    normalizeConfig({
      webRemote: { enabled: true, relayUrl: 'https://relay.test', dataDir: dir, autoPair: false },
    }).webRemote,
    {
      logger: quietLogger,
      createTransport: () => {
        creates += 1
        throw new Error('should not connect')
      },
    },
  )
  try {
    const statusFile = join(dir, 'status.json')
    await waitFor(async () => {
      try {
        return JSON.parse(await readFile(statusFile, 'utf8')).state === 'waiting-pairing'
      } catch {
        return false
      }
    }, { timeoutMs: 10000 })
    assert.equal(creates, 0)
    assert.equal(listeners.size, 0)
  } finally {
    dispose()
    // The final status write is asynchronous; let it settle before deleting the directory.
    await new Promise((resolve) => setTimeout(resolve, 50))
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
  }
})

/** A pairing relay that keeps the device waiting for approval. */
function pendingPairingFetch() {
  return async (url) => {
    if (url.endsWith('/v1/device/authorize')) {
      return jsonResponse(200, {
        device_code: 'dc_pending',
        user_code: 'WXYZ-2345',
        verification_uri: 'https://relay.test/pair',
        expires_in: 600,
        interval: 1,
      })
    }
    if (url.endsWith('/v1/device/token')) {
      return jsonResponse(200, { error: 'authorization_pending' })
    }
    throw new Error(`unexpected request ${url}`)
  }
}

/** One transport the feature builds, counted by start(). */
function transportFactory(onStart = () => {}) {
  const created = []
  return {
    created,
    createTransport: (options) => {
      const transport = {
        status: 'idle',
        start() {
          onStart()
          transport.status = 'ready'
          options.onStatus({ status: 'ready', serverTime: 1 })
        },
        stop() {
          transport.status = 'stopped'
        },
        async request() {
          return { accepted: true }
        },
      }
      created.push(transport)
      return transport
    },
  }
}

/** Wait until the card route reports a matching snapshot. */
async function waitForState(connection, predicate, timeoutMs = 10000) {
  let last = ''
  try {
    await waitFor(async () => {
      const answer = await connection.call('state')
      last = JSON.stringify(answer)
      return answer.ok === true && predicate(answer.value)
    }, { timeoutMs })
  } catch (error) {
    throw new Error(`state never matched (last: ${last})`, { cause: error })
  }
}

test('a disabled feature still serves the card and opens no socket', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-web-remote-'))
  const connection = fakeConnection()
  const { ctx } = fakeContext(
    { list: async () => ({ sessions: [] }) },
    { connection: connection.service, configEditor: fakeConfigEditor() },
  )
  let creates = 0

  const dispose = mountWebRemote(
    ctx,
    normalizeConfig({
      webRemote: { enabled: false, relayUrl: 'https://relay.test', dataDir: dir, autoPair: true },
    }).webRemote,
    {
      logger: quietLogger,
      createTransport: () => {
        creates += 1
        throw new Error('must not connect while disabled')
      },
    },
  )

  try {
    await waitForState(connection, (state) => state.status.state === 'disabled')
    const answer = await connection.call('state')
    assert.equal(answer.ok, true)
    assert.equal(answer.value.settings.enabled, false)
    assert.equal(answer.value.writable, true)
    assert.equal(answer.value.status.paired, false)
    assert.equal(creates, 0)
    // The device key is created by pairing, not by reading the card.
    assert.equal(existsSync(join(dir, 'device.key')), false)

    const pair = await connection.call('pair')
    assert.equal(pair.ok, false)
    assert.equal(pair.error?.code, 'pair/disabled')
    assert.equal(creates, 0)
  } finally {
    dispose()
    await new Promise((resolve) => setTimeout(resolve, 50))
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
  }
})

test('the card routes report the live status and drive unpair and re-pair', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-web-remote-'))
  const connection = fakeConnection()
  const editor = fakeConfigEditor()
  const { ctx } = fakeContext(
    { list: async () => ({ sessions: [] }), async *follow() {} },
    { connection: connection.service, configEditor: editor },
  )
  const transports = transportFactory()

  const dispose = mountWebRemote(
    ctx,
    normalizeConfig({
      webRemote: { enabled: true, relayUrl: 'https://relay.test', dataDir: dir, autoPair: true },
    }).webRemote,
    {
      logger: quietLogger,
      fetchImpl: pairingFetch(),
      pairingPollMs: 1,
      createTransport: transports.createTransport,
    },
  )
  const tokenFile = join(dir, 'refresh-token.json')

  try {
    await waitForState(connection, (state) => state.status.state === 'connected')

    const initial = await connection.call('state')
    assert.equal(initial.ok, true)
    assert.equal(initial.value.settings.relayUrl, 'https://relay.test')
    assert.equal(initial.value.settings.autoPair, true)
    assert.equal(initial.value.status.state, 'connected')
    assert.equal(initial.value.status.paired, true)
    assert.equal(initial.value.writable, true)
    assert.match(initial.value.status.fingerprint, /^SHA256:/)

    const unpaired = await connection.call('unpair')
    assert.equal(unpaired.ok, true, JSON.stringify(unpaired))
    assert.equal(unpaired.value.state, 'pairing-required')
    await waitForState(connection, (state) => state.status.state === 'pairing-required' && state.status.pairingStatus === 'unpaired')
    assert.equal(await readFile(tokenFile, 'utf8'), '')
    const afterUnpair = await connection.call('state')
    assert.equal(afterUnpair.value.status.paired, false)

    const paired = await connection.call('pair')
    assert.equal(paired.ok, true, JSON.stringify(paired))
    await waitForState(connection, (state) => state.status.state === 'connected')
    assert.equal(transports.created.length, 2)
    const afterPair = await connection.call('state')
    assert.equal(afterPair.value.status.paired, true)
  } finally {
    dispose()
    await new Promise((resolve) => setTimeout(resolve, 50))
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
  }
})

test('the card can cancel a pairing attempt that the web never approves', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-web-remote-'))
  const connection = fakeConnection()
  const { ctx } = fakeContext(
    { list: async () => ({ sessions: [] }) },
    { connection: connection.service, configEditor: fakeConfigEditor() },
  )
  const transports = transportFactory()

  const dispose = mountWebRemote(
    ctx,
    normalizeConfig({
      webRemote: { enabled: true, relayUrl: 'https://relay.test', dataDir: dir, autoPair: false },
    }).webRemote,
    {
      logger: quietLogger,
      fetchImpl: pendingPairingFetch(),
      pairingPollMs: 5,
      createTransport: transports.createTransport,
    },
  )

  try {
    await waitForState(connection, (state) => state.status.state === 'waiting-pairing')

    const started = await connection.call('pair')
    assert.equal(started.ok, true, JSON.stringify(started))
    await waitForState(connection, (state) => state.status.state === 'pairing' && state.status.pairing !== null)
    const pairing = (await connection.call('state')).value.status.pairing
    assert.equal(pairing.code, 'WXYZ-2345')
    assert.equal(pairing.uri, 'https://relay.test/pair')

    const cancelled = await connection.call('pairCancel')
    assert.equal(cancelled.ok, true, JSON.stringify(cancelled))
    assert.equal(cancelled.value.state, 'pairing-required')
    await waitForState(connection, (state) => state.status.pairing === null && state.status.pairingStatus === 'cancelled')
    assert.equal(transports.created.length, 0, 'cancelling must not open a socket')
  } finally {
    dispose()
    await new Promise((resolve) => setTimeout(resolve, 50))
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
  }
})
