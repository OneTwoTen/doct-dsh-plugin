import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { test } from 'node:test'

import { createRelayServer } from '../relay.mjs'
import { signHello } from '../../../plugin/lib/remote-device.js'

const WEB_TOKEN = 'web_test_token'

async function startRelay() {
  const relay = createRelayServer({ webToken: WEB_TOKEN })
  const address = await relay.listen(0, '127.0.0.1')
  const port = address.port
  return {
    relay,
    base: `http://127.0.0.1:${port}`,
    wsBase: `ws://127.0.0.1:${port}/ws`,
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  return { status: response.status, body: text.length === 0 ? undefined : JSON.parse(text) }
}

async function pairDevice(base, { name = 'PC-Test' } = {}) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const pubkey = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')

  const authorized = await fetchJson(`${base}/v1/device/authorize`, {
    method: 'POST',
    body: { name, platform: 'test', pubkey, device_id: 'dev_0123456789abcdef', scopes: ['chat', 'approval'] },
  })
  assert.equal(authorized.status, 201)
  assert.match(authorized.body.user_code, /^[0-9A-Z]{4}-[0-9A-Z]{4}$/)

  const pending = await fetchJson(`${base}/v1/device/token`, {
    method: 'POST',
    body: { device_code: authorized.body.device_code },
  })
  assert.equal(pending.body.error, 'authorization_pending')

  const approved = await fetchJson(`${base}/v1/pair/approve`, {
    method: 'POST',
    body: { code: authorized.body.user_code },
  })
  assert.equal(approved.status, 200)
  assert.equal(approved.body.device.status, 'active')

  const issued = await fetchJson(`${base}/v1/device/token`, {
    method: 'POST',
    body: { device_code: authorized.body.device_code },
  })
  assert.equal(issued.status, 200)
  assert.equal(issued.body.device_id, 'dev_0123456789abcdef')

  return {
    privateKey,
    pubkey,
    userCode: authorized.body.user_code,
    deviceCode: authorized.body.device_code,
    deviceId: issued.body.device_id,
    tokens: issued.body,
  }
}

function openSocket(url, protocols) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, protocols)
    const client = {
      socket,
      queue: [],
      waiters: [],
      closed: undefined,
    }
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
    socket.addEventListener('close', (event) => {
      client.closed = { code: event.code, reason: event.reason }
      for (const waiter of client.waiters.splice(0)) {
        clearTimeout(waiter.timer)
        waiter.reject(new Error(`socket closed (${event.code}) while waiting`))
      }
    })
    client.send = (frame) => socket.send(JSON.stringify(frame))
    client.next = (predicate, timeoutMs = 3000) => {
      const index = client.queue.findIndex(predicate)
      if (index >= 0) return Promise.resolve(client.queue.splice(index, 1)[0])
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const position = client.waiters.indexOf(waiter)
          if (position >= 0) client.waiters.splice(position, 1)
          reject(new Error('timeout waiting for a frame'))
        }, timeoutMs)
        const waiter = { predicate, resolve, reject, timer }
        client.waiters.push(waiter)
      })
    }
    client.close = () => socket.close()
  })
}

async function connectDevice(wsBase, pair) {
  const client = await openSocket(wsBase, [
    'dsh-remote.v1',
    `bearer.${pair.tokens.access_token}`,
    `device.${pair.deviceId}`,
  ])
  const hello = signHello({ deviceId: pair.deviceId, privateKey: pair.privateKey }, { ts: Date.now() })
  client.send({ t: 'hello', v: 1, ...hello })
  const ok = await client.next((frame) => frame.t === 'hello.ok')
  assert.equal(ok.v, 1)
  return client
}

async function connectWeb(wsBase, token = WEB_TOKEN) {
  const client = await openSocket(wsBase, ['dsh-remote.v1', `webbearer.${token}`])
  await client.next((frame) => frame.t === 'hello.ok')
  return client
}

test('pairing issues tokens only after approval and rotates refresh tokens', async () => {
  const { relay, base } = await startRelay()
  try {
    const pair = await pairDevice(base)
    const reused = await fetchJson(`${base}/v1/device/token`, {
      method: 'POST',
      body: { device_code: pair.deviceCode },
    })
    assert.equal(reused.body.error, 'invalid_grant')

    const rotated = await fetchJson(`${base}/v1/token/refresh`, {
      method: 'POST',
      body: { refresh_token: pair.tokens.refresh_token },
    })
    assert.equal(rotated.status, 200)
    assert.notEqual(rotated.body.access_token, pair.tokens.access_token)

    const oldToken = await fetchJson(`${base}/v1/token/refresh`, {
      method: 'POST',
      body: { refresh_token: pair.tokens.refresh_token },
    })
    assert.equal(oldToken.status, 401)
  } finally {
    await relay.close()
  }
})

test('the pair page shows machine details and the approved device appears in the list', async () => {
  const { relay, base } = await startRelay()
  try {
    const { privateKey: _privateKey, ...pair } = await pairDevice(base, { name: 'Studio-PC' })
    void _privateKey
    const page = await fetch(`${base}/pair?code=${encodeURIComponent(pair.userCode)}`)
    const html = await page.text()
    assert.match(html, /Studio-PC/)
    assert.match(html, /SHA256:/)
    assert.match(html, /Duyệt thiết bị/)

    const listed = await fetch(`${base}/v1/devices`, {
      headers: { authorization: `Bearer ${WEB_TOKEN}` },
    })
    const body = await listed.json()
    assert.equal(body.items[0].status, 'active')
    assert.equal(body.items[0].online, false)
  } finally {
    await relay.close()
  }
})

