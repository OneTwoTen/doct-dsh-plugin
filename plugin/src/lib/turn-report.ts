/**
 * Turn narration for Telegram: the assistant's intermediate responses, the
 * turn's main file changes, and the final answer are separate chat messages.
 *
 * The changed-files summary arrives through the optional `workspaceChanges`
 * service (`ctx.workspaceChanges.summary`). When that service is not mounted,
 * file edits and shell commands recorded through `tool/call` events are used
 * as a compact fallback.
 */

/** Prefix for an intermediate assistant response. */
export const RESPONSE_LABEL = '💬'
/** Header for the turn's changed-files summary. */
export const CHANGES_LABEL = '🔧 Thay đổi chính'
/** Prefix for the final assistant answer. */
export const FINAL_LABEL = '✅'

/** Page/field limits that keep one chat message readable. */
const MAX_CHANGE_ITEMS = 15
const MAX_COMMAND_CHARS = 120
const MAX_PATH_CHARS = 80
/** Skip the line diff for pairs whose line matrix would grow too large. */
const MAX_DIFF_CELLS = 250_000

const SHELL_TOOL_NAMES = new Set(['bash', 'pwsh'])

/** One content block of a committed message; only text blocks carry narration. */
export interface SessionEventContentBlock {
  type?: unknown
  text?: unknown
}

/**
 * One committed Session event. The Harness event catalog is not part of this
 * bundle, so only the members narration reads are described here; the index
 * signature keeps every other payload field available without `any`.
 */
export interface SessionEvent {
  type?: string
  seq?: number
  surfaceOp?: unknown
  data?: {
    message?: {
      content?: SessionEventContentBlock[]
      isError?: boolean
      toolCallId?: string
    }
    callId?: string
    name?: string
    arguments?: unknown
    meta?: { diffs?: unknown[] }
  }
  [key: string]: unknown
}

/** One file a tool call changed. */
export interface ToolFileChange {
  path: string
  added: number
  deleted: number
}

/** One tool call that may have changed something. */
export interface ToolChangeEntry {
  callId: string
  kind: 'file' | 'command'
  tool: string
  files?: ToolFileChange[]
  command?: string
  failed: boolean
}

/** One file row of a `workspaceChanges.summary`. */
export interface ChangeSummaryFile {
  display?: string
  path?: string
  added?: number
  deleted?: number
  binary?: boolean
  oversized?: boolean
}

/** The `workspaceChanges.summary` payload this feature renders. */
export interface ChangeSummary {
  files?: ChangeSummaryFile[]
  total?: number
  added?: number
  deleted?: number
}

/** The reporter options `config` carries. */
export interface TurnReporterConfig {
  pushResponses?: boolean
  pushChanges?: boolean
  progressIntervalMs?: number
}

/** What the caller of `createTurnReporter` supplies. */
export interface TurnReporterOptions {
  send: (text: string) => Promise<unknown>
  updateStatus?: (text: string) => Promise<unknown>
  resolveChanges?: (seq: number | undefined) => ChangeSummary | undefined
  config?: TurnReporterConfig
  placeholder?: string
  cwd?: string
  onError?: (error: unknown) => void
}

/** One turn's narration handle. */
export interface TurnReporter {
  handle(event: SessionEvent | undefined): Promise<void>
  tick(): Promise<void>
  finish(): Promise<string>
}

/**
 * Extract the visible text of one assistant message event.
 * @returns trimmed text blocks joined by a newline
 */
export function assistantText(event: SessionEvent | undefined): string {
  const content = event?.data?.message?.content
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim().length > 0) {
      parts.push(block.text)
    }
  }
  return parts.join('\n').trim()
}

/**
 * Whether a durable event belongs on the current surface. Replacement records
 * describe a historical rewrite, so they are not new narration.
 */
export function isAppendEvent(event: { surfaceOp?: unknown } | undefined): boolean {
  return event?.surfaceOp === undefined || event.surfaceOp === 'append'
}

/**
 * Summarize one tool call as a change candidate. Read-only tools return null.
 */
