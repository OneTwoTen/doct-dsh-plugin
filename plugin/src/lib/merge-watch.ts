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
  /** Repository id when the binding belongs to a multi-repo chat. */
  repoId?: string
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

/**
 * One chat's change requests when it checks out several repositories.
 *
 * A multi-repo chat owns one PR per materialized repository. The per-repo slots
 * settle independently, but the chat is archived only once every materialized
 * repository has merged. Old single-PR records keep their flat shape.
 */
export interface SessionPullSet {
  repos: Record<string, PullBinding>
  archived?: boolean
  archiveError?: string
  attempts?: number
  checkedAt?: number
  cleanedAt?: number
  deferred?: string
}

/** Either the historical single binding or a multi-repository set. */
export type SessionPulls = PullBinding | SessionPullSet

/** The plugin's recorded checkout of one Session, as the matching rules read it. */
export interface CheckoutFacts {
  path?: string
  repositoryRoot?: string
  branch?: string
}

/** The durable state the watcher reads and writes. */
export interface MergeStoreState {
  pulls?: Record<string, SessionPulls>
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

/** Whether one session's record holds several per-repository bindings. */
export function isPullSet(value: SessionPulls | undefined): value is SessionPullSet {
  if (value === null || typeof value !== 'object') return false
  const repos = (value as SessionPullSet).repos
  return repos !== null && typeof repos === 'object' && !Array.isArray(repos)
}

/** One binding slot, flattened so the poll can visit both record shapes. */
interface PullSlot {
  sessionId: string
  repoId?: string
  set?: SessionPullSet
  binding: PullBinding
}

/** Every binding in the store, old and new shape alike. */
function pullSlots(pulls: Record<string, SessionPulls> | undefined): PullSlot[] {
  const slots: PullSlot[] = []
  for (const [sessionId, value] of Object.entries(pulls ?? {})) {
    if (isPullSet(value)) {
      for (const [repoId, binding] of Object.entries(value.repos)) {
        if (binding !== null && typeof binding === 'object') slots.push({ sessionId, repoId, set: value, binding })
      }
    } else if (value !== null && typeof value === 'object') {
      slots.push({ sessionId, binding: value })
    }
  }
  return slots
}

/** The one binding a slot addresses, if it has been tracked. */
function readBinding(value: SessionPulls | undefined, repoId?: string): PullBinding | undefined {
  if (value === undefined) return undefined
  if (isPullSet(value)) return repoId === undefined ? undefined : value.repos[repoId]
  return repoId === undefined ? value : undefined
}

/**
 * Patch one slot, migrating a legacy flat binding into `repos.primary` before
 * the first per-repository binding is written.
 */
function writeSlot(
  state: MergeStoreState,
  sessionId: string,
  repoId: string | undefined,
  patch: Partial<PullBinding>,
): void {
  state.pulls ??= {}
  const current = state.pulls[sessionId]
  if (repoId === undefined) {
    if (isPullSet(current)) {
      state.pulls[sessionId] = {
        ...current,
        repos: { ...current.repos, primary: { ...current.repos.primary, ...patch } },
      }
    } else {
      state.pulls[sessionId] = { ...(current ?? {}), ...patch }
    }
    return
  }
  const set: SessionPullSet = isPullSet(current)
    ? current
    : { repos: current !== undefined ? { primary: current } : {} }
  state.pulls[sessionId] = {
    ...set,
    repos: { ...set.repos, [repoId]: { ...(set.repos[repoId] ?? {}), ...patch } },
  }
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

/** How far back a settlement's lost archive may be repaired. */
export const ARCHIVE_REPAIR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Merged bindings whose Session the registry's archive set no longer holds.
 *
 * A settled record says the plugin archived its Session, but the durable
 * archive set is what the sidebar reads. When a write was lost, the chat stays
 * visible forever: a settled binding is never polled again. Repairing means
 * re-applying a decision already made, so it is bounded to recent settlements —
 * an old record is history, and re-archiving it would fight a user who
 * unarchived the chat on purpose.
 *
 * @param pulls tracked change requests by Session.
 * @param archivedIds the registry's archive set.
 * @param now current time.
 * @param windowMs how far back a settlement may be repaired.
 * @returns ids to archive again.
 */
export function lostArchives(
  pulls: Record<string, SessionPulls> | undefined,
  archivedIds: ReadonlySet<string> | readonly string[],
  now: number,
  windowMs: number = ARCHIVE_REPAIR_WINDOW_MS,
): string[] {
  const archived = archivedIds instanceof Set ? archivedIds : new Set(archivedIds)
  const lost: string[] = []
  for (const [sessionId, binding] of Object.entries(pulls ?? {})) {
    if (binding === null || typeof binding !== 'object') continue
    if (isPullSet(binding)) {
      // A set archives only after every repository merged; one shared
      // settlement stamp is enough to bound the repair window.
      if (binding.archived !== true) continue
      const settledAt = Number(binding.cleanedAt ?? 0)
      if (settledAt <= 0 || now - settledAt > windowMs) continue
      if (!archived.has(sessionId)) lost.push(sessionId)
      continue
    }
    if (binding.state !== 'merged' || binding.archived !== true) continue
    if (archived.has(sessionId)) continue
    const cleanedAt = Number(binding.cleanedAt ?? 0)
    // Without a settlement time the record is history, not a lost write.
    if (cleanedAt <= 0 || now - cleanedAt > windowMs) continue
    lost.push(sessionId)
  }
  return lost
}

/** A merged change request reduced to what checkout reconciliation matches. */
export interface ReconciledPull {
  number: number
  url: string
  branch: string
  base?: string
  /** The code-host remote that answers for the repository. */
  remote?: unknown
}

/** What checkout reconciliation reads and writes. */
export interface CheckoutReconcileOptions {
  store: MergeWatcherStore
  logger: Logger
  /** The branch Git really has checked out at one path, or null when it cannot answer. */
  currentBranch(path: string): Promise<string | null>
  /** Recently merged change requests of one repository. */
  mergedPulls(root: string): Promise<readonly ReconciledPull[]>
  /** Bind one change request so the next poll settles it. */
  track(sessionId: string, record: Record<string, unknown>): Promise<void>
}

/**
 * Bind merged change requests that belong to a recorded checkout but were never tracked.
 *
 * A checkout can outlive its change request unnoticed: the request may have
 * been opened outside the panel, or its branch renamed in place after the
 * checkout was recorded. No binding was written, so the merge watcher never
 * polled it and the merged chat stayed in the list. Reconciliation reads the
 * branch Git really has checked out, repairs a stale record, and binds the
 * merged request that names it — the ownership proof every other cleanup step
 * relies on.
 *
 * @param options the store, the evidence readers, and the binding sink.
 * @returns how many change requests were newly bound.
 */
export async function reconcileCheckouts(options: CheckoutReconcileOptions): Promise<number> {
  const { store, logger, currentBranch, mergedPulls, track } = options
  await store.load()
  const byRoot = new Map<string, Array<{ sessionId: string; branch: string }>>()
  for (const [sessionId, raw] of Object.entries(store.state.worktrees ?? {})) {
    if (raw === null || typeof raw !== 'object') continue
    const record = raw as { path?: unknown; repositoryRoot?: unknown; branch?: unknown }
    const path = typeof record.path === 'string' ? record.path : ''
    const repositoryRoot = typeof record.repositoryRoot === 'string' ? record.repositoryRoot : ''
    if (path.length === 0 || repositoryRoot.length === 0) continue
    const branch = await currentBranch(path).catch(() => null)
    if (branch === null || branch.length === 0) continue
    if (branch !== String(record.branch ?? '')) {
      // The checkout's branch was renamed after the record was written.
      await store.update((current) => {
        const entry = current.worktrees?.[sessionId] as { branch?: string } | undefined
        if (entry !== undefined) entry.branch = branch
      })
      logger.info('git: the checkout of %s is on %s; updating its record', sessionId, branch)
    }
    const group = byRoot.get(repositoryRoot) ?? []
    group.push({ sessionId, branch })
    byRoot.set(repositoryRoot, group)
  }
  let bound = 0
  for (const [repositoryRoot, entries] of byRoot) {
    const pulls = await mergedPulls(repositoryRoot).catch(() => [])
    if (pulls.length === 0) continue
    for (const entry of entries) {
      const pull = pulls.find((candidate) => candidate.branch === entry.branch)
      if (pull === undefined) continue
      await track(entry.sessionId, {
        root: repositoryRoot,
        remote: pull.remote,
        number: pull.number,
        url: pull.url,
        branch: entry.branch,
        base: pull.base ?? '',
      })
      bound += 1
    }
  }
  return bound
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
  /** Per-chat set archivals in flight, so a poll cannot archive twice. */
  const archivingSets = new Set<string>()

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
    const repoId = typeof record.repoId === 'string' ? record.repoId.trim() : ''
    await store.load()
    // Never bind a change request that names another checkout: settling it would
    // remove this Session's branch for work it never pushed. A multi-repo chat
    // records one checkout per repo; the context directory itself is not one.
    const stored = store.state.worktrees?.[sessionId] as (CheckoutFacts & {
      repos?: Record<string, CheckoutFacts>
    }) | undefined
    const checkout = repoId.length > 0 ? stored?.repos?.[repoId] : stored
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
    const slot = repoId.length > 0 ? repoId : undefined
    const existing = readBinding(store.state.pulls?.[sessionId], slot)
    // The same binding needs no rewrite: a settled one must stay settled, and an
    // open one is already polled, so only a different change request is new.
    if (existing !== undefined && existing.number === number) return
    await store.update((state) => {
      const previous = readBinding(state.pulls?.[sessionId], slot)
      writeSlot(state, sessionId, slot, {
        ...record,
        number,
        sessionId,
        repoId: slot,
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
      })
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
      for (const { sessionId, repoId, set, binding } of pullSlots(pulls)) {
        try {
          // A binding settled by an older build may still show its merged chat:
          // that build archived before stopping the Session's work, so the
          // registry refused while a turn ran and the error was final. Retrying
          // here repairs those records instead of leaving them visible.
          if (binding.done === true) {
            if (set === undefined) await retrySettledArchive(sessionId, binding)
            continue
          }
          await settle(sessionId, binding, repoId, set)
        } catch (error) {
          logger.warn('git: merge check for %s failed: %s', sessionId, messageOf(error))
        }
      }
      // A set can become complete after its last binding settled (a deferred
      // archive, or a repo bound later), so every pass re-checks the predicate.
      for (const [sessionId, value] of Object.entries(pulls)) {
        if (!isPullSet(value)) continue
        try {
          await maybeArchiveSet(sessionId, value)
        } catch (error) {
          logger.warn('git: multi-repo merge check for %s failed: %s', sessionId, messageOf(error))
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
   * Settle one repository of a multi-repo chat, without archiving the chat:
   * the other repositories may still have open work.
   */
  async function settleRepoBinding(
    sessionId: string,
    record: PullBinding,
    repoId: string,
  ): Promise<void> {
    const state = await forge.pullState({
      root: record.root,
      remote: record.remote,
      number: Number(record.number),
    })
    if (state === null) return
    const next = String(state.state ?? '')
    if (next !== 'merged') {
      await store.update((value) => {
        writeSlot(value, sessionId, repoId, {
          state: next,
          checkedAt: now(),
          done: next === 'closed',
        })
      })
      return
    }
    const worktrees = store.state.worktrees ?? {}
    const stored = worktrees[sessionId] as { repos?: Record<string, CheckoutFacts> } | undefined
    const checkout = stored?.repos?.[repoId]
    if (checkout !== undefined && !checkoutOwnsBinding(record, checkout)) {
      logger.warn('git: %s merged but is not the checkout of %s in %s; leaving it alone', String(state.url ?? record.number), repoId, sessionId)
      await store.update((value) => {
        writeSlot(value, sessionId, repoId, {
          state: 'merged', done: true, skipped: 'checkout-mismatch', checkedAt: now(),
        })
      })
      return
    }
    await store.update((value) => {
      writeSlot(value, sessionId, repoId, {
        state: 'merged',
        done: true,
        cleanedAt: now(),
        mergedUrl: state.url ?? record.url ?? '',
        attempts: (Number(record.attempts) || 0) + 1,
        deferred: undefined,
        skipped: undefined,
      })
    })
  }

  /**
   * Archive a multi-repo chat only when every repository still checked out by
   * it has a merged change request. A materialized repository without a binding
   * blocks the archive: its state is unknown, so acting would hide live work.
   */
  async function maybeArchiveSet(sessionId: string, initial: SessionPullSet): Promise<void> {
    if (archivingSets.has(sessionId)) return
    const value = (store.state.pulls?.[sessionId] as SessionPulls | undefined)
    const set = isPullSet(value) ? value : initial
    if (set.archived === true) return
    if ((Number(set.attempts) || 0) >= SETTLE_RETRY_LIMIT) return
    const stored = store.state.worktrees?.[sessionId] as {
      kind?: string
      repos?: Record<string, unknown>
    } | undefined
    if (stored?.kind !== 'context') return
    const materialized = Object.keys(stored.repos ?? {})
    if (materialized.length === 0) return
    const bindings = materialized.map((repoId) => set.repos[repoId])
    if (bindings.some((binding) => binding === undefined)) return
    if (!bindings.every((binding) => String(binding?.state ?? '') === 'merged')) return
    if (!mergedCleanup(merged, { hasWorktree: true }).archiveSession) return
    archivingSets.add(sessionId)
    try {
      const result = await archiveNow(sessionId)
      if (!result.archived) {
        const busy = runtime.isSessionActive?.(sessionId, stored) === true
        await store.update((current) => {
          const entry = current.pulls?.[sessionId]
          if (entry === undefined || !isPullSet(entry)) return
          entry.archiveError = result.error ?? (busy ? 'session-active' : 'archive-refused')
          entry.deferred = busy ? 'session-active' : undefined
          entry.attempts = (Number(entry.attempts) || 0) + 1
          entry.checkedAt = now()
        })
        if (busy) logger.info('git: %s has merged in every repo but is still active; cleanup waits', sessionId)
        return
      }
      await store.update((current) => {
        const entry = current.pulls?.[sessionId]
        if (entry === undefined || !isPullSet(entry)) return
        entry.archived = true
        entry.archiveError = undefined
        entry.deferred = undefined
        entry.cleanedAt = now()
        entry.attempts = (Number(entry.attempts) || 0) + 1
      })
      logger.info('git: archived %s after all %d repositories merged', sessionId, bindings.length)
      if (mergedCleanup(merged, { hasWorktree: true }).removeWorktree) {
        try {
          await runtime.removeSessionWorktree(stored, sessionId)
        } catch (error) {
          logger.warn('git: could not remove the checkouts of %s: %s', sessionId, messageOf(error))
        }
      }
    } finally {
      archivingSets.delete(sessionId)
    }
  }

  /**
   * Read one binding's state and apply the configured cleanup when it merged.
   * @param sessionId owning Session.
   * @param record binding.
   */
  async function settle(
    sessionId: string,
    record: PullBinding,
    repoId?: string,
    set?: SessionPullSet,
  ): Promise<void> {
    if (set !== undefined && repoId !== undefined) {
      await settleRepoBinding(sessionId, record, repoId)
      return
    }
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
