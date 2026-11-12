// Protocol-level end-to-end check for the Zig relay: raw HTTP + WebSocket,
// no plugin code involved. Start a relay with a known dev token, then run:
//
//   RELAY_E2E=1 node test/protocol-e2e.mjs
//
// Env: RELAY_HTTP (default http://127.0.0.1:18787), RELAY_DEV_TOKEN.
import { generateKeyPairSync, randomBytes, sign, createHash } from 'node:crypto'

if (process.env.RELAY_E2E !== '1') {
  console.log('skipped: set RELAY_E2E=1 with a running relay')
  process.exit(0)
}

const base = process.env.RELAY_HTTP ?? 'http://127.0.0.1:18787'
const wsBase = base.replace(/^http/, 'ws') + '/ws'
const devToken = process.env.RELAY_DEV_TOKEN ?? 'dev_test_token_123'

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}

async function json(method, path, body, headers = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let parsed
  try { parsed = JSON.parse(text) } catch { parsed = text }
  return { status: response.status, body: parsed }
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const pubkey = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
const digest = createHash('sha256').update(Buffer.from(pubkey, 'base64')).digest('hex')
const deviceId = `dev_${digest.slice(0, 16)}`
const webHeaders = { authorization: `Bearer ${devToken}` }

const authorized = await json('POST', '/v1/device/authorize', {
  name: 'PC test', platform: 'windows', pubkey, scopes: ['chat', 'approval'], device_id: deviceId,
})
check('authorize returns a code', authorized.status === 201 && typeof authorized.body.user_code === 'string', `status ${authorized.status}`)
const { device_code: deviceCode, user_code: userCode } = authorized.body

const anonymous = await json('POST', '/v1/pair/confirm', { code: userCode })
check('confirm requires web auth', anonymous.status === 401, `status ${anonymous.status}`)

const confirmed = await json('POST', '/v1/pair/confirm', { code: userCode }, webHeaders)
check('confirm shows the device', confirmed.status === 200 && confirmed.body.device?.name === 'PC test')

const approved = await json('POST', '/v1/pair/approve', { code: userCode }, webHeaders)
check('approve activates the device', approved.status === 200 && approved.body.device?.status === 'active')

const tokens = await json('POST', '/v1/device/token', { device_code: deviceCode })
check('token issued after approval', tokens.status === 200 && typeof tokens.body.access_token === 'string')
const { access_token: accessToken, refresh_token: refreshToken } = tokens.body

const devices = await json('GET', '/v1/devices', undefined, webHeaders)
check('device list contains the device', devices.status === 200 && devices.body.items?.some((d) => d.id === deviceId && d.status === 'active'))

const refreshed = await json('POST', '/v1/token/refresh', { refresh_token: refreshToken })
check('refresh returns a new pair', refreshed.status === 200 && refreshed.body.access_token !== accessToken)

function open(url, protocols) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, protocols)
    const timer = setTimeout(() => reject(new Error('ws timeout')), 5000)
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(socket) })
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('ws error')) })
  })
}

function nextMessage(socket, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('message timeout')), timeoutMs)
    socket.addEventListener('message', (event) => { clearTimeout(timer); resolve(JSON.parse(event.data)) }, { once: true })
  })
}

const deviceSocket = await open(wsBase, ['dsh-remote.v1', `bearer.${accessToken}`, `device.${deviceId}`])
const ts = Date.now()
const nonce = randomBytes(16).toString('base64url')
const signingText = `dsh-remote-hello|1|${deviceId}|${ts}|${nonce}`
const signature = sign(null, Buffer.from(signingText, 'utf8'), privateKey).toString('base64url')
deviceSocket.send(JSON.stringify({ t: 'hello', v: 1, deviceId, ts, nonce, sig: signature }))
const helloOk = await nextMessage(deviceSocket)
check('device hello is accepted', helloOk.t === 'hello.ok' && helloOk.limits?.maxFrameBytes === 262144)

const webSocket = await open(wsBase, ['dsh-remote.v1', `webbearer.${devToken}`])
const webHello = await nextMessage(webSocket)
check('web receives hello.ok', webHello.t === 'hello.ok')

webSocket.send(JSON.stringify({ t: 'req', id: 'r1', op: 'session.list', args: {} }))
const forwarded = await nextMessage(deviceSocket)
check('request reaches the device', forwarded.t === 'req' && forwarded.id === 'r1' && forwarded.op === 'session.list')

deviceSocket.send(JSON.stringify({ t: 'res', id: 'r1', ok: true, value: { sessions: [{ id: 's1' }] } }))
const answered = await nextMessage(webSocket)
check('response returns to the web', answered.t === 'res' && answered.id === 'r1' && answered.ok === true)

deviceSocket.send(JSON.stringify({ t: 'req', id: 'a1', op: 'approval.ask', args: { approvalId: 'ap1', sessionId: 's1', toolName: 'bash' } }))
const asked = await nextMessage(webSocket)
check('approval reaches the web', asked.t === 'req' && asked.op === 'approval.ask')

webSocket.send(JSON.stringify({ t: 'res', id: 'a1', ok: true, value: { outcome: 'allowed-once' } }))
const approvedAnswer = await nextMessage(deviceSocket)
check('approval answer returns to the device', approvedAnswer.t === 'res' && approvedAnswer.value?.outcome === 'allowed-once')

const reused = await json('POST', '/v1/token/refresh', { refresh_token: refreshToken })
check('refresh reuse is refused', reused.status === 401, `status ${reused.status}`)

const closed = new Promise((resolve) => deviceSocket.addEventListener('close', (event) => resolve(event.code), { once: true }))
await json('POST', `/v1/devices/${deviceId}/revoke`, undefined, webHeaders)
const closeCode = await Promise.race([closed, new Promise((resolve) => setTimeout(() => resolve(0), 3000))])
check('revoked device is disconnected', closeCode === 4003, `close code ${closeCode}`)

const revokedToken = await json('POST', '/v1/token/refresh', { refresh_token: refreshed.body.refresh_token })
check('revoked device cannot refresh', revokedToken.status === 401, `status ${revokedToken.status}`)

const failures = results.filter((result) => !result.ok)
console.log(`\n${results.length - failures.length}/${results.length} checks passed`)
process.exit(failures.length === 0 ? 0 : 1)