export function toolChangeEntry(event: SessionEvent | undefined): ToolChangeEntry | null {
  const data = event?.data
  const name = typeof data?.name === 'string' ? data.name : ''
  const callId = typeof data?.callId === 'string' ? data.callId : ''
  if (name.length === 0 || callId.length === 0) return null
  const args = parseArguments(data?.arguments)

  if (name === 'edit' || name === 'write' || name === 'str_replace_editor') {
    const path = firstString(args.file_path, args.path, args.file)
    if (path.length === 0) return null
    return { callId, kind: 'file', tool: name, files: [{ path, added: 0, deleted: 0 }], failed: false }
  }

  if (name === 'apply_patch') {
    const paths = patchPaths(firstString(args.input, args.patch))
    if (paths.length === 0) return null
    return { callId, kind: 'file', tool: name, files: paths.map((path) => ({ path, added: 0, deleted: 0 })), failed: false }
  }

  if (SHELL_TOOL_NAMES.has(name)) {
    const command = firstString(args.command, args.cmd, args.input).trim()
    if (command.length === 0) return null
    return { callId, kind: 'command', tool: name, command, failed: false }
  }

  return null
}

/**
 * Fold a tool result into its call entry: authoritative diff paths and line
 * counts when `meta.diffs` exists, and the failure flag either way.
 */
export function applyToolResult(entry: ToolChangeEntry | null | undefined, event: SessionEvent | undefined): void {
  if (!entry) return
  if (event?.data?.message?.isError === true) entry.failed = true
  const diffs = event?.data?.meta?.diffs
  if (entry.kind !== 'file' || !Array.isArray(diffs)) return

  const files: ToolFileChange[] = []
  for (const diff of diffs) {
    const record = diff as { path?: unknown; oldText?: unknown; newText?: unknown } | null | undefined
    if (!record || typeof record.path !== 'string' || record.path.length === 0) continue
    const stats = lineStats(record.oldText, record.newText)
    files.push({
      path: record.path,
      added: stats?.added ?? 0,
      deleted: stats?.removed ?? 0,
    })
  }
  if (files.length > 0) entry.files = files
}

/**
 * Render a `workspaceChanges.summary` into one chat message.
 * @returns an empty string when nothing changed
 */
export function formatChangeSummary(summary: ChangeSummary | undefined): string {
  const files = Array.isArray(summary?.files) ? summary.files : []
  if (files.length === 0) return ''

  const reportedTotal = summary?.total
  const total = isFiniteNumber(reportedTotal) ? reportedTotal : files.length
  const reportedAdded = summary?.added
  const added = isFiniteNumber(reportedAdded)
    ? reportedAdded
    : files.reduce((sum, file) => {
      const value = file?.added
      return sum + (isFiniteNumber(value) ? value : 0)
    }, 0)
  const reportedDeleted = summary?.deleted
  const deleted = isFiniteNumber(reportedDeleted)
    ? reportedDeleted
    : files.reduce((sum, file) => {
      const value = file?.deleted
      return sum + (isFiniteNumber(value) ? value : 0)
    }, 0)

  const lines = [`${CHANGES_LABEL} · ${total} tệp (+${added} −${deleted})`]
  for (const file of files.slice(0, MAX_CHANGE_ITEMS)) {
    const path = displayPath(file?.display ?? file?.path)
    const fileAdded = file?.added
    const fileDeleted = file?.deleted
    const stats = file?.binary
      ? ' (nhị phân)'
      : file?.oversized
        ? ' (quá lớn)'
        : ` (+${isFiniteNumber(fileAdded) ? fileAdded : 0} −${isFiniteNumber(fileDeleted) ? fileDeleted : 0})`
    lines.push(`• ${path}${stats}`)
  }
  if (total > lines.length - 1) lines.push(`… và ${total - (lines.length - 1)} tệp khác`)
  return lines.join('\n')
}

/**
 * Render the fallback change list captured from tool-call events.
 * @returns an empty string when no file or shell change was recorded
 */
