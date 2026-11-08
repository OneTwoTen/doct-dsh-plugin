/**
 * Removing checkouts nobody uses any more.
 *
 * Only checkouts this plugin created are eligible. The decision is a pure
 * function of the checkout's facts, so every rule can be tested without a
 * repository, a clock, or a session; the runner around it gathers the facts
 * with Git and applies the removal.
 */
import { stat } from 'node:fs/promises'

import { removeWorktree } from './worktree.js'

/** The longest a cleanup pass may wait; a shorter setting is raised to this. */
const MIN_CHECK_MS = 300000
const DAY_MS = 86400000
const HOUR_MS = 3600000

/**
 * Decide one checkout's fate.
 *
 * A live Session always wins: its checkout is never removed, because the Agent
 * is working in it. Then the configured protection for uncommitted work, then
 * the two age rules.
 *
 * @param {{
 *   enabled?: boolean,
 *   inactiveDays?: number,
 *   whenNoCommits?: boolean,
 *   noCommitsAfterHours?: number,
 *   keepChanges?: 'tracked' | 'any' | 'none',
 * }} settings cleanup configuration.
 * @param {{
 *   active?: boolean,
 *   ageMs: number,
 *   localFiles: number,
 *   trackedChanges: number,
 *   commitsAhead: number,
 * }} facts one checkout's current state.
 * @returns {{ remove: boolean, reason: string }}
 */
export function cleanupDecision(settings, facts) {
  const config = settings ?? {}
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
 * @param {{ run: Function }} runner command runner.
 * @param {Record<string, unknown>} record the stored worktree record.
 * @param {number} [at] the current time, for an injectable clock.
 * @returns {Promise<Record<string, unknown>>}
 */
export async function inspectWorktree(runner, record, at = Date.now()) {
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
 * @param {{
 *   runner: { run: Function },
 *   config: Record<string, unknown>,
 *   logger: { info: Function, warn: Function },
 *   store: { load: () => Promise<unknown>, state: Record<string, unknown>, update: (mutate: Function) => Promise<unknown> },
 *   runtime: { isSessionActive: (sessionId: string, record: Record<string, unknown>) => boolean },
 *   now?: () => number,
 * }} options
 * @returns {{ start: () => void, stop: () => void, runOnce: () => Promise<Record<string, unknown>> }}
 */
export function createWorktreeCleanup({ runner, config, logger, store, runtime, now = Date.now }) {
  const settings = config?.worktree?.cleanup ?? {}
  const timeoutMs = Number(config?.worktreeTimeoutMs) || 120000
  const interval = Math.max(MIN_CHECK_MS, Number(settings.checkMs) || 3600000)
  let timer
  let running = false
  let disposed = false

  /** One pass over every recorded checkout. */
  async function runOnce() {
    if (disposed || running) return store?.state?.cleanup ?? null
    if (settings.enabled !== true) return store?.state?.cleanup ?? null
    running = true
    const removed = []
    const kept = []
    try {
      await store.load()
      const records = store.state.worktrees ?? {}
      for (const [sessionId, record] of Object.entries(records)) {
        if (record === null || typeof record !== 'object') continue
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
            state.worktrees ??= {}
            delete state.worktrees[sessionId]
          })
          removed.push({ sessionId, branch: record.branch, reason: decision.reason })
          logger.info('git: cleanup removed %s (%s)', String(record.branch ?? ''), decision.reason)
        } catch (error) {
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
    start() {
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
    stop() {
      disposed = true
      if (timer !== undefined) clearInterval(timer)
      timer = undefined
    },
  }
}
