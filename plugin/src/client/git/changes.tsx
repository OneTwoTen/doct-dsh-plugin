/**
 * The Changes tab: a stacked diff over every changed file, with a commit box
 * docked at the bottom.
 *
 * File checkboxes are the commit scope, so selecting a subset and committing it
 * is one gesture rather than a separate dialog.
 */
import { h, useEffect, useMemo, useRef, useState } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import { useLoader } from '../hooks.ts'
import type { Translate } from '../i18n.ts'
import type { GitApi } from '../api.ts'
import { messageOf } from '../api.ts'
import { buildStack, stackKey } from './diff-model.ts'
import { Counts, DiffControls, DiffFileSection } from './diff-view.tsx'
import { CommitComposer } from './commit-composer.tsx'
import type { CommitRequest } from './commit-composer.tsx'
import type { GitOverview } from '../../shared/protocol.ts'

/** The view's props. */
export interface ChangesViewProps {
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  overview: GitOverview
  revision: number
  busy: boolean
  onCommit(request: CommitRequest): void
  onToast(title: string, description: string, tone: 'error' | 'success'): void
  onRefresh(): void
}

/** The stored view preferences. */
interface DiffPreferences {
  layout: 'unified' | 'split'
  wrap: boolean
  hideWhitespace: boolean
  scope: 'working' | 'branch'
}

const PREFERENCES_KEY = 'personal-hub:diff-preferences'

function readPreferences(): DiffPreferences {
  const fallback: DiffPreferences = { layout: 'unified', wrap: false, hideWhitespace: false, scope: 'working' }
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw) as Partial<DiffPreferences>
    return {
      layout: parsed.layout === 'split' ? 'split' : 'unified',
      wrap: parsed.wrap === true,
      hideWhitespace: parsed.hideWhitespace === true,
      scope: parsed.scope === 'branch' ? 'branch' : 'working',
    }
  } catch {
    return fallback
  }
}

function writePreferences(value: DiffPreferences): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(value))
  } catch {
    // A storage quota or a private window simply keeps the defaults.
  }
}

