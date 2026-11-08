import { randomUUID } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expandHome, pluginDataDir } from '../lib/paths.ts'
import { JsonStateStore, writeJsonFile } from '../lib/state-store.ts'
import { TelegramApi, TelegramError, isTokenFailure } from '../lib/telegram-api.ts'
import type {
  EditMessageOptions,
  TelegramCallbackQuery,
  TelegramInlineKeyboardButton,
  TelegramKeyboard,
  TelegramMessage,
  TelegramUser,
} from '../lib/telegram-api.ts'
import { chunkText, parseCommand } from '../lib/text.ts'
import { createTurnReporter, FINAL_LABEL } from '../lib/turn-report.ts'
import type { ChangeSummary, SessionEvent, TurnReporter } from '../lib/turn-report.ts'
import type { DshContext, Disposer, Logger, SessionLike } from '../host/dsh.ts'
import type { TelegramConfig } from '../lib/config.ts'

export { assistantText } from '../lib/turn-report.ts'

/** Data directory name under the DeepSeek Harness home. */
const DATA_DIR_NAME = 'personal-hub'
const TELEGRAM_DATA_DIR = 'telegram-remote'
const PLACEHOLDER = '⏳ Đang xử lý…'
/** One page of the session picker; keeps the message and keyboard readable. */
const SESSION_PAGE_SIZE = 8
/** Credential reference the settings card writes and this feature resolves. */
const TOKEN_CREDENTIAL_REF = 'DSH_TELEGRAM_BOT_TOKEN'
const HELP_TEXT = [
  'Điều khiển DeepSeek Harness từ xa.',
  '',
  'Gửi tin nhắn văn bản để chuyển thành prompt cho phiên DSH đang gắn với chat này.',
  'Mỗi lượt trả lời được đẩy về chat thành nhiều tin: 💬 phản hồi trung gian, 🔧 thay đổi chính, ✅ phản hồi cuối.',
  '',
  '/new [thư-mục] – tạo phiên mới (mặc định dùng workspace hoặc thư mục đang chọn)',
  '/sessions [trang] – liệt kê phiên gần đây, chạm để gắn hoặc lưu trữ',
  '/session <số|sessionId> – gắn chat này vào một phiên có sẵn',
  '/archived [trang] – phiên đã lưu trữ, chạm để khôi phục',
  '/archive [số|sessionId] – lưu trữ phiên (mặc định phiên đang gắn)',
  '/restore <số|sessionId> – khôi phục phiên đã lưu trữ',
  '/workspaces – liệt kê workspace (có nút bấm để chọn)',
  '/workspace <số|id|đường-dẫn> – chọn workspace cho phiên mới',
  '/models – liệt kê provider và model (có nút bấm để chọn)',
  '/model <số|provider/model[@effort]> – đổi model cho phiên này',
  '/status – phiên đang gắn, workspace, model, trạng thái chạy',
  '/cancel – dừng lượt đang chạy',
  '/unbind – bỏ gắn phiên, tin nhắn sau sẽ tạo phiên mới',
  '/use <sessionId> – gắn chat này vào một phiên có sẵn',
  '/whoami – id chat của bạn',
  '/help – danh sách lệnh',
].join('\n')

/** What `apply` hands a feature when it mounts. */
export interface TelegramRemoteDeps {
  logger: Logger
  dataDir?: string
  fetchImpl?: typeof fetch
}

/** One model route selection, as a chat stores it. */
interface ModelSelection {
  provider?: string
  model?: string
  reasoningEffort?: string
}

/** One chat's bound Session. */
interface StoredBinding {
  sessionId: string
  cwd?: string
  workspaceId?: string
  model?: ModelSelection
  createdAt?: number
}

/** One chat's remembered choices. */
interface StoredPreferences {
  workspaceId?: string
  model?: ModelSelection
}

/** One row of the Session picker. */
interface SessionItem {
  sessionId: string
  title: string
  cwd: string
  updatedAt?: number
  running?: boolean
  blank?: boolean
}

/** One workspace the DSH profile knows about. */
interface WorkspaceItem {
  id: string
  title: string
  path: string
}

/** One routable model offered by the picker. */
interface ModelChoice {
  provider: string
  providerName: string
  model: string
  modelName: string
}

/** A chat listing the numbered replies and buttons resolve against. */
type ListKind = 'sessions' | 'archived' | 'workspaces' | 'models'

/** The persistent state this feature keeps under its data directory. */
interface TelegramState {
  version: number
  offset: number
  allowedChatIds: string[]
  bindings: Record<string, StoredBinding>
  prefs: Record<string, StoredPreferences>
  lists: Record<string, Record<string, unknown[]>>
  pairedAt?: number
}

/** One Host Session summary the picker lists. */
interface SessionSummaryLike {
  sessionId?: string | number
  cwd?: unknown
  origin?: string
  updatedAt?: number
  running?: boolean
  blank?: boolean
  projections?: { values?: { title?: unknown } }
  [key: string]: unknown
}

/** The state `sessionController.state` answers with. */
interface SessionStateLike {
  cursor: number
  running?: boolean
  queue?: unknown[] | null
  pendingInput?: string[]
}

/** One record of the Session event log. */
interface EventRecord {
  event?: SessionEvent
}

/** What `sessionController.wait` answers with. */
interface WaitResult {
  reason?: string
  state?: { cursor?: number; pendingInput?: string[] }
  output?: { records?: EventRecord[] }
}

/** What `sessionController.events` answers with. */
interface EventsResult {
  cursor?: number
  records?: EventRecord[]
  hasMore?: boolean
}

/** One provider group of the model catalog. */
interface ModelCatalogGroup {
  id: string
  name?: string
  models?: Array<{ id: string; name?: string }>
}

/** The model catalog `sessionController.modelCatalog` answers with. */
interface ModelCatalog {
  default?: ModelSelection | null
  groups?: ModelCatalogGroup[]
  failures?: Array<{ id?: string; name?: string; message?: string }>
}

/** A Session the controller just created. */
interface CreatedSession {
  sessionId: string
}

