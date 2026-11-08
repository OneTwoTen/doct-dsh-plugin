// @ts-nocheck -- ported from the JavaScript Web Remote tests; behavior is covered at runtime.
import assert from 'node:assert/strict'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  deviceIdFor,
  fingerprintFor,
  helloSigningText,
  loadOrCreateIdentity,
  makeNonce,
  signHello,
  verifyHello,
} from '../src/lib/remote-device.ts'

test('identity is created once, persisted, and reloads to the same key', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-remote-device-'))
  try {
    const first = await loadOrCreateIdentity({ dir })
    const second = await loadOrCreateIdentity({ dir })

    assert.equal(first.deviceId, second.deviceId)
    assert.equal(first.publicKeyBase64, second.publicKeyBase64)
    assert.match(first.deviceId, /^dev_[0-9a-f]{16}$/)
    assert.match(first.fingerprint, /^SHA256:([0-9A-F]{2}:){15}[0-9A-F]{2}$/)

    const info = await stat(first.keyFile)
    assert.ok(info.size > 0)
    if (process.platform !== 'win32') assert.equal(info.mode & 0o777, 0o600)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('hello signatures verify and fail closed on any tampering', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-remote-device-'))
  try {
    const identity = await loadOrCreateIdentity({ dir })
    const signed = signHello(identity, { ts: 1762560000000, nonce: makeNonce() })
    const hello = { v: 1, ...signed }

    assert.equal(verifyHello(identity.publicKeyBase64, hello), true)
    assert.equal(verifyHello(identity.publicKeyBase64, { ...hello, ts: hello.ts + 1 }), false)
    assert.equal(verifyHello(identity.publicKeyBase64, { ...hello, nonce: 'other-nonce' }), false)
    assert.equal(verifyHello(identity.publicKeyBase64, { ...hello, sig: 'not-a-signature' }), false)
    assert.equal(verifyHello('not-base64', hello), false)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('the signing context binds version, device, time, and nonce', () => {
  assert.equal(
    helloSigningText({ v: 1, deviceId: 'dev_1', ts: 10, nonce: 'n' }),
    'dsh-remote-hello|1|dev_1|10|n',
  )
})

test('device id and fingerprint derive from the public key alone', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-remote-device-'))
  try {
    const identity = await loadOrCreateIdentity({ dir })
    assert.equal(deviceIdFor(identity.publicKeyBase64), identity.deviceId)
    assert.equal(fingerprintFor(identity.publicKeyBase64), identity.fingerprint)
    assert.equal(fingerprintFor(identity.publicKeyBase64), fingerprintFor(identity.publicKeyBase64))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('a corrupt key file is rejected instead of silently replaced', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-remote-device-'))
  try {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(join(dir, 'device.key'), 'not a pem', 'utf8')
    await assert.rejects(() => loadOrCreateIdentity({ dir }))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