test('wrong WebSocket credentials are refused', async () => {
  const { relay, wsBase } = await startRelay()
  try {
    await assert.rejects(
      () => openSocket(wsBase, ['dsh-remote.v1', 'webbearer.nope']),
      /failed to open/,
    )
    const pair = await pairDevice(`http://127.0.0.1:${new URL(wsBase).port}`)
    await assert.rejects(
      () => openSocket(wsBase, ['dsh-remote.v1', `bearer.${pair.tokens.access_token}`, 'device.dev_wrong']),
      /failed to open/,
    )
  } finally {
    await relay.close()
  }
})

test('the device must open with a valid hello before serving requests', async () => {
  const { relay, base, wsBase } = await startRelay()
  try {
    const pair = await pairDevice(base)
    const client = await openSocket(wsBase, [
      'dsh-remote.v1',
      `bearer.${pair.tokens.access_token}`,
      `device.${pair.deviceId}`,
    ])
    client.send({ t: 'hello', v: 1, deviceId: pair.deviceId, ts: Date.now(), nonce: 'nonce-123456', sig: 'x'.repeat(64) })
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(client.closed?.code, 4001)
  } finally {
    await relay.close()
  }
})

test('web requests reach the device and responses return to the web', async () => {
  const { relay, base, wsBase } = await startRelay()
  try {
    const pair = await pairDevice(base)
    const device = await connectDevice(wsBase, pair)
    const web = await connectWeb(wsBase)

    web.send({ t: 'req', id: 'req_1', op: 'session.list', args: {} })
    const forwarded = await device.next((frame) => frame.t === 'req' && frame.id === 'req_1')
    assert.equal(forwarded.op, 'session.list')

    device.send({ t: 'res', id: 'req_1', ok: true, value: { items: [] } })
    const response = await web.next((frame) => frame.t === 'res' && frame.id === 'req_1')
    assert.deepEqual(response.value, { items: [] })

    web.close()
    device.close()
  } finally {
    await relay.close()
  }
})

test('an approval request travels device → web → device with the same id', async () => {
  const { relay, base, wsBase } = await startRelay()
  try {
    const pair = await pairDevice(base)
    const device = await connectDevice(wsBase, pair)
    const web = await connectWeb(wsBase)

    device.send({
      t: 'req',
      id: 'ap_1',
      op: 'approval.ask',
      args: { approvalId: 'a1', sessionId: 's1', toolName: 'bash' },
    })
    const asked = await web.next((frame) => frame.t === 'req' && frame.id === 'ap_1')
    assert.equal(asked.args.toolName, 'bash')

    web.send({ t: 'res', id: 'ap_1', ok: true, value: { outcome: 'allowed-once' } })
    const answered = await device.next((frame) => frame.t === 'res' && frame.id === 'ap_1')
    assert.equal(answered.value.outcome, 'allowed-once')

    web.close()
    device.close()
  } finally {
    await relay.close()
  }
})

test('stream frames are routed in both directions and cancel reaches the device', async () => {
  const { relay, base, wsBase } = await startRelay()
  try {
    const pair = await pairDevice(base)
    const device = await connectDevice(wsBase, pair)
    const web = await connectWeb(wsBase)

    web.send({ t: 'open', id: 'stream_1', op: 'session.follow', args: { sessionId: 's1' } })
    const opened = await device.next((frame) => frame.t === 'open' && frame.id === 'stream_1')
    assert.equal(opened.op, 'session.follow')

    device.send({ t: 'item', id: 'stream_1', seq: 4, item: { type: 'event', event: { seq: 4 } } })
    const item = await web.next((frame) => frame.t === 'item' && frame.id === 'stream_1')
    assert.equal(item.seq, 4)

    web.send({ t: 'cancel', id: 'stream_1' })
    const cancelled = await device.next((frame) => frame.t === 'cancel' && frame.id === 'stream_1')
    assert.equal(cancelled.id, 'stream_1')

    web.close()
    device.close()
  } finally {
    await relay.close()
  }
})

test('without a device the web receives a structured failure', async () => {
  const { relay, wsBase } = await startRelay()
  try {
    const web = await connectWeb(wsBase)
    web.send({ t: 'req', id: 'req_1', op: 'session.list', args: {} })
    const response = await web.next((frame) => frame.t === 'res' && frame.id === 'req_1')
    assert.equal(response.ok, false)
    assert.equal(response.error.code, 'transport/not-ready')

    web.send({ t: 'open', id: 'stream_1', op: 'session.follow', args: { sessionId: 's1' } })
    const end = await web.next((frame) => frame.t === 'end' && frame.id === 'stream_1')
    assert.equal(end.reason, 'error')
    web.close()
  } finally {
    await relay.close()
  }
})

test('revoking a device closes its socket and fails pending web work', async () => {
  const { relay, base, wsBase } = await startRelay()
  try {
    const pair = await pairDevice(base)
    const device = await connectDevice(wsBase, pair)
    const web = await connectWeb(wsBase)

    web.send({ t: 'open', id: 'stream_1', op: 'session.follow', args: { sessionId: 's1' } })
    await device.next((frame) => frame.t === 'open' && frame.id === 'stream_1')

    const revoked = await fetchJson(`${base}/v1/devices/${pair.deviceId}/revoke`, {
      method: 'POST',
      headers: { authorization: `Bearer ${WEB_TOKEN}` },
    })
    assert.equal(revoked.status, 200)

    const end = await web.next((frame) => frame.t === 'end' && frame.id === 'stream_1')
    assert.equal(end.reason, 'error')
    await new Promise((resolve) => setTimeout(resolve, 50))
    assert.equal(device.closed?.code, 4003)

    web.close()
    device.close()
  } finally {
    await relay.close()
  }
})
