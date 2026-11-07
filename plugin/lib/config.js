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
  /** Push each intermediate assistant response into the chat. */
  pushResponses: true,
  /** Push the turn's changed-files summary into the chat. */
  pushChanges: true,
})

export const GIT_DEFAULTS = Object.freeze({
  enabled: true,
  /** `auto` detects the code host from the remote; `none` disables pull requests and issues. */
  forge: 'auto',
  /** Remote to prefer; empty means the branch's upstream remote, then `origin`. */
  remote: '',
  /** Code host CLI to run (`gh`, `glab`, or an absolute path); empty picks by provider. */
  cliPath: '',
  /** Environment variable holding a GitHub token for the REST fallback. */
  tokenEnv: 'GITHUB_TOKEN',
  commandTimeoutMs: 15000,
  /** Bytes of diff text kept per file. */
  maxDiffBytes: 393216,
  /** Bytes read from one untracked file when it has no diff. */
  maxUntrackedBytes: 131072,
  /** Untracked files sized on one refresh; the rest are listed without line counts. */
  maxUntrackedFiles: 60,
  logLimit: 20,
  pullLimit: 20,
  issueLimit: 20,
  /** Milliseconds a code-host answer is reused. */
  cacheMs: 20000,
  /** Suggested client refresh interval. */
  refreshMs: 30000,
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

function asChoice(value, choices, fallback) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return choices.includes(text) ? text : fallback
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
  const git = root.git && typeof root.git === 'object' ? root.git : {}
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
      pushResponses: asBoolean(telegram.pushResponses, TELEGRAM_DEFAULTS.pushResponses),
      pushChanges: asBoolean(telegram.pushChanges, TELEGRAM_DEFAULTS.pushChanges),
    },
    git: {
      enabled: asBoolean(git.enabled, GIT_DEFAULTS.enabled),
      forge: asChoice(git.forge, ['auto', 'github', 'gitlab', 'none'], GIT_DEFAULTS.forge),
      remote: asString(git.remote, GIT_DEFAULTS.remote).trim(),
      cliPath: asString(git.cliPath, GIT_DEFAULTS.cliPath).trim(),
      tokenEnv: asString(git.tokenEnv, GIT_DEFAULTS.tokenEnv).trim(),
      commandTimeoutMs: asPositiveInteger(git.commandTimeoutMs, GIT_DEFAULTS.commandTimeoutMs, { min: 1000 }),
      maxDiffBytes: asPositiveInteger(git.maxDiffBytes, GIT_DEFAULTS.maxDiffBytes, { min: 4096 }),
      maxUntrackedBytes: asPositiveInteger(git.maxUntrackedBytes, GIT_DEFAULTS.maxUntrackedBytes, { min: 1024 }),
      maxUntrackedFiles: asPositiveInteger(git.maxUntrackedFiles, GIT_DEFAULTS.maxUntrackedFiles, { min: 1, max: 500 }),
      logLimit: asPositiveInteger(git.logLimit, GIT_DEFAULTS.logLimit, { min: 1, max: 200 }),
      pullLimit: asPositiveInteger(git.pullLimit, GIT_DEFAULTS.pullLimit, { min: 1, max: 100 }),
      issueLimit: asPositiveInteger(git.issueLimit, GIT_DEFAULTS.issueLimit, { min: 1, max: 100 }),
      cacheMs: asPositiveInteger(git.cacheMs, GIT_DEFAULTS.cacheMs, { min: 0, max: 600000 }),
      refreshMs: asPositiveInteger(git.refreshMs, GIT_DEFAULTS.refreshMs, { min: 3000, max: 600000 }),
    },
  }
}