/** The `sessionController` service surface this feature calls. */
interface SessionControllerLike {
  list(options: Record<string, unknown>, signal?: AbortSignal): Promise<{ items?: SessionSummaryLike[] }>
  state(options: { sessionId: string }, signal?: AbortSignal): Promise<SessionStateLike>
  create(options: { cwd?: string; workspaceId?: string }): Promise<CreatedSession>
  prompt(options: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
  wait(options: {
    sessionId: string
    timeoutMs: number
    afterSeq: number
    maxMessages: number
  }, signal?: AbortSignal): Promise<WaitResult>
  events(options: Record<string, unknown>, signal?: AbortSignal): Promise<EventsResult>
  cancel(options: { sessionId: string }): unknown
  modelCatalog(): Promise<ModelCatalog>
  selectModel(
    options: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<{ selected?: ModelSelection } | undefined>
}

/** One workspace row the registry lists. */
interface WorkspaceRow {
  id: string
  title?: string
  path: string
}

/** The `workspaceRegistry` service surface this feature calls. */
interface WorkspaceRegistryLike {
  list(): WorkspaceRow[]
  /** Session ids the registry hides from its grouping surfaces. */
  archivedSessionIds?: unknown
  archiveSession(sessionId: string): Promise<unknown>
  unarchiveSession(sessionId: string): Promise<unknown>
}

/** The optional `workspaceChanges` service. */
interface WorkspaceChangesService {
  summary(sessionId: string, seq: number | undefined): ChangeSummary | undefined
}

/** The optional `workingDirectory` member this feature reads. */
interface WorkingDirectoryLike {
  defaultDirectory?: string
}

/** One turn's route from committed events to the chat. */
interface TurnSink {
  startSeq: number
  reporter: TurnReporter
  chain: Promise<void>
  seen: Set<number>
  closed: boolean
}

/** What one pump waits for. */
interface TurnOutcome {
  reporter: TurnReporter
  pendingInput: string[]
  timedOut: boolean
}

/** The status file this feature publishes for the user and for debugging. */
interface PublishedStatus {
  updatedAt?: string
  state?: string
  tokenSource?: string
  lastPollAt?: string | null
  lastError?: string | null
  bot?: { id?: number; username?: string } | null
  allowedChatIds?: string[]
  bindings?: Record<string, StoredBinding>
  capabilities?: { workspaces: number; providers?: number; models?: number; modelError?: string }
  hint?: string | null
}

/** How the Harness delivers `session/event`: the Session, then the event. */
type SessionEventRegistrar = (
  event: string,
  listener: (session: SessionLike, event: SessionEvent) => void,
) => Disposer

/**
 * Mount the Telegram remote-control feature.
 *
 * @param ctx Harness plugin context.
 * @param config Feature configuration.
 * @param deps logger, optional data directory, and optional fetch implementation.
 * @returns disposer that stops polling and drops in-flight work
 */
export function mountTelegramRemote(ctx: DshContext, config: TelegramConfig, deps: TelegramRemoteDeps): Disposer {
  const logger = deps.logger
  const dataDir = deps.dataDir ?? join(pluginDataDir(DATA_DIR_NAME), TELEGRAM_DATA_DIR)
  const stateFile = join(dataDir, 'state.json')
  const statusFile = join(dataDir, 'status.json')
  const store = new JsonStateStore<TelegramState>(stateFile, {
    version: 1,
    offset: 0,
    allowedChatIds: [],
    bindings: {},
    prefs: {},
    lists: {},
  })

  const controller = new AbortController()
  const chatQueues = new Map<string, Promise<unknown>>()
  const activeTurns = new Map<string, string>()
  const turnSinks = new Map<string, Set<TurnSink>>()
  let observeSessionEvents = typeof ctx.on === 'function'
  const fetchImpl = deps.fetchImpl
  const sessionController = requiredService<SessionControllerLike>(ctx, 'sessionController')
  const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const staticAllowed = (Array.isArray(config.allowedChatIds) ? config.allowedChatIds : [])
    .map((id) => String(id).trim())
    .filter((id) => id.length > 0)

  let stopped = false
  let identity: TelegramUser | undefined
  let identityToken = ''
  let currentState = 'starting'
  let lastStatusText = ''
  let published: PublishedStatus = {}
  let lastPollAt = 0

  logger.info('telegram-remote: mounted, data directory %s', dataDir)

  // Committed Session events feed an active turn directly, so the chat shows
  // narration, tool changes, and the changed-files event as they happen
  // instead of re-reading history pages every poll.
  let detachSessionEvents: Disposer | undefined
  if (observeSessionEvents) {
    try {
      // `DshContext.on` types its payload as `never` because the Harness event
      // catalog is not part of this bundle; `session/event` passes the Session
      // and the committed event as two arguments.
      const register = ctx.on as unknown as SessionEventRegistrar
      detachSessionEvents = register('session/event', (session, event) => {
        const sessionId = session?.id
        if (typeof sessionId !== 'string' || !event || typeof event.seq !== 'number') return
        const sinks = turnSinks.get(sessionId)
        if (!sinks || sinks.size === 0) return
        for (const sink of [...sinks]) enqueueSinkEvent(sink, event)
      })
    } catch (error) {
      observeSessionEvents = false
      logger.warn('telegram-remote: cannot observe session events, falling back to polling: %s', errorMessage(error))
    }
  }

  /** Publish observable runtime status for the user and for debugging. */
  async function publishStatus(patch: Partial<PublishedStatus>): Promise<void> {
    const patchedState = patch?.state
    if (typeof patchedState === 'string') currentState = patchedState
    const next: PublishedStatus = {
      ...published,
      updatedAt: new Date().toISOString(),
      state: currentState,
      tokenSource: published.tokenSource ?? 'none',
      lastPollAt: lastPollAt > 0 ? new Date(lastPollAt).toISOString() : published.lastPollAt ?? null,
      lastError: published.lastError ?? null,
      bot: identity ? { id: identity.id, username: identity.username } : published.bot ?? null,
      allowedChatIds: staticAllowed.length > 0 ? staticAllowed : store.state.allowedChatIds ?? [],
      bindings: store.state.bindings ?? {},
      ...patch,
    }
    const comparable = JSON.stringify({ ...next, updatedAt: '' })
    if (comparable === lastStatusText) return
    lastStatusText = comparable
    published = next
    try {
      await writeJsonFile(statusFile, next)
    } catch (error) {
      logger.warn('telegram-remote: cannot write status file: %s', errorMessage(error))
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms)
      function done(): void {
        clearTimeout(timer)
        controller.signal.removeEventListener('abort', done)
        resolve()
      }
      controller.signal.addEventListener('abort', done, { once: true })
    })
  }

  /** Resolve the bot token: config value, credential store, environment variable, then token file. */
  async function resolveToken(): Promise<{ token: string; source: string; tokenFile?: string }> {
    const fromConfig = typeof config.token === 'string' ? config.token.trim() : ''
    if (fromConfig.length > 0) return { token: fromConfig, source: 'config' }

    const credentials = ctx.get<{ resolve(ref: string): Promise<{ value?: string } | undefined> }>('credentials')
    if (credentials) {
      try {
        const hit = await credentials.resolve(TOKEN_CREDENTIAL_REF)
        if (typeof hit?.value === 'string' && hit.value.trim().length > 0) {
          return { token: hit.value.trim(), source: `credential:${TOKEN_CREDENTIAL_REF}` }
        }
      } catch (error) {
        logger.warn('telegram-remote: cannot read credential: %s', errorMessage(error))
      }
    }

    const envName = typeof config.tokenEnv === 'string' ? config.tokenEnv.trim() : ''
    const fromEnv = envName.length > 0 ? (process.env[envName] ?? '').trim() : ''
    if (fromEnv.length > 0) return { token: fromEnv, source: `env:${envName}` }

    const tokenFile = config.tokenFile ? expandHome(String(config.tokenFile)) : join(dataDir, 'token')
    try {
      const raw = (await readFile(tokenFile, 'utf8')).trim()
      if (raw.length > 0) return { token: raw, source: `file:${tokenFile}` }
    } catch (error) {
      if (error?.code !== 'ENOENT') logger.warn('telegram-remote: cannot read token file: %s', errorMessage(error))
    }
    return { token: '', source: 'none', tokenFile }
  }

  function resolveCwd(): string {
    if (typeof config.cwd === 'string' && config.cwd.trim().length > 0) return expandHome(config.cwd.trim())
    const workingDirectory = ctx.get<WorkingDirectoryLike>('workingDirectory')
    const defaultDirectory = workingDirectory?.defaultDirectory
    if (defaultDirectory) return defaultDirectory
    return process.cwd()
  }

  function isAllowed(chatId: string): boolean {
    if (staticAllowed.length > 0) return staticAllowed.includes(chatId)
    return (store.state.allowedChatIds ?? []).includes(chatId)
  }

  function canPair(): boolean {
    return staticAllowed.length === 0 && (store.state.allowedChatIds ?? []).length === 0
  }

  async function reply(
    api: TelegramApi,
    chatId: string,
    text: string,
    options: { keyboard?: TelegramKeyboard } = {},
  ): Promise<void> {
    const { keyboard, ...rest } = options
    const chunks = chunkText(text)
    for (let index = 0; index < chunks.length; index += 1) {
      const isLast = index === chunks.length - 1
      await api.sendMessage(chatId, chunks[index], isLast && keyboard ? { ...rest, keyboard } : rest)
    }
  }

  /** Last listing sent to this chat, so numbered replies and buttons resolve after a restart. */
  function cachedList<T>(chatId: string, kind: ListKind): T[] {
    return (store.state.lists?.[chatId]?.[kind] as T[] | undefined) ?? []
  }

  async function saveListing(chatId: string, kind: ListKind, items: unknown[]): Promise<void> {
    await store.update((state) => {
      const lists = state.lists ?? {}
      state.lists = { ...lists, [chatId]: { ...(lists[chatId] ?? {}), [kind]: items } }
    })
  }

  function shorten(value: unknown, max: number): string {
    const text = String(value ?? '')
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`
  }

  function workspaceKeyboard(chatId: string, workspaces: WorkspaceItem[]): TelegramKeyboard {
    const chosen = preferencesOf(chatId).workspaceId
    return {
      inline_keyboard: workspaces.map((workspace, index) => [{
        text: `${workspace.id === chosen ? '✅ ' : ''}${index + 1}. ${shorten(workspace.title, 44)}`,
        callback_data: `w:${index}`,
      }]),
    }
  }

  function modelKeyboard(chatId: string, models: ModelChoice[]): TelegramKeyboard {
    const current = preferencesOf(chatId).model
    const rows: TelegramInlineKeyboardButton[][] = []
    let row: TelegramInlineKeyboardButton[] = []
    models.forEach((entry, index) => {
      const chosen = current?.provider === entry.provider && current?.model === entry.model
      row.push({
        text: `${chosen ? '✅ ' : ''}${shorten(`${entry.provider} · ${entry.model}`, 46)}`,
        callback_data: `m:${index}`,
      })
      if (row.length === 2) {
        rows.push(row)
        row = []
      }
    })
    if (row.length > 0) rows.push(row)
    return { inline_keyboard: rows }
  }

  /** Edit one message, tolerating "message is not modified" and rate limits. */
  async function editQuietly(
    api: TelegramApi,
    chatId: string,
    messageId: number,
    text: string,
    options: EditMessageOptions = {},
  ): Promise<void> {
    try {
      await api.editMessageText(chatId, messageId, text, options)
    } catch (error) {
      if (error instanceof TelegramError) {
        if (error.status === 400 && /not modified/i.test(error.description)) return
        if (error.status === 429) {
          await sleep(Math.min(5000, (error.retryAfter ?? 1) * 1000))
          return
        }
      }
      logger.warn('telegram-remote: edit failed: %s', errorMessage(error))
    }
  }

  async function forgetBinding(chatId: string): Promise<void> {
    await store.update((state) => {
      if (state.bindings) delete state.bindings[chatId]
    })
  }

  /** Workspaces the DSH profile knows about, in sidebar order. */
  function listWorkspaces(): WorkspaceItem[] {
    const registry = ctx.get<WorkspaceRegistryLike>('workspaceRegistry')
    if (!registry || typeof registry.list !== 'function') return []
    try {
      return registry.list().map((workspace) => ({
        id: workspace.id,
        title: workspace.title ?? workspace.path,
        path: workspace.path,
      }))
    } catch (error) {
      logger.warn('telegram-remote: cannot list workspaces: %s', errorMessage(error))
      return []
    }
  }

  /** The archive surface is optional: older Host builds may not expose it. */
  function archiveRegistry(): WorkspaceRegistryLike | undefined {
    const registry = ctx.get<WorkspaceRegistryLike>('workspaceRegistry')
    if (!registry) return undefined
    if (typeof registry.archiveSession !== 'function' || typeof registry.unarchiveSession !== 'function') return undefined
    return registry
  }

  function canArchiveSessions(): boolean {
    return archiveRegistry() !== undefined
  }

  /** Session ids the Workspace registry hides from its grouping surfaces. */
  function archivedSessionIds(): Set<string> {
    const registry = ctx.get<WorkspaceRegistryLike>('workspaceRegistry')
    const ids = registry?.archivedSessionIds
    return new Set(Array.isArray(ids) ? ids.map((id) => String(id)) : [])
  }

  function shortSessionId(value: unknown): string {
    const id = String(value ?? '')
    return id.length <= 12 ? id : `#${id.slice(-8)}`
  }

