// @ts-nocheck -- ported from the JavaScript Web Remote tests; behavior is covered at runtime.
import assert from 'node:assert/strict'
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

function fakeContext(controller) {
  const listeners = new Map()
  return {
    listeners,
    ctx: {
      get(name) {
        return name === 'sessionController' ? controller : undefined
      },
      on(event, listener) {
        listeners.set(event, listener)
        return () => listeners.delete(event)
      },
    },
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
