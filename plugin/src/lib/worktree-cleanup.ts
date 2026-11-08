/**
 * Removing checkouts nobody uses any more.
 *
 * Only checkouts this plugin created are eligible. The decision is a pure
 * function of the checkout's facts, so every rule can be tested without a
 * repository, a clock, or a session; the runner around it gathers the facts
 * with Git and applies the removal.
 */
import { stat } from 'node:fs/promises'

import type { CleanupSettings, WorktreeRecord } from '../shared/protocol.ts'
import type { GitRunner } from './worktree.ts'
import { removeWorktree } from './worktree.ts'

/** The longest a cleanup pass may wait; a shorter setting is raised to this. */
const MIN_CHECK_MS = 300000
const DAY_MS = 86400000
const HOUR_MS = 3600000

/** The stored worktree fields a cleanup pass reads. */
export interface CleanupRecord extends Partial<WorktreeRecord> {
  /** The branch the checkout started from, as older records spell it. */
  base?: string
  /** The ref the checkout started from. */
  start?: string
}

/** One checkout's current state, as the decision rules read it. */
export interface CleanupFacts {
  active?: boolean
  ageMs: number
  localFiles: number
  trackedChanges: number
  commitsAhead: number
}

/** What inspecting one checkout found. */
export interface WorktreeFacts {
  missing: boolean
  ageMs: number
  localFiles: number
  trackedChanges: number
  commitsAhead: number
}

/** One checkout's fate. */
export interface CleanupDecision {
  remove: boolean
  reason: string
}

/** One checkout a cleanup pass removed. */
export interface CleanupRemoval {
  sessionId: string
  branch?: string | null
  reason: string
}

/** One checkout a cleanup pass kept, and why. */
export interface CleanupKeep {
  sessionId: string
  branch?: string | null
  reason: string
  error?: string
}

/** What one cleanup pass did. */
export interface WorktreeCleanupReport {
  at: number
  removed: CleanupRemoval[]
  kept: CleanupKeep[]
}

/** The store a cleanup pass loads, reads, and updates. */
export interface CleanupStore {
  load(): Promise<unknown>
  state: Record<string, unknown>
  update(mutate: (state: Record<string, unknown>) => unknown): Promise<unknown>
}

/** The logger methods a cleanup pass calls. */
export interface CleanupLogger {
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
}

/** The live-Session check that keeps a checkout in use. */
export interface CleanupRuntime {
  isSessionActive(sessionId: string, record: CleanupRecord): boolean
}

/** The configuration a cleanup pass reads. */
export interface CleanupSourceConfig {
  worktree?: { cleanup?: Partial<CleanupSettings> & { checkMs?: number } }
  worktreeTimeoutMs?: number
}

/** What one cleanup runner is built from. */
export interface WorktreeCleanupOptions {
  runner: GitRunner
  config: CleanupSourceConfig
  logger: CleanupLogger
  store: CleanupStore
  runtime: CleanupRuntime
  now?: () => number
}

/** The handle one cleanup runner answers. */
export interface WorktreeCleanup {
  start(): void
  stop(): void
  runOnce(): Promise<WorktreeCleanupReport | null>
}

/**
 * Decide one checkout's fate.
 *
 * A live Session always wins: its checkout is never removed, because the Agent
 * is working in it. Then the configured protection for uncommitted work, then
 * the two age rules.
 *
 * @param settings cleanup configuration.
 * @param facts one checkout's current state.
 */
export function cleanupDecision(
  settings: Partial<CleanupSettings> | null | undefined,
  facts: CleanupFacts,
): CleanupDecision {
  const config: Partial<CleanupSettings> = settings ?? {}
  if (config.enabled !== true) return { remove: false, reason: 'disabled' }
  if (facts.active === true) return { remove: false, reason: 'session-active' }

  const keep = String(config.keepChanges ?? 'tracked')
  if (keep === 'any' && facts.localFiles > 0) return { remove: false, reason: 'local-files' }
  if (keep === 'tracked' && facts.trackedChanges > 0) return { remove: false, reason: 'uncommitted-changes' }

  const inactiveDays = Number(config.inactiveDays) || 0
  if (inactiveDays > 0 && facts.ageMs >= inactiveDays * DAY_MS) {
    return { remove: true, reason: 'inactive' }
  }
  const noCommitsHours = Number(config.noCommitsAfterHours) || 0
  if (config.whenNoCommits === true && facts.commitsAhead === 0 && noCommitsHours > 0
    && facts.ageMs >= noCommitsHours * HOUR_MS) {
    return { remove: true, reason: 'no-commits' }
  }
  return { remove: false, reason: 'kept' }
}

/**
 * Gather one checkout's facts: how old it is, whether it holds local files, and
 * how far its branch moved beyond the commit it started from.
 *
 * @param runner command runner.
 * @param record the stored worktree record.
 * @param at the current time, for an injectable clock.
 */