  function fallbackSessionTitle(cwd: unknown, sessionId: unknown): string {
    if (typeof cwd === 'string' && cwd.length > 0) {
      const base = cwd.split(/[\\/]+/).filter((part) => part.length > 0).at(-1)
      if (base) return `Phiên ở ${base}`
    }
    return `Phiên ${shortSessionId(sessionId)}`
  }

  /** Turn one Host SessionSummary into the small row this chat needs. */
  function sessionItemOf(summary: SessionSummaryLike): SessionItem {
    const sessionId = String(summary.sessionId)
    const projected = summary.projections?.values?.title
    const title = typeof projected === 'string' ? projected.replace(/\s+/g, ' ').trim() : ''
    const cwd = typeof summary.cwd === 'string' ? summary.cwd : ''
    return {
      sessionId,
      title: title || fallbackSessionTitle(cwd, sessionId),
      cwd,
      updatedAt: Number.isFinite(summary.updatedAt) ? summary.updatedAt : 0,
      running: summary.running === true,
      blank: summary.blank === true,
    }
  }

  /** Every ordinary Session the Host lists, newest first, archived included. */
  async function loadSessionIndex(): Promise<SessionItem[]> {
    if (typeof sessionController.list !== 'function') {
      throw new Error('Bản DSH này không hỗ trợ liệt kê phiên.')
    }
    let value: { items?: SessionSummaryLike[] }
    try {
      value = await sessionController.list({}, controller.signal)
    } catch (error) {
      throw new Error(`Không đọc được danh sách phiên: ${errorMessage(error)}`)
    }
    const rows = Array.isArray(value?.items) ? value.items : []
    return rows
      .filter((summary) => summary && String(summary.sessionId ?? '').length > 0 && summary.origin !== 'subagent')
      .map((summary) => sessionItemOf(summary))
  }