export function formatFallbackChanges(
  entries: ReadonlyArray<ToolChangeEntry | null | undefined> | undefined,
  options: { cwd?: string } = {},
): string {
  const files = new Map<string, { path: string; added: number; deleted: number; failed: boolean }>()
  const commands: Array<{ command: string; failed: boolean }> = []
  const commandKeys = new Set<string>()

  for (const entry of entries ?? []) {
    if (!entry) continue
    if (entry.kind === 'command') {
      const command = shortCommand(entry.command)
      const key = `${entry.failed ? '1' : '0'}:${command}`
      if (commandKeys.has(key)) continue
      commandKeys.add(key)
      commands.push({ command, failed: entry.failed === true })
      continue
    }
    for (const file of entry.files ?? []) {
      if (typeof file?.path !== 'string' || file.path.length === 0) continue
      const key = file.path
      const current = files.get(key) ?? { path: key, added: 0, deleted: 0, failed: false }
      current.added += Number.isFinite(file.added) ? file.added : 0
      current.deleted += Number.isFinite(file.deleted) ? file.deleted : 0
      current.failed = current.failed || entry.failed === true
      files.set(key, current)
    }
  }

  const items: string[] = []
  for (const file of files.values()) {
    const stats = file.added + file.deleted > 0 ? ` (+${file.added} −${file.deleted})` : ''
    items.push(`• ${displayPath(file.path, options.cwd)}${stats}${file.failed ? ' ❌' : ''}`)
  }
  for (const command of commands) {
    items.push(`• ▶ ${command.command}${command.failed ? ' ❌' : ''}`)
  }
  if (items.length === 0) return ''

  const shown = items.slice(0, MAX_CHANGE_ITEMS)
  const lines = [CHANGES_LABEL, ...shown]
  if (items.length > shown.length) lines.push(`… và ${items.length - shown.length} mục khác`)
  return lines.join('\n')
}

/**
 * Compute added/removed line counts for one before/after pair. A missing side
 * means creation or deletion; an oversized pair yields null.
 */
export function lineStats(before: unknown, after: unknown): { added: number; removed: number } | null {
  const hasBefore = typeof before === 'string'
  const hasAfter = typeof after === 'string'
  if (!hasBefore && !hasAfter) return { added: 0, removed: 0 }
  if (!hasBefore) return { added: countLines(after), removed: 0 }
  if (!hasAfter) return { added: 0, removed: countLines(before) }

  const oldLines = splitLines(before)
  const newLines = splitLines(after)
  if (oldLines.length === 0) return { added: newLines.length, removed: 0 }
  if (newLines.length === 0) return { added: 0, removed: oldLines.length }
  if (oldLines.length * newLines.length > MAX_DIFF_CELLS) return null

  const common = commonLineCount(oldLines, newLines)
  return { added: newLines.length - common, removed: oldLines.length - common }
}

/**
 * Create the per-turn reporter. It sends intermediate responses as soon as a
 * tool call proves they are not the final answer, keeps one changed-files
 * summary, and returns the final answer for the caller to send last.
 */
export function createTurnReporter(options: TurnReporterOptions): TurnReporter {
  // `options` is required at the type level, but the runtime default keeps a
  // call with no argument behaving as it did before the migration.
  const {
    send,
    updateStatus = async () => {},
    resolveChanges,
    config = {},
    placeholder = '⏳ Đang xử lý…',
    cwd = '',
    onError = () => {},
  } = (options ?? {}) as TurnReporterOptions

  const pushResponses = config.pushResponses !== false
  const pushChanges = config.pushChanges !== false
  const interval = Math.max(250, Number(config.progressIntervalMs) || 1500)
  const pending: string[] = []
  const entries = new Map<string, ToolChangeEntry>()
  let latestSummary: ChangeSummary | undefined
  let responses = 0
  let lastStatus = placeholder
  let statusAt = 0

  async function safeSend(text: string): Promise<boolean> {
    try {
      await send(text)
      return true
    } catch (error) {
      onError(error)
      return false
    }
  }

  /** Send buffered responses, optionally keeping the last one as the final answer. */
  async function flush(keepLast: boolean): Promise<void> {
    if (pending.length === 0) return
    const count = keepLast ? Math.max(0, pending.length - 1) : pending.length
    const texts = pending.splice(0, count)
    if (!pushResponses) return
    for (const text of texts) {
      if (await safeSend(`${RESPONSE_LABEL} ${text}`)) responses += 1
    }
  }

  return {
    /** Fold one committed Session event into the turn's chat narration. */
    async handle(event: SessionEvent | undefined): Promise<void> {
      if (!event || typeof event.type !== 'string') return
      if (event.type === 'assistant/message') {
        if (!isAppendEvent(event)) return
        const text = assistantText(event)
        if (text.length === 0) return
        // A newer assistant message proves earlier buffered text is not the
        // final answer, so push it as an intermediate response now.
        await flush(false)
        pending.push(text)
        return
      }
      if (event.type === 'tool/call') {
        // Narration that precedes a tool call is an intermediate response.
        await flush(false)
        const entry = toolChangeEntry(event)
        if (entry?.callId) entries.set(entry.callId, entry)
        return
      }
      if (event.type === 'tool/result') {
        const callId = event?.data?.message?.toolCallId
        const entry = typeof callId === 'string' ? entries.get(callId) : undefined
        if (entry) applyToolResult(entry, event)
        return
      }
      if (event.type === 'workspace/changes') {
        if (!pushChanges) return
        try {
          const summary = resolveChanges?.(event.seq)
          if (summary) latestSummary = summary
        } catch (error) {
          onError(error)
        }
      }
    },

    /** Refresh the status placeholder with what the turn has produced so far. */
    async tick(): Promise<void> {
      const changeCount = latestSummary?.total ?? latestSummary?.files?.length ?? entries.size
      if (responses === 0 && changeCount === 0) return
      if (Date.now() - statusAt < interval) return
      const parts: string[] = []
      if (responses > 0) parts.push(`${RESPONSE_LABEL} ${responses}`)
      if (changeCount > 0) parts.push(`🔧 ${changeCount}`)
      const text = parts.length > 0 ? `${placeholder} · ${parts.join(' · ')}` : placeholder
      if (text === lastStatus) return
      statusAt = Date.now()
      lastStatus = text
      try {
        await updateStatus(text)
      } catch (error) {
        onError(error)
      }
    },

    /**
     * Flush remaining responses and the change message, then return the final
     * answer for the caller to send after retiring the status placeholder.
     */
    async finish(): Promise<string> {
      const finalText = pending.length > 0 ? pending.pop() as string : ''
      await flush(false)
      if (pushChanges) {
        const text = latestSummary !== undefined
          ? formatChangeSummary(latestSummary)
          : formatFallbackChanges([...entries.values()], { cwd })
        if (text.length > 0) await safeSend(text)
      }
      return finalText.trim()
    },
  }
}

