/**
 * The stacked diff view: one expandable section per changed file, with sticky
 * headers, a unified or two-column layout, and optional line wrapping.
 *
 * The shape follows the reference implementation (t3code): the whole change set
 * is one scroll container rather than a file list plus a separate pane.
 */
import { h } from '../runtime.ts'
import { useState } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import { copyText } from '../hooks.ts'
import { splitPath, truncateStart } from '../hooks.ts'
import type { Translate } from '../i18n.ts'
import { buildSplitRows } from './diff-model.ts'
import type { SplitRow, StackFile } from './diff-model.ts'
import type { DiffFile, DiffHunk, DiffLine } from '../../shared/protocol.ts'

/** Lines one file renders before it stops and says so. */
const MAX_DIFF_LINES = 4000

/** Props of one file section. */
export interface DiffFileSectionProps {
  file: StackFile
  expanded: boolean
  selected: boolean
  layout: 'unified' | 'split'
  wrap: boolean
  t: Translate
  onToggle(): void
  onSelect(next: boolean): void
  /** Report the file whose patch is copied, for the panel's toast. */
  onCopied(path: string): void
}

/** The status letter one file's change deserves. */
function fileBadge(file: StackFile): { letter: string; tone: string } {
  if (file.untracked) return { letter: 'U', tone: 'muted' }
  if (file.oldPath !== null && file.oldPath !== file.path) return { letter: 'R', tone: 'business' }
  if (file.binary) return { letter: 'M', tone: 'warn' }
  if (file.deletions === 0 && file.additions > 0) return { letter: 'A', tone: 'success' }
  if (file.additions === 0 && file.deletions > 0) return { letter: 'D', tone: 'error' }
  return { letter: 'M', tone: 'warn' }
}

/** One file's section. */
export function DiffFileSection(props: DiffFileSectionProps): ReturnType<typeof h> {
  const { file, t } = props
  const parts = splitPath(file.path)
  const badge = fileBadge(file)
  const [copied, setCopied] = useState(false)

  const copy = (event: { stopPropagation(): void }): void => {
    event.stopPropagation()
    void copyText(file.path).then((ok) => {
      if (!ok) return
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      props.onCopied(file.path)
    })
  }

  const header = h('div', {
    className: 'ph-file-head',
    'data-expanded': props.expanded ? 'true' : 'false',
    onClick: props.onToggle,
    role: 'button',
    tabIndex: 0,
    'aria-expanded': props.expanded ? 'true' : 'false',
    'aria-label': props.expanded ? t('gitCollapseFile', { path: file.path }) : t('gitExpandFile', { path: file.path }),
    onKeyDown: (event: { key: string; preventDefault(): void }) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        props.onToggle()
      }
    },
  },
    h('input', {
      type: 'checkbox',
      className: 'ph-file-check',
      checked: props.selected,
      'aria-label': file.path,
      onClick: (event: { stopPropagation(): void }) => event.stopPropagation(),
      onChange: (event: { target: { checked: boolean } }) => props.onSelect(event.target.checked),
    }),
    h('span', { style: { display: 'flex', color: 'var(--dsw-alias-label-tertiary)', transform: props.expanded ? 'rotate(90deg)' : 'none', transition: 'transform .12s' } },
      h(Icon, { name: 'chevron', size: 11 })),
    h('span', { className: 'ph-badge', 'data-tone': badge.tone, 'aria-hidden': 'true' }, badge.letter),
    h('span', { className: 'ph-file-path', title: file.path },
      parts.dir.length > 0
        ? [
            h('span', { className: 'ph-file-dir', key: 'dir' }, parts.dir),
            h('span', { className: 'ph-file-sep', key: 'sep' }, '/'),
          ]
        : null,
      h('span', { className: 'ph-file-name' }, parts.name)),
    h(Counts, { additions: file.additions, deletions: file.deletions }),
    h('button', {
      type: 'button',
      className: 'ph-icon-button ph-file-copy',
      title: copied ? t('gitCopied') : t('gitCopyPath'),
      'aria-label': t('gitCopyPath'),
      onClick: copy,
    }, h(Icon, { name: copied ? 'check' : 'copy', size: 12 })))

  return h('section', { className: 'ph-file', 'data-path': file.path },
    header,
    props.expanded
      ? h('div', { className: 'ph-file-body' },
          h('div', { className: 'ph-diff', 'data-wrap': props.wrap ? 'true' : 'false' }, body(props)))
      : null)
}

