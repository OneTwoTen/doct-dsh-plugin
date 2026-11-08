// @ts-nocheck -- ported from the JavaScript Web Remote tests; behavior is covered at runtime.
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { test } from 'node:test'

import { helloOkFrame, openFrame, requestFrame } from '../src/lib/remote-protocol.ts'
import { RemoteTransport } from '../src/lib/remote-transport.ts'
import { verifyHello } from '../src/lib/remote-device.ts'
import { FakeWebSocket, tick, waitFor } from '../test-support/fake-websocket.ts'

function identityFixture() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  return {
    identity: { deviceId: 'dev_test', privateKey },
    publicKeyBase64: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
  }
}

async function openTransport(options = {}) {
  FakeWebSocket.reset()
  const { identity, publicKeyBase64 } = identityFixture()
  const statuses = []
  const transport = new RemoteTransport({
    url: 'wss://relay.test/ws',
    identity,
    getAccessToken: () => 'at_test',
    WebSocket: FakeWebSocket,
    heartbeatMs: 60000,
    helloTimeoutMs: 200,
    requestTimeoutMs: 100,
    reconnect: { minMs: 2, maxMs: 5 },
    onStatus: (status) => statuses.push(status),
    ...options,
  })
  transport.start()
  const socket = await waitFor(() => FakeWebSocket.last)
  const hello = await waitFor(() => socket.sent.find((frame) => frame.t === 'hello'))
  socket.serverSend(helloOkFrame({ serverTime: 1, limits: { maxFrameBytes: 1024, maxStreams: 4 } }))
  await waitFor(() => transport.status === 'ready')
  return { transport, socket, statuses, hello, identity, publicKeyBase64 }
}

test('connect signs a fresh hello and carries token and device as subprotocols', async () => {
  const { transport, socket, hello, publicKeyBase64 } = await openTransport()
  try {
    assert.deepEqual(socket.protocols.slice(0, 1), ['dsh-remote.v1'])
    assert.equal(socket.protocols[1], 'bearer.at_test')
    assert.equal(socket.protocols[2], 'device.dev_test')
    assert.ok(hello.ts > 0)
    assert.ok(hello.nonce.length >= 16)
    assert.equal(verifyHello(publicKeyBase64, { ...hello, v: 1 }), true)
    assert.equal(socket.sent.some((frame) => frame.t === 'hello'), true)
  } finally {
    transport.stop()
  }
})

test('a unary request resolves with the response value', async () => {
  const { transport, socket } = await openTransport()
  try {
    const pending = transport.request('session.list', { cursor: 'x' })
    const request = await waitFor(() => socket.sent.find((frame) => frame.t === 'req'))
    assert.equal(request.op, 'session.list')
    assert.deepEqual(request.args, { cursor: 'x' })
    socket.serverSend({ t: 'res', id: request.id, ok: true, value: { sessions: [] } })
    assert.deepEqual(await pending, { sessions: [] })
  } finally {
    transport.stop()
  }
})

test('a failed response rejects with the stable error code', async () => {
  const { transport, socket } = await openTransport()
  try {
    const pending = transport.request('session.state', { sessionId: 'missing' })
    const request = await waitFor(() => socket.sent.find((frame) => frame.t === 'req'))
    socket.serverSend({
      t: 'res',
      id: request.id,
      ok: false,
      error: { code: 'session/not-found', message: 'gone', retryable: false },
    })
    await assert.rejects(pending, (error) => error.code === 'session/not-found' && error.retryable === false)
  } finally {
    transport.stop()
  }
})

test('a request with no answer times out', async () => {
  const { transport } = await openTransport()
  try {
    await assert.rejects(
      () => transport.request('relay.ping', {}, { timeoutMs: 5 }),
      (error) => error.code === 'transport/timeout',
    )
  } finally {
    transport.stop()
  }
})

test('relay-initiated requests are answered, including handler failures', async () => {
  const seen = []
  const { transport, socket } = await openTransport({
    onRequest: async (op, args) => {
      seen.push({ op, args })
      if (op === 'test.explode') throw new Error('boom')
      return { time: 7 }
    },
  })
  try {
    socket.serverSend(requestFrame('r1', 'relay.ping', {}))
    const ok = await waitFor(() => socket.sent.find((frame) => frame.t === 'res' && frame.id === 'r1'))
    assert.deepEqual(ok.value, { time: 7 })
    assert.deepEqual(seen[0], { op: 'relay.ping', args: {} })

    socket.serverSend(requestFrame('r2', 'test.explode', {}))
    const failed = await waitFor(() => socket.sent.find((frame) => frame.t === 'res' && frame.id === 'r2'))
    assert.equal(failed.ok, false)
    assert.equal(failed.error.code, 'internal')
  } finally {
    transport.stop()
  }
})

