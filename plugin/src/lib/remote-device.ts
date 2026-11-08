/**
 * Device identity for Web Remote: one Ed25519 keypair per DSH installation.
 *
 * The private key never leaves the machine. A relay only ever sees the SPKI
 * public key; every reconnect proves possession by signing the `hello` frame
 * with a fresh nonce (see `protocol/README.md`).
 */
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  verify,
} from 'node:crypto'
import type { KeyObject } from 'node:crypto'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Prefix mixed into the signature so the same key cannot sign another protocol. */
const HELLO_CONTEXT = 'dsh-remote-hello'

/** The fields one `hello` signature covers. */
export interface HelloSigningFields {
  v?: number
  deviceId: string
  ts: number
  nonce: string
}

/** Build the exact string an Ed25519 `hello` signature covers. */
export function helloSigningText({ v = 1, deviceId, ts, nonce }: HelloSigningFields): string {
  return `${HELLO_CONTEXT}|${v}|${deviceId}|${ts}|${nonce}`
}

/** 16 random bytes, URL-safe; replay cache key on the relay. */
export function makeNonce(): string {
  return randomBytes(16).toString('base64url')
}

/** `dev_` + a stable digest of the public key, so no state file is required. */
export function deviceIdFor(publicKeyBase64: string): string {
  const digest = createHash('sha256').update(Buffer.from(publicKeyBase64, 'base64')).digest('hex')
  return `dev_${digest.slice(0, 16)}`
}

/** `SHA256:AB:CD:…` over the first 16 bytes, for humans comparing screens. */
export function fingerprintFor(publicKeyBase64: string): string {
  const digest = createHash('sha256').update(Buffer.from(publicKeyBase64, 'base64')).digest('hex')
  const pairs = digest.slice(0, 32).toUpperCase().match(/.{2}/g) ?? []
  return `SHA256:${pairs.join(':')}`
}

/** SPKI DER, base64: the form a relay stores and `verifyHello` accepts. */
export function publicKeyBase64Of(publicKey: KeyObject): string {
  return publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
}

/** One installation's keypair plus the identifiers derived from it. */
export interface DeviceIdentity {
  deviceId: string
  keyFile: string
  privateKey: KeyObject
  publicKey: KeyObject
  publicKeyBase64: string
  fingerprint: string
}

/** Where the key file lives. */
export interface LoadIdentityOptions {
  dir: string
  keyFile?: string
}

/**
 * Load `device.key`, or create it on first use.
 *
 * The key file is written with mode 0600 (POSIX) inside a 0700 directory. On
 * Windows the mode is advisory; DPAPI-backed storage is a later upgrade.
 */
export async function loadOrCreateIdentity({ dir, keyFile = join(dir, 'device.key') }: LoadIdentityOptions): Promise<DeviceIdentity> {
  await mkdir(dir, { recursive: true, mode: 0o700 })

  let pem: string | undefined
  try {
    pem = await readFile(keyFile, 'utf8')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  if (pem === undefined || pem.trim().length === 0) {
    const { privateKey } = generateKeyPairSync('ed25519')
    // PKCS#8 PEM export is a string; the Buffer branch belongs to DER exports.
    pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
    try {
      await writeFile(keyFile, pem, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    } catch (error) {
      // Two mounts racing on first run: the loser reads the winner's key.
      if (error?.code !== 'EEXIST') throw error
      pem = await readFile(keyFile, 'utf8')
    }
    await chmod(keyFile, 0o600).catch(() => {})
  }

  const privateKey = createPrivateKey(pem)
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error(`device key at ${keyFile} is not Ed25519`)
  }
  const publicKey = createPublicKey(privateKey)
  const publicKeyBase64 = publicKeyBase64Of(publicKey)

  return {
    deviceId: deviceIdFor(publicKeyBase64),
    keyFile,
    privateKey,
    publicKey,
    publicKeyBase64,
    fingerprint: fingerprintFor(publicKeyBase64),
  }
}

/** The parts of an identity that signing needs. */
export interface SigningIdentity {
  deviceId: string
  privateKey: KeyObject
}

/** Fields a caller may override when signing one `hello`. */
export interface SignHelloOptions {
  ts?: number
  nonce?: string
  deviceId?: string
  v?: number
}

/** The signed fields carried by a `hello` frame. */
export interface SignedHello {
  v: number
  deviceId: string
  ts: number
  nonce: string
  sig: string
}

/**
 * Sign one `hello` frame.
 */
export function signHello(
  identity: SigningIdentity,
  { ts = Date.now(), nonce = makeNonce(), deviceId = identity.deviceId, v = 1 }: SignHelloOptions = {},
): SignedHello {
  const text = helloSigningText({ v, deviceId, ts, nonce })
  const sig = sign(null, Buffer.from(text, 'utf8'), identity.privateKey).toString('base64url')
  return { v, deviceId, ts, nonce, sig }
}

/** The fields `verifyHello` checks; all but `v` come straight off the wire. */
export interface HelloVerification {
  v?: number
  deviceId: string
  ts: number
  nonce: string
  sig: string
}

/**
 * Verify a `hello` signature with a base64 SPKI public key.
 */
export function verifyHello(publicKeyBase64: string, { v = 1, deviceId, ts, nonce, sig }: HelloVerification): boolean {
  if (typeof sig !== 'string' || typeof nonce !== 'string') return false
  try {
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    })
    const text = helloSigningText({ v, deviceId, ts, nonce })
    return verify(null, Buffer.from(text, 'utf8'), publicKey, Buffer.from(sig, 'base64url'))
  } catch {
    return false
  }
}
