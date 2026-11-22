/**
 * The automatic-archive card's Host routes.
 *
 * The card lives in the plugin row's configuration slot, so the settings it
 * shows and the pass it can run must come from the mounted feature rather than
 * from a file the browser could read. These exact POST routes are that door:
 *
 *   state        the settings, the last pass, and whether the row is editable
 *   settingsSet  persist the rules into the profile row
 *   runNow       run one pass immediately, whatever the schedule says
 *
 * Configuration edits go through the configuration editor, which reloads the
 * plugin row through the normal Loader path; the settings fields converge on
 * the next mount.
 */
import type { ConfigEditorService, ConnectionService, DshContext, Disposer, FetchRoute, Logger } from '../host/dsh.ts'
import { readJsonPayload, jsonResponse } from '../lib/host-http.ts'
import { ProtocolError } from '../lib/remote-protocol.ts'
import type {
  AutoArchiveCardState,
  AutoArchiveReport,
  AutoArchiveRunResult,
  AutoArchiveSettings,
  AutoArchiveSettingsPatch,
  FailureInfo,
} from '../shared/protocol.ts'

/** The Host route prefix, relative to the page. */
export const AUTO_ARCHIVE_PATH_PREFIX = '/api/personal-hub-auto-archive'

/** Every route this module registers, in one place so a rename stays in sync. */
export const AUTO_ARCHIVE_ENDPOINTS = ['state', 'settingsSet', 'runNow'] as const

/** One endpoint name. */
type Endpoint = typeof AUTO_ARCHIVE_ENDPOINTS[number]

/** The package name the profile row carries. */
const ROW_PACKAGE = '@local/personal-hub'

/** Bounds every numeric field is validated against before it is written. */
const LIMITS = Object.freeze({
  inactiveDays: { min: 0, max: 3650 },
  checkMs: { min: 60000, max: 86400000 },
  maxPerPass: { min: 0, max: 500 },
})

/** What the routes read and drive in the mounted feature. */
export interface AutoArchiveRouteDeps {
  logger: Logger
  /** The settings this mount runs with. */
  settings(): AutoArchiveSettings
  /** The report of the last pass, when one ran. */
  last(): AutoArchiveReport | null
  /** Run one pass now. */
  run(): Promise<AutoArchiveReport | null>
  /** Adopt a saved edit without waiting for the row to remount. */
  applySettings(next: AutoArchiveSettings): void
}

/**
 * Mount the card's routes over the Connection service.
 *
 * @param ctx Harness plugin context, used for the configuration editor.
 * @param deps the mounted feature's settings, last pass, and run control.
 * @returns disposer that withdraws the routes
 */
export function mountAutoArchiveRoutes(ctx: DshContext, deps: AutoArchiveRouteDeps): Disposer {
  const connection = ctx.get<ConnectionService>('connection')
  if (connection?.fetch !== undefined && typeof connection.fetch.register === 'function') {
    return registerRoutes(ctx, connection.fetch.register.bind(connection.fetch), deps)
  }
  // A profile whose Connection loads after this row still gets the card:
  // `ctx.inject` runs the registration when the service arrives.
  if (typeof ctx.inject !== 'function') {
    deps.logger.info('auto-archive: the connection service is absent, so the settings card has no Host side')
    return () => {}
  }

  let routeDisposer: Disposer | undefined
  let fiber: { dispose?(): void } | undefined
  try {
    fiber = ctx.inject(['connection'], (scoped) => {
      const scopedConnection = scoped.get<ConnectionService>('connection')
      if (scopedConnection?.fetch === undefined || typeof scopedConnection.fetch.register !== 'function') {
        deps.logger.warn('auto-archive: the connection service exposes no Fetch routes; the card has no Host side')
        return
      }
      routeDisposer = registerRoutes(ctx, scopedConnection.fetch.register.bind(scopedConnection.fetch), deps)
    })
  } catch (error) {
    deps.logger.warn('auto-archive: cannot wait for the connection service: %s', messageOf(error))
    return () => {}
  }

  return () => {
    try {
      routeDisposer?.()
    } catch (error) {
      deps.logger.warn('auto-archive: route disposal failed: %s', messageOf(error))
    }
    routeDisposer = undefined
    try {
      fiber?.dispose?.()
    } catch {
      // The owning fiber is already gone when its parent disposes it.
    }
  }
}