test('relay-open streams push items, end, and react to cancel', async () => {
  const streams = []
  const { transport, socket } = await openTransport({
    onStream: (op, args, stream) => {
      streams.push({ op, args, stream })
    },
  })
  try {
    socket.serverSend(openFrame('s1', 'session.follow', { sessionId: 's1' }))
    await waitFor(() => streams.length === 1)
    const stream = streams[0].stream
    assert.equal(streams[0].op, 'session.follow')

    assert.equal(stream.push({ type: 'snapshot' }), true)
    assert.equal(socket.lastSent.t, 'item')
    stream.push({ type: 'event' }, 42)
    assert.equal(socket.lastSent.seq, 42)

    stream.end('complete')
    assert.equal(socket.lastSent.t, 'end')
    assert.equal(socket.lastSent.reason, 'complete')
    assert.equal(stream.closed, true)
    assert.equal(stream.push({ type: 'event' }, 43), false)

    let cancelled = false
    socket.serverSend(openFrame('s2', 'session.follow', { sessionId: 's2' }))
    await waitFor(() => streams.length === 2)
    streams[1].stream.onCancel(() => {
      cancelled = true
    })
    socket.serverSend({ t: 'cancel', id: 's2' })
    await waitFor(() => cancelled)
    assert.equal(streams[1].stream.closed, true)
  } finally {
    transport.stop()
  }
})

test('stream count is capped by the advertised limit', async () => {
  const { transport, socket } = await openTransport({ onStream: () => {}, maxStreams: 1 })
  try {
    socket.serverSend(openFrame('s1', 'session.follow', { sessionId: 's1' }))
    await tick()
    socket.serverSend(openFrame('s2', 'session.follow', { sessionId: 's2' }))
    const overflow = await waitFor(() => socket.sent.find((frame) => frame.t === 'end' && frame.id === 's2'))
    assert.equal(overflow.reason, 'overflow')
  } finally {
    transport.stop()
  }
})

test('a dropped socket rejects pending work and reconnects with a new hello', async () => {
  const { transport, socket } = await openTransport()
  try {
    const pending = transport.request('session.list', {}, { timeoutMs: 5000 })
    socket.serverDrop()
    await assert.rejects(pending, (error) => error.code === 'transport/closed')

    await waitFor(() => FakeWebSocket.instances.length === 2)
    const second = FakeWebSocket.last
    const hello = await waitFor(() => second.sent.find((frame) => frame.t === 'hello'))
    assert.equal(hello.t, 'hello')
    second.serverSend(helloOkFrame({ serverTime: 2 }))
    await waitFor(() => transport.status === 'ready')
  } finally {
    transport.stop()
  }
})

test('stop() refuses further work and closes the socket', async () => {
  const { transport, socket } = await openTransport()
  const pending = transport.request('session.list', {}, { timeoutMs: 5000 })
  transport.stop()
  await assert.rejects(pending, (error) => error.code === 'transport/closed')
  assert.equal(transport.status, 'stopped')
  assert.equal(socket.readyState, 3)
  await assert.rejects(
    () => transport.request('session.list'),
    (error) => error.code === 'transport/not-ready',
  )
})

test('heartbeat pings and then declares the connection dead', async () => {
  let heartbeat
  let clock = 0
  FakeWebSocket.reset()
  const { identity } = identityFixture()
  const statuses = []
  const transport = new RemoteTransport({
    url: 'wss://relay.test/ws',
    identity,
    getAccessToken: () => 'at',
    WebSocket: FakeWebSocket,
    heartbeatMs: 10,
    requestTimeoutMs: 50,
    reconnect: { minMs: 1000, maxMs: 1000 },
    now: () => clock,
    setInterval: (callback) => {
      heartbeat = callback
      return 77
    },
    clearInterval: () => {},
    onStatus: (status) => statuses.push(status),
  })
  try {
    transport.start()
    const socket = await waitFor(() => FakeWebSocket.last)
    await waitFor(() => socket.readyState === 1)
    socket.serverSend(helloOkFrame({ serverTime: 1 }))
    await waitFor(() => heartbeat !== undefined)

    heartbeat()
    assert.equal(socket.lastSent.t, 'ping')

    clock = 10_000
    heartbeat()
    await waitFor(() => statuses.some((status) => status.status === 'reconnecting'))
  } finally {
    transport.stop()
  }
})
