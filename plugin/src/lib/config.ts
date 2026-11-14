/**
 * Configuration defaults and normalization for the personal hub bundle.
 *
 * Normalization never throws: an invalid value falls back to its default, so a
 * typo in the profile patch cannot keep the whole plugin from mounting.
 */

/** Telegram remote control options. */
export interface TelegramConfig {
  enabled: boolean
  token: string
  tokenEnv: string
  tokenFile: string
  allowedChatIds: string[]
  cwd: string
  pollTimeoutSec: number
  requestTimeoutMs: number
  progressIntervalMs: number
  pushResponses: boolean
  pushChanges: boolean
}

/** The phone-first Web Remote bridge: an outbound relay connection plus pairing. */
export interface WebRemoteConfig {
  enabled: boolean
  /** Relay base URL, for example `https://chat.example.com` or `wss://host/ws`. */
  relayUrl: string
  /** Machine name shown on the approval screen; empty uses the OS hostname. */
  deviceName: string
  /** Data directory; empty uses `<DSH_HOME>/personal-hub/web-remote`. */
  dataDir: string
  /** Start the device pairing flow automatically when no token is stored. */
  autoPair: boolean
  /** Scopes requested during pairing. */
  scopes: string[]
  approvalTimeoutMs: number
  questionTimeoutMs: number
  requestTimeoutMs: number
  heartbeatMs: number
  reconnectMinMs: number
  reconnectMaxMs: number
}

/** How a model drafts a change request. */
export interface PullConfig {
  enabled: boolean
  base: string
  provider: string
  model: string
  push: boolean
  timeoutMs: number
  maxOutputTokens: number
  contextBytes: number
  commitLimit: number
}

/** How a model drafts a commit message. */
export interface CommitConfig {
  enabled: boolean
  provider: string
  model: string
  timeoutMs: number
  maxOutputTokens: number
  contextBytes: number
  /** Recent commit subjects offered to the model as a style guide. */
  styleLimit: number
  /** Longest subject line the plugin keeps. */
  maxSubjectLength: number
}

/** The cleanup rules for checkouts nobody uses. */
export interface WorktreeCleanupConfig {
  enabled: boolean
  checkMs: number
  inactiveDays: number
  whenNoCommits: boolean
  noCommitsAfterHours: number
  keepChanges: 'tracked' | 'any' | 'none'
  deleteBranch: boolean
}

/** Per-Session worktrees. */
export interface WorktreeConfig {
  enabled: boolean
  directory: string
  namePrefix: string
  naming: 'id' | 'semantic'
  nameInstructions: string
  base: string
  source: 'local' | 'remote'
  remote: string
  cleanup: WorktreeCleanupConfig
}

/** What happens once a Session's change request is merged. */
export interface MergedConfig {
  enabled: boolean
  removeWorktree: boolean
  deleteBranch: boolean
  archiveSession: boolean
  checkMs: number
}

/** The Git panel and its actions. */
export interface GitConfig {
  enabled: boolean
  forge: 'auto' | 'github' | 'gitlab' | 'none'
  /**
   * Self-hosted GitLab instances. Entries may be hostnames (`gitlab.example.com`)
   * or base URLs (`https://gitlab.example.com`); matching is by hostname.
   */
  gitlabHosts: string[]
  remote: string
  cliPath: string
  tokenEnv: string
  /** Environment variable holding a GitLab personal access token for the REST fallback. */
  gitlabTokenEnv: string
  commandTimeoutMs: number
  worktreeTimeoutMs: number
  maxDiffBytes: number
  maxUntrackedBytes: number
  maxUntrackedFiles: number
  logLimit: number
  pullLimit: number
  issueLimit: number
  cacheMs: number
  refreshMs: number
  pull: PullConfig
  commit: CommitConfig
  worktree: WorktreeConfig
  merged: MergedConfig
}

/** The normalized configuration one plugin row carries. */
export interface HubConfig {
  telegram: TelegramConfig
  webRemote: WebRemoteConfig
  git: GitConfig
}

/** Telegram defaults. */
export const TELEGRAM_DEFAULTS = Object.freeze({
  enabled: true,
  token: '',
  tokenEnv: 'DSH_TELEGRAM_BOT_TOKEN',
  tokenFile: '',
  allowedChatIds: [] as string[],
  cwd: '',
  pollTimeoutSec: 25,
  requestTimeoutMs: 900000,
  progressIntervalMs: 1500,
  /** Push each intermediate assistant response into the chat. */
  pushResponses: true,
  /** Push the turn's changed-files summary into the chat. */
  pushChanges: true,
})