/**
 * Register one exact POST route per endpoint.
 * @param ctx Harness plugin context.
 * @param register the Connection service's Fetch registrar.
 * @param deps the feature's settings, last pass, and run control.
 */
function registerRoutes(
  ctx: DshContext,
  register: (route: FetchRoute) => Disposer,
  deps: AutoArchiveRouteDeps,
): Disposer {
  const disposers: Disposer[] = []
  for (const endpoint of AUTO_ARCHIVE_ENDPOINTS) {
    const route: FetchRoute = {
      path: `${AUTO_ARCHIVE_PATH_PREFIX}/${endpoint}`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request: Request) => {
        const payload = await readJsonPayload(request)
        if (payload === undefined) {
          return jsonResponse(failure('input/invalid', 'The request body is not valid JSON'))
        }
        return jsonResponse(await dispatch(ctx, deps, endpoint, payload))
      },
    }
    try {
      disposers.push(register(route))
    } catch (error) {
      deps.logger.error('auto-archive: cannot register %s: %s', route.path, messageOf(error))
    }
  }

  if (disposers.length === 0) {
    deps.logger.error('auto-archive: no card route could be registered')
  } else {
    deps.logger.info('auto-archive: %d routes are open under %s for this browser', disposers.length, AUTO_ARCHIVE_PATH_PREFIX)
  }

  return () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch (error) {
        deps.logger.warn('auto-archive: route dispose failed: %s', messageOf(error))
      }
    }
  }
}

/**
 * Run one card call, folding every failure into the envelope.
 * @param ctx Harness plugin context.
 * @param deps the feature's settings, last pass, and run control.
 * @param endpoint route name.
 * @param payload call arguments.
 */
async function dispatch(
  ctx: DshContext,
  deps: AutoArchiveRouteDeps,
  endpoint: Endpoint,
  payload: Record<string, unknown>,
): Promise<{ ok: true; value: unknown } | { ok: false; error: FailureInfo }> {
  try {
    switch (endpoint) {
      case 'state':
        return { ok: true, value: cardState(ctx, deps) }
      case 'settingsSet':
        return { ok: true, value: await settingsSet(ctx, deps, payload) }
      case 'runNow':
        return { ok: true, value: await runNow(deps) }
      default:
        return failure('input/unknown-endpoint', `Unknown automatic-archive route "${String(endpoint)}"`)
    }
  } catch (error) {
    deps.logger.warn('auto-archive: %s failed: %s', endpoint, messageOf(error))
    return failureOf(error)
  }
}

/** The settings, the last pass, and whether this composition may edit them. */
function cardState(ctx: DshContext, deps: AutoArchiveRouteDeps): AutoArchiveCardState {
  return {
    writable: editorOf(ctx) !== undefined,
    settings: deps.settings(),
    last: deps.last(),
  }
}

/**
 * Run one pass immediately.
 *
 * A disabled feature does not archive anything, not even from the button: the
 * card explains that, and the toggle is the one control that turns it on.
 *
 * @param deps the feature's settings and run control.
 */
async function runNow(deps: AutoArchiveRouteDeps): Promise<AutoArchiveRunResult> {
  if (deps.settings().enabled !== true) {
    return { ran: false, reason: 'disabled', last: deps.last() }
  }
  const last = await deps.run()
  return { ran: true, last: last ?? deps.last() }
}

/**
 * Persist one settings change into the profile's plugin row.
 *
 * @param ctx Harness plugin context.
 * @param deps the feature's settings.
 * @param payload the edit the card sent.
 */
