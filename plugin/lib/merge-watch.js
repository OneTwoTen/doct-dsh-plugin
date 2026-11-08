/**
 * Cleanup after a change request is merged.
 *
 * A Session that works in its own worktree leaves that checkout and its branch
 * behind when the change lands. This module decides what to remove for one
 * bound change request and polls the code host until it settles, so the
 * decision is testable without a network or a clock.
 */

/** Milliseconds a merged check waits before its next poll when nothing settles. */
const MIN_CHECK_MS = 15000

/**
 * What one merged change request should do to its Session.
 *
 * Every switch is independent: a user may want the checkout removed but the
 * conversation kept, or the conversation archived with the branch preserved.
 *
 * @param {{ enabled?: boolean, removeWorktree?: boolean, deleteBranch?: boolean, archiveSession?: boolean } | undefined} config
 * @param {{ hasWorktree?: boolean }} facts
 * @returns {{ removeWorktree: boolean, deleteBranch: boolean, archiveSession: boolean, active: boolean }}
 */
export function mergedCleanup(config, facts = {}) {
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
 *
 * @param {{
 *   config: Record<string, unknown>,
 *   logger: { info: Function, warn: Function, error: Function },
 *   store: { load: () => Promise<Record<string, unknown>>, state: Record<string, unknown>, update: (mutate: Function) => Promise<unknown> },
 *   forge: { pullState: (options: Record<string, unknown>) => Promise<Record<string, unknown> | null> },
 *   runtime: {
 *     removeSessionWorktree: (record: Record<string, unknown>, sessionId: string) => Promise<Record<string, unknown>>,
 *     archiveSession: (sessionId: string) => Promise<boolean>,
 *   },
 *   now?: () => number,
 * }} options
 * @returns {{ start: () => void, stop: () => void, runOnce: () => Promise<void>, track: (sessionId: string, record: Record<string, unknown>) => Promise<void> }}
 */
export function createMergeWatcher({ config, logger, store, forge, runtime, now = Date.now }) {
  const merged = config.merged ?? {}
  const interval = Math.max(MIN_CHECK_MS, Number(merged.checkMs) || 60000)
  let timer
  let running = false
  let disposed = false

  /**
   * Remember one Session's change request so a later poll can settle it.
   * @param {string} sessionId owning Session.
   * @param {Record<string, unknown>} record repository, remote, number, url, branch, and base.
   */
  async function track(sessionId, record) {
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
  async function runOnce() {
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
   * @param {string} sessionId owning Session.
   * @param {Record<string, unknown>} record binding.
   */
  async function settle(sessionId, record) {
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
      const outcome = { cleanedAt: now(), mergedUrl: state.url ?? record.url ?? '' }
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
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}
