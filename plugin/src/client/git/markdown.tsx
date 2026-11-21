/**
 * Markdown rendering for the prose a code host stores: issue bodies,
 * change-request descriptions, reviews and comments.
 *
 * The Host hands those strings over raw. A description written with headings,
 * lists, a table and inline code is unreadable when it arrives as a single
 * pre-wrapped paragraph, and the code host shows it rendered, so the panel does
 * too. The parser is local and dependency-free (the browser bundle may only
 * borrow React from the page), and it produces elements rather than HTML: no
 * string from the code host is ever handed to the page as markup.
 *
 * Supported: ATX headings, paragraphs with hard breaks, fenced and indented
 * code, block quotes, ordered/unordered lists (nested, with `- [ ]` tasks),
 * GFM tables with alignment, thematic breaks, and inline code, emphasis,
 * strikethrough, links, images, `<url>` autolinks and bare URLs. Raw HTML is
 * dropped instead of executed, and setext headings are not recognised.
 */
import { h } from '../runtime.ts'
import type { ReactElementLike } from '../runtime.ts'
import { Icon } from '../icons.tsx'

/** How one table column is aligned. */
type Align = 'left' | 'center' | 'right' | null

/** One list item: its task state, if it has one, then its own blocks. */
interface ListItem {
  task: boolean | null
  blocks: Block[]
}

/** One list, ordered or not. */
interface ListBlock {
  kind: 'list'
  ordered: boolean
  start: number
  items: ListItem[]
}

/** One block-level node. */
type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; info: string; text: string }
  | { kind: 'quote'; blocks: Block[] }
  | ListBlock
  | { kind: 'table'; align: Align[]; header: string[]; rows: string[][] }
  | { kind: 'rule' }