/** Web Remote bridge defaults. */
export const WEB_REMOTE_DEFAULTS = Object.freeze({
  enabled: false,
  /** Relay base URL, e.g. `https://chat.example.com` or `wss://host/ws`. */
  relayUrl: '',
  /** Machine name shown on the approval screen; empty uses the OS hostname. */
  deviceName: '',
  /** Data directory; empty uses `<DSH_HOME>/personal-hub/web-remote`. */
  dataDir: '',
  /** Start the device pairing flow automatically when no token is stored. */
  autoPair: true,
  /** Scopes requested during pairing. */
  scopes: ['chat', 'approval'] as string[],
  approvalTimeoutMs: 300000,
  questionTimeoutMs: 300000,
  requestTimeoutMs: 60000,
  heartbeatMs: 25000,
  reconnectMinMs: 1000,
  reconnectMaxMs: 30000,
})

/** Git defaults. */
export const GIT_DEFAULTS = Object.freeze({  enabled: true,
  /** `auto` detects the code host from the remote; `none` disables pull requests and issues. */
  forge: 'auto',
  /** Self-hosted GitLab hosts, beyond gitlab.com. */
  gitlabHosts: [] as string[],
  /** Remote to prefer; empty means the branch's upstream remote, then `origin`. */
  remote: '',
  /** Code host CLI to run (`gh`, `glab`, or an absolute path); empty picks by provider. */
  cliPath: '',
  /** Environment variable holding a GitHub token for the REST fallback. */
  tokenEnv: 'GITHUB_TOKEN',
  /** Environment variable holding a GitLab token for the REST fallback. */
  gitlabTokenEnv: 'GITLAB_TOKEN',
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
  /** Drafting a commit message with a model. */
  commit: Object.freeze({
    enabled: true,
    provider: '',
    model: '',
    timeoutMs: 60000,
    maxOutputTokens: 512,
    contextBytes: 50000,
    styleLimit: 12,
    maxSubjectLength: 72,
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
    /**
     * Where a new worktree starts: `local` (recent local branches) or `remote`
     * (fetched remote branches). `remote` is the default, so a new Session
     * starts from the code host's branch; a repository without remote branches
     * falls back to `local` on its own.
     */
    source: 'remote',
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

/** A plain record, the shape every raw config value starts as. */
type Raw = Record<string, unknown>

function asRecord(value: unknown): Raw {
  return value !== null && typeof value === 'object' ? (value as Raw) : {}
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function asPositiveInteger(
  value: unknown,
  fallback: number,
  { min = 1, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
): number {
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asStringList(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback]
  const list = value.map((item) => String(item).trim()).filter((item) => item.length > 0)
  return list.length > 0 ? list : [...fallback]
}

/**
 * Read a host list that may be an array or one comma/newline-separated string.
 * @param value raw configuration value.
 */
function asHostList(value: unknown): string[] {
  const items = typeof value === 'string'
    ? value.split(/[\s,]+/)
    : Array.isArray(value)
      ? value.map((item) => String(item))
      : []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const host = item.trim().replace(/\/+$/, '')
    if (host.length === 0) continue
    const key = host.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(host)
  }
  return result
}

function asChoice<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return choices.includes(text as T) ? (text as T) : fallback
}

/**
 * Fill every option, rejecting nothing: an invalid value falls back to its
 * default so a typo never keeps the whole plugin from mounting.
 *
 * @param raw row config from `cordis.patch.yml`
 */
export function normalizeConfig(raw: unknown): HubConfig {
  const root = asRecord(raw)
  const telegram = asRecord(root.telegram)
  const allowedChatIds = Array.isArray(telegram.allowedChatIds) ? telegram.allowedChatIds : []
  const git = asRecord(root.git)
  const pull = asRecord(git.pull)
  const commit = asRecord(git.commit)
  const worktree = asRecord(git.worktree)
  const cleanup = asRecord(worktree.cleanup)
  const merged = asRecord(git.merged)
  const webRemote = asRecord(root.webRemote)
  const reconnectMinMs = asPositiveInteger(webRemote.reconnectMinMs, WEB_REMOTE_DEFAULTS.reconnectMinMs, { min: 250, max: 60000 })
  const reconnectMaxMs = asPositiveInteger(webRemote.reconnectMaxMs, WEB_REMOTE_DEFAULTS.reconnectMaxMs, { min: reconnectMinMs, max: 300000 })
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
    webRemote: {
      enabled: asBoolean(webRemote.enabled, WEB_REMOTE_DEFAULTS.enabled),
      relayUrl: asString(webRemote.relayUrl, WEB_REMOTE_DEFAULTS.relayUrl).trim(),
      deviceName: asString(webRemote.deviceName, WEB_REMOTE_DEFAULTS.deviceName).trim(),
      dataDir: asString(webRemote.dataDir, WEB_REMOTE_DEFAULTS.dataDir).trim(),
      autoPair: asBoolean(webRemote.autoPair, WEB_REMOTE_DEFAULTS.autoPair),
      scopes: asStringList(webRemote.scopes, WEB_REMOTE_DEFAULTS.scopes),
      approvalTimeoutMs: asPositiveInteger(
        webRemote.approvalTimeoutMs,
        WEB_REMOTE_DEFAULTS.approvalTimeoutMs,
        { min: 5000, max: 3600000 },
      ),
      questionTimeoutMs: asPositiveInteger(
        webRemote.questionTimeoutMs,
        WEB_REMOTE_DEFAULTS.questionTimeoutMs,
        { min: 5000, max: 3600000 },
      ),
      requestTimeoutMs: asPositiveInteger(
        webRemote.requestTimeoutMs,
        WEB_REMOTE_DEFAULTS.requestTimeoutMs,
        { min: 1000, max: 600000 },
      ),
      heartbeatMs: asPositiveInteger(webRemote.heartbeatMs, WEB_REMOTE_DEFAULTS.heartbeatMs, { min: 1000, max: 120000 }),
      reconnectMinMs,
      reconnectMaxMs,
    },
    git: {
      enabled: asBoolean(git.enabled, GIT_DEFAULTS.enabled),
      forge: asChoice(git.forge, ['auto', 'github', 'gitlab', 'none'] as const, GIT_DEFAULTS.forge),
      gitlabHosts: asHostList(git.gitlabHosts),
      remote: asString(git.remote, GIT_DEFAULTS.remote).trim(),
      cliPath: asString(git.cliPath, GIT_DEFAULTS.cliPath).trim(),
      tokenEnv: asString(git.tokenEnv, GIT_DEFAULTS.tokenEnv).trim(),
      gitlabTokenEnv: asString(git.gitlabTokenEnv, GIT_DEFAULTS.gitlabTokenEnv).trim(),
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
      commit: {
        enabled: asBoolean(commit.enabled, GIT_DEFAULTS.commit.enabled),
        provider: asString(commit.provider, GIT_DEFAULTS.commit.provider).trim(),
        model: asString(commit.model, GIT_DEFAULTS.commit.model).trim(),
        timeoutMs: asPositiveInteger(commit.timeoutMs, GIT_DEFAULTS.commit.timeoutMs, { min: 5000, max: 600000 }),
        maxOutputTokens: asPositiveInteger(commit.maxOutputTokens, GIT_DEFAULTS.commit.maxOutputTokens, { min: 64, max: 8192 }),
        contextBytes: asPositiveInteger(commit.contextBytes, GIT_DEFAULTS.commit.contextBytes, { min: 1024 }),
        styleLimit: asPositiveInteger(commit.styleLimit, GIT_DEFAULTS.commit.styleLimit, { min: 0, max: 100 }),
        maxSubjectLength: asPositiveInteger(commit.maxSubjectLength, GIT_DEFAULTS.commit.maxSubjectLength, { min: 20, max: 200 }),
      },
      worktree: {
        enabled: asBoolean(worktree.enabled, GIT_DEFAULTS.worktree.enabled),
        directory: asString(worktree.directory, GIT_DEFAULTS.worktree.directory).trim() || GIT_DEFAULTS.worktree.directory,
        namePrefix: asString(worktree.namePrefix, GIT_DEFAULTS.worktree.namePrefix).trim(),
        naming: asChoice(worktree.naming, ['id', 'semantic'] as const, GIT_DEFAULTS.worktree.naming),
        nameInstructions: asString(worktree.nameInstructions, GIT_DEFAULTS.worktree.nameInstructions).trim(),
        base: asString(worktree.base, GIT_DEFAULTS.worktree.base).trim(),
        source: asChoice(worktree.source, ['local', 'remote'] as const, GIT_DEFAULTS.worktree.source),
        remote: asString(worktree.remote, GIT_DEFAULTS.worktree.remote).trim(),
        cleanup: {
          enabled: asBoolean(cleanup.enabled, GIT_DEFAULTS.worktree.cleanup.enabled),
          checkMs: asPositiveInteger(cleanup.checkMs, GIT_DEFAULTS.worktree.cleanup.checkMs, { min: 300000, max: 86400000 }),
          inactiveDays: asPositiveInteger(cleanup.inactiveDays, GIT_DEFAULTS.worktree.cleanup.inactiveDays, { min: 0, max: 3650 }),
          whenNoCommits: asBoolean(cleanup.whenNoCommits, GIT_DEFAULTS.worktree.cleanup.whenNoCommits),
          noCommitsAfterHours: asPositiveInteger(cleanup.noCommitsAfterHours, GIT_DEFAULTS.worktree.cleanup.noCommitsAfterHours, { min: 0, max: 8760 }),
          keepChanges: asChoice(cleanup.keepChanges, ['tracked', 'any', 'none'] as const, GIT_DEFAULTS.worktree.cleanup.keepChanges),
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