/** One file's patch body, or the reason it has none. */
function body(props: DiffFileSectionProps): Array<ReturnType<typeof h> | null> {
  const { file, t } = props
  if (file.binary) return [h('div', { key: 'bin', className: 'ph-notice' }, t('gitBinary'))]
  if (file.whitespaceOnly) return [h('div', { key: 'ws', className: 'ph-notice' }, t('gitWhitespaceOnly'))]
  if (file.file === null || file.file.hunks.length === 0) {
    return [h('div', { key: 'none', className: 'ph-notice' }, t('gitNoText'))]
  }
  const blocks: Array<ReturnType<typeof h> | null> = []
  let budget = MAX_DIFF_LINES
  for (const [index, hunk] of file.file.hunks.entries()) {
    if (budget <= 0) break
    blocks.push(h(HunkBlock, {
      key: `hunk-${index}`,
      hunk,
      layout: props.layout,
      wrap: props.wrap,
      budget: () => budget,
      spend: (count: number) => {
        budget -= count
      },
    }))
  }
  if (budget <= 0) blocks.push(h('div', { key: 'truncated', className: 'ph-notice' }, t('gitTruncated')))
  if (file.truncated) blocks.push(h('div', { key: 'cut', className: 'ph-notice' }, t('gitTooLarge')))
  return blocks
}

/** Props of one hunk block. */
interface HunkBlockProps {
  hunk: DiffHunk
  layout: 'unified' | 'split'
  wrap: boolean
  budget(): number
  spend(count: number): void
}

/** One hunk, rendered in the chosen layout. */
function HunkBlock(props: HunkBlockProps): ReturnType<typeof h> {
  const { hunk } = props
  if (props.layout === 'split') {
    const rows = buildSplitRows(hunk)
    const visible = rows.slice(0, Math.max(0, props.budget()))
    props.spend(visible.length)
    return h('div', { className: 'ph-split' },
      visible.map((row, index) => h(SplitRowView, { key: index, row })))
  }
  const visible = hunk.lines.slice(0, Math.max(0, props.budget()))
  props.spend(visible.length)
  return h('div', null,
    h('div', { className: 'ph-hunk-head' }, hunk.header),
    visible.map((line, index) => h(UnifiedRow, { key: index, line })))
}

