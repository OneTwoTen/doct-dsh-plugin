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

/**
 * Extract the visible text of one assistant message event.
 * @param {{ data?: { message?: { content?: unknown[] } } }} event
 * @returns {string} trimmed text blocks joined by a newline
 */
export function assistantText(event) {
  const content = event?.data?.message?.content
  if (!Array.isArray(content)) return ''
  const parts = []
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
 * @param {{ surfaceOp?: unknown }} event
 */
export function isAppendEvent(event) {
  return event?.surfaceOp === undefined || event.surfaceOp === 'append'
}

/**
 * Summarize one tool call as a change candidate. Read-only tools return null.
 * @param {{ data?: { callId?: string, name?: string, arguments?: unknown } }} event
 * @returns {{ callId: string, kind: 'file' | 'command', tool: string, files?: { path: string, added: number, deleted: number }[], command?: string, failed: boolean } | null}
 */
export function toolChangeEntry(event) {
  const data = event?.data
  const name = typeof data?.name === 'string' ? data.name : ''
  const callId = typeof data?.callId === 'string' ? data.callId : ''
  if (name.length === 0 || callId.length === 0) return null
  const args = parseArguments(data.arguments)

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
 * @param {ReturnType<typeof toolChangeEntry>} entry
 * @param {{ data?: { message?: { isError?: boolean }, meta?: { diffs?: unknown[] } } }} event
 */
export function applyToolResult(entry, event) {
  if (!entry) return
  if (event?.data?.message?.isError === true) entry.failed = true
  const diffs = event?.data?.meta?.diffs
  if (entry.kind !== 'file' || !Array.isArray(diffs)) return

  const files = []
  for (const diff of diffs) {
    if (!diff || typeof diff.path !== 'string' || diff.path.length === 0) continue
    const stats = lineStats(diff.oldText, diff.newText)
    files.push({
      path: diff.path,
      added: stats?.added ?? 0,
      deleted: stats?.removed ?? 0,
    })
  }
  if (files.length > 0) entry.files = files
}

/**
 * Render a `workspaceChanges.summary` into one chat message.
 * @param {{ files?: unknown[], total?: number, added?: number, deleted?: number } | undefined} summary
 * @returns {string} an empty string when nothing changed
 */
export function formatChangeSummary(summary) {
  const files = Array.isArray(summary?.files) ? summary.files : []
  if (files.length === 0) return ''

  const total = Number.isFinite(summary?.total) ? summary.total : files.length
  const added = Number.isFinite(summary?.added)
    ? summary.added
    : files.reduce((sum, file) => sum + (Number.isFinite(file?.added) ? file.added : 0), 0)
  const deleted = Number.isFinite(summary?.deleted)
    ? summary.deleted
    : files.reduce((sum, file) => sum + (Number.isFinite(file?.deleted) ? file.deleted : 0), 0)

  const lines = [`${CHANGES_LABEL} · ${total} tệp (+${added} −${deleted})`]
  for (const file of files.slice(0, MAX_CHANGE_ITEMS)) {
    const path = displayPath(file?.display ?? file?.path)
    const stats = file?.binary
      ? ' (nhị phân)'
      : file?.oversized
        ? ' (quá lớn)'
        : ` (+${Number.isFinite(file?.added) ? file.added : 0} −${Number.isFinite(file?.deleted) ? file.deleted : 0})`
    lines.push(`• ${path}${stats}`)
  }
  if (total > lines.length - 1) lines.push(`… và ${total - (lines.length - 1)} tệp khác`)
  return lines.join('\n')
}

/**
 * Render the fallback change list captured from tool-call events.
 * @param {Array<ReturnType<typeof toolChangeEntry>>} entries
 * @param {{ cwd?: string }} [options]
 * @returns {string} an empty string when no file or shell change was recorded
 */
export function formatFallbackChanges(entries, options = {}) {
  const files = new Map()
  const commands = []
  const commandKeys = new Set()

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

  const items = []
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
 * @param {string | null | undefined} before
 * @param {string | null | undefined} after
 * @returns {{ added: number, removed: number } | null}
 */
export function lineStats(before, after) {
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
 *
 * @param {{
 *   send: (text: string) => Promise<unknown>,
 *   updateStatus?: (text: string) => Promise<unknown>,
 *   resolveChanges?: (seq: number) => { files?: unknown[], total?: number, added?: number, deleted?: number } | undefined,
 *   config?: { pushResponses?: boolean, pushChanges?: boolean, progressIntervalMs?: number },
 *   placeholder?: string,
 *   cwd?: string,
 *   onError?: (error: unknown) => void,
 * }} options
 */
export function createTurnReporter(options) {
  const {
    send,
    updateStatus = async () => {},
    resolveChanges,
    config = {},
    placeholder = '⏳ Đang xử lý…',
    cwd = '',
    onError = () => {},
  } = options ?? {}

  const pushResponses = config.pushResponses !== false
  const pushChanges = config.pushChanges !== false
  const interval = Math.max(250, Number(config.progressIntervalMs) || 1500)
  const pending = []
  const entries = new Map()
  let latestSummary
  let responses = 0
  let lastStatus = placeholder
  let statusAt = 0

  async function safeSend(text) {
    try {
      await send(text)
      return true
    } catch (error) {
      onError(error)
      return false
    }
  }

  /** Send buffered responses, optionally keeping the last one as the final answer. */
  async function flush(keepLast) {
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
    async handle(event) {
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
    async tick() {
      const changeCount = latestSummary?.total ?? latestSummary?.files?.length ?? entries.size
      if (responses === 0 && changeCount === 0) return
      if (Date.now() - statusAt < interval) return
      const parts = []
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
     * @returns {Promise<string>}
     */
    async finish() {
      const finalText = pending.length > 0 ? pending.pop() : ''
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
function parseArguments(raw) {
  if (raw && typeof raw === 'object') return raw
  if (typeof raw !== 'string' || raw.trim().length === 0) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return ''
}

/** File paths named by an apply_patch envelope. */
function patchPaths(input) {
  if (input.length === 0) return []
  const paths = []
  const seen = new Set()
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
function displayPath(value, cwd) {
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

function shortCommand(command) {
  const firstLine = String(command ?? '').split(/\r?\n/)[0].trim()
  return shorten(firstLine, MAX_COMMAND_CHARS)
}

function shorten(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function countLines(text) {
  return splitLines(text).length
}

/** Split on newlines, ignoring the synthetic empty line from a final newline. */
function splitLines(text) {
  const value = typeof text === 'string' ? text : ''
  if (value.length === 0) return []
  return (value.endsWith('\n') ? value.slice(0, -1) : value).split('\n')
}

/** Longest common subsequence length over lines, capped by MAX_DIFF_CELLS. */
function commonLineCount(oldLines, newLines) {
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