/** The opening fence of a fenced code block, with its optional info string. */
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})[ \t]*(\S*)/
/** The closing fence: the same character, at least as long. */
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/
/** An ATX heading. */
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/
/** A thematic break. */
const RULE = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/
/** One block-quote line. */
const QUOTE = /^ {0,3}>[ \t]?(.*)$/
/** One list item: indent, marker, the spaces after it, and the content. */
const ITEM = /^( *)([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/
/** A link reference definition, which this renderer does not resolve. */
const DEFINITION = /^ {0,3}\[[^\]]+\]:[ \t]+\S/
/** A task-list marker at the start of an item. */
const TASK = /^\[([ xX])\](?:[ \t]+([\s\S]*))?$/
/** Characters a backslash may escape. */
const ESCAPABLE = /[\\`*_{}[\]()#+\-.!|~>]/

/** Props of {@link Markdown}. */
export interface MarkdownProps {
  /** The Markdown source, exactly as the code host stored it. */
  text: string
  /** An extra class for the wrapper, if the caller needs one. */
  className?: string
}

/**
 * Render Markdown the way the code host shows it.
 * @param props the source text and an optional wrapper class.
 */
export function Markdown(props: MarkdownProps): ReactElementLike {
  const text = typeof props.text === 'string' ? props.text : ''
  const blocks = parseBlocks(text.replace(/\r\n?/g, '\n').split('\n'))
  const className = props.className === undefined || props.className.length === 0
    ? 'ph-md'
    : `ph-md ${props.className}`
  return h('div', { className, 'data-personal-hub-markdown': true },
    blocks.map((block, index) => renderBlock(block, `md-${index}`)))
}

/**
 * Parse the whole document.
 * @param lines the source, split on newlines.
 */
function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim().length === 0) {
      index += 1
      continue
    }

    const fence = FENCE_OPEN.exec(line)
    if (fence !== null) {
      index = readFence(blocks, lines, index, fence[1], (fence[2] ?? '').trim())
      continue
    }

    const heading = HEADING.exec(line)
    if (heading !== null) {
      const text = (heading[2] ?? '').replace(/[ \t]+#+[ \t]*$/, '').trim()
      blocks.push({ kind: 'heading', level: heading[1].length, text })
      index += 1
      continue
    }

    if (RULE.test(line)) {
      blocks.push({ kind: 'rule' })
      index += 1
      continue
    }

    if (DEFINITION.test(line)) {
      index += 1
      continue
    }

    if (QUOTE.test(line)) {
      const inner: string[] = []
      while (index < lines.length) {
        const quoted = QUOTE.exec(lines[index])
        if (quoted === null) break
        inner.push(quoted[1])
        index += 1
      }
      blocks.push({ kind: 'quote', blocks: parseBlocks(inner) })
      continue
    }

    if (isTableStart(lines, index)) {
      index = readTable(blocks, lines, index)
      continue
    }

    if (ITEM.test(line)) {
      index = readList(blocks, lines, index)
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length) {
      if (lines[index].trim().length === 0) break
      if (startsBlock(lines, index)) break
      paragraph.push(lines[index].replace(/^ {0,3}/, ''))
      index += 1
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join('\n').trimEnd() })
  }
  return blocks
}

/**
 * Read one fenced code block, up to its closing fence or the end.
 * @param blocks the output list.
 * @param lines the source lines.
 * @param start the index of the opening fence.
 * @param marker the opening fence run.
 * @param info the info string, usually a language name.
 * @returns the index after the closing fence.
 */
function readFence(blocks: Block[], lines: string[], start: number, marker: string, info: string): number {
  const body: string[] = []
  const character = marker[0]
  let index = start + 1
  while (index < lines.length) {
    const close = FENCE_CLOSE.exec(lines[index])
    if (close !== null && close[1][0] === character && close[1].length >= marker.length) break
    body.push(lines[index])
    index += 1
  }
  blocks.push({ kind: 'code', info, text: body.join('\n') })
  return index + 1
}

/**
 * Read one GFM table: header row, delimiter row, then body rows.
 * @param blocks the output list.
 * @param lines the source lines.
 * @param start the index of the header row.
 * @returns the index after the table.
 */
function readTable(blocks: Block[], lines: string[], start: number): number {
  const header = splitRow(lines[start])
  const align = splitRow(lines[start + 1]).map(alignOf)
  const rows: string[][] = []
  let index = start + 2
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim().length === 0 || !line.includes('|')) break
    rows.push(splitRow(line))
    index += 1
  }
  blocks.push({ kind: 'table', align, header, rows })
  return index
}

/**
 * Read one list, with nested lists and multi-paragraph items.
 * @param blocks the output list.
 * @param lines the source lines.
 * @param start the index of the first item.
 * @returns the index after the list.
 */
function readList(blocks: Block[], lines: string[], start: number): number {
  const first = ITEM.exec(lines[start])!
  const ordered = !isBullet(first[2])
  const items: ListItem[] = []
  let index = start
  while (index < lines.length) {
    const match = ITEM.exec(lines[index])
    if (match === null) break
    if (isBullet(match[2]) === ordered) break
    const contentIndent = match[1].length + match[2].length + Math.max(1, (match[3] ?? ' ').length)
    const content: string[] = [match[4] ?? '']
    index += 1
    while (index < lines.length) {
      const next = lines[index]
      if (next.trim().length === 0) {
        // A blank line stays inside the item only when the block after it is
        // still indented under the item's marker. Otherwise the item ends and
        // the blank lines are skipped here, so a loose list stays one list.
        let look = index + 1
        while (look < lines.length && lines[look].trim().length === 0) look += 1
        if (look < lines.length && leadingSpaces(lines[look]) >= contentIndent) {
          while (index < look) {
            content.push('')
            index += 1
          }
          continue
        }
        index = look
        break
      }
      if (leadingSpaces(next) >= contentIndent) {
        content.push(next.slice(contentIndent))
        index += 1
        continue
      }
      // Lazy continuation: a plain line directly under the item's paragraph.
      if (startsBlock(lines, index)) break
      content.push(next.trim())
      index += 1
    }
    let task: boolean | null = null
    const checked = TASK.exec(content[0])
    if (checked !== null) {
      task = checked[1] !== ' '
      content[0] = checked[2] ?? ''
    }
    items.push({ task, blocks: parseBlocks(content) })
  }
  blocks.push({ kind: 'list', ordered, start: ordered ? Number.parseInt(first[2], 10) : 1, items })
  return index
}

/**
 * Whether a line begins a block that interrupts a paragraph.
 * @param lines the source lines.
 * @param index the line to test.
 */
function startsBlock(lines: string[], index: number): boolean {
  const line = lines[index]
  return FENCE_OPEN.test(line)
    || HEADING.test(line)
    || RULE.test(line)
    || QUOTE.test(line)
    || ITEM.test(line)
    || DEFINITION.test(line)
    || isTableStart(lines, index)
}

/**
 * Whether a table starts at a line: a header with pipes, then a delimiter row
 * with the same number of cells.
 * @param lines the source lines.
 * @param index the candidate header line.
 */
function isTableStart(lines: string[], index: number): boolean {
  if (index + 1 >= lines.length) return false
  if (!lines[index].includes('|')) return false
  if (!isDelimiterRow(lines[index + 1])) return false
  return splitRow(lines[index]).length === splitRow(lines[index + 1]).length
}

/**
 * Whether a line is a table's delimiter row.
 * @param line the candidate line.
 */
function isDelimiterRow(line: string): boolean {
  if (!line.includes('-')) return false
  const cells = splitRow(line)
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell))
}

/**
 * Split one table row into trimmed cells, ignoring pipes inside code spans and
 * escaped pipes.
 * @param line the raw row.
 */
function splitRow(line: string): string[] {
  let text = line.trim()
  if (text.startsWith('|')) text = text.slice(1)
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  let ticks = 0
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '\\' && text[index + 1] === '|') {
      cell += '|'
      index += 1
      continue
    }
    if (character === '`') {
      let run = 1
      while (text[index + run] === '`') run += 1
      ticks = ticks === 0 ? run : (ticks === run ? 0 : ticks)
      cell += text.slice(index, index + run)
      index += run - 1
      continue
    }
    if (character === '|' && ticks === 0) {
      cells.push(cell.trim())
      cell = ''
      continue
    }
    cell += character
  }
  cells.push(cell.trim())
  return cells
}

