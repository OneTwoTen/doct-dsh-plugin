/**
 * Archiving chats nobody has touched for a while.
 *
 * The decision is a pure function of one Session's facts, so every rule can be
 * tested without a Host, a clock, or a registry. The runner around it scans the
 * Session list, applies the decision, and archives with the Workspace registry,
 * which is what actually hides a chat from the sidebar.
 *
 * Idleness is read from the list's `updatedAt`, the Host's durable
 * "last user prompt" watermark: an archived chat is one the user did not write
 * to for the configured number of days, not one the assistant did not speak in.
 */
import type {
  AutoArchiveEntry,
  AutoArchiveFailure,
  AutoArchiveReport,
  AutoArchiveSettings,
} from '../shared/protocol.ts'

/** Milliseconds in one day. */
const DAY_MS = 86400000

/** How many entries a report keeps per list; the counts carry the real totals. */
export const AUTO_ARCHIVE_REPORT_LIMIT = 50

/** Why one Session is or is not being archived. */
export type AutoArchiveReason =
  | 'disabled'
  | 'already-archived'
  | 'pinned'
  | 'subagent'
  | 'active'
  | 'running'
  | 'blank'
  | 'idle-rule-off'
  | 'recent'
  | 'archive'

/** One Session as the decision rules read it. */
export interface AutoArchiveFact {
  sessionId: string
  /** Epoch milliseconds of the Session's latest durable user prompt. */
  updatedAt: number
  /** The Session has a loaded Agent in this process, so it may be on screen. */
  active?: boolean
  /** A turn is running right now. */
  running?: boolean
  /** No prompt was ever submitted. */
  blank?: boolean
  /** A child a delegating Agent created. */
  subagent?: boolean
  archived?: boolean
  pinned?: boolean
  title?: string
}

/** One Session's fate. */
export interface AutoArchiveDecision {
  archive: boolean
  reason: AutoArchiveReason
}

/**
 * Decide one Session's fate.
 *
 * The protections are checked before the age rule: a chat that is already
 * archived, pinned, a subagent's, loaded in this process, running, or still
 * blank under the configured rule is never touched. `active` protects a chat
 * the user has open in this window; the registry's own activity check protects
 * the work behind a chat that is not.
 *
 * @param settings auto-archive configuration.
 * @param fact one Session's facts.
 * @param now current epoch milliseconds, for an injectable clock.
 */
export function autoArchiveDecision(
  settings: Partial<AutoArchiveSettings> | null | undefined,
  fact: AutoArchiveFact,
  now: number = Date.now(),
): AutoArchiveDecision {
  const config: Partial<AutoArchiveSettings> = settings ?? {}
  if (config.enabled !== true) return { archive: false, reason: 'disabled' }
  if (fact.archived === true) return { archive: false, reason: 'already-archived' }
  if (fact.pinned === true) return { archive: false, reason: 'pinned' }
  if (fact.subagent === true) return { archive: false, reason: 'subagent' }
  if (config.skipActive !== false && fact.active === true) return { archive: false, reason: 'active' }
  if (config.archiveRunning !== true && fact.running === true) return { archive: false, reason: 'running' }
  if (config.archiveBlank === false && fact.blank === true) return { archive: false, reason: 'blank' }

  const inactiveDays = Number(config.inactiveDays) || 0
  if (inactiveDays <= 0) return { archive: false, reason: 'idle-rule-off' }
  const idleMs = now - (Number(fact.updatedAt) || 0)
  if (idleMs < inactiveDays * DAY_MS) return { archive: false, reason: 'recent' }
  return { archive: true, reason: 'archive' }
}

/** What one archive attempt did. */
export interface AutoArchiveArchiveResult {
  archived: boolean
  /** The registry refused because the Session still has running work. */
  active?: boolean
  error?: string
}

/** The surface the runner reads from the running plugin. */
export interface AutoArchiveRuntime {
  /** Every Session the Host lists, with the archive and pin sets already applied. */
  facts(signal?: AbortSignal): Promise<AutoArchiveFact[]>
  /** Archive one Session, optionally stopping its work. */
  archive(sessionId: string, options: { stopActivity: boolean }): Promise<AutoArchiveArchiveResult>
}

/** The store a pass loads, reads, and updates. */
export interface AutoArchiveStore {
  load(): Promise<unknown>
  state: Record<string, unknown>
  update(mutate: (state: Record<string, unknown>) => unknown): Promise<unknown>
}

/** The logger methods a pass calls. */
export interface AutoArchiveLogger {
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
}

/** What one runner is built from. */
export interface AutoArchiveOptions {
  settings: AutoArchiveSettings & { startupDelayMs?: number }
  logger: AutoArchiveLogger
  store: AutoArchiveStore
  runtime: AutoArchiveRuntime
  now?: () => number
}

/** The handle one runner answers. */
export interface AutoArchive {
  start(): void
  stop(): void
  /** Run one pass now; `null` when the feature is off or a pass is already running. */
  runOnce(): Promise<AutoArchiveReport | null>
  /** The report of the last pass this process ran. */
  last(): AutoArchiveReport | null
}

