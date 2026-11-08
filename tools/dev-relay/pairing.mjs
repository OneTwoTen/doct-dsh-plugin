/** Pairing primitives for the development relay: codes, opaque tokens, fingerprints. */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Crockford base32 without I, L, O, U â€” easy to read over a phone. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function generateUserCode() {
  const bytes = randomBytes(8)
  let text = ''
  for (const byte of bytes) text += ALPHABET[byte % ALPHABET.length]
  return `${text.slice(0, 4)}-${text.slice(4)}`
}

export function normalizeUserCode(input) {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
}

export function generateDeviceCode() {
  return `dc_${randomBytes(18).toString('base64url')}`
}

export function generateAccessToken() {
  return `at_${randomBytes(32).toString('base64url')}`
}

export function generateRefreshToken() {
  return `rt_${randomBytes(32).toString('base64url')}`
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

export function tokenEquals(left, right) {
  const a = Buffer.from(String(left))
  const b = Buffer.from(String(right))
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Same presentation as the plugin: `SHA256:AB:CD:â€¦` over the first 16 bytes. */
export function fingerprintFor(publicKeyBase64) {
  const digest = createHash('sha256').update(Buffer.from(publicKeyBase64, 'base64')).digest('hex')
  const pairs = digest.slice(0, 32).toUpperCase().match(/.{2}/g) ?? []
  return `SHA256:${pairs.join(':')}`
}

export function isValidPublicKey(value) {
  if (typeof value !== 'string' || value.length < 32 || value.length > 4096) return false
  try {
    const der = Buffer.from(value, 'base64')
    return der.length >= 32
  } catch {
    return false
  }
}

export function summarizeDevice(device) {
  return {
    id: device.id,
    name: device.name,
    platform: device.platform,
    status: device.status,
    fingerprint: device.fingerprint,
    online: device.ws !== undefined,
    created_at: device.createdAt,
    approved_at: device.approvedAt ?? null,
    last_seen_at: device.lastSeenAt ?? null,
  }
}