/**
 * Whether one list marker is a bullet rather than a number.
 * @param marker the marker text from a list item.
 */
function isBullet(marker: string): boolean {
  return marker === '-' || marker === '*' || marker === '+'
}

/**
 * The alignment a delimiter cell asks for.
 * @param cell one delimiter cell.
 */
function alignOf(cell: string): Align {
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  if (left) return 'left'
  return null
}

/**
 * How many spaces a line is indented by.
 * @param line the line to measure.
 */
function leadingSpaces(line: string): number {
  const match = /^ */.exec(line)
  return match === null ? 0 : match[0].length
}

/**
 * Render one block.
 * @param block the block to render.
 * @param key a stable React key.
 */
function renderBlock(block: Block, key: string): ReactElementLike {
  switch (block.kind) {
    case 'paragraph':
      return h('p', { key, className: 'ph-md-p' }, ...renderInline(block.text, key))
    case 'heading': {
      const level = Math.min(6, Math.max(1, block.level))
      return h(`h${level}`, { key, className: `ph-md-h ph-md-h${level}` }, ...renderInline(block.text, key))
    }
    case 'code':
      return h('div', { key, className: 'ph-md-code-block' },
        block.info.length === 0
          ? null
          : h('div', { key: 'info', className: 'ph-md-code-info' }, block.info),
        h('pre', { key: 'pre', className: 'ph-md-pre' },
          h('code', { key: 'code' }, block.text.length === 0 ? '\n' : block.text)))
    case 'quote':
      return h('blockquote', { key, className: 'ph-md-quote' },
        block.blocks.map((child, index) => renderBlock(child, `${key}-${index}`)))
    case 'list': {
      const items = block.items.map((item, index) => {
        const itemKey = `${key}-i${index}`
        return h('li', {
          key: itemKey,
          className: item.task === null ? 'ph-md-li' : 'ph-md-li ph-md-li-task',
        },
          item.task === null
            ? null
            : h('span', {
                key: 'task',
                className: 'ph-md-task',
                'data-done': item.task ? 'true' : 'false',
                'aria-hidden': 'true',
              }, item.task ? h(Icon, { name: 'check', size: 10, weight: 2 }) : null),
          item.blocks.map((child, childIndex) => renderBlock(child, `${itemKey}-${childIndex}`)))
      })
      return h(block.ordered ? 'ol' : 'ul', {
        key,
        className: block.ordered ? 'ph-md-list ph-md-ol' : 'ph-md-list ph-md-ul',
        start: block.ordered && block.start !== 1 ? block.start : undefined,
      }, ...items)
    }
    case 'table': {
      const columnStyle = (index: number): Record<string, unknown> | undefined => {
        const align = block.align[index]
        return typeof align === 'string' ? { textAlign: align } : undefined
      }
      const header = block.header.map((cell, index) => h('th', {
        key: `h${index}`,
        className: 'ph-md-th',
        style: columnStyle(index),
      }, ...renderInline(cell, `${key}-h${index}`)))
      const rows = block.rows.map((row, rowIndex) => h('tr', { key: `r${rowIndex}` },
        block.header.map((_, column) => h('td', {
          key: `c${column}`,
          className: 'ph-md-td',
          style: columnStyle(column),
        }, ...renderInline(row[column] ?? '', `${key}-r${rowIndex}c${column}`)))))
      return h('div', { key, className: 'ph-md-table-wrap' },
        h('table', { key: 'table', className: 'ph-md-table' },
          h('thead', { key: 'head' }, h('tr', { key: 'row' }, ...header)),
          rows.length === 0 ? null : h('tbody', { key: 'body' }, ...rows)))
    }
    case 'rule':
      return h('hr', { key, className: 'ph-md-rule' })
    default:
      return h('div', { key })
  }
}