/**
 * Run automatic archive passes.
 *
 * A pass lists the Sessions, applies the decision, and archives the due ones up
 * to `maxPerPass`. A single archive failure never stops the pass: the registry
 * refusing because a Session still has running work is reported as `active`,
 * while a real failure is reported as `failed`.
 *
 * @param options the settings, logger, store, runtime, and clock.
 */
export function createAutoArchiver({
  settings,
  logger,
  store,
  runtime,
  now = Date.now,
}: AutoArchiveOptions): AutoArchive {
  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false
  let disposed = false
  let report: AutoArchiveReport | null = null

  /** One pass over every Session the Host lists. */
  async function runOnce(): Promise<AutoArchiveReport | null> {
    if (disposed || running) return report
    if (settings.enabled !== true) return report
    running = true
    try {
      const at = now()
      const facts = await runtime.facts()
      const due: AutoArchiveEntry[] = []
      let recent = 0
      let pinned = 0
      for (const fact of facts) {
        const decision = autoArchiveDecision(settings, fact, at)
        if (!decision.archive) {
          if (decision.reason === 'recent') recent += 1
          else if (decision.reason === 'pinned') pinned += 1
          continue
        }
        due.push(entryOf(fact, at))
      }

      const limit = Number(settings.maxPerPass) > 0 ? Number(settings.maxPerPass) : due.length
      const attempted = due.slice(0, limit)
      const deferred = due.slice(attempted.length)
      const archived: AutoArchiveEntry[] = []
      const failed: AutoArchiveFailure[] = []
      const active: AutoArchiveEntry[] = []

      for (const entry of attempted) {
        if (settings.dryRun === true) {
          archived.push(entry)
          continue
        }
        try {
          const result = await runtime.archive(entry.sessionId, { stopActivity: settings.archiveRunning === true })
          if (result.archived) {
            archived.push(entry)
            logger.info('auto-archive: archived %s after %d days without a prompt', entry.sessionId, entry.idleDays)
          } else if (result.active === true) {
            active.push(entry)
          } else {
            failed.push({ ...entry, error: result.error ?? 'the registry refused the archive' })
            logger.warn('auto-archive: cannot archive %s: %s', entry.sessionId, result.error ?? 'refused')
          }
        } catch (error) {
          failed.push({ ...entry, error: messageOf(error) })
          logger.warn('auto-archive: cannot archive %s: %s', entry.sessionId, messageOf(error))
        }
      }

      report = {
        at,
        dryRun: settings.dryRun === true,
        scanned: facts.length,
        due: due.length,
        recent,
        pinned,
        archivedCount: archived.length,
        failedCount: failed.length,
        activeCount: active.length,
        deferredCount: deferred.length,
        archived: archived.slice(0, AUTO_ARCHIVE_REPORT_LIMIT),
        failed: failed.slice(0, AUTO_ARCHIVE_REPORT_LIMIT),
        active: active.slice(0, AUTO_ARCHIVE_REPORT_LIMIT),
        deferred: deferred.slice(0, AUTO_ARCHIVE_REPORT_LIMIT),
      }
      await store.update((state) => {
        state.last = report
      }).catch((error: unknown) => {
        logger.warn('auto-archive: cannot record the pass: %s', messageOf(error))
      })
      return report
    } finally {
      running = false
    }
  }

  /** Wake up for the next pass, keeping one timer at a time. */
  function schedule(delayMs: number): void {
    if (disposed) return
    timer = setTimeout(() => {
      timer = undefined
      void runOnce()
        .catch((error: unknown) => {
          logger.warn('auto-archive: pass failed: %s', messageOf(error))
        })
        .finally(() => {
          schedule(Number(settings.checkMs) || 3600000)
        })
    }, delayMs)
    timer.unref?.()
  }

  return {
    runOnce,
    last: () => report,
    start(): void {
      if (disposed || timer !== undefined) return
      if (settings.enabled !== true) {
        logger.info('auto-archive: off')
        return
      }
      const startupDelayMs = Math.max(0, Number(settings.startupDelayMs) || 0)
      const checkMs = Number(settings.checkMs) || 3600000
      logger.info('auto-archive: chats untouched for %d days are archived, first pass in %d ms, then every %d ms',
        Number(settings.inactiveDays) || 0, startupDelayMs, checkMs)
      schedule(startupDelayMs)
    },
    stop(): void {
      disposed = true
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
    },
  }
}

/** One Session's report entry, with its idle age in days. */
function entryOf(fact: AutoArchiveFact, at: number): AutoArchiveEntry {
  const idleMs = Math.max(0, at - (Number(fact.updatedAt) || 0))
  const idleDays = Math.round((idleMs / DAY_MS) * 10) / 10
  return {
    sessionId: fact.sessionId,
    ...(typeof fact.title === 'string' && fact.title.length > 0 ? { title: fact.title } : {}),
    idleDays,
  }
}

/** Message of an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
