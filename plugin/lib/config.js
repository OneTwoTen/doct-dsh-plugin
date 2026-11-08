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
  /** Longest `git fetch` or worktree command; the default command limit is too short for a network fetch. */
  worktreeTimeoutMs: 180000,
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
  /** Creating a change request with a model. */
  pull: Object.freeze({
    enabled: true,
    /** Base branch a new change request targets; empty asks the repository for its default. */
    base: '',
    /**
     * Route used to draft the title and description. Empty uses the Session's
     * current model with the lowest reasoning effort that route supports.
     */
    provider: '',
    model: '',
    /** Push the branch before creating the change request. */
    push: true,
    /** End-to-end deadline for the drafting request. */
    timeoutMs: 90000,
    /** Model output-token cap for the draft. */
    maxOutputTokens: 4096,
    /** Bytes of diff text the draft prompt may carry. */
    contextBytes: 60000,
    /** Commits the draft prompt lists. */
    commitLimit: 40,
  }),
  /** New Session worktrees. */
  worktree: Object.freeze({
    enabled: true,
    /** Directory inside the repository that holds created checkouts. */
    directory: '.agents/worktrees',
    /** Branch and directory name prefix. */
    namePrefix: 'dsh',
    /** `id` keeps `dsh-<session digits>`; `semantic` renames the branch from the first message. */
    naming: 'id',
    /** Extra instruction for the naming model, appended to its prompt. */
    nameInstructions: '',
    /** Branch the picker starts on; empty asks the repository for its default branch. */
    base: '',
    /** Where a new worktree starts: `local` (recent local branches) or `remote` (fetched remote branches). */
    source: 'local',
    /** Remote used for `source: remote`; empty follows the selected remote, then `origin`. */
    remote: '',
    /** Removing checkouts nobody uses any more. */
    cleanup: Object.freeze({
      enabled: false,
      /** Milliseconds between cleanup passes. */
      checkMs: 3600000,
      /** Remove a checkout untouched for this many days; 0 turns the rule off. */
      inactiveDays: 7,
      /** Remove a checkout whose branch never gained a commit over its base. */
      whenNoCommits: true,
      /** Grace before the no-commit rule applies, so a fresh checkout survives its first hour. */
      noCommitsAfterHours: 6,
      /** `tracked` keeps a checkout with uncommitted tracked edits, `any` also keeps untracked files, `none` ignores both. */
      keepChanges: 'tracked',
      /** Delete the branch together with its checkout. */
      deleteBranch: false,
    }),
  }),
  /** What happens once a Session's change request is merged. */
  merged: Object.freeze({
    enabled: false,
    /** Remove the worktree this Session created once its change request is merged. */
    removeWorktree: true,
    /** Delete the merged worktree branch too. */
    deleteBranch: false,
    /** Archive the Session so it leaves the active list. */
    archiveSession: true,
    /** Milliseconds between merge checks. */
    checkMs: 60000,
  }),
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
  const pull = git.pull && typeof git.pull === 'object' ? git.pull : {}
  const worktree = git.worktree && typeof git.worktree === 'object' ? git.worktree : {}
  const cleanup = worktree.cleanup && typeof worktree.cleanup === 'object' ? worktree.cleanup : {}
  const merged = git.merged && typeof git.merged === 'object' ? git.merged : {}
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
      worktreeTimeoutMs: asPositiveInteger(git.worktreeTimeoutMs, GIT_DEFAULTS.worktreeTimeoutMs, { min: 5000, max: 1800000 }),
      pull: {
        enabled: asBoolean(pull.enabled, GIT_DEFAULTS.pull.enabled),
        base: asString(pull.base, GIT_DEFAULTS.pull.base).trim(),
        provider: asString(pull.provider, GIT_DEFAULTS.pull.provider).trim(),
        model: asString(pull.model, GIT_DEFAULTS.pull.model).trim(),
        push: asBoolean(pull.push, GIT_DEFAULTS.pull.push),
        timeoutMs: asPositiveInteger(pull.timeoutMs, GIT_DEFAULTS.pull.timeoutMs, { min: 5000, max: 600000 }),
        maxOutputTokens: asPositiveInteger(pull.maxOutputTokens, GIT_DEFAULTS.pull.maxOutputTokens, { min: 256, max: 32768 }),
        contextBytes: asPositiveInteger(pull.contextBytes, GIT_DEFAULTS.pull.contextBytes, { min: 1024 }),
        commitLimit: asPositiveInteger(pull.commitLimit, GIT_DEFAULTS.pull.commitLimit, { min: 1, max: 200 }),
      },
      worktree: {
        enabled: asBoolean(worktree.enabled, GIT_DEFAULTS.worktree.enabled),
        directory: asString(worktree.directory, GIT_DEFAULTS.worktree.directory).trim() || GIT_DEFAULTS.worktree.directory,
        namePrefix: asString(worktree.namePrefix, GIT_DEFAULTS.worktree.namePrefix).trim(),
        naming: asChoice(worktree.naming, ['id', 'semantic'], GIT_DEFAULTS.worktree.naming),
        nameInstructions: asString(worktree.nameInstructions, GIT_DEFAULTS.worktree.nameInstructions).trim(),
        base: asString(worktree.base, GIT_DEFAULTS.worktree.base).trim(),
        source: asChoice(worktree.source, ['local', 'remote'], GIT_DEFAULTS.worktree.source),
        remote: asString(worktree.remote, GIT_DEFAULTS.worktree.remote).trim(),
        cleanup: {
          enabled: asBoolean(cleanup.enabled, GIT_DEFAULTS.worktree.cleanup.enabled),
          checkMs: asPositiveInteger(cleanup.checkMs, GIT_DEFAULTS.worktree.cleanup.checkMs, { min: 300000, max: 86400000 }),
          inactiveDays: asPositiveInteger(cleanup.inactiveDays, GIT_DEFAULTS.worktree.cleanup.inactiveDays, { min: 0, max: 3650 }),
          whenNoCommits: asBoolean(cleanup.whenNoCommits, GIT_DEFAULTS.worktree.cleanup.whenNoCommits),
          noCommitsAfterHours: asPositiveInteger(cleanup.noCommitsAfterHours, GIT_DEFAULTS.worktree.cleanup.noCommitsAfterHours, { min: 0, max: 8760 }),
          keepChanges: asChoice(cleanup.keepChanges, ['tracked', 'any', 'none'], GIT_DEFAULTS.worktree.cleanup.keepChanges),
          deleteBranch: asBoolean(cleanup.deleteBranch, GIT_DEFAULTS.worktree.cleanup.deleteBranch),
        },
      },
      merged: {
        enabled: asBoolean(merged.enabled, GIT_DEFAULTS.merged.enabled),
        removeWorktree: asBoolean(merged.removeWorktree, GIT_DEFAULTS.merged.removeWorktree),
        deleteBranch: asBoolean(merged.deleteBranch, GIT_DEFAULTS.merged.deleteBranch),
        archiveSession: asBoolean(merged.archiveSession, GIT_DEFAULTS.merged.archiveSession),
        checkMs: asPositiveInteger(merged.checkMs, GIT_DEFAULTS.merged.checkMs, { min: 15000, max: 3600000 }),
      },
    },
  }
}