/**
 * Render inline Markdown into text and element children.
 * @param text the inline source.
 * @param keyPrefix a prefix that keeps sibling keys unique.
 */
function renderInline(text: string, keyPrefix: string): unknown[] {
  const nodes: unknown[] = []
  let buffer = ''
  let index = 0
  const flush = (): void => {
    if (buffer.length > 0) {
      nodes.push(buffer)
      buffer = ''
    }
  }
  while (index < text.length) {
    const character = text[index]

    if (character === '\\' && ESCAPABLE.test(text[index + 1] ?? '')) {
      buffer += text[index + 1]
      index += 2
      continue
    }

    if (character === '\n') {
      // Two trailing spaces, or a backslash, is a hard break.
      const hard = /(?: {2}|\\)$/.exec(buffer)
      if (hard !== null) {
        buffer = buffer.slice(0, hard.index)
        flush()
        nodes.push(h('br', { key: `${keyPrefix}-br-${index}` }))
      } else {
        buffer += ' '
      }
      index += 1
      continue
    }

    if (character === '`') {
      const run = /^`+/.exec(text.slice(index))![0]
      const rest = text.slice(index)
      const close = rest.indexOf(run, run.length)
      if (close === -1) {
        buffer += run
        index += run.length
        continue
      }
      let code = rest.slice(run.length, close).replace(/\n/g, ' ')
      if (code.length > 1 && code.startsWith(' ') && code.endsWith(' ')) code = code.slice(1, -1)
      flush()
      nodes.push(h('code', { key: `${keyPrefix}-code-${index}`, className: 'ph-md-code' }, code))
      index += close + run.length
      continue
    }

    if (character === '!' && text[index + 1] === '[') {
      const image = /^!\[([^\]]*)\]\(([^)]*)\)/.exec(text.slice(index))
      if (image !== null) {
        const target = linkTarget(image[2])
        flush()
        const source = target.href !== null && /^https?:/i.test(target.href) ? target.href : null
        nodes.push(source === null
          ? h('span', { key: `${keyPrefix}-img-${index}`, className: 'ph-md-a' }, image[1].length > 0 ? image[1] : image[2])
          : h('img', {
              key: `${keyPrefix}-img-${index}`,
              className: 'ph-md-img',
              src: source,
              alt: image[1],
              title: target.title,
              loading: 'lazy',
              referrerPolicy: 'no-referrer',
            }))
        index += image[0].length
        continue
      }
    }

    if (character === '[') {
      const link = /^\[([^\]]*)\]\(([^)]*)\)/.exec(text.slice(index))
      if (link !== null) {
        const target = linkTarget(link[2])
        flush()
        const label = renderInline(link[1], `${keyPrefix}-a-${index}`)
        nodes.push(target.href === null
          ? h('span', { key: `${keyPrefix}-a-${index}`, className: 'ph-md-a' }, ...label)
          : h('a', {
              key: `${keyPrefix}-a-${index}`,
              className: 'ph-md-a',
              href: target.href,
              title: target.title,
              target: '_blank',
              rel: 'noreferrer noopener',
            }, ...label))
        index += link[0].length
        continue
      }
    }

    if (character === '<') {
      const rest = text.slice(index)
      const autolink = /^<([a-zA-Z][a-zA-Z0-9+.-]*:[^>\s]*)>/.exec(rest)
      if (autolink !== null) {
        const href = safeHref(autolink[1])
        if (href !== null) {
          flush()
          nodes.push(h('a', {
            key: `${keyPrefix}-a-${index}`,
            className: 'ph-md-a',
            href,
            target: '_blank',
            rel: 'noreferrer noopener',
          }, autolink[1]))
          index += autolink[0].length
          continue
        }
      }
      if (/^<br\s*\/?>/i.test(rest)) {
        const length = /^<br\s*\/?>/i.exec(rest)![0].length
        flush()
        nodes.push(h('br', { key: `${keyPrefix}-br-${index}` }))
        index += length
        continue
      }
      // Raw HTML is dropped rather than executed: the text around it stays.
      const garbage = /^(?:<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>)/.exec(rest)
      if (garbage !== null) {
        index += garbage[0].length
        continue
      }
    }

    if ((character === 'h' || character === 'H') && /^https?:\/\//i.test(text.slice(index, index + 8))) {
      const match = /^https?:\/\/[^\s<>"'`]+/i.exec(text.slice(index))!
      let url = match[0]
      while (url.length > 8 && /[.,;:!?)\]]$/.test(url)) url = url.slice(0, -1)
      flush()
      nodes.push(h('a', {
        key: `${keyPrefix}-a-${index}`,
        className: 'ph-md-a',
        href: url,
        target: '_blank',
        rel: 'noreferrer noopener',
      }, url))
      index += url.length
      continue
    }

    if (character === '*' || character === '_' || character === '~') {
      const rest = text.slice(index)
      const previous = index > 0 ? text[index - 1] : ''
      // `_` inside a word is an identifier, not emphasis.
      if (character === '_' && /[0-9A-Za-z]/.test(previous)) {
        buffer += character
        index += 1
        continue
      }
      if (character === '~') {
        const strike = /^~~(?=\S)([\s\S]*?\S)~~/.exec(rest)
        if (strike !== null) {
          flush()
          nodes.push(h('del', { key: `${keyPrefix}-del-${index}` }, ...renderInline(strike[1], `${keyPrefix}-del-${index}`)))
          index += strike[0].length
          continue
        }
      } else {
        const strong = /^(\*\*|__)(?=\S)([\s\S]*?\S)\1/.exec(rest)
        if (strong !== null) {
          flush()
          nodes.push(h('strong', { key: `${keyPrefix}-strong-${index}` }, ...renderInline(strong[2], `${keyPrefix}-strong-${index}`)))
          index += strong[0].length
          continue
        }
        const emphasis = /^([*_])(?=\S)([\s\S]*?\S)\1/.exec(rest)
        if (emphasis !== null) {
          flush()
          nodes.push(h('em', { key: `${keyPrefix}-em-${index}` }, ...renderInline(emphasis[2], `${keyPrefix}-em-${index}`)))
          index += emphasis[0].length
          continue
        }
      }
      buffer += character
      index += 1
      continue
    }

    buffer += character
    index += 1
  }
  flush()
  return nodes
}

/**
 * Split a link destination into a safe href and an optional title.
 * @param raw the text between the parentheses.
 */
function linkTarget(raw: string): { href: string | null; title: string | undefined } {
  const trimmed = raw.trim()
  const titled = /^(\S+)\s+"([^"]*)"$/.exec(trimmed)
  const href = titled !== null ? titled[1] : trimmed
  return { href: safeHref(href), title: titled === null ? undefined : titled[2] }
}

/**
 * Whether a link target may be followed, and what the panel should use.
 * @param raw the destination from the source.
 * @returns the destination, or `null` when it must stay plain text.
 */
function safeHref(raw: string): string | null {
  const href = raw.trim()
  if (href.length === 0) return null
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(href)
  if (scheme === null) {
    // A fragment or an absolute path is harmless; a bare word is not a link.
    return href.startsWith('#') || href.startsWith('/') || href.startsWith('./') || href.startsWith('../')
      ? href
      : null
  }
  const name = scheme[1].toLowerCase()
  return name === 'http' || name === 'https' || name === 'mailto' ? href : null
}
