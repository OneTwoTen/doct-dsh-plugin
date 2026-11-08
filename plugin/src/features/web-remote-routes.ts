/**
 * The Web Remote card's Host routes.
 *
 * The card lives in the plugin row's configuration slot, so everything it shows
 * — pairing code, connection state, last error — must come from the running
 * feature rather than from a file the browser could read. These exact POST
 * routes are that door:
 *
 *   state        one snapshot of settings plus runtime status
 *   settingsSet  persist relayUrl / deviceName / autoPair into the profile row
 *   pair         drop the credential and start flow B again
 *   pairCancel   abort the pairing attempt in flight
 *   unpair       delete the stored credential and stop the socket
 *
 * Configuration edits go through the configuration editor, which reloads the
 * plugin row through the normal Loader path; the settings fields converge on
 * the next mount.
 */
import type { ConfigEditorService, ConnectionService, DshContext, Disposer, FetchRoute, Logger } from '../host/dsh.ts'
import { readJsonPayload, jsonResponse } from '../lib/host-http.ts'
import { ProtocolError } from '../lib/remote-protocol.ts'
import { PairingError, relayEndpoints } from '../lib/remote-pairing.ts'
import type {
  FailureInfo,
  WebRemoteActionResult,
  WebRemoteCardState,
  WebRemoteRuntimeStatus,
  WebRemoteSettingsPatch,
  WebRemoteSettingsView,
} from '../shared/protocol.ts'

/** The Host route prefix, relative to the page. */
export const WEB_REMOTE_PATH_PREFIX = '/api/personal-hub-web-remote'

/** Every route this module registers, in one place so a rename stays in sync. */
export const WEB_REMOTE_ENDPOINTS = ['state', 'settingsSet', 'pair', 'pairCancel', 'unpair'] as const

/** One endpoint name. */
type Endpoint = typeof WEB_REMOTE_ENDPOINTS[number]

/** The package name the profile row carries. */
const ROW_PACKAGE = '@local/personal-hub'

/** Longest device name the relay gets; a desktop hostname fits well inside. */
const MAX_DEVICE_NAME = 80

/** Longest relay URL accepted; anything longer is a typo, not a relay. */
const MAX_RELAY_URL = 2048

/** What the routes read and drive in the mounted feature. */
export interface WebRemoteRouteDeps {
  logger: Logger
  /** The relay settings this mount runs with. */
  settings(): WebRemoteSettingsView
  /** The latest runtime status snapshot. */
  status(): WebRemoteRuntimeStatus
  /** Drop the credential and start pairing; resolves once the attempt started. */
  pair(): Promise<void>
  /** Abort the pairing attempt in flight, if any. */
  cancelPairing(): Promise<void>
  /** Delete the credential and stop the socket. */
  unpair(): Promise<void>
}

/**
 * Mount the card's routes over the Connection service.
 *
 * @param ctx Harness plugin context, used for the configuration editor.
 * @param deps the mounted feature's status and pairing controls.
 * @returns disposer that withdraws the routes
 */
