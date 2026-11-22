/**
 * Cleanup after a change request is merged.
 *
 * A Session that works in its own worktree leaves that checkout and its branch
 * behind when the change lands. This module decides what to remove for one
 * bound change request and polls the code host until it settles, so the
 * decision is testable without a network or a clock.
 */

import { resolve } from 'node:path'

import type { MergedConfig } from './config.ts'
import type { Logger } from '../host/dsh.ts'
import type { MergeSettings } from '../shared/protocol.ts'

/** Milliseconds a merged check waits before its next poll when nothing settles. */
const MIN_CHECK_MS = 15000

/**
 * Failed cleanup passes a merged binding retries before it gives up.
 *
 * Archiving a Session whose turn had just started used to fail once and mark
 * the binding settled, which left the merged chat visible forever. A transient
 * refusal now keeps the binding open, but a permanent one must not be retried
 * on every poll for the life of the profile.
 */
const SETTLE_RETRY_LIMIT = 5

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
  /** Failed cleanup passes so far, so a broken effect is retried a few times, not forever. */
  attempts?: number
  /**
   * Why a settled binding did not touch its Session: the tracked change request
   * belongs to another checkout, so nothing may be removed or archived.
   */
  skipped?: string
  /** Why a merged binding waits: its Session is still standing in the checkout. */
  deferred?: string
}

