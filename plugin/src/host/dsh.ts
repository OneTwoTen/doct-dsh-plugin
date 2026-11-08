/**
 * The slice of the Harness plugin API this bundle uses, written as structural
 * types.
 *
 * The bundle never imports Harness packages: a profile installs one local
 * package, and its dependencies must not leak into the profile's resolution.
 * These interfaces describe only the members this plugin calls, so the compiler
 * checks every call site while the runtime keeps using whatever the composition
 * supplies.
 */

/** One line-oriented logger, as `ctx.logger(name)` returns it. */
export interface Logger {
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
  debug?(...args: unknown[]): void
}

/** The function a registration returns to withdraw itself. */
export type Disposer = () => void

/** A context handle, either the plugin's own or one `inject` scoped. */
export interface DshContext {
  /** Resolve one service, or `undefined` when the composition has none. */
  get<T = unknown>(name: string): T | undefined
  /** Run `callback` once the named services exist; returns a handle to cancel. */
  inject?(names: string[], callback: (scoped: DshContext) => void): { dispose?(): void } | undefined
  /** Listen for one event; returns its unsubscriber. */
  on?(event: string, listener: (payload: never) => void): Disposer
  /** Run `factory` now and its cleanup when the plugin unloads. */
  effect(fn: () => Disposer | void, label?: string): void
  /** A named logger, when the composition exposes one. */
  logger?(name: string): Logger
}

/** The `subprocess` service: process lifetime and the credential scrub. */
export interface SubprocessService {
  resolveExecutable(program: string): Promise<string>
  spawn(options: {
    argv: string[]
    cwd?: string
    stdio?: unknown
    graceMs?: number
    signal?: AbortSignal
    env?: Record<string, string>
  }): {
    done: Promise<{ exitCode?: number; signal?: string | null } | undefined>
    collected?: {
      stdout?: { readFrom(offset: number): { text?: string; lossy?: boolean } }
      stderr?: { readFrom(offset: number): { text?: string } }
    }
  }
}

/** One exact Fetch route the browser may call. */
export interface FetchRoute {
  path: string
  methods: string[]
  requestBody?: 'buffered'
  fetch(request: Request): Promise<Response> | Response
}

/** The `connection` service's Fetch registrar. */
export interface ConnectionService {
  fetch?: {
    register(route: FetchRoute): Disposer
  }
}

/** The `credentials` service. */
export interface CredentialsService {
  resolve(ref: string): Promise<{ value?: string; configured?: boolean } | undefined>
  set?(ref: string, value: string): Promise<unknown>
  unset?(ref: string): Promise<unknown>
  describe?(refs: string[]): Promise<{ ok: boolean; value?: Record<string, { configured: boolean; writable: boolean }> }>
}

/** One row the configuration editor can rewrite. */
export interface ConfigEditorEntry {
  id?: string
  options?: { name?: string; [key: string]: unknown }
  [key: string]: unknown
}

/** The `configEditor` service. */
export interface ConfigEditorService {
  entries(): ConfigEditorEntry[]
  edit(entry: ConfigEditorEntry, next: (current: unknown) => unknown): Promise<unknown> | unknown
}

/** A live Session Agent. */
export interface AgentLike {
  session?: SessionLike
  [key: string]: unknown
}

/** The header a Session carries. */
export interface SessionLike {
  id?: string
  header?: { cwd?: string; [key: string]: unknown }
  [key: string]: unknown
}

/** The `agents` service. */
export interface AgentsService {
  get(sessionId: string): AgentLike | undefined
}

/** The `sessions` service. */
export interface SessionsService {
  get(sessionId: string): SessionLike | undefined
}

/** The `workingDirectory` service, which owns a Session's effective folder. */
export interface WorkingDirectoryService {
  get(session: SessionLike): string | undefined
  set(agent: AgentLike, directory: string, signal?: AbortSignal): Promise<unknown>
}

/** The `sessionProjections` service. */
export interface SessionProjectionsService {
  stateOf(session: SessionLike, key: string): unknown
}

/** The `agentDefaultModel` service. */
export interface AgentDefaultModelService {
  currentSelection(): { provider?: string; model?: string } | null | undefined
}

/** A model route this plugin may call. */
export interface ModelRoute {
  provider: string
  model: string
}

/** One streamed model chunk. */
export interface LlmChunk {
  type?: string
  text?: string
  block?: { type?: string; text?: string }
}

/** The call handle `prepareCall` returns. */
export interface LlmCall {
  config: Record<string, unknown> & { reasoningEffort?: string | null }
  stream(params: Record<string, unknown>): AsyncIterable<LlmChunk>
}

/** The `llm` service. */
export interface LlmService {
  prepareCall(
    config: { provider: string; model: string; maxTokens?: number },
    signal: AbortSignal,
    adjust?: (controls: Record<string, unknown>, model: unknown) => Record<string, unknown>,
  ): Promise<LlmCall>
}

/** The `workspaceRegistry` service. */
export interface WorkspaceRegistryService {
  archiveSession?(sessionId: string): Promise<unknown>
}

/** The `sessionController` service: creating a Session for a new chat. */
export interface SessionControllerService {
  create?(options: Record<string, unknown>): Promise<unknown>
}

/** The `sidebarRightTabs` service. */
export interface SidebarRightTabsService {
  register(options: Record<string, unknown>): Disposer
}

/** The `sidebarRight` service. */
export interface SidebarRightService {
  openTab(kind: string): void
}

/** The `slots` service of the browser context. */
export interface SlotsService {
  inject(name: string, callback: () => unknown): Disposer
  register(options: Record<string, unknown>, component: unknown): Disposer
}

/** The `locale` service of the browser context. */
export interface LocaleService {
  bind(namespace: string): (key: string, values?: Record<string, string | number>) => string
  register(namespace: string, dictionaries: Record<string, Record<string, string>>): Disposer
}

/** The `remote` service of the browser context. */
export interface RemoteService {
  credentials: {
    describe(refs: string[]): Promise<{
      ok: boolean
      value?: Record<string, { configured: boolean; writable: boolean }>
      error?: { code?: string; message?: string }
    }>
    set(ref: string, value: string): Promise<unknown>
    unset(ref: string): Promise<unknown>
  }
  session?: {
    create(options: { cwd?: string }): Promise<{
      ok: boolean
      value?: unknown
      error?: { code?: string; message?: string }
    }>
  }
  $on(event: string, listener: (payload: never) => void): Disposer
}

/** The browser plugin context this bundle receives in `apply`. */
export interface ClientContext extends DshContext {
  slots: SlotsService
  locale: LocaleService
  remote: RemoteService
}

/** Read one service from a context, narrowed by the caller. */
export function service<T>(ctx: DshContext, name: string): T | undefined {
  return ctx.get<T>(name)
}