/** Parse a tool call's JSON arguments, tolerating malformed model output. */
function parseArguments(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw !== 'string' || raw.trim().length === 0) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return ''
}

/** File paths named by an apply_patch envelope. */
function patchPaths(input: string): string[] {
  if (input.length === 0) return []
  const paths: string[] = []
  const seen = new Set<string>()
  for (const line of input.split(/\r?\n/)) {
    const match = /^\*\*\* (?:Add|Update|Delete) File:\s*(.+)$/.exec(line)
      ?? /^\*\*\* Move to:\s*(.+)$/.exec(line)
    if (!match) continue
    const path = match[1].trim()
    if (path.length === 0 || seen.has(path)) continue
    seen.add(path)
    paths.push(path)
  }
  return paths
}

/** Compact display path: slash-separated and relative to `cwd` when inside it. */
function displayPath(value: unknown, cwd?: string): string {
  let text = typeof value === 'string' ? value : ''
  if (text.trim().length === 0) return '(không rõ)'
  text = text.replaceAll('\\', '/')
  if (typeof cwd === 'string' && cwd.trim().length > 0) {
    const base = cwd.replaceAll('\\', '/').replace(/\/+$/, '')
    if (base.length > 0 && text.toLowerCase().startsWith(`${base.toLowerCase()}/`)) {
      text = text.slice(base.length + 1)
    }
  }
  return shorten(text, MAX_PATH_CHARS)
}

function shortCommand(command: string | undefined): string {
  const firstLine = String(command ?? '').split(/\r?\n/)[0].trim()
  return shorten(firstLine, MAX_COMMAND_CHARS)
}

function shorten(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function countLines(text: unknown): number {
  return splitLines(text).length
}

/** Split on newlines, ignoring the synthetic empty line from a final newline. */
function splitLines(text: unknown): string[] {
  const value = typeof text === 'string' ? text : ''
  if (value.length === 0) return []
  return (value.endsWith('\n') ? value.slice(0, -1) : value).split('\n')
}

/** Longest common subsequence length over lines, capped by MAX_DIFF_CELLS. */
function commonLineCount(oldLines: string[], newLines: string[]): number {
  let previous = new Uint32Array(newLines.length + 1)
  let current = new Uint32Array(newLines.length + 1)
  for (let i = 1; i <= oldLines.length; i += 1) {
    for (let j = 1; j <= newLines.length; j += 1) {
      current[j] = oldLines[i - 1] === newLines[j - 1]
        ? previous[j - 1] + 1
        : Math.max(previous[j], current[j - 1])
    }
    const swap = previous
    previous = current
    current = swap
    current.fill(0)
  }
  return previous[newLines.length]
}

/** The narrowing form of `Number.isFinite`; the built-in does not narrow. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
