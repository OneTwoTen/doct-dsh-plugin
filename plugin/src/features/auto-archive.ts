/**
 * Automatic archive: hide chats nobody has touched for a while.
 *
 * DSH already has a durable archive set that hides a Session from every
 * grouping surface, and restoring is always possible, so this feature only has
 * to decide *which* chats are idle and hand them to the Workspace registry. A
 * pass reads the Host's Session list, applies the pure rules in
 * `lib/auto-archive.ts`, and archives up to `maxPerPass` chats.
 *
 * Idleness is the Host's `updatedAt` watermark — the time of the latest durable
 * user prompt — so a chat is archived for being unwritten, not for the
 * assistant being quiet. A chat that is pinned, open in this window, or still
 * has running work is protected: the registry refuses an active Session unless
 * the operator asked for `archiveRunning`, which stops that work first.
 */
import { join } from 'node:path'

import type { DshContext, Disposer, Logger } from '../host/dsh.ts'
import type { AutoArchiveConfig } from '../lib/config.ts'
import { createAutoArchiver } from '../lib/auto-archive.ts'
import { AUTO_ARCHIVE_PATH_PREFIX, mountAutoArchiveRoutes } from './auto-archive-routes.ts'
import { pluginDataDir } from '../lib/paths.ts'
import { JsonStateStore } from '../lib/state-store.ts'
import type {
  AutoArchiveFact,
  AutoArchiveArchiveResult,
} from '../lib/auto-archive.ts'
import type { AutoArchiveReport, AutoArchiveSettings } from '../shared/protocol.ts'

/** The private data directory this feature keeps its state in. */
const DATA_DIR_NAME = 'personal-hub'
const STATE_DIR_NAME = 'auto-archive'

/** One Session row the Host's list answers. */
interface SessionSummaryLike {
  sessionId?: unknown
  updatedAt?: unknown
  running?: unknown
  blank?: unknown
  origin?: unknown
  cwd?: unknown
  agentAvailable?: unknown
  projections?: { values?: Record<string, unknown> }
}

/** The `sessionController` surface this feature calls. */
interface SessionControllerLike {
  list(options: Record<string, unknown>, signal?: AbortSignal): Promise<{ items?: readonly SessionSummaryLike[] }>
}

/** The `workspaceRegistry` surface this feature calls. */
interface WorkspaceRegistryLike {
  /** The archive set the sidebar hides; absent on a build without it. */
  readonly archivedSessionIds?: readonly string[]
  /** Pinned chats are the user's explicit "keep". */
  readonly pinnedSessionIds?: readonly string[]
  /** `stopActivity` archives even while a turn or a job still runs. */
  archiveSession(sessionId: string, options?: { stopActivity?: boolean }): Promise<unknown>
}

/** The durable state this feature keeps between restarts. */
type AutoArchiveState = {
  version: number
  last: AutoArchiveReport | null
}

/**
 * Mount the automatic-archive feature.
 *
 * The Workspace registry may load after this row, so a build that has not
 * mounted it yet gets the feature when the service arrives instead of losing
 * it for the session.
 *
 * @param ctx Harness plugin context.
 * @param config normalized automatic-archive configuration.
 * @param deps the bundle's logger.
 * @returns disposer that stops the schedule and withdraws the routes
 */
export function mountAutoArchive(
  ctx: DshContext,
  config: AutoArchiveConfig,
  deps: { logger: Logger },
): Disposer {
  const logger = deps.logger
  const registry = ctx.get<WorkspaceRegistryLike>('workspaceRegistry')
  if (typeof registry?.archiveSession === 'function') return mountWithRegistry(ctx, config, deps, registry)

  if (typeof ctx.inject !== 'function') {
    logger.warn('auto-archive: this build exposes no archive set, so the feature cannot mount')
    return () => {}
  }

  let inner: Disposer | undefined
  let fiber: { dispose?(): void } | undefined
  try {
    fiber = ctx.inject(['workspaceRegistry'], (scoped) => {
      const live = scoped.get<WorkspaceRegistryLike>('workspaceRegistry')
      if (typeof live?.archiveSession !== 'function') {
        logger.warn('auto-archive: this build exposes no archive set, so the feature cannot mount')
        return
      }
      inner = mountWithRegistry(scoped, config, deps, live)
    })
  } catch (error) {
    logger.warn('auto-archive: cannot wait for the workspace registry: %s', messageOf(error))
    return () => {}
  }

  return () => {
    try {
      inner?.()
    } catch (error) {
      logger.warn('auto-archive: dispose failed: %s', messageOf(error))
    }
    inner = undefined
    try {
      fiber?.dispose?.()
    } catch {
      // The owning fiber is already gone when its parent disposes it.
    }
  }
}

/**
 * Build and start the feature over a live Workspace registry.
 *
 * @param ctx Harness plugin context.
 * @param config normalized automatic-archive configuration.
 * @param deps the bundle's logger.
 * @param registry the archive surface this build exposes.
 */
