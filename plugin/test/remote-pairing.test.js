import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  PairingError,
  pairDevice,
  refreshAccessToken,
  relayEndpoints,
} from '../lib/remote-pairing.js'

function jsonResponse(status, body) {
  return {
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }
}

function fakeFetch(handler) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return handler(url, init, calls.length)
  }
  fetchImpl.calls = calls
  return fetchImpl
}

const AUTHORIZE = {
  device_code: 'dc_test',
  user_code: 'ABCD-EFGH',
  verification_uri: 'https://chat.test/pair',
  expires_in: 600,
  interval: 1,
}

test('relay URLs cover http(s), ws(s), and reverse-proxy prefixes', () => {
  assert.deepEqual(relayEndpoints('https://chat.test'), {
    apiBase: 'https://chat.test',
    wsUrl: 'wss://chat.test/ws',
  })
  assert.deepEqual(relayEndpoints('http://127.0.0.1:8787/'), {
    apiBase: 'http://127.0.0.1:8787',
    wsUrl: 'ws://127.0.0.1:8787/ws',
  })
  assert.deepEqual(relayEndpoints('wss://chat.test/ws'), {
    apiBase: 'https://chat.test',
    wsUrl: 'wss://chat.test/ws',
  })
  assert.deepEqual(relayEndpoints('https://example.test/dsh'), {
    apiBase: 'https://example.test/dsh',
    wsUrl: 'wss://example.test/dsh/ws',
  })
  assert.throws(() => relayEndpoints(''), (error) => error.code === 'pair/invalid-url')
  assert.throws(() => relayEndpoints('ftp://chat.test'), /http/)
  assert.throws(() => relayEndpoints('https://chat.test/?token=x'), /query/)
})

test('flow B polls through pending and slow_down until the account approves', async () => {
  const codes = []
  const statuses = []
  const fetchImpl = fakeFetch((_url, init, call) => {
    const body = JSON.parse(init.body)
    if (call === 1) {
      assert.equal(body.pubkey, 'pubkey-base64')
      assert.equal(body.device_id, 'dev_derived')
      return jsonResponse(200, AUTHORIZE)
    }
    if (call === 2) return jsonResponse(200, { error: 'authorization_pending' })
    if (call === 3) return jsonResponse(200, { error: 'slow_down' })
    return jsonResponse(200, {
      access_token: 'at_1',
      refresh_token: 'rt_1',
      expires_in: 900,
      device_id: 'dev_1',
    })
  })

  const tokens = await pairDevice({
    relayUrl: 'https://chat.test',
    name: 'PC-Test',
    platform: 'win32',
    pubkey: 'pubkey-base64',
    deviceId: 'dev_derived',
    fetchImpl,
    pollIntervalMs: 1,
    onCode: (code) => codes.push(code),
    onStatus: (status) => statuses.push(status.code),
  })

  assert.equal(tokens.refresh_token, 'rt_1')
  assert.equal(codes.length, 1)
  assert.equal(codes[0].userCode, 'ABCD-EFGH')
  assert.equal(codes[0].verificationUri, 'https://chat.test/pair')
  assert.deepEqual(statuses, ['authorization_pending', 'slow_down'])
  assert.equal(fetchImpl.calls.length, 4)
  assert.equal(JSON.parse(fetchImpl.calls[0].init.body).device_id, 'dev_derived')
})

test('an expired code stops polling and reports pair/expired', async () => {
  let clock = 0
  const fetchImpl = fakeFetch((_url, _init, call) => {
    if (call === 1) return jsonResponse(200, AUTHORIZE)
    return jsonResponse(200, { error: 'authorization_pending' })
  })

  await assert.rejects(
    () => pairDevice({
      relayUrl: 'https://chat.test',
      name: 'PC',
      pubkey: 'pub',
      fetchImpl,
      pollIntervalMs: 1,
      now: () => clock,
      onCode: () => {
        clock = 10_000_000
      },
    }),
    (error) => error instanceof PairingError && error.code === 'pair/expired',
  )
})

test('a denied request does not keep polling', async () => {
  const fetchImpl = fakeFetch((_url, _init, call) => {
    if (call === 1) return jsonResponse(200, AUTHORIZE)
    return jsonResponse(403, { error: 'access_denied' })
  })

  await assert.rejects(
    () => pairDevice({
      relayUrl: 'https://chat.test',
      name: 'PC',
      pubkey: 'pub',
      fetchImpl,
      pollIntervalMs: 1,
    }),
    (error) => error.code === 'pair/denied',
  )
})

test('refresh rotates the pair and surfaces an invalid token', async () => {
  const ok = fakeFetch(() => jsonResponse(200, { access_token: 'at_2', refresh_token: 'rt_2', expires_in: 900 }))
  const rotated = await refreshAccessToken({
    relayUrl: 'https://chat.test',
    refreshToken: 'rt_1',
    fetchImpl: ok,
  })
  assert.equal(rotated.refresh_token, 'rt_2')

  const bad = fakeFetch(() => jsonResponse(401, { error: 'invalid_grant' }))
  await assert.rejects(
    () => refreshAccessToken({ relayUrl: 'https://chat.test', refreshToken: 'rt_1', fetchImpl: bad }),
    (error) => error.code === 'invalid_grant',
  )
})

test('pairing without a pem key is refused before any network call', async () => {
  let called = false
  await assert.rejects(
    () => pairDevice({
      relayUrl: 'https://chat.test',
      name: 'PC',
      pubkey: '',
      fetchImpl: async () => {
        called = true
        return jsonResponse(500, {})
      },
    }),
    (error) => error.code === 'pair/invalid-pubkey',
  )
  assert.equal(called, false)
})
