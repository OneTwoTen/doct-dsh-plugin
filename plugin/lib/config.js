/** Configuration defaults and normalization for the personal hub bundle. */

export const TELEGRAM_DEFAULTS = Object.freeze({
  enabled: true,
  token: '',
  tokenEnv: 'DSH_TELEGRAM_BOT_TOKEN',
  tokenFile: '',
  allowedChatIds: [],
  cwd: '',
  pollTimeoutSec: 25,
  requestTimeoutMs: 900000,
  progressIntervalMs: 1500,
})

function asBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function asPositiveInteger(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

/**
 * Fill every telegram option, rejecting nothing: an invalid value falls back to
 * its default so a typo never keeps the whole plugin from mounting.
 *
 * @param {unknown} raw row config from `cordis.patch.yml`
 */
export function normalizeConfig(raw) {
  const root = raw && typeof raw === 'object' ? raw : {}
  const telegram = root.telegram && typeof root.telegram === 'object' ? root.telegram : {}
  const allowedChatIds = Array.isArray(telegram.allowedChatIds) ? telegram.allowedChatIds : []
  return {
    telegram: {
      enabled: asBoolean(telegram.enabled, TELEGRAM_DEFAULTS.enabled),
      token: asString(telegram.token, TELEGRAM_DEFAULTS.token).trim(),
      tokenEnv: asString(telegram.tokenEnv, TELEGRAM_DEFAULTS.tokenEnv).trim(),
      tokenFile: asString(telegram.tokenFile, TELEGRAM_DEFAULTS.tokenFile).trim(),
      allowedChatIds: allowedChatIds
        .map((id) => String(id).trim())
        .filter((id) => id.length > 0),
      cwd: asString(telegram.cwd, TELEGRAM_DEFAULTS.cwd).trim(),
      pollTimeoutSec: asPositiveInteger(telegram.pollTimeoutSec, TELEGRAM_DEFAULTS.pollTimeoutSec, { min: 1, max: 50 }),
      requestTimeoutMs: asPositiveInteger(telegram.requestTimeoutMs, TELEGRAM_DEFAULTS.requestTimeoutMs, { min: 5000 }),
      progressIntervalMs: asPositiveInteger(telegram.progressIntervalMs, TELEGRAM_DEFAULTS.progressIntervalMs, { min: 250 }),
    },
  }
}