/** One unified line. */
function UnifiedRow(props: { line: DiffLine }): ReturnType<typeof h> {
  const { line } = props
  if (line.type === 'meta') return h('div', { className: 'ph-line', 'data-kind': 'meta' }, h('span', { className: 'ph-code' }, line.text))
  return h('div', { className: 'ph-line', 'data-kind': line.type },
    h('span', { className: 'ph-num' }, line.oldNumber === null ? '' : String(line.oldNumber)),
    h('span', { className: 'ph-num' }, line.newNumber === null ? '' : String(line.newNumber)),
    h('span', { className: 'ph-sign' }, line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '),
    h('span', { className: 'ph-code' }, line.text.length === 0 ? ' ' : line.text))
}

/** One two-column row. */
function SplitRowView(props: { row: SplitRow }): ReturnType<typeof h> {
  const { row } = props
  return h('div', { style: { display: 'contents' } },
    h('div', { className: 'ph-side', 'data-kind': row.left?.type ?? 'empty', 'data-empty': row.left === null ? 'true' : 'false' },
      h('span', { className: 'ph-num' }, row.left?.oldNumber === null || row.left === null ? '' : String(row.left.oldNumber)),
      h('span', { className: 'ph-code' }, row.left === null ? '' : row.left.text.length === 0 ? ' ' : row.left.text)),
    h('div', { className: 'ph-side', 'data-kind': row.right?.type ?? 'empty', 'data-empty': row.right === null ? 'true' : 'false' },
      h('span', { className: 'ph-num' }, row.right?.newNumber === null || row.right === null ? '' : String(row.right.newNumber)),
      h('span', { className: 'ph-code' }, row.right === null ? '' : row.right.text.length === 0 ? ' ' : row.right.text)))
}

/**
 * A read-only patch body for a commit, where there is nothing to select.
 * @param props the parsed patch and how to render it.
 */
export function StaticPatch(props: { file: DiffFile; t: Translate; wrap?: boolean }): ReturnType<typeof h> {
  const { file, t } = props
  if (file.binary) return h('div', { className: 'ph-notice' }, t('gitBinary'))
  if (file.hunks.length === 0) return h('div', { className: 'ph-notice' }, t('gitNoText'))
  let budget = MAX_DIFF_LINES
  const blocks = file.hunks.map((hunk, index) => h(HunkBlock, {
    key: index,
    hunk,
    layout: 'unified',
    wrap: props.wrap === true,
    budget: () => budget,
    spend: (count: number) => {
      budget -= count
    },
  }))
  return h('div', { className: 'ph-diff', 'data-wrap': props.wrap === true ? 'true' : 'false' }, blocks)
}

/** A compact `+n −m` pair. */
export function Counts(props: { additions?: number; deletions?: number }): ReturnType<typeof h> | null {  const additions = Number(props.additions) || 0
  const deletions = Number(props.deletions) || 0
  if (additions === 0 && deletions === 0) return null
  return h('span', { className: 'ph-counts' },
    additions > 0 ? h('span', { className: 'ph-add' }, `+${additions}`) : null,
    deletions > 0 ? h('span', { className: 'ph-del' }, `−${deletions}`) : null)
}

/** A stacked bar of added and removed lines, so the size of a change is visible at a glance. */
export function DiffBar(props: { additions: number; deletions: number }): ReturnType<typeof h> | null {
  const additions = Number(props.additions) || 0
  const deletions = Number(props.deletions) || 0
  const total = additions + deletions
  if (total === 0) return null
  const added = Math.max(2, Math.round((additions / total) * 100))
  return h('span', { className: 'ph-bar', 'aria-hidden': 'true' },
    h('span', { className: 'ph-bar-add', style: { width: `${added}%` } }),
    h('span', { className: 'ph-bar-del', style: { width: `${100 - added}%` } }))
}

/** The diff layout switch, wrap switch, and whitespace switch. */
export interface DiffControlsProps {
  layout: 'unified' | 'split'
  wrap: boolean
  hideWhitespace: boolean
  t: Translate
  onLayout(next: 'unified' | 'split'): void
  onWrap(next: boolean): void
  onWhitespace(next: boolean): void
  onExpandAll(): void
  onCollapseAll(): void
}

/** The diff toolbar controls. */
export function DiffControls(props: DiffControlsProps): ReturnType<typeof h> {
  const { t } = props
  return h('div', { className: 'ph-row', style: { gap: '2px' } },
    h('button', {
      type: 'button',
      className: 'ph-icon-button',
      title: t('gitExpandAll'),
      'aria-label': t('gitExpandAll'),
      onClick: props.onExpandAll,
    }, h(Icon, { name: 'rows', size: 13 })),
    h('button', {
      type: 'button',
      className: 'ph-icon-button',
      title: t('gitCollapseAll'),
      'aria-label': t('gitCollapseAll'),
      onClick: props.onCollapseAll,
    }, h(Icon, { name: 'tree', size: 13 })),
    h('span', { style: { width: '1px', height: '14px', background: 'var(--dsw-alias-border-l3)', margin: '0 2px' } }),
    h('button', {
      type: 'button',
      className: 'ph-icon-button',
      title: t('gitLayoutUnified'),
      'aria-label': t('gitLayoutUnified'),
      'aria-pressed': props.layout === 'unified' ? 'true' : 'false',
      style: props.layout === 'unified' ? pressedStyle : undefined,
      onClick: () => props.onLayout('unified'),
    }, h(Icon, { name: 'rows', size: 13 })),
    h('button', {
      type: 'button',
      className: 'ph-icon-button',
      title: t('gitLayoutSplit'),
      'aria-label': t('gitLayoutSplit'),
      'aria-pressed': props.layout === 'split' ? 'true' : 'false',
      style: props.layout === 'split' ? pressedStyle : undefined,
      onClick: () => props.onLayout('split'),
    }, h(Icon, { name: 'columns', size: 13 })),
    h('button', {
      type: 'button',
      className: 'ph-icon-button',
      title: t('gitWrap'),
      'aria-label': t('gitWrap'),
      'aria-pressed': props.wrap ? 'true' : 'false',
      style: props.wrap ? pressedStyle : undefined,
      onClick: () => props.onWrap(!props.wrap),
    }, h(Icon, { name: 'wrap', size: 13 })),
    h('button', {
      type: 'button',
      className: 'ph-icon-button',
      title: t('gitWhitespace'),
      'aria-label': t('gitWhitespace'),
      'aria-pressed': props.hideWhitespace ? 'true' : 'false',
      style: props.hideWhitespace ? pressedStyle : undefined,
      onClick: () => props.onWhitespace(!props.hideWhitespace),
    }, h(Icon, { name: 'pilcrow', size: 13 })))
}

const pressedStyle: Record<string, string> = {
  background: 'var(--dsw-alias-bg-layer-2)',
  color: 'var(--dsw-alias-label-primary)',
}

/** The `…` start-truncated path used by narrow rows. */
export { truncateStart, splitPath }
