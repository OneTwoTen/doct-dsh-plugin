/**
 * Cleanup after a change request is merged.
 *
 * A Session that works in its own worktree leaves that checkout and its branch
 * behind when the change lands. This module decides what to remove for one
 * bound change request and polls the code host until it settles, so the
 * decision is testable without a network or a clock.
 */

import type { MergedConfig } from './config.ts'
import type { Logger } from '../host/dsh.ts'
import type { MergeSettings } from '../shared/protocol.ts'

/** Milliseconds a merged check waits before its next poll when nothing settles. */
const MIN_CHECK_MS = 15000

/** The facts the cleanup decision needs. */
export interface MergedCleanupFacts {
  hasWorktree?: boolean
}

/** What one merged change request should do to its Session. */
export interface MergedCleanupAction {
  removeWorktree: boolean
  deleteBranch: boolean
  archiveSession: boolean
  active: boolean
}

/**
 * One Session's tracked change request, as the plugin's JSON store keeps it.
 *
 * Every field is optional because the record starts as caller-supplied facts and
 * gains settlement fields as polls run.
 */
export interface PullBinding {
  number?: number | null
  root?: string
  remote?: unknown
  url?: string
  branch?: string
  base?: string
  sessionId?: string
  trackedAt?: number
  checkedAt?: number
  done?: boolean
  /** The last state the code host reported. */
  state?: string
  cleanedAt?: number
  mergedUrl?: string
  worktreeRemoved?: boolean
  branchDeleted?: boolean
  worktreeError?: string
  archived?: boolean
  archiveError?: string
}

/** The durable state the watcher reads and writes. */
export interface MergeStoreState {
  pulls?: Record<string, PullBinding>
  worktrees?: Record<string, unknown>
}

/** The plugin's JSON store, as this module uses it. */
export interface MergeWatcherStore {
  load(): Promise<unknown>
  state: MergeStoreState
  update(mutate: (state: MergeStoreState) => void | Promise<void>): Promise<unknown>
}

/** The poll one binding makes of the code host. */
export interface MergeWatchPullStateQuery {
  root?: string
  remote?: unknown
  number: number
}

/** The change-request state one poll reads. */
export interface MergeWatchPullState {
  number?: number
  state?: string | null
  url?: string | null
  mergedAt?: string | null
}

/** The code-host access the watcher needs. */
export interface MergeWatchForge {
  pullState(options: MergeWatchPullStateQuery): Promise<MergeWatchPullState | null>
}

/** What removing one Session's worktree reported. */
export interface WorktreeRemovalOutcome {
  removed?: boolean
  branchDeleted?: boolean
}

/** The two effects the watcher applies, supplied by the composition. */
export interface MergeWatchRuntime {
  removeSessionWorktree(record: unknown, sessionId: string): Promise<WorktreeRemovalOutcome>
  archiveSession(sessionId: string): Promise<boolean>
}

/** The configuration the watcher reads. */
export interface MergeWatcherConfig {
  merged?: Partial<MergedConfig> | null
}

/** The options `createMergeWatcher` accepts. */
export interface MergeWatcherOptions {
  config: MergeWatcherConfig
  logger: Logger
  store: MergeWatcherStore
  forge: MergeWatchForge
  runtime: MergeWatchRuntime
  now?: () => number
}

/** The watcher this module exposes. */
export interface MergeWatcher {
  track(sessionId: string, record: Record<string, unknown>): Promise<void>
  runOnce(): Promise<void>
  start(): void
  stop(): void
}

/** Read a caller-supplied binding record, narrowing at the boundary. */
function asBinding(record: unknown): PullBinding {
  return record !== null && typeof record === 'object' ? (record as PullBinding) : {}
}

/**
 * What one merged change request should do to its Session.
 *
 * Every switch is independent: a user may want the checkout removed but the
 * conversation kept, or the conversation archived with the branch preserved.
 *
 * @param config the merge policy, or nothing when the feature is unconfigured.
 * @param facts what is known about the Session's worktree.
 */
export function mergedCleanup(config: Partial<MergeSettings> | undefined, facts: MergedCleanupFacts = {}): MergedCleanupAction {
  const settings = config ?? {}
  const active = settings.enabled === true
  const removeWorktree = active && settings.removeWorktree !== false && facts.hasWorktree === true
  return {
    removeWorktree,
    deleteBranch: removeWorktree && settings.deleteBranch === true,
    archiveSession: active && settings.archiveSession !== false,
    active,
  }
}