function mountWithRegistry(
  ctx: DshContext,
  config: AutoArchiveConfig,
  deps: { logger: Logger },
  registry: WorkspaceRegistryLike,
): Disposer {
  const logger = deps.logger
  const controller = new AbortController()

  const sessionController = ctx.get<SessionControllerLike>('sessionController')
  if (typeof sessionController?.list !== 'function') {
    logger.warn('auto-archive: this build lists no Sessions, so nothing can be archived')
    return () => {}
  }

  // The runner keeps this object and re-reads it every pass, so a settings save
  // applies to the next pass without waiting for the plugin row to remount.
  const settings: AutoArchiveConfig = { ...config }
  const store = new JsonStateStore<AutoArchiveState>(
    join(pluginDataDir(DATA_DIR_NAME), STATE_DIR_NAME, 'state.json'),
    { version: 1, last: null },
  )

  /** The last report, from this process or the one before it. */
  let lastReport: AutoArchiveReport | null = null
  void store.load()
    .then((value) => {
      lastReport = value.last ?? null
    })
    .catch((error: unknown) => {
      logger.warn('auto-archive: cannot read the last pass: %s', messageOf(error))
    })

  /** One string list from the registry, tolerant of an older shape. */
  function idSet(value: unknown): Set<string> {
    if (value instanceof Set) return new Set([...value].map(String))
    return new Set(Array.isArray(value) ? value.map((item) => String(item)) : [])
  }

  const runtime = {
    /** Every Session the Host lists, with the archive and pin sets applied. */
    async facts(): Promise<AutoArchiveFact[]> {
      let archived: Set<string>
      let pinned: Set<string>
      try {
        archived = idSet(registry.archivedSessionIds)
        pinned = idSet(registry.pinnedSessionIds)
      } catch (error) {
        logger.warn('auto-archive: cannot read the archive or pin set: %s', messageOf(error))
        archived = new Set()
        pinned = new Set()
      }
      const value = await sessionController.list({}, controller.signal)
      const rows = Array.isArray(value?.items) ? value.items : []
      const facts: AutoArchiveFact[] = []
      for (const summary of rows) {
        const sessionId = String(summary?.sessionId ?? '')
        if (sessionId.length === 0) continue
        const title = projectedTitle(summary)
        facts.push({
          sessionId,
          updatedAt: Number(summary?.updatedAt) || 0,
          active: summary?.agentAvailable === true,
          running: summary?.running === true,
          blank: summary?.blank === true,
          subagent: summary?.origin === 'subagent',
          archived: archived.has(sessionId),
          pinned: pinned.has(sessionId),
          ...(title.length > 0 ? { title } : {}),
        })
      }
      return facts
    },

    /** Archive one Session, classifying the registry's activity refusal. */
    async archive(sessionId: string, options: { stopActivity: boolean }): Promise<AutoArchiveArchiveResult> {
      try {
        await registry.archiveSession(sessionId, options.stopActivity ? { stopActivity: true } : {})
        return { archived: true }
      } catch (error) {
        // The registry refuses a Session with running work instead of stopping
        // it; that is a protected chat, not a failure worth a warning.
        if (errorName(error) === 'WorkspaceActiveSessionError') return { archived: false, active: true }
        throw error
      }
    },
  }

  const archiver = createAutoArchiver({
    settings,
    logger,
    store,
    runtime,
    now: () => Date.now(),
  })

  /** The settings the card sees: the runtime fields, without the startup grace. */
  function view(): AutoArchiveSettings {
    return {
      enabled: settings.enabled,
      inactiveDays: settings.inactiveDays,
      checkMs: settings.checkMs,
      skipActive: settings.skipActive,
      archiveRunning: settings.archiveRunning,
      archiveBlank: settings.archiveBlank,
      dryRun: settings.dryRun,
      maxPerPass: settings.maxPerPass,
    }
  }

  const routes = mountAutoArchiveRoutes(ctx, {
    logger,
    settings: view,
    last: () => archiver.last() ?? lastReport,
    run: async () => {
      const report = await archiver.runOnce()
      if (report !== null) lastReport = report
      return report
    },
    applySettings: (next) => {
      Object.assign(settings, next)
    },
  })

  archiver.start()
  logger.info('auto-archive: mounted; routes under %s', AUTO_ARCHIVE_PATH_PREFIX)

  return () => {
    archiver.stop()
    controller.abort()
    routes()
  }
}

/** The chat title the Host projected, when it projected one. */
function projectedTitle(summary: SessionSummaryLike): string {
  const value = summary?.projections?.values?.title
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

/** The error class name, for a registry refusal this module classifies without importing it. */
function errorName(error: unknown): string {
  return error instanceof Error ? error.name : ''
}

/** Message of an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
