/** Telegram's hard limit for one message body is 4096 UTF-16 code units. */
export const TELEGRAM_MESSAGE_LIMIT = 4096

/** Leave headroom so a rendered preview marker never pushes a chunk over the limit. */
export const SAFE_MESSAGE_LIMIT = 3800

/**
 * Split long text into Telegram-safe chunks without breaking surrogate pairs.
 * Prefers paragraph, then line, then space boundaries near the limit.
 *
 * @param text
 * @param limit
 * @returns one or more non-empty chunks; an empty input yields `[]`
 */
export function chunkText(text: string, limit = SAFE_MESSAGE_LIMIT): string[] {
  const source = typeof text === 'string' ? text : String(text ?? '')
  if (source.trim().length === 0) return []
  if (limit <= 0) throw new RangeError('limit must be positive')

  const chunks: string[] = []
  let rest = source
  while (rest.length > limit) {
    let cut = -1
    const window = rest.slice(0, limit)
    for (const marker of ['\n\n', '\n', ' ']) {
      const at = window.lastIndexOf(marker)
      if (at > limit * 0.5) {
        cut = at + marker.length
        break
      }
    }
    if (cut <= 0) cut = safeCut(rest, limit)
    chunks.push(rest.slice(0, cut))
    rest = rest.slice(cut)
  }
  if (rest.length > 0) chunks.push(rest)
  return chunks.filter((chunk) => chunk.length > 0)
}

/** Cut at `limit`, stepping back one unit when that would split a surrogate pair. */
function safeCut(text: string, limit: number): number {
  const code = text.charCodeAt(limit - 1)
  return code >= 0xd800 && code <= 0xdbff ? limit - 1 : limit
}

/** Trim a chunk to the Telegram limit after appending a suffix. */
export function withSuffix(text: string, suffix: string, limit = TELEGRAM_MESSAGE_LIMIT): string {
  const room = Math.max(0, limit - suffix.length)
  const body = text.length > room ? text.slice(text.length - room) : text
  return `${body}${suffix}`
}

/** True when a line is a bot command addressed to this bot. */
export function isCommand(text: string): boolean {
  return typeof text === 'string' && text.trimStart().startsWith('/')
}

/**
 * Parse `/name@bot arg1 arg2` into its command name and argument text.
 *
 * @param text
 * @returns the lower-cased command name and its argument text
 */
export function parseCommand(text: string): { name: string; argument: string } {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  const withoutSlash = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
  const space = withoutSlash.search(/\s/)
  const head = (space < 0 ? withoutSlash : withoutSlash.slice(0, space)).split('@')[0].toLowerCase()
  const argument = space < 0 ? '' : withoutSlash.slice(space + 1).trim()
  return { name: head, argument }
}