export function mountWebRemoteRoutes(ctx: DshContext, deps: WebRemoteRouteDeps): Disposer {
  const connection = ctx.get<ConnectionService>('connection')
  if (connection?.fetch !== undefined && typeof connection.fetch.register === 'function') {
    return registerRoutes(ctx, connection.fetch.register.bind(connection.fetch), deps)
  }
  // A profile whose Connection loads after this row still gets the card:
  // `ctx.inject` runs the registration when the service arrives.
  if (typeof ctx.inject !== 'function') {
    deps.logger.info('web-remote: the connection service is absent, so the settings card has no Host side')
    return () => {}
  }

  let routeDisposer: Disposer | undefined
  let fiber: { dispose?(): void } | undefined
  try {
    fiber = ctx.inject(['connection'], (scoped) => {
      const scopedConnection = scoped.get<ConnectionService>('connection')
      if (scopedConnection?.fetch === undefined || typeof scopedConnection.fetch.register !== 'function') {
        deps.logger.warn('web-remote: the connection service exposes no Fetch routes; the settings card has no Host side')
        return
      }
      routeDisposer = registerRoutes(ctx, scopedConnection.fetch.register.bind(scopedConnection.fetch), deps)
    })
  } catch (error) {
    deps.logger.warn('web-remote: cannot wait for the connection service: %s', messageOf(error))
    return () => {}
  }

  return () => {
    try {
      routeDisposer?.()
    } catch (error) {
      deps.logger.warn('web-remote: route disposal failed: %s', messageOf(error))
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
 * @param deps the feature's status and pairing controls.
 */
function registerRoutes(
  ctx: DshContext,
  register: (route: FetchRoute) => Disposer,
  deps: WebRemoteRouteDeps,
): Disposer {
  const disposers: Disposer[] = []
  for (const endpoint of WEB_REMOTE_ENDPOINTS) {
    const route: FetchRoute = {
      path: `${WEB_REMOTE_PATH_PREFIX}/${endpoint}`,
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
      deps.logger.error('web-remote: cannot register %s: %s', route.path, messageOf(error))
    }
  }

  if (disposers.length === 0) {
    deps.logger.error('web-remote: no card route could be registered')
  } else {
    deps.logger.info('web-remote: %d status routes are open under %s for this browser', disposers.length, WEB_REMOTE_PATH_PREFIX)
  }

  return () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch (error) {
        deps.logger.warn('web-remote: route dispose failed: %s', messageOf(error))
      }
    }
  }
}

/**
 * Run one card call, folding every failure into the envelope.
 * @param ctx Harness plugin context.
 * @param deps the feature's status and pairing controls.
 * @param endpoint route name.
 * @param payload call arguments.
 */
async function dispatch(
  ctx: DshContext,
  deps: WebRemoteRouteDeps,
  endpoint: Endpoint,
  payload: Record<string, unknown>,
): Promise<{ ok: true; value: unknown } | { ok: false; error: FailureInfo }> {
  try {
    switch (endpoint) {
      case 'state':
        return { ok: true, value: cardState(ctx, deps) }
      case 'settingsSet':
        return { ok: true, value: await settingsSet(ctx, deps, payload) }
      case 'pair':
        await deps.pair()
        return { ok: true, value: actionResult(deps) }
      case 'pairCancel':
        await deps.cancelPairing()
        return { ok: true, value: actionResult(deps) }
      case 'unpair':
        await deps.unpair()
        return { ok: true, value: actionResult(deps) }
      default:
        return failure('input/unknown-endpoint', `Unknown Web Remote route "${String(endpoint)}"`)
    }
  } catch (error) {
    deps.logger.warn('web-remote: %s failed: %s', endpoint, messageOf(error))
    return failureOf(error)
  }
}

/** The settings, the status, and whether this composition may edit them. */
function cardState(ctx: DshContext, deps: WebRemoteRouteDeps): WebRemoteCardState {
  return {
    writable: editorOf(ctx) !== undefined,
    settings: deps.settings(),
    status: deps.status(),
  }
}

/** What a pairing control answers. */
function actionResult(deps: WebRemoteRouteDeps): WebRemoteActionResult {
  return { state: deps.status().state }
}

/**
 * Persist one settings change into the profile's plugin row.
 *
 * @param ctx Harness plugin context.
 * @param deps the feature's settings and controls.
 * @param payload the edit the card sent.
 */
async function settingsSet(
  ctx: DshContext,
  deps: WebRemoteRouteDeps,
  payload: Record<string, unknown>,
): Promise<{ settings: WebRemoteSettingsView }> {
  const editor = editorOf(ctx)
  if (editor === undefined) {
    throw new ProtocolError('config/unavailable', 'This build cannot edit configuration from the UI')
  }
  const current = deps.settings()
  const next = mergeSettings(current, payload)
  // A reload of the plugin row costs a reconnect; an unchanged form should not.
  if (sameSettings(current, next)) return { settings: current }

  const entry = editor.entries().find((row) => row?.options?.name === ROW_PACKAGE)
  if (entry === undefined) {
    throw new ProtocolError('config/unknown-entry', 'The plugin row is missing from this profile configuration')
  }
  await editor.edit(entry, (raw) => writeRow(raw, next))
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
 * `relayEndpoints` is the same parser the transport uses, so a URL the card
 * accepts is a URL the bridge can connect to.
 *
 * @param current the settings this mount runs with.
 * @param payload the edit the card sent.
 */
function mergeSettings(current: WebRemoteSettingsView, payload: Record<string, unknown>): WebRemoteSettingsView {
  let enabled = current.enabled
  if (payload.enabled !== undefined) {
    if (typeof payload.enabled !== 'boolean') {
      throw new ProtocolError('input/invalid', 'enabled must be true or false')
    }
    enabled = payload.enabled
  }

  const relayUrl = payload.relayUrl === undefined ? current.relayUrl : text(payload.relayUrl, 'relayUrl', MAX_RELAY_URL)
  if (relayUrl.length > 0) relayEndpoints(relayUrl)

  const rawName = payload.deviceName === undefined ? current.deviceName : text(payload.deviceName, 'deviceName', MAX_DEVICE_NAME)
  const deviceName = rawName.trim()
  let autoPair = current.autoPair
  if (payload.autoPair !== undefined) {
    if (typeof payload.autoPair !== 'boolean') {
      throw new ProtocolError('input/invalid', 'autoPair must be true or false')
    }
    autoPair = payload.autoPair
  }

  return {
    enabled,
    relayUrl,
    deviceName,
    effectiveDeviceName: deviceName.length > 0 ? deviceName : current.effectiveDeviceName,
    autoPair,
  }
}

/** One string field with a length bound. */
function text(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string') throw new ProtocolError('input/invalid', `${name} must be a string`)
  const trimmed = value.trim()
  if (trimmed.length > max) {
    throw new ProtocolError('input/invalid', `${name} is longer than ${max} characters`)
  }
  return trimmed
}

/** Whether two settings snapshots ask the relay for the same thing. */
function sameSettings(left: WebRemoteSettingsView, right: WebRemoteSettingsView): boolean {
  return left.enabled === right.enabled
    && left.relayUrl === right.relayUrl
    && left.deviceName === right.deviceName
    && left.autoPair === right.autoPair
}

/**
 * Write the card's four fields into one profile row, leaving every other key
 * — Git and Telegram settings included — untouched.
 *
 * @param raw the row as the configuration editor holds it.
 * @param settings the next settings.
 */
function writeRow(raw: unknown, settings: WebRemoteSettingsView): Record<string, unknown> {
  const row = record(raw)
  return {
    ...row,
    webRemote: {
      ...record(row.webRemote),
      enabled: settings.enabled,
      relayUrl: settings.relayUrl,
      deviceName: settings.deviceName,
      autoPair: settings.autoPair,
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
  if (error instanceof ProtocolError || error instanceof PairingError) {
    return failure(error.code, error.message)
  }
  return failure('system/failed', messageOf(error))
}

/** Message of an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