/** The plugin's recorded checkout of one Session, as the matching rules read it. */
export interface CheckoutFacts {
  path?: string
  repositoryRoot?: string
  branch?: string
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
  /**
   * Archive one merged Session. The runtime stops any work still running for it
   * (a turn, a job) the way the UI's "stop and archive" action does, because a
   * merged Session is done by definition. Returns false only when the build
   * exposes no way to archive.
   */
  archiveSession(sessionId: string): Promise<boolean>
  /** Whether the Session is standing in that checkout right now, so cleanup waits. */
  isSessionActive?(sessionId: string, record: unknown): boolean
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

/** Whether two absolute paths name the same directory; Windows ignores case. */
function samePath(left: string, right: string): boolean {
  if (left.length === 0 || right.length === 0) return false
  const one = resolve(left)
  const other = resolve(right)
  return process.platform === 'win32' ? one.toLowerCase() === other.toLowerCase() : one === other
}

/**
 * Whether one tracked change request belongs to a Session's recorded checkout.
 *
 * A binding that names a different branch or a different checkout describes some
 * other work. Acting on it would remove a branch and archive a conversation the
 * request never belonged to, so every destructive step is gated on this answer.
 *
 * @param binding tracked change request, carrying the branch and root it was seen in.
 * @param checkout the plugin's record of the Session's own checkout, if any.
 */
export function checkoutOwnsBinding(
  binding: { root?: string; branch?: string } | null | undefined,
  checkout: CheckoutFacts | null | undefined,
): boolean {
  if (checkout === null || checkout === undefined) return false
  const path = String(checkout.path ?? '')
  if (path.length === 0) return false
  const branch = String(checkout.branch ?? '')
  const bound = String(binding?.branch ?? '')
  if (branch.length > 0 && bound !== branch) return false
  const repositoryRoot = String(checkout.repositoryRoot ?? '')
  const root = String(binding?.root ?? '')
  return samePath(root, path) || (repositoryRoot.length > 0 && samePath(root, repositoryRoot))
}

/**
 * Whether an automatically discovered change request may be tracked.
 *
 * Only an open or draft change request that belongs to the Session's own
 * checkout qualifies. A merged or closed one is history: adopting it would mark
 * the Session done and clean up work that never reached that request.
 *
 * @param facts what the panel read about the branch and the Session's checkout.
 */
export function mayAdoptBranchPull(facts: {
  pull?: { state?: string } | null
  root?: string
  branch?: string
  checkout?: CheckoutFacts | null
}): boolean {
  const state = String(facts.pull?.state ?? '')
  if (state !== 'open' && state !== 'draft') return false
  return checkoutOwnsBinding(facts, facts.checkout)
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
    // Never bind a change request that names another checkout: settling it would
    // remove this Session's branch for work it never pushed.
    const checkout = store.state.worktrees?.[sessionId] as CheckoutFacts | undefined
    if (checkout !== undefined && !checkoutOwnsBinding(record as { root?: string; branch?: string }, checkout)) {
      logger.warn(
        'git: ignoring change request %d for %s: branch %s is not its checkout branch %s',
        number,
        sessionId,
        String(record.branch ?? ''),
        String(checkout.branch ?? ''),
      )
      return
    }
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
        // A different change request starts a new settlement cycle: what the
        // previous one recorded about archiving this Session must not decide
        // this one (a stale `archived: true` hid a chat that was later reopened).
        state: undefined,
        archived: undefined,
        archiveError: undefined,
        worktreeRemoved: undefined,
        branchDeleted: undefined,
        worktreeError: undefined,
        cleanedAt: undefined,
        mergedUrl: undefined,
        attempts: undefined,
        deferred: undefined,
        skipped: undefined,
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
        if (record === null || typeof record !== 'object') continue
        try {
          // A binding settled by an older build may still show its merged chat:
          // that build archived before stopping the Session's work, so the
          // registry refused while a turn ran and the error was final. Retrying
          // here repairs those records instead of leaving them visible.
          if (record.done === true) {
            await retrySettledArchive(sessionId, record)
            continue
          }
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
   * Archive one Session, turning a refusal into a recorded reason.
   * @param sessionId Session to archive.
   */
  async function archiveNow(sessionId: string): Promise<{ archived: boolean; error?: string }> {
    try {
      return { archived: (await runtime.archiveSession(sessionId)) === true }
    } catch (error) {
      logger.warn('git: could not archive %s: %s', sessionId, messageOf(error))
      return { archived: false, error: messageOf(error) }
    }
  }

  /**
   * Retry the archive of a record settled by an older build with a refused one.
   * @param sessionId owning Session.
   * @param record settled binding, carrying the recorded archive error.
   */
  async function retrySettledArchive(sessionId: string, record: PullBinding): Promise<void> {
    if (record.state !== 'merged') return
    if (typeof record.archiveError !== 'string') return
    if (!mergedCleanup(merged, {}).archiveSession) return
    const attempts = Number(record.attempts) || 0
    if (attempts >= SETTLE_RETRY_LIMIT) return
    const result = await archiveNow(sessionId)
    await store.update((value) => {
      const entry = value.pulls?.[sessionId]
      if (entry === undefined) return
      entry.attempts = attempts + 1
      entry.checkedAt = now()
      if (result.archived) {
        entry.archived = true
        entry.archiveError = undefined
      }
    })
    if (result.archived) logger.info('git: archived %s after its change request merged', sessionId)
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
      const checkout = worktrees[sessionId] as CheckoutFacts | undefined
      // A merged change request only settles the Session whose checkout it came
      // from. Anything else is a mis-binding (another branch, another checkout):
      // stop watching it instead of deleting work this Session still owns.
      if (checkout !== undefined && !checkoutOwnsBinding(record, checkout)) {
        logger.warn(
          'git: %s merged but belongs to branch %s, not the checkout of %s (%s); leaving it alone',
          String(state.url ?? record.url ?? record.number ?? ''),
          String(record.branch ?? ''),
          sessionId,
          String(checkout.branch ?? ''),
        )
        await store.update((value) => {
          value.pulls ??= {}
          value.pulls[sessionId] = {
            ...value.pulls[sessionId],
            state: 'merged',
            done: true,
            skipped: 'checkout-mismatch',
            checkedAt: now(),
          }
        })
        return
      }
      const action = mergedCleanup(merged, { hasWorktree: checkout !== undefined })
      // Explicit `undefined` values clear fields left by a failed earlier pass.
      const outcome: PullBinding = {
        cleanedAt: now(),
        mergedUrl: state.url ?? record.url ?? '',
        attempts: (Number(record.attempts) || 0) + 1,
        deferred: undefined,
        skipped: undefined,
        archiveError: undefined,
        worktreeError: undefined,
      }
      // Archive first: a merged chat is finished work, and the archive is what
      // stops a still-running turn or job. Older builds archived with an
      // activity check, so a merge during a turn left the chat in the list.
      let archived = false
      if (action.archiveSession) {
        const result = await archiveNow(sessionId)
        archived = result.archived
        if (result.error === undefined) outcome.archived = result.archived
        else outcome.archiveError = result.error
      }
      // Removing the checkout under a live Session is exactly the damage this
      // watcher must not do. An archived Session no longer works in it, so the
      // runtime may return that chat to the repository and drop the checkout.
      const busy = checkout !== undefined && runtime.isSessionActive?.(sessionId, checkout) === true
      if (busy && !archived) {
        logger.info('git: %s merged but its Session is still in the checkout; cleanup waits', sessionId)
        await store.update((value) => {
          value.pulls ??= {}
          value.pulls[sessionId] = {
            ...value.pulls[sessionId],
            state: 'merged',
            done: false,
            deferred: 'session-active',
            checkedAt: now(),
          }
        })
        return
      }
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
      // A refused effect keeps the binding open for the next pass; after a few
      // passes it settles anyway, so a permanent failure does not poll forever.
      const failed = outcome.archiveError !== undefined || outcome.worktreeError !== undefined
      const settled = !failed || (outcome.attempts ?? 0) >= SETTLE_RETRY_LIMIT
      await store.update((value) => {
        value.pulls ??= {}
        value.pulls[sessionId] = { ...value.pulls[sessionId], ...outcome, state: 'merged', done: settled, checkedAt: now() }
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