export async function inspectWorktree(runner: GitRunner, record: CleanupRecord, at: number = Date.now()): Promise<WorktreeFacts> {
  const path = String(record?.path ?? '')
  const created = Number(record?.createdAt) || at
  const info = await stat(path).catch(() => undefined)
  if (info === undefined) {
    return { missing: true, ageMs: at - created, localFiles: 0, trackedChanges: 0, commitsAhead: 0 }
  }

  const status = await runner.run('git', ['status', '--porcelain=v1', '-z'], { cwd: path })
  const entries = status.code === 0 ? String(status.stdout ?? '').split('\0').filter((entry) => entry.length > 0) : []
  const trackedChanges = entries.filter((entry) => !entry.startsWith('??')).length

  const start = String(record?.start ?? '').length > 0
    ? String(record.start)
    : String(record?.base ?? '').length > 0
      ? `refs/heads/${String(record.base)}`
      : 'HEAD'
  const count = await runner.run('git', ['rev-list', '--count', `${start}...HEAD`], { cwd: path })
  const commitsAhead = count.code === 0 ? Number.parseInt(String(count.stdout ?? '').trim(), 10) || 0 : 0

  return {
    missing: false,
    ageMs: Math.max(at - created, at - info.mtimeMs),
    localFiles: entries.length,
    trackedChanges,
    commitsAhead,
  }
}

/**
 * Run cleanup passes over the checkouts this plugin created.
 *
 * @param options the runner, configuration, logger, store, and live-Session check.
 */
export function createWorktreeCleanup(
  { runner, config, logger, store, runtime, now = Date.now }: WorktreeCleanupOptions,
): WorktreeCleanup {
  const settings: Partial<CleanupSettings> & { checkMs?: number } = config?.worktree?.cleanup ?? {}
  const timeoutMs = Number(config?.worktreeTimeoutMs) || 120000
  const interval = Math.max(MIN_CHECK_MS, Number(settings.checkMs) || 3600000)
  let timer: ReturnType<typeof setInterval> | undefined
  let running = false
  let disposed = false

  /** One pass over every recorded checkout. */
  async function runOnce(): Promise<WorktreeCleanupReport | null> {
    if (disposed || running) return storedCleanup(store?.state?.cleanup)
    if (settings.enabled !== true) return storedCleanup(store?.state?.cleanup)
    running = true
    const removed: CleanupRemoval[] = []
    const kept: CleanupKeep[] = []
    try {
      await store.load()
      const records = worktreeRecords(store.state)
      for (const [sessionId, value] of Object.entries(records)) {
        if (value === null || typeof value !== 'object') continue
        const record = value as CleanupRecord
        try {
          const facts = await inspectWorktree(runner, record, now())
          const decision = cleanupDecision(settings, {
            ...facts,
            active: runtime.isSessionActive(sessionId, record),
          })
          if (!decision.remove) {
            kept.push({ sessionId, branch: record.branch, reason: decision.reason })
            continue
          }
          await removeWorktree(runner, {
            repoRoot: String(record.repositoryRoot ?? ''),
            path: String(record.path ?? ''),
            branch: record.branch,
            deleteBranch: settings.deleteBranch === true,
            timeoutMs,
          })
          await store.update((state) => {
            const worktrees: unknown = state.worktrees ?? {}
            state.worktrees = worktrees
            if (worktrees !== null && typeof worktrees === 'object') {
              delete (worktrees as Record<string, unknown>)[sessionId]
            }
          })
          removed.push({ sessionId, branch: record.branch, reason: decision.reason })
          logger.info('git: cleanup removed %s (%s)', String(record.branch ?? ''), decision.reason)
        } catch (error: unknown) {
          const reason = error instanceof Error ? error.message : String(error)
          kept.push({ sessionId, branch: record?.branch, reason: 'failed', error: reason })
          logger.warn('git: cleanup kept %s: %s', String(record?.branch ?? ''), reason)
        }
      }
      const result = { at: now(), removed, kept }
      await store.update((state) => {
        state.cleanup = result
      })
      return result
    } finally {
      running = false
    }
  }

  return {
    runOnce,
    start(): void {
      if (timer !== undefined || disposed) return
      if (settings.enabled !== true) {
        logger.info('git: worktree cleanup is off')
        return
      }
      timer = setInterval(() => {
        void runOnce()
      }, interval)
      timer.unref?.()
      logger.info('git: worktree cleanup runs every %d ms', interval)
    },
    stop(): void {
      disposed = true
      if (timer !== undefined) clearInterval(timer)
      timer = undefined
    },
  }
}

/** The worktrees a store state records, or an empty set. */
function worktreeRecords(state: Record<string, unknown>): Record<string, unknown> {
  const value: unknown = state.worktrees ?? {}
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
}

/** The last cleanup report a store holds, as this module wrote it. */
function storedCleanup(value: unknown): WorktreeCleanupReport | null {
  return value === undefined || value === null ? null : value as WorktreeCleanupReport
}