  function formatSessionWhen(ms: unknown): string {
    if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return ''
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: clientTimeZone,
      }).format(new Date(ms))
    } catch {
      return new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
    }
  }

  function sessionPage(
    items: SessionItem[],
    wanted: unknown,
  ): { current: number; total: number; offset: number; entries: SessionItem[] } {
    const total = Math.max(1, Math.ceil(items.length / SESSION_PAGE_SIZE))
    const current = Math.min(Math.max(1, Number(wanted) || 1), total)
    const offset = (current - 1) * SESSION_PAGE_SIZE
    return { current, total, offset, entries: items.slice(offset, offset + SESSION_PAGE_SIZE) }
  }

  async function sendOrEdit(
    api: TelegramApi,
    chatId: string,
    text: string,
    keyboard: TelegramKeyboard | undefined,
    editMessageId: number | undefined,
  ): Promise<void> {
    if (editMessageId !== undefined) {
      await editQuietly(api, chatId, editMessageId, text, { keyboard: keyboard ?? { inline_keyboard: [] } })
      return
    }
    await reply(api, chatId, text, keyboard ? { keyboard } : {})
  }

  function sessionRowKeyboard(
    chatId: string,
    entries: SessionItem[],
    offset: number,
  ): TelegramInlineKeyboardButton[][] {
    const bound = store.state.bindings?.[chatId]?.sessionId
    const archive = canArchiveSessions()
    return entries.map((item, index) => {
      const globalIndex = offset + index
      const marks = `${item.sessionId === bound ? '✅ ' : ''}${item.running ? '▶️ ' : ''}`
      const row: TelegramInlineKeyboardButton[] = [{
        text: `${marks}${globalIndex + 1}. ${shorten(item.title, 32)}`,
        callback_data: `s:${globalIndex}`,
      }]
      if (archive) row.push({ text: '📦', callback_data: `x:${globalIndex}` })
      return row
    })
  }

  /** Render one page of the Session picker. */
  async function showSessionList(
    api: TelegramApi,
    chatId: string,
    wantedPage: number | string = 1,
    options: { items?: SessionItem[]; editMessageId?: number } = {},
  ): Promise<void> {
    const all = Array.isArray(options.items) ? options.items : cachedList<SessionItem>(chatId, 'sessions')
    if (all.length === 0) {
      await sendOrEdit(
        api,
        chatId,
        'Chưa có phiên DSH nào. Gửi một tin nhắn hoặc /new để tạo phiên mới.',
        undefined,
        options.editMessageId,
      )
      return
    }

    const page = sessionPage(all, wantedPage)
    const bound = store.state.bindings?.[chatId]?.sessionId
    const lines = [`🗂 Phiên DSH (trang ${page.current}/${page.total}, ${all.length} phiên):`, '']
    page.entries.forEach((item, index) => {
      const globalIndex = page.offset + index
      const marks: string[] = []
      if (item.sessionId === bound) marks.push('✅ đang gắn')
      if (item.running) marks.push('▶️ đang chạy')
      if (item.blank) marks.push('trống')
      const suffix = marks.length > 0 ? ` · ${marks.join(' · ')}` : ''
      lines.push(`${globalIndex + 1}. ${shorten(item.title, 64)}${suffix}`)
      const when = formatSessionWhen(item.updatedAt)
      lines.push(`   ${shortSessionId(item.sessionId)}${when ? ` · ${when}` : ''}`)
    })
    lines.push('', 'Chạm số để gắn phiên này; 📦 để lưu trữ.')
    if (!canArchiveSessions()) lines.push('Bản DSH này không hỗ trợ lưu trữ phiên.')

    const rows = sessionRowKeyboard(chatId, page.entries, page.offset)
    const navigation: TelegramInlineKeyboardButton[] = []
    if (page.current > 1) navigation.push({ text: '◀️ Trang trước', callback_data: `p:${page.current - 1}` })
    if (page.current < page.total) navigation.push({ text: 'Trang sau ▶️', callback_data: `p:${page.current + 1}` })
    if (navigation.length > 0) rows.push(navigation)

    await sendOrEdit(api, chatId, lines.join('\n'), { inline_keyboard: rows }, options.editMessageId)
  }

  /** Render one page of the archived Session picker. */
  async function showArchivedList(
    api: TelegramApi,
    chatId: string,
    wantedPage: number | string = 1,
    options: { items?: SessionItem[]; editMessageId?: number } = {},
  ): Promise<void> {
    const all = Array.isArray(options.items) ? options.items : cachedList<SessionItem>(chatId, 'archived')
    if (all.length === 0) {
      await sendOrEdit(api, chatId, '📦 Không có phiên nào đã lưu trữ.', undefined, options.editMessageId)
      return
    }

    const page = sessionPage(all, wantedPage)
    const lines = [`📦 Phiên đã lưu trữ (trang ${page.current}/${page.total}, ${all.length} phiên):`, '']
    const rows: TelegramInlineKeyboardButton[][] = []
    page.entries.forEach((item, index) => {
      const globalIndex = page.offset + index
      lines.push(`${globalIndex + 1}. ${shorten(item.title, 64)}`)
      const when = formatSessionWhen(item.updatedAt)
      lines.push(`   ${shortSessionId(item.sessionId)}${when ? ` · ${when}` : ''}`)
      rows.push([{
        text: `♻️ ${globalIndex + 1}. ${shorten(item.title, 32)}`,
        callback_data: `u:${globalIndex}`,
      }])
    })
    lines.push('', 'Chạm một phiên để khôi phục.')
    if (!canArchiveSessions()) lines.push('Bản DSH này không hỗ trợ khôi phục phiên.')

    const navigation: TelegramInlineKeyboardButton[] = []
    if (page.current > 1) navigation.push({ text: '◀️ Trang trước', callback_data: `P:${page.current - 1}` })
    if (page.current < page.total) navigation.push({ text: 'Trang sau ▶️', callback_data: `P:${page.current + 1}` })
    if (navigation.length > 0) rows.push(navigation)

    await sendOrEdit(api, chatId, lines.join('\n'), { inline_keyboard: rows }, options.editMessageId)
  }

  /** Bind the chat, refusing archived Sessions and validating the live Session. */
  async function bindSession(chatId: string, target: SessionItem): Promise<void> {
    if (archivedSessionIds().has(target.sessionId)) {
      throw new Error('Phiên này đang được lưu trữ. Gửi /archived rồi chạm để khôi phục trước.')
    }
    await readSessionState(target.sessionId)
    await store.update((state) => {
      state.bindings = {
        ...(state.bindings ?? {}),
        [chatId]: {
          sessionId: target.sessionId,
          ...(target.cwd ? { cwd: target.cwd } : {}),
          createdAt: Date.now(),
        },
      }
    })
  }

  /** Resolve `/session`, `/archive`, or `/restore` arguments against a cached listing. */
  function resolveSessionArgument(
    chatId: string,
    argument: string,
    kind: 'sessions' | 'archived',
  ): SessionItem | undefined {
    const value = String(argument ?? '').trim()
    if (value.length === 0) return undefined
    if (/^\d+$/.test(value)) return cachedList<SessionItem>(chatId, kind)[Number(value) - 1]
    const normalized = value.replace(/^#/, '')
    const bySuffix = cachedList<SessionItem>(chatId, kind).find((item) => item.sessionId.endsWith(normalized))
    return bySuffix ?? { sessionId: value.split(/\s+/)[0], title: '', cwd: '' }
  }

  async function archiveSessionById(sessionId: string): Promise<void> {
    const registry = archiveRegistry()
    if (!registry) throw new Error('Bản DSH này không hỗ trợ lưu trữ phiên.')
    try {
      await registry.archiveSession(sessionId)
    } catch (error) {
      if (error?.name === 'WorkspaceActiveSessionError' || /session is active/i.test(errorMessage(error))) {
        throw new Error('Phiên đang chạy. Gửi /cancel rồi thử lại, hoặc đợi lượt hiện tại xong.')
      }
      if (error?.name === 'WorkspaceUnknownSessionError') {
        throw new Error('Không tìm thấy phiên này trong DSH (có thể phiên đã bị xoá).')
      }
      throw error
    }
  }

  async function unarchiveSessionById(sessionId: string): Promise<void> {
    const registry = archiveRegistry()
    if (!registry) throw new Error('Bản DSH này không hỗ trợ khôi phục phiên.')
    await registry.unarchiveSession(sessionId)
  }

  async function dropFromListing(chatId: string, kind: ListKind, sessionId: string): Promise<void> {
    await store.update((state) => {
      const current = state.lists?.[chatId]?.[kind]
      if (!Array.isArray(current)) return
      const remaining = current.filter((item) => {
        const entry = item as { sessionId?: unknown } | null | undefined
        return entry?.sessionId !== sessionId
      })
      if (remaining.length === current.length) return
      const lists = state.lists ?? {}
      state.lists = {
        ...lists,
        [chatId]: { ...(lists[chatId] ?? {}), [kind]: remaining },
      }
    })
  }

  function preferencesOf(chatId: string): StoredPreferences {
    return store.state.prefs?.[chatId] ?? {}
  }

  async function savePreferences(chatId: string, patch: Partial<StoredPreferences>): Promise<void> {
    await store.update((state) => {
      const prefs = state.prefs ?? {}
      state.prefs = { ...prefs, [chatId]: { ...(prefs[chatId] ?? {}), ...patch } }
    })
  }

  /** Apply one model selection to a live session, surfacing catalog errors to the chat. */
  async function applyModel(sessionId: string, selection: ModelSelection): Promise<ModelSelection> {
    const applied = await sessionController.selectModel({
      sessionId,
      provider: selection.provider,
      model: selection.model,
      ...(selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}),
    }, controller.signal)
    return applied?.selected ?? selection
  }

  /**
   * Create the chat's session from its preferences: an explicit directory wins,
   * then the chosen workspace, then the configured default directory.
   */
  async function createSession(
    chatId: string,
    { cwd, workspaceId }: { cwd?: string; workspaceId?: string } = {},
  ): Promise<{ binding: StoredBinding; note?: string }> {
    const prefs = preferencesOf(chatId)
    const wantedWorkspace = workspaceId ?? (cwd ? undefined : prefs.workspaceId)

    let request: { cwd?: string; workspaceId?: string }
    if (cwd) request = { cwd }
    else if (wantedWorkspace) request = { workspaceId: wantedWorkspace }
    else request = { cwd: resolveCwd() }

    let note: string | undefined
    let created: CreatedSession
    try {
      created = await sessionController.create(request)
    } catch (error) {
      if (request.workspaceId === undefined) throw error
      note = `⚠ Không mở được workspace ${request.workspaceId} (${errorMessage(error)}); đã dùng thư mục mặc định.`
      request = { cwd: resolveCwd() }
      created = await sessionController.create(request)
    }

    const model = prefs.model
    if (model) {
      try {
        await applyModel(created.sessionId, model)
      } catch (error) {
        note = `${note ? `${note}\n` : ''}⚠ Không đặt được model ${model.provider}/${model.model}: ${errorMessage(error)}`
      }
    }

    const binding: StoredBinding = {
      sessionId: created.sessionId,
      ...(request.cwd ? { cwd: request.cwd } : {}),
      ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
      ...(model ? { model } : {}),
      createdAt: Date.now(),
    }
    await store.update((state) => {
      state.bindings = { ...(state.bindings ?? {}), [chatId]: binding }
    })
    return { binding, note }
  }

  function readSessionState(sessionId: string): Promise<SessionStateLike> {
    return sessionController.state({ sessionId }, controller.signal)
  }

  /** Flatten the provider-grouped model catalog into one ordered list. */
  function flattenModels(catalog: ModelCatalog): ModelChoice[] {
    const groups = Array.isArray(catalog?.groups) ? catalog.groups : []
    return groups.flatMap((group) => (group.models ?? []).map((model) => ({
      provider: group.id,
      providerName: group.name ?? group.id,
      model: model.id,
      modelName: model.name ?? model.id,
    })))
  }

  function modelLabel(selection: ModelSelection | undefined): string {
    if (!selection?.provider || !selection?.model) return 'mặc định của DSH'
    const effort = selection.reasoningEffort ? `@${selection.reasoningEffort}` : ''
    return `${selection.provider}/${selection.model}${effort}`
  }

  async function loadModelCatalog(): Promise<ModelCatalog> {
    try {
      return await sessionController.modelCatalog()
    } catch (error) {
      logger.warn('telegram-remote: cannot read model catalog: %s', errorMessage(error))
      return { groups: [], failures: [] }
    }
  }

  /** Resolve a `/workspace` argument: list number, id, absolute or partial path. */
  function resolveWorkspaceArgument(chatId: string, argument: string): WorkspaceItem | undefined {
    const all = listWorkspaces()
    const value = argument.trim()
    if (/^\d+$/.test(value)) {
      const cached = cachedList<WorkspaceItem>(chatId, 'workspaces')
      const pool = cached.length > 0 ? cached : all
      return pool[Number(value) - 1]
    }
    const lowered = value.toLowerCase()
    const expanded = expandHome(value).toLowerCase()
    return all.find((workspace) => workspace.id === value)
      ?? all.find((workspace) => workspace.path.toLowerCase() === expanded)
      ?? all.find((workspace) => workspace.path.toLowerCase().endsWith(lowered))
      ?? { id: value, title: value, path: value }
  }

  /** Resolve a `/model` argument: list number, `provider/model`, `@effort`, or a unique model id. */
  function resolveModelArgument(
    chatId: string,
    argument: string,
    catalog: ModelCatalog,
  ): ModelSelection | undefined {
    const value = argument.trim()
    const flat = flattenModels(catalog)
    if (/^\d+$/.test(value)) {
      const cached = cachedList<ModelChoice>(chatId, 'models')
      const pool = cached.length > 0 ? cached : flat
      return pool[Number(value) - 1]
    }
    const at = value.indexOf('@')
    const head = at < 0 ? value : value.slice(0, at)
    const reasoningEffort = at < 0 ? undefined : value.slice(at + 1)
    const slash = head.indexOf('/')
    if (slash > 0) {
      return {
        provider: head.slice(0, slash),
        model: head.slice(slash + 1),
        ...(reasoningEffort ? { reasoningEffort } : {}),
      }
    }
    const matches = flat.filter((entry) => entry.model === head)
    if (matches.length !== 1) return undefined
    return {
      provider: matches[0].provider,
      model: matches[0].model,
      ...(reasoningEffort ? { reasoningEffort } : {}),
    }
  }

  /** Register one turn's reporter so committed events feed it in order. */
  function beginTurn(sessionId: string, startSeq: number, reporter: TurnReporter): TurnSink {
    const sink: TurnSink = { startSeq, reporter, chain: Promise.resolve(), seen: new Set(), closed: false }
    if (observeSessionEvents) {
      const sinks = turnSinks.get(sessionId) ?? new Set<TurnSink>()
      sinks.add(sink)
      turnSinks.set(sessionId, sinks)
    }
    return sink
  }

  /** Stop routing events to a finished turn and wait for its queue to drain. */
  async function endTurn(sessionId: string, sink: TurnSink): Promise<void> {
    sink.closed = true
    const sinks = turnSinks.get(sessionId)
    if (sinks) {
      sinks.delete(sink)
      if (sinks.size === 0) turnSinks.delete(sessionId)
    }
    await sink.chain
  }

  /** Queue one committed event on a turn's serial chain. */
  function enqueueSinkEvent(sink: TurnSink, event: SessionEvent): void {
    const seq = event.seq as number
    if (sink.closed || seq <= sink.startSeq || sink.seen.has(seq)) return
    sink.seen.add(seq)
    sink.chain = sink.chain
      .then(async () => {
        await sink.reporter.handle(event)
        await sink.reporter.tick()
      })
      .catch((error) => logger.warn('telegram-remote: cannot report session event: %s', errorMessage(error)))
  }

  /** Run one prompt and stream the assistant's answer back into the chat. */
  async function runPrompt(api: TelegramApi, chatId: string, text: string): Promise<void> {
    let binding = store.state.bindings?.[chatId]
    if (!binding?.sessionId) {
      const created = await createSession(chatId, {})
      binding = created.binding
      if (created.note) await reply(api, chatId, created.note)
    }
    const sessionId = binding.sessionId
    const deadline = Date.now() + config.requestTimeoutMs

    let before: SessionStateLike
    try {
      before = await readSessionState(sessionId)
    } catch (error) {
      await forgetBinding(chatId)
      throw new Error(`Không đọc được phiên ${sessionId}: ${errorMessage(error)}`)
    }

    const placeholder = await api.sendMessage(chatId, PLACEHOLDER)
    activeTurns.set(chatId, sessionId)
    const reporter = createTurnReporter({
      send: (text: string) => reply(api, chatId, text),
      updateStatus: (statusText: string) => editQuietly(api, chatId, placeholder.message_id, statusText),
      resolveChanges: (seq) => {
        const changes = ctx.get<WorkspaceChangesService>('workspaceChanges')
        return typeof changes?.summary === 'function' ? changes.summary(sessionId, seq) : undefined
      },
      config,
      placeholder: PLACEHOLDER,
      cwd: binding.cwd ?? '',
      onError: (error) => logger.warn('telegram-remote: cannot push turn message: %s', errorMessage(error)),
    })
    const sink = beginTurn(sessionId, before.cursor, reporter)
    try {
      try {
        await api.sendChatAction(chatId, 'typing').catch(() => {})
        await sessionController.prompt({
          requestId: randomUUID(),
          sessionId,
          mode: 'queue',
          content: [{ type: 'text', text }],
          clientTimeZone,
        }, controller.signal)

        const outcome = await pump(sessionId, before.cursor, deadline, reporter, sink)
        await endTurn(sessionId, sink)
        await finishTurn(api, chatId, placeholder.message_id, outcome)
      } catch (error) {
        await endTurn(sessionId, sink)
        await retirePlaceholder(api, chatId, placeholder.message_id)
        throw error
      }
    } finally {
      activeTurns.delete(chatId)
    }
  }

  /** Follow the turn until the session is quiescent or the deadline passes. */
  async function pump(
    sessionId: string,
    startSeq: number,
    deadline: number,
    reporter: TurnReporter,
    sink: TurnSink,
  ): Promise<TurnOutcome> {
    let afterSeq = startSeq

    while (!controller.signal.aborted) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) return { reporter, pendingInput: [], timedOut: true }

      const wait = await sessionController.wait({
        sessionId,
        timeoutMs: Math.min(15000, Math.max(1000, remaining)),
        afterSeq,
        maxMessages: 50,
      }, controller.signal)

      if (observeSessionEvents) {
        // The Session event listener is the primary path; `wait` output is a
        // safety net for an assistant message the listener has not queued.
        await sink.chain
        for (const record of [...(wait.output?.records ?? [])].reverse()) {
          if (record?.event) enqueueSinkEvent(sink, record.event)
        }
        await sink.chain
      } else {
        // Older Host builds expose only the assistant messages carried by `wait`.
        const events = await readEventsSince(sessionId, afterSeq, wait.state?.cursor)
        if (events === undefined) {
          const records = [...(wait.output?.records ?? [])].reverse()
          for (const record of records) {
            const event = record?.event
            if (!event || typeof event.seq !== 'number' || event.seq <= afterSeq) continue
            afterSeq = event.seq
            await reporter.handle(event)
          }
        } else {
          for (const record of events) {
            const event = record?.event
            if (!event || typeof event.seq !== 'number' || event.seq <= afterSeq) continue
            afterSeq = event.seq
            await reporter.handle(event)
          }
        }
      }

      await reporter.tick()
      if (typeof wait.state?.cursor === 'number') afterSeq = wait.state.cursor

      const pendingInput = wait.state?.pendingInput ?? []
      if (wait.reason === 'idle') return { reporter, pendingInput, timedOut: false }
      if (wait.reason === 'input-required') return { reporter, pendingInput, timedOut: false }
    }
    return { reporter, pendingInput: [], timedOut: true }
  }

  /**
   * Read every committed event after `afterSeq` up to the wait cursor. Pages
   * are message-aligned, so a busy interval may need more than one page.
   * @returns undefined when the controller cannot serve history
   */
  async function readEventsSince(
    sessionId: string,
    afterSeq: number,
    throughSeq: number | undefined,
  ): Promise<EventRecord[] | undefined> {
    if (typeof sessionController.events !== 'function') return undefined
    try {
      const pages: EventRecord[][] = []
      let beforeSeq: number | undefined
      let cut = typeof throughSeq === 'number' ? throughSeq : undefined
      for (let page = 0; page < 4; page += 1) {
        const result = await sessionController.events({
          address: { kind: 'session', sessionId },
          maxMessages: 100,
          ...(cut === undefined ? {} : { throughSeq: cut }),
          ...(beforeSeq === undefined ? {} : { beforeSeq }),
        }, controller.signal)
        const records: EventRecord[] = Array.isArray(result?.records) ? result.records : []
        if (records.length === 0) break
        pages.unshift(records)
        const oldest = records[0]?.event?.seq
        if (typeof oldest !== 'number' || oldest <= afterSeq + 1 || result?.hasMore !== true) break
        beforeSeq = oldest
        cut = undefined
      }

      const seen = new Set<number>()
      return pages
        .flat()
        .filter(isSequencedRecord)
        .sort((left, right) => left.event.seq - right.event.seq)
        .filter((record) => {
          if (record.event.seq <= afterSeq || seen.has(record.event.seq)) return false
          seen.add(record.event.seq)
          return true
        })
    } catch (error) {
      logger.warn('telegram-remote: cannot read session events: %s', errorMessage(error))
      return undefined
    }
  }

  async function finishTurn(
    api: TelegramApi,
    chatId: string,
    placeholderId: number,
    outcome: TurnOutcome,
  ): Promise<void> {
    const notes: string[] = []
    if (outcome.timedOut) notes.push('⏱ Hết thời gian chờ. Lượt chạy có thể vẫn tiếp tục trong DSH – gửi /status để kiểm tra.')
    if (outcome.pendingInput.length > 0) {
      notes.push('⏸ DSH đang chờ bạn phê duyệt hoặc trả lời câu hỏi trong ứng dụng.')
    }

    const finalText = await outcome.reporter.finish()
    const body = [
      finalText.length > 0 ? `${FINAL_LABEL} ${finalText}` : '',
      ...notes,
    ].filter((part) => part.length > 0).join('\n\n')
      || '✅ Xong, nhưng lượt này không sinh ra nội dung văn bản.'

    await retirePlaceholder(api, chatId, placeholderId)
    await reply(api, chatId, body)
  }

  /** Remove the status message, falling back to a short completion label. */
  async function retirePlaceholder(api: TelegramApi, chatId: string, messageId: number): Promise<void> {
    try {
      await api.deleteMessage(chatId, messageId)
    } catch (error) {
      logger.warn('telegram-remote: cannot delete placeholder: %s', errorMessage(error))
      await editQuietly(api, chatId, messageId, '✅ Xong')
    }
  }

  async function handleCommand(api: TelegramApi, chatId: string, text: string): Promise<void> {
    const { name, argument } = parseCommand(text)
    switch (name) {
      case 'start': {
        if (canPair()) {
          await store.update((state) => {
            state.allowedChatIds = [chatId]
            state.pairedAt = Date.now()
          })
          await reply(api, chatId, `✅ Đã ghép nối chat này với DSH.\n\n${HELP_TEXT}`)
          return
        }
        if (!isAllowed(chatId)) {
          await reply(api, chatId, `⛔ Chat ${chatId} không nằm trong danh sách cho phép.`)
          return
        }
        await reply(api, chatId, HELP_TEXT)
        return
      }
      case 'help':
        await reply(api, chatId, HELP_TEXT)
        return
      case 'whoami':
        await reply(api, chatId, [
          `Chat id: ${chatId}`,
          `Bot: @${identity?.username ?? '?'}`,
          `Phiên đang gắn: ${store.state.bindings?.[chatId]?.sessionId ?? 'chưa có'}`,
        ].join('\n'))
        return
      case 'ping':
        await reply(api, chatId, '🏓 pong')
        return
      case 'new': {
        const created = await createSession(chatId, argument.length > 0 ? { cwd: expandHome(argument) } : {})
        const lines = [`🆕 Phiên mới: ${created.binding.sessionId}`]
        if (created.binding.cwd) lines.push(`📁 ${created.binding.cwd}`)
        if (created.binding.workspaceId) lines.push(`🗂 workspace: ${created.binding.workspaceId}`)
        if (created.binding.model) lines.push(`🤖 ${modelLabel(created.binding.model)}`)
        if (created.note) lines.push(created.note)
        await reply(api, chatId, lines.join('\n'))
        return
      }
      case 'sessions': {
        let items: SessionItem[]
        try {
          const index = await loadSessionIndex()
          const archived = archivedSessionIds()
          items = index.filter((item) => !archived.has(item.sessionId))
          await saveListing(chatId, 'sessions', items)
        } catch (error) {
          await reply(api, chatId, `❌ ${errorMessage(error)}`)
          return
        }
        await showSessionList(api, chatId, argument, { items })
        return
      }
      case 'session': {
        const binding = store.state.bindings?.[chatId]
        if (argument.length === 0) {
          await reply(api, chatId, binding?.sessionId
            ? [
              `Phiên đang gắn: ${binding.sessionId}`,
              ...(binding.cwd ? [`📁 ${binding.cwd}`] : []),
              'Gửi /sessions để chọn phiên khác.',
            ].join('\n')
            : 'Chưa gắn phiên nào. Gửi /sessions để chọn, hoặc gửi tin nhắn để tạo phiên mới.')
          return
        }
        const target = resolveSessionArgument(chatId, argument, 'sessions')
        if (!target) {
          await reply(api, chatId, `Không tìm thấy phiên "${argument}". Gửi /sessions để xem danh sách.`)
          return
        }
        try {
          await bindSession(chatId, target)
        } catch (error) {
          await reply(api, chatId, `❌ ${errorMessage(error)}`)
          return
        }
        await reply(api, chatId, [
          `🔗 Đã gắn chat này với phiên ${target.sessionId}`,
          ...(target.title ? [`📝 ${target.title}`] : []),
          'Tin nhắn tiếp theo sẽ vào phiên này.',
        ].join('\n'))
        return
      }
      case 'archived': {
        let items: SessionItem[]
        try {
          const index = await loadSessionIndex()
          const archived = archivedSessionIds()
          items = index.filter((item) => archived.has(item.sessionId))
          await saveListing(chatId, 'archived', items)
        } catch (error) {
          await reply(api, chatId, `❌ ${errorMessage(error)}`)
          return
        }
        await showArchivedList(api, chatId, argument, { items })
        return
      }
      case 'archive': {
        let target: SessionItem | undefined
        if (argument.length === 0) {
          const binding = store.state.bindings?.[chatId]
          if (!binding?.sessionId) {
            await reply(api, chatId, 'Cú pháp: /archive <số|sessionId>. Gửi /sessions để xem danh sách.')
            return
          }
          target = cachedList<SessionItem>(chatId, 'sessions').find((item) => item.sessionId === binding.sessionId)
            ?? { sessionId: binding.sessionId, title: '', cwd: binding.cwd ?? '' }
        } else {
          target = resolveSessionArgument(chatId, argument, 'sessions')
          if (!target) {
            await reply(api, chatId, `Không tìm thấy phiên "${argument}". Gửi /sessions để xem danh sách.`)
            return
          }
        }
        const wasBound = store.state.bindings?.[chatId]?.sessionId === target.sessionId
        try {
          await archiveSessionById(target.sessionId)
        } catch (error) {
          await reply(api, chatId, `❌ Không lưu trữ được: ${errorMessage(error)}`)
          return
        }
        if (wasBound) await forgetBinding(chatId)
        await dropFromListing(chatId, 'sessions', target.sessionId)
        await reply(api, chatId, [
          `📦 Đã lưu trữ phiên ${shortSessionId(target.sessionId)}${target.title ? ` — ${target.title}` : ''}.`,
          ...(wasBound ? ['Chat đã được bỏ gắn.'] : []),
          'Dùng /archived để khôi phục.',
        ].join('\n'))
        return
      }
      case 'restore': {
        if (argument.length === 0) {
          await reply(api, chatId, 'Cú pháp: /restore <số|sessionId>. Gửi /archived để xem danh sách.')
          return
        }
        const target = resolveSessionArgument(chatId, argument, 'archived')
        if (!target) {
          await reply(api, chatId, `Không tìm thấy phiên "${argument}". Gửi /archived để xem danh sách.`)
          return
        }
        try {
          await unarchiveSessionById(target.sessionId)
        } catch (error) {
          await reply(api, chatId, `❌ Không khôi phục được: ${errorMessage(error)}`)
          return
        }
        await dropFromListing(chatId, 'archived', target.sessionId)
        await reply(api, chatId, [
          `♻️ Đã khôi phục phiên ${shortSessionId(target.sessionId)}${target.title ? ` — ${target.title}` : ''}.`,
          'Dùng /sessions để chọn lại.',
        ].join('\n'))
        return
      }
      case 'workspaces': {
        const workspaces = listWorkspaces()
        await saveListing(chatId, 'workspaces', workspaces)
        if (workspaces.length === 0) {
          await reply(api, chatId, 'DSH chưa có workspace nào. Dùng /new <thư-mục> để mở phiên trong một thư mục.')
          return
        }
        const chosen = preferencesOf(chatId).workspaceId
        const lines = ['🗂 Workspace của DSH:']
        workspaces.forEach((workspace, index) => {
          const mark = workspace.id === chosen ? ' ✅' : ''
          lines.push(`${index + 1}. ${workspace.title} — ${workspace.path}${mark}`)
        })
        lines.push('', 'Chạm nút bên dưới để chọn, hoặc gõ /workspace <số|id|đường-dẫn>.')
        await reply(api, chatId, lines.join('\n'), { keyboard: workspaceKeyboard(chatId, workspaces) })
        return
      }
      case 'workspace': {
        if (argument.length === 0) {
          const chosen = preferencesOf(chatId).workspaceId
          await reply(api, chatId, chosen
            ? `Workspace đang chọn: ${chosen}\nGửi /workspaces để xem danh sách, /new để mở phiên trong workspace này.`
            : 'Chưa chọn workspace. Gửi /workspaces để xem danh sách.')
          return
        }
        const target = resolveWorkspaceArgument(chatId, argument)
        if (!target) {
          await reply(api, chatId, `Không tìm thấy workspace "${argument}". Gửi /workspaces để xem danh sách.`)
          return
        }
        await savePreferences(chatId, { workspaceId: target.id })
        await reply(api, chatId, [
          `🗂 Đã chọn workspace: ${target.title} — ${target.path}`,
          `Id: ${target.id}`,
          'Phiên hiện tại không đổi; gửi /new để mở phiên trong workspace này.',
        ].join('\n'))
        return
      }
      case 'models': {
        const catalog = await loadModelCatalog()
        const flat = flattenModels(catalog)
        await saveListing(chatId, 'models', flat)
        if (flat.length === 0) {
          await reply(api, chatId, 'Không đọc được model nào đang dùng được. Kiểm tra provider trong DSH.')
          return
        }
        const current = preferencesOf(chatId).model
        const defaultSelection = catalog.default
        const lines = ['🤖 Model đang dùng được:']
        let lastProvider: string | undefined
        flat.forEach((entry, index) => {
          if (entry.provider !== lastProvider) {
            lines.push(`\n${entry.providerName} (${entry.provider})`)
            lastProvider = entry.provider
          }
          const marks: string[] = []
          if (defaultSelection?.provider === entry.provider && defaultSelection?.model === entry.model) marks.push('⭐ mặc định')
          if (current?.provider === entry.provider && current?.model === entry.model) marks.push('✅ đang chọn')
          const suffix = marks.length > 0 ? `  ${marks.join(' · ')}` : ''
          lines.push(`${index + 1}. ${entry.model}${suffix}`)
        })
        for (const failure of catalog.failures ?? []) {
          lines.push(`⚠ ${failure.name ?? failure.id}: ${failure.message}`)
        }
        lines.push('', 'Chạm nút bên dưới để chọn, hoặc gõ /model <số> hay /model provider/model[@effort].')
        await reply(api, chatId, lines.join('\n'), { keyboard: modelKeyboard(chatId, flat) })
        return
      }
      case 'model': {
        const current = preferencesOf(chatId).model
        if (argument.length === 0) {
          await reply(api, chatId, [
            `Model đang chọn: ${modelLabel(current)}`,
            'Gửi /models để xem danh sách, rồi /model <số> hoặc /model provider/model.',
          ].join('\n'))
          return
        }
        const catalog = await loadModelCatalog()
        const selection = resolveModelArgument(chatId, argument, catalog)
        if (!selection) {
          await reply(api, chatId, `Không xác định được model "${argument}". Gửi /models để xem danh sách.`)
          return
        }

        const binding = store.state.bindings?.[chatId]
        let applied: ModelSelection = selection
        if (binding?.sessionId) {
          try {
            applied = await applyModel(binding.sessionId, selection)
          } catch (error) {
            await reply(api, chatId, `❌ Không đổi được model: ${errorMessage(error)}`)
            return
          }
        }
        await savePreferences(chatId, { model: applied })
        if (binding?.sessionId) {
          await store.update((state) => {
            state.bindings = { ...(state.bindings ?? {}), [chatId]: { ...binding, model: applied } }
          })
        }
        await reply(api, chatId, `🤖 Đã chọn ${modelLabel(applied)}${binding?.sessionId ? '' : ' cho phiên kế tiếp'}`)
        return
      }
      case 'use': {
        if (argument.length === 0) {
          await reply(api, chatId, 'Cú pháp: /use <sessionId>')
          return
        }
        const sessionId = argument.split(/\s+/)[0]
        await readSessionState(sessionId)
        await store.update((state) => {
          state.bindings = {
            ...(state.bindings ?? {}),
            [chatId]: { sessionId, cwd: resolveCwd(), createdAt: Date.now() },
          }
        })
        await reply(api, chatId, `🔗 Đã gắn chat này với phiên ${sessionId}`)
        return
      }
      case 'unbind':
        await forgetBinding(chatId)
        await reply(api, chatId, 'Đã bỏ gắn. Tin nhắn tiếp theo sẽ tạo phiên mới (giữ workspace và model đã chọn).')
        return
      case 'cancel': {
        const sessionId = activeTurns.get(chatId) ?? store.state.bindings?.[chatId]?.sessionId
        if (!sessionId) {
          await reply(api, chatId, 'Chưa có phiên nào để dừng.')
          return
        }
        sessionController.cancel({ sessionId })
        await reply(api, chatId, `⏹ Đã yêu cầu dừng ${sessionId}`)
        return
      }
      case 'status': {
        const binding = store.state.bindings?.[chatId]
        const prefs = preferencesOf(chatId)
        const lines: string[] = []
        if (binding?.sessionId) {
          const state = await readSessionState(binding.sessionId)
          lines.push(`Phiên: ${binding.sessionId}`)
          if (binding.cwd) lines.push(`Thư mục: ${binding.cwd}`)
          if (binding.workspaceId) lines.push(`Workspace: ${binding.workspaceId}`)
          lines.push(`Model: ${modelLabel(binding.model ?? prefs.model)}`)
          lines.push(`Đang chạy: ${state.running ? 'có' : 'không'}`)
          lines.push(`Hàng đợi: ${state.queue?.length ?? 0}`)
          lines.push(`Chờ phê duyệt: ${(state.pendingInput ?? []).join(', ') || 'không'}`)
        } else {
          lines.push('Chưa gắn phiên nào. Gửi một tin nhắn hoặc /new.')
          lines.push(`Workspace đã chọn: ${prefs.workspaceId ?? 'mặc định'}`)
          lines.push(`Model đã chọn: ${modelLabel(prefs.model)}`)
        }
        await reply(api, chatId, lines.join('\n'))
        return
      }
      default:
        await reply(api, chatId, `Lệnh /${name} chưa được hỗ trợ. Gửi /help để xem danh sách.`)
    }
  }

  async function handleMessage(api: TelegramApi, message: TelegramMessage | undefined): Promise<void> {
    if (!message?.chat) return
    const chatId = String(message.chat.id)
    const text = typeof message.text === 'string' ? message.text.trim() : ''

    if (message.chat.type !== 'private') {
      await api.sendMessage(chatId, 'Bot này chỉ điều khiển DSH trong chat riêng.')
      return
    }

    const command = text.startsWith('/') ? parseCommand(text) : undefined
    if (!isAllowed(chatId) && !(command?.name === 'start' && canPair())) {
      if (!command) return
      await reply(api, chatId, canPair()
        ? `👋 Gửi /start để ghép nối chat này với DSH (chat id ${chatId}).`
        : `⛔ Chat ${chatId} không nằm trong danh sách cho phép.`)
      return
    }

    if (command) {
      await handleCommand(api, chatId, text)
      return
    }

    if (text.length === 0) {
      await reply(api, chatId, 'Hiện chỉ hỗ trợ tin nhắn văn bản.')
      return
    }

    void enqueue(chatId, async () => {
      try {
        await runPrompt(api, chatId, text)
      } catch (error) {
        logger.error('telegram-remote: prompt failed: %s', errorMessage(error))
        await reply(api, chatId, `❌ ${errorMessage(error)}`).catch(() => {})
      }
    })
  }

  /** Apply a tapped inline button: a workspace choice or a model choice. */
  async function handleCallback(api: TelegramApi, query: TelegramCallbackQuery): Promise<void> {
    const message = query?.message
    const data = typeof query?.data === 'string' ? query.data : ''
    const answer = async (text?: string, showAlert = false): Promise<void> => {
      try {
        await api.answerCallbackQuery(query.id, text ? { text, showAlert } : {})
      } catch (error) {
        logger.warn('telegram-remote: answerCallbackQuery failed: %s', errorMessage(error))
      }
    }
    if (!message?.chat) return
    const chatId = String(message.chat.id)

    if (message.chat.type !== 'private' || !isAllowed(chatId)) {
      await answer('Chat này chưa được ghép nối với DSH.')
      return
    }

    if (data === 'c') {
      await answer('Đã huỷ')
      await editQuietly(api, chatId, message.message_id, '↩️ Đã huỷ lưu trữ.', {
        keyboard: { inline_keyboard: [] },
      })
      return
    }

    const match = /^([wmxsupPA]):(\d+)$/.exec(data)
    if (!match) {
      await answer()
      return
    }
    const action = match[1]
    const index = Number(match[2])
    const messageId = message.message_id

    if (action === 'p' || action === 'P') {
      const kind = action === 'p' ? 'sessions' : 'archived'
      if (cachedList<SessionItem>(chatId, kind).length === 0) {
        await answer('Danh sách đã cũ, gửi lại lệnh nhé.', true)
        return
      }
      if (kind === 'sessions') await showSessionList(api, chatId, index, { editMessageId: messageId })
      else await showArchivedList(api, chatId, index, { editMessageId: messageId })
      await answer()
      return
    }

    if (action === 'w') {
      const target = cachedList<WorkspaceItem>(chatId, 'workspaces')[index]
      if (!target) {
        await answer('Danh sách đã cũ, gửi /workspaces lại nhé.', true)
        return
      }
      await savePreferences(chatId, { workspaceId: target.id })
      await answer('Đã chọn workspace')
      await editQuietly(api, chatId, messageId, [
        `🗂 Đã chọn workspace: ${target.title} — ${target.path}`,
        `Id: ${target.id}`,
        'Phiên hiện tại không đổi; gửi /new để mở phiên trong workspace này.',
      ].join('\n'), { keyboard: { inline_keyboard: [] } })
      return
    }

    if (action === 's') {
      const target = cachedList<SessionItem>(chatId, 'sessions')[index]
      if (!target) {
        await answer('Danh sách đã cũ, gửi /sessions lại nhé.', true)
        return
      }
      try {
        await bindSession(chatId, target)
      } catch (error) {
        await answer(errorMessage(error), true)
        return
      }
      await answer('Đã gắn phiên')
      await editQuietly(api, chatId, messageId, [
        `🔗 Đã gắn chat này với phiên ${target.sessionId}`,
        ...(target.title ? [`📝 ${target.title}`] : []),
        'Tin nhắn tiếp theo sẽ vào phiên này.',
      ].join('\n'), { keyboard: { inline_keyboard: [] } })
      return
    }

    if (action === 'x') {
      const target = cachedList<SessionItem>(chatId, 'sessions')[index]
      if (!target) {
        await answer('Danh sách đã cũ, gửi /sessions lại nhé.', true)
        return
      }
      if (!canArchiveSessions()) {
        await answer('Bản DSH này không hỗ trợ lưu trữ phiên.', true)
        return
      }
      await answer()
      await editQuietly(api, chatId, messageId, [
        '📦 Lưu trữ phiên này?',
        '',
        `${index + 1}. ${shorten(target.title, 64)}`,
        shortSessionId(target.sessionId),
        '',
        'Phiên sẽ ẩn khỏi danh sách nhưng dữ liệu vẫn còn; khôi phục bằng /archived.',
      ].join('\n'), {
        keyboard: {
          inline_keyboard: [[
            { text: '📦 Lưu trữ', callback_data: `A:${index}` },
            { text: '↩️ Huỷ', callback_data: 'c' },
          ]],
        },
      })
      return
    }

    if (action === 'A') {
      const target = cachedList<SessionItem>(chatId, 'sessions')[index]
      if (!target) {
        await answer('Danh sách đã cũ, gửi /sessions lại nhé.', true)
        return
      }
      const wasBound = store.state.bindings?.[chatId]?.sessionId === target.sessionId
      try {
        await archiveSessionById(target.sessionId)
      } catch (error) {
        await answer('Không lưu trữ được', true)
        await editQuietly(api, chatId, messageId, `❌ ${errorMessage(error)}`, {
          keyboard: { inline_keyboard: [] },
        })
        return
      }
      if (wasBound) await forgetBinding(chatId)
      await dropFromListing(chatId, 'sessions', target.sessionId)
      await answer('Đã lưu trữ')
      await editQuietly(api, chatId, messageId, [
        `📦 Đã lưu trữ phiên ${shortSessionId(target.sessionId)}${target.title ? ` — ${target.title}` : ''}.`,
        ...(wasBound ? ['Chat đã được bỏ gắn.'] : []),
        'Dùng /archived để khôi phục.',
      ].join('\n'), { keyboard: { inline_keyboard: [] } })
      return
    }

    if (action === 'u') {
      const target = cachedList<SessionItem>(chatId, 'archived')[index]
      if (!target) {
        await answer('Danh sách đã cũ, gửi /archived lại nhé.', true)
        return
      }
      try {
        await unarchiveSessionById(target.sessionId)
      } catch (error) {
        await answer('Không khôi phục được', true)
        await editQuietly(api, chatId, messageId, `❌ ${errorMessage(error)}`, {
          keyboard: { inline_keyboard: [] },
        })
        return
      }
      await dropFromListing(chatId, 'archived', target.sessionId)
      await answer('Đã khôi phục')
      await editQuietly(api, chatId, messageId, [
        `♻️ Đã khôi phục phiên ${shortSessionId(target.sessionId)}${target.title ? ` — ${target.title}` : ''}.`,
        'Dùng /sessions để chọn lại.',
      ].join('\n'), { keyboard: { inline_keyboard: [] } })
      return
    }

    const entry = cachedList<ModelChoice>(chatId, 'models')[index]
    if (!entry) {
      await answer('Danh sách đã cũ, gửi /models lại nhé.', true)
      return
    }

    const binding = store.state.bindings?.[chatId]
    const selection: ModelSelection = { provider: entry.provider, model: entry.model }
    let applied: ModelSelection = selection
    if (binding?.sessionId) {
      try {
        applied = await applyModel(binding.sessionId, selection)
      } catch (error) {
        await answer(`Không đổi được: ${errorMessage(error)}`, true)
        return
      }
    }
    await savePreferences(chatId, { model: applied })
    if (binding?.sessionId) {
      await store.update((state) => {
        state.bindings = { ...(state.bindings ?? {}), [chatId]: { ...binding, model: applied } }
      })
    }
    await answer('Đã chọn model')
    await editQuietly(
      api,
      chatId,
      messageId,
      `🤖 Đã chọn ${modelLabel(applied)}${binding?.sessionId ? '' : ' cho phiên kế tiếp'}`,
      { keyboard: { inline_keyboard: [] } },
    )
  }

  function enqueue<T>(chatId: string, task: () => Promise<T>): Promise<T> {
    const previous = chatQueues.get(chatId) ?? Promise.resolve()
    const next = previous.then(task, task)
    chatQueues.set(chatId, next)
    const clear = (): void => {
      if (chatQueues.get(chatId) === next) chatQueues.delete(chatId)
    }
    next.then(clear, clear)
    return next
  }

  /** Record what this profile can offer, so `/workspaces` and `/models` failures are visible. */
  async function probeCapabilities(): Promise<void> {
    const workspaces = listWorkspaces().length
    let providers = 0
    let models = 0
    let modelError: string | undefined
    try {
      const catalog = await sessionController.modelCatalog()
      const flat = flattenModels(catalog)
      models = flat.length
      providers = new Set(flat.map((entry) => entry.provider)).size
    } catch (error) {
      modelError = errorMessage(error)
    }
    await publishStatus({
      capabilities: {
        workspaces,
        ...(modelError === undefined ? { providers, models } : { modelError }),
      },
    })
  }

  async function pollLoop(): Promise<void> {
    await mkdir(dataDir, { recursive: true })
    await store.load()
    let backoff = 1000
    let probed = false

    while (!stopped) {
      const { token, source, tokenFile } = await resolveToken()
      if (token.length === 0) {
        await publishStatus({
          state: 'waiting-token',
          tokenSource: source,
          hint: `Đặt token vào ${tokenFile ?? join(dataDir, 'token')}, hoặc đặt biến môi trường ${config.tokenEnv}. Tệp token được đọc lại mỗi vòng nên không cần khởi động lại.`,
        })
        if (!probed) {
          probed = true
          void probeCapabilities().catch(() => {})
        }
        await sleep(3000)
        continue
      }

      const api = new TelegramApi(token, { fetchImpl })
      if (identityToken !== token) {
        // A rotated or newly configured token invalidates the cached bot identity.
        identity = undefined
        identityToken = token
      }
      try {
        if (!identity) {
          identity = await api.getMe(controller.signal)
          logger.info('telegram-remote: connected as @%s', identity.username)
          await api.setMyCommands([
            { command: 'new', description: 'Tạo phiên DSH mới' },
            { command: 'sessions', description: 'Liệt kê và chọn phiên' },
            { command: 'archived', description: 'Phiên đã lưu trữ' },
            { command: 'archive', description: 'Lưu trữ phiên' },
            { command: 'workspaces', description: 'Liệt kê workspace' },
            { command: 'workspace', description: 'Chọn workspace cho phiên mới' },
            { command: 'models', description: 'Liệt kê provider và model' },
            { command: 'model', description: 'Đổi model cho phiên' },
            { command: 'status', description: 'Trạng thái phiên đang gắn' },
            { command: 'cancel', description: 'Dừng lượt đang chạy' },
            { command: 'unbind', description: 'Bỏ gắn phiên' },
            { command: 'help', description: 'Danh sách lệnh' },
          ]).catch(() => {})
        }
        await publishStatus({ state: 'polling', tokenSource: source, hint: null })
        if (!probed) {
          probed = true
          void probeCapabilities().catch(() => {})
        }

        const updates = await api.getUpdates({
          offset: store.state.offset,
          timeoutSeconds: config.pollTimeoutSec,
        }, controller.signal)

        backoff = 1000
        lastPollAt = Date.now()
        for (const update of updates) {
          await store.update((state) => {
            state.offset = update.update_id + 1
          })
          if (update.callback_query) {
            void handleCallback(api, update.callback_query).catch((error) => {
              logger.error('telegram-remote: callback failed: %s', errorMessage(error))
            })
            continue
          }
          void handleMessage(api, update.message).catch((error) => {
            logger.error('telegram-remote: update failed: %s', errorMessage(error))
          })
        }
        await publishStatus({
          state: 'polling',
          lastPollAt: new Date(lastPollAt).toISOString(),
          lastError: null,
        })
      } catch (error) {
        if (stopped || controller.signal.aborted) break

        if (isTokenFailure(error)) {
          identity = undefined
          logger.error('telegram-remote: token rejected: %s', errorMessage(error))
          await publishStatus({ state: 'invalid-token', tokenSource: source, lastError: errorMessage(error) })
          await sleep(15000)
          continue
        }

        const wait = error instanceof TelegramError && error.retryAfter
          ? Math.min(60000, error.retryAfter * 1000)
          : backoff
        logger.warn('telegram-remote: poll failed (%s), retrying in %dms', errorMessage(error), wait)
        await publishStatus({ state: 'error', tokenSource: source, lastError: errorMessage(error) })
        await sleep(wait)
        backoff = Math.min(backoff * 2, 30000)
      }
    }

    await publishStatus({ state: 'stopped' })
    logger.info('telegram-remote: stopped')
  }

  const loopPromise = pollLoop()
  loopPromise.catch((error) => {
    logger.error('telegram-remote: loop crashed: %s', errorMessage(error))
  })

  return () => {
    if (stopped) return
    stopped = true
    controller.abort()
    if (typeof detachSessionEvents === 'function') detachSessionEvents()
    turnSinks.clear()
  }
}

/** A record whose event carries the numeric sequence this loop orders by. */
function isSequencedRecord(record: EventRecord | undefined): record is { event: SessionEvent & { seq: number } } {
  return record?.event !== undefined && typeof record.event.seq === 'number'
}

/** Resolve a service `apply` guarantees is present before a feature mounts. */
function requiredService<T>(ctx: DshContext, name: string): T {
  return ctx.get<T>(name) as T
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