/**
 * Track change requests and settle each one once.
 *
 * The watcher owns no state of its own: bindings live in the plugin's JSON
 * store, so a reload resumes tracking where it stopped. `runtime` supplies the
 * two effects, which keeps this module free of the Harness context.
 */
export function createMergeWatcher({ config, logger, store, forge, runtime, now = Date.now }: MergeWatcherOptions): MergeWatcher {
  const merged: Partial<MergedConfig> = config.merged ?? {}
  const interval = Math.max(MIN_CHECK_MS, Number(merged.checkMs) || 60000)
  let timer: ReturnType<typeof setInterval> | undefined
  let running = false
  let disposed = false

  /**
   * Remember one Session's change request so a later poll can settle it.
   * @param sessionId owning Session.
   * @param record repository, remote, number, url, branch, and base.
   */
  async function track(sessionId: string, record: Record<string, unknown>): Promise<void> {
    if (typeof sessionId !== 'string' || sessionId.length === 0) return
    if (record === null || typeof record !== 'object') return
    const number = Number(record.number)
    if (!Number.isFinite(number) || number <= 0) return
    await store.load()
    const existing = store.state.pulls?.[sessionId]
    // The same binding needs no rewrite: a settled one must stay settled, and an
    // open one is already polled, so only a different change request is new.
    if (existing !== undefined && existing.number === number) return
    await store.update((state) => {
      state.pulls ??= {}
      const previous = state.pulls[sessionId]
      state.pulls[sessionId] = {
        ...previous,
        ...record,
        number,
        sessionId,
        trackedAt: previous?.trackedAt ?? now(),
        done: false,
        checkedAt: now(),
      }
    })
  }

  /** One pass over every open binding. */
  async function runOnce(): Promise<void> {
    if (running || disposed) return
    if (merged.enabled !== true) return
    running = true
    try {
      await store.load()
      const pulls = store.state.pulls ?? {}
      for (const [sessionId, record] of Object.entries(pulls)) {
        if (record === null || typeof record !== 'object' || record.done === true) continue
        try {
          await settle(sessionId, record)
        } catch (error) {
          logger.warn('git: merge check for %s failed: %s', sessionId, messageOf(error))
        }
      }
    } finally {
      running = false
    }
  }

  /**
   * Read one binding's state and apply the configured cleanup when it merged.
   * @param sessionId owning Session.
   * @param record binding.
   */
  async function settle(sessionId: string, record: PullBinding): Promise<void> {
    const state = await forge.pullState({
      root: record.root,
      remote: record.remote,
      number: Number(record.number),
    })
    if (state === null) return
    const next = String(state.state ?? '')
    if (next === 'merged') {
      const worktrees = store.state.worktrees ?? {}
      const action = mergedCleanup(merged, { hasWorktree: worktrees[sessionId] !== undefined })
      const outcome: PullBinding = { cleanedAt: now(), mergedUrl: state.url ?? record.url ?? '' }
      if (action.removeWorktree) {
        try {
          const removed = await runtime.removeSessionWorktree(worktrees[sessionId], sessionId)
          outcome.worktreeRemoved = removed.removed === true
          outcome.branchDeleted = removed.branchDeleted === true
          logger.info('git: removed the worktree of %s after its change request merged', sessionId)
        } catch (error) {
          outcome.worktreeError = messageOf(error)
          logger.warn('git: could not remove the worktree of %s: %s', sessionId, messageOf(error))
        }
      }
      if (action.archiveSession) {
        try {
          outcome.archived = await runtime.archiveSession(sessionId)
        } catch (error) {
          outcome.archiveError = messageOf(error)
          logger.warn('git: could not archive %s: %s', sessionId, messageOf(error))
        }
      }
      await store.update((value) => {
        value.pulls ??= {}
        value.pulls[sessionId] = { ...value.pulls[sessionId], ...outcome, state: 'merged', done: true, checkedAt: now() }
      })
      return
    }
    const settled = next === 'closed'
    await store.update((value) => {
      value.pulls ??= {}
      value.pulls[sessionId] = {
        ...value.pulls[sessionId],
        state: next,
        checkedAt: now(),
        done: settled,
      }
    })
  }

  return {
    track,
    runOnce,
    start() {
      if (timer !== undefined || disposed) return
      if (merged.enabled !== true) {
        logger.info('git: merge cleanup is off, so no change request is polled')
        return
      }
      timer = setInterval(() => {
        void runOnce()
      }, interval)
      timer.unref?.()
      logger.info('git: merge cleanup polls every %d ms', interval)
      void runOnce()
    },
    stop() {
      disposed = true
      if (timer !== undefined) clearInterval(timer)
      timer = undefined
    },
  }
}

/** Message of an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