async function settingsSet(
  ctx: DshContext,
  deps: AutoArchiveRouteDeps,
  payload: Record<string, unknown>,
): Promise<{ settings: AutoArchiveSettings }> {
  const editor = editorOf(ctx)
  if (editor === undefined) {
    throw new ProtocolError('config/unavailable', 'This build cannot edit configuration from the UI')
  }
  const current = deps.settings()
  const next = mergeSettings(current, payload)
  // A reload of the plugin row costs a restart of this feature; an unchanged
  // form should not cause one.
  if (sameSettings(current, next)) return { settings: current }

  const entry = editor.entries().find((row) => row?.options?.name === ROW_PACKAGE)
  if (entry === undefined) {
    throw new ProtocolError('config/unknown-entry', 'The plugin row is missing from this profile configuration')
  }
  await editor.edit(entry, (raw) => writeRow(raw, next))
  deps.applySettings(next)
  return { settings: next }
}

/** The configuration editor, when this composition can rewrite the profile. */
function editorOf(ctx: DshContext): ConfigEditorService | undefined {
  const service = ctx.get<ConfigEditorService>('configEditor')
  return service !== undefined && typeof service.edit === 'function' && typeof service.entries === 'function'
    ? service
    : undefined
}

/**
 * Validate one edit against the current settings.
 *
 * @param current the settings this mount runs with.
 * @param payload the edit the card sent.
 */
function mergeSettings(current: AutoArchiveSettings, payload: AutoArchiveSettingsPatch & Record<string, unknown>): AutoArchiveSettings {
  return {
    enabled: boolean(current.enabled, payload.enabled, 'enabled'),
    inactiveDays: whole(payload.inactiveDays, current.inactiveDays, 'inactiveDays'),
    checkMs: whole(payload.checkMs, current.checkMs, 'checkMs'),
    skipActive: boolean(current.skipActive, payload.skipActive, 'skipActive'),
    archiveRunning: boolean(current.archiveRunning, payload.archiveRunning, 'archiveRunning'),
    archiveBlank: boolean(current.archiveBlank, payload.archiveBlank, 'archiveBlank'),
    dryRun: boolean(current.dryRun, payload.dryRun, 'dryRun'),
    maxPerPass: whole(payload.maxPerPass, current.maxPerPass, 'maxPerPass'),
  }
}

/** One boolean field: absent keeps the current value. */
function boolean(current: boolean, value: unknown, name: string): boolean {
  if (value === undefined) return current
  if (typeof value !== 'boolean') throw new ProtocolError('input/invalid', `${name} must be true or false`)
  return value
}

/** One bounded whole-number field: absent keeps the current value. */
function whole(value: unknown, current: number, name: keyof typeof LIMITS): number {
  if (value === undefined) return current
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new ProtocolError('input/invalid', `${name} must be a whole number`)
  }
  const limit = LIMITS[name]
  if (value < limit.min || value > limit.max) {
    throw new ProtocolError('input/invalid', `${name} must be between ${limit.min} and ${limit.max}`)
  }
  return value
}

/** Whether two settings snapshots ask for the same rules. */
function sameSettings(left: AutoArchiveSettings, right: AutoArchiveSettings): boolean {
  return left.enabled === right.enabled
    && left.inactiveDays === right.inactiveDays
    && left.checkMs === right.checkMs
    && left.skipActive === right.skipActive
    && left.archiveRunning === right.archiveRunning
    && left.archiveBlank === right.archiveBlank
    && left.dryRun === right.dryRun
    && left.maxPerPass === right.maxPerPass
}

/**
 * Write the card's eight fields into one profile row, leaving every other key
 * — Git, Telegram, and Web Remote settings included — untouched.
 *
 * @param raw the row as the configuration editor holds it.
 * @param settings the next settings.
 */
function writeRow(raw: unknown, settings: AutoArchiveSettings): Record<string, unknown> {
  const row = record(raw)
  return {
    ...row,
    autoArchive: {
      ...record(row.autoArchive),
      ...settings,
    },
  }
}

/** A plain object, or an empty one. */
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

/** The Remote failure envelope. */
function failure(code: string, message: string): { ok: false; error: FailureInfo } {
  return { ok: false, error: { code, message } }
}

/** Turn a thrown value into the failure the card shows. */
function failureOf(error: unknown): { ok: false; error: FailureInfo } {
  if (error instanceof ProtocolError) return failure(error.code, error.message)
  return failure('system/failed', messageOf(error))
}

/** Message of an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
