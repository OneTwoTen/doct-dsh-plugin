import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  APPROVAL_OUTCOMES,
  DEFAULT_LIMITS,
  ERROR_CATALOG,
  ProtocolError,
  decodeFrame,
  encodeFrame,
  endFrame,
  errorResponseFrame,
  itemFrame,
  openFrame,
  requestFrame,
  responseFrame,
  validateFrame,
} from '../lib/remote-protocol.js'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'protocol', 'fixtures')

function fixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')).frames
}

for (const name of ['hello.json', 'unary.json', 'stream.json', 'approval.json']) {
  test(`golden frames in ${name} round-trip through the v1 codec`, () => {
    for (const frame of fixture(name)) {
      const text = encodeFrame(frame)
      assert.deepEqual(decodeFrame(text), frame)
    }
  })
}

test('unknown frame types and missing required fields are rejected', () => {
  assert.throws(() => validateFrame({ t: 'nope' }), (error) => error.code === 'bad-frame')
  assert.throws(() => validateFrame({ t: 'req', id: 'x' }), /op/)
  assert.throws(() => validateFrame({ t: 'res', id: 'x', ok: true }), /value/)
  assert.throws(() => validateFrame({ t: 'res', id: 'x', ok: false }), /error/)
  assert.throws(() => validateFrame({ t: 'end', id: 'x', reason: 'because' }), /reason/)
  assert.throws(() => validateFrame({ t: 'hello', v: 2 }), /version/)
})

test('unknown extra fields are tolerated for forward compatibility', () => {
  const frame = { ...requestFrame('r1', 'session.list', {}), future: { nested: true } }
  assert.equal(decodeFrame(JSON.stringify(frame)).future.nested, true)
})

test('the frame byte budget is enforced before and after parsing', () => {
  const frame = requestFrame('r1', 'session.prompt', { text: 'x'.repeat(2000) })
  assert.throws(
    () => encodeFrame(frame, { maxFrameBytes: 128 }),
    (error) => error instanceof ProtocolError && error.code === 'stream/overflow',
  )
  assert.throws(() => decodeFrame(JSON.stringify(frame), { maxFrameBytes: 128 }), /limit/)
})

test('invalid JSON is a bad-frame, not a crash', () => {
  assert.throws(() => decodeFrame('{'), (error) => error.code === 'bad-frame')
  assert.throws(() => decodeFrame(42), (error) => error.code === 'bad-frame')
})

test('builders emit the documented shapes', () => {
  assert.deepEqual(requestFrame('a', 'session.list'), { t: 'req', id: 'a', op: 'session.list', args: {} })
  assert.deepEqual(responseFrame('a', { ok: true }), { t: 'res', id: 'a', ok: true, value: { ok: true } })
  const failure = errorResponseFrame('a', 'session/not-found', 'gone')
  assert.equal(failure.ok, false)
  assert.equal(failure.error.code, 'session/not-found')
  assert.equal(failure.error.retryable, undefined)
  assert.deepEqual(openFrame('s', 'session.follow', { sessionId: 'x' }), {
    t: 'open',
    id: 's',
    op: 'session.follow',
    args: { sessionId: 'x' },
  })
  assert.deepEqual(itemFrame('s', { type: 'snapshot' }, 7), {
    t: 'item',
    id: 's',
    item: { type: 'snapshot' },
    seq: 7,
  })
  assert.deepEqual(endFrame('s', 'cancelled'), { t: 'end', id: 's', reason: 'cancelled' })
})

test('the error catalogue and approval outcomes stay closed', () => {
  assert.equal(ERROR_CATALOG['transport/closed'], true)
  assert.equal(ERROR_CATALOG['device/revoked'], false)
  assert.deepEqual([...APPROVAL_OUTCOMES], ['allowed-once', 'rejected', 'cancelled', 'unavailable'])
  assert.equal(DEFAULT_LIMITS.maxFrameBytes, 262144)
})