/** The Changes tab. */
export function ChangesView(props: ChangesViewProps): ReturnType<typeof h> {
  const { t, api, overview } = props
  const files = overview.files
  const initial = useMemo(readPreferences, [])
  const [layout, setLayout] = useState<'unified' | 'split'>(initial.layout)
  const [wrap, setWrap] = useState(initial.wrap)
  const [hideWhitespace, setHideWhitespace] = useState(initial.hideWhitespace)
  const [scope, setScope] = useState<'working' | 'branch'>(initial.scope)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [selection, setSelection] = useState<Set<string>>(() => new Set())
  const known = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    writePreferences({ layout, wrap, hideWhitespace, scope })
  }, [layout, wrap, hideWhitespace, scope])

  const signature = files.map((file) => file.path).join('\n')

  // Reconcile the commit scope and the expanded set when the change set moves:
  // new files arrive selected, a file the user excluded stays excluded, and a
  // file that disappeared leaves the set.
  useEffect(() => {
    const paths = files.map((file) => file.path)
    setSelection((previous) => {
      const next = new Set<string>()
      for (const path of paths) {
        if (!known.current.has(path) || previous.has(path)) next.add(path)
      }
      return next
    })
    setExpanded((previous) => {
      const next = new Set<string>()
      for (const path of paths) {
        if (known.current.has(path) ? previous.has(path) : (!initialized.current && paths.length <= 3)) next.add(path)
      }
      return next
    })
    known.current = new Set(paths)
    initialized.current = true
    // The signature is the stable identity of the change set.
  }, [signature])

  const loaded = useLoader(
    () => api.diffAll({
      sessionId: props.sessionId,
      cwd: props.cwd || undefined,
      scope,
      includeUntracked: true,
    }),
    [props.sessionId, props.cwd, scope, props.revision],
  )

  const stack = useMemo(
    () => buildStack(loaded.value, hideWhitespace),
    [loaded.value, hideWhitespace],
  )

  const toggleExpanded = (key: string): void => {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelected = (path: string, next: boolean): void => {
    setSelection((previous) => {
      const value = new Set(previous)
      if (next) value.add(path)
      else value.delete(path)
      return value
    })
  }

  const selectAll = (next: boolean): void => {
    setSelection(next ? new Set(files.map((file) => file.path)) : new Set())
  }

  const expandAll = (): void => setExpanded(new Set(stack.map((file) => stackKey(file))))
  const collapseAll = (): void => setExpanded(new Set())

  const baseLabel = overview.branchChanges?.baseRef ?? overview.repo.defaultBranch ?? ''
  const toolbar = h('div', { className: 'ph-stack-toolbar' },
    h('div', { style: { display: 'flex', borderRadius: '999px', border: '1px solid var(--dsw-alias-border-l1)', overflow: 'hidden' } },
      h('button', {
        type: 'button',
        className: 'ph-filter',
        style: { border: 0, borderRadius: 0 },
        'aria-pressed': scope === 'working' ? 'true' : 'false',
        onClick: () => setScope('working'),
      }, t('gitScopeWorking')),
      h('button', {
        type: 'button',
        className: 'ph-filter',
        style: { border: 0, borderRadius: 0 },
        'aria-pressed': scope === 'branch' ? 'true' : 'false',
        onClick: () => setScope('branch'),
      }, t('gitScopeBranch'))),
    baseLabel.length > 0 && scope === 'branch'
      ? h('span', { className: 'ph-dim ph-tiny' }, t('gitScopeLabel', { base: baseLabel }))
      : null,
    h('span', { className: 'ph-spacer' }),
    h('button', {
      type: 'button',
      className: 'ph-icon-button',
      title: t('gitRefresh'),
      'aria-label': t('gitRefresh'),
      'data-busy': loaded.status === 'loading' ? 'true' : 'false',
      onClick: props.onRefresh,
    }, h(Icon, { name: 'refresh', size: 13 })),
    h(DiffControls, {
      t,
      layout,
      wrap,
      hideWhitespace,
      onLayout: setLayout,
      onWrap: setWrap,
      onWhitespace: setHideWhitespace,
      onExpandAll: expandAll,
      onCollapseAll: collapseAll,
    }))

  let content: unknown
  if (files.length === 0 && scope === 'working') {
    content = h(EmptyChanges, { t })
  } else if (loaded.status === 'error' && loaded.value === undefined) {
    content = h('div', { className: 'ph-error' },
      h('span', { className: 'ph-error-title' }, h(Icon, { name: 'alert', size: 14 }), t('gitReadError')),
      h('span', null, messageOf(loaded.error)),
      h('button', { type: 'button', className: 'ph-button', onClick: props.onRefresh }, t('gitRetry')))
  } else if (loaded.value === undefined) {
    content = h('div', { className: 'ph-loading' }, h('span', { className: 'ph-spinner' }), t('gitLoading'))
  } else if (stack.length === 0) {
    content = h(EmptyChanges, { t })
  } else {
    content = [
      loaded.value.truncated
        ? h('div', { key: 'truncated', className: 'ph-notice' }, t('gitDiffTooLarge'))
        : null,
      ...stack.map((file) => {
        const key = stackKey(file)
        return h(DiffFileSection, {
          key,
          file,
          t,
          layout,
          wrap,
          expanded: expanded.has(key),
          selected: selection.has(file.path),
          onToggle: () => toggleExpanded(key),
          onSelect: (next: boolean) => toggleSelected(file.path, next),
          onCopied: (path: string) => props.onToast(t('gitCopied'), path, 'success'),
        })
      }),
    ]
  }

  return h('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' } },
    toolbar,
    h('div', { className: 'ph-body', style: { flex: '1 1 auto' } }, content),
    h('div', { style: { flex: 'none' } },
      h(CommitComposer, {
        api,
        t,
        sessionId: props.sessionId,
        cwd: props.cwd,
        files,
        selected: selection,
        busy: props.busy,
        onSelectAll: selectAll,
        onToggleFile: toggleSelected,
        onCommit: props.onCommit,
        onToast: props.onToast,
      })))
}

/** The clean-tree placeholder. */
function EmptyChanges(props: { t: Translate }): ReturnType<typeof h> {
  return h('div', { className: 'ph-empty' },
    h('span', { className: 'ph-empty-icon' }, h(Icon, { name: 'check', size: 26 })),
    h('span', { className: 'ph-empty-title' }, props.t('gitClean')),
    h('span', { className: 'ph-empty-hint' }, props.t('gitCleanHint')))
}

/** A compact summary of the working tree, for the header. */
export function ChangesSummary(props: {
  t: Translate
  stats: GitOverview['stats']
  branchChanges: GitOverview['branchChanges']
  onClick?(): void
}): ReturnType<typeof h> {
  const totals = props.branchChanges !== null && (props.branchChanges.insertions > 0 || props.branchChanges.deletions > 0)
    ? props.branchChanges
    : { baseRef: null, insertions: props.stats.additions, deletions: props.stats.deletions }
  const base = totals.baseRef === null ? props.t('gitUncommitted') : props.t('gitScopeLabel', { base: totals.baseRef })
  return h('button', {
    type: 'button',
    className: 'ph-button',
    style: { width: '100%', justifyContent: 'flex-start', padding: '5px 8px' },
    onClick: props.onClick,
  },
    h(Icon, { name: 'fileDiff', size: 12 }),
    h('span', null, props.t('gitChanges')),
    h('span', { className: 'ph-dim ph-tiny' }, base),
    h('span', { className: 'ph-spacer' }),
    h(Counts, { additions: totals.insertions, deletions: totals.deletions }))
}
