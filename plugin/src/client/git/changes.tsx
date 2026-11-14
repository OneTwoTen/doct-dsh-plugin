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
  const [working, setWorking] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState<{ path: string; untracked: boolean } | null>(null)
  const known = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    writePreferences({ layout, wrap, hideWhitespace, scope })
  }, [layout, wrap, hideWhitespace, scope])

  const signature = files.map((file) => file.path).join('\n')

  /** Whether the index already holds this file's change. */
  const stagedPaths = useMemo(
    () => new Map(files.map((file) => [file.path, file.staged === true])),
    [files],
  )

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

  /**
   * Stage, unstage, or discard exactly one file.
   *
   * The working tree stays authoritative: every action reloads the overview and
   * the diff so a partially staged file cannot leave the two views disagreeing.
   */
  const runFileAction = async (kind: 'stage' | 'unstage' | 'discard', path: string, untracked: boolean): Promise<void> => {
    if (working !== null) return
    setWorking(path)
    try {
      const target = { sessionId: props.sessionId, cwd: props.cwd || undefined }
      if (kind === 'stage') await api.stage({ ...target, paths: [path] })
      else if (kind === 'unstage') await api.unstage({ ...target, paths: [path] })
      else {
        // A staged copy would otherwise survive the work-tree restore, leaving
        // the file staged after it was "discarded".
        if (!untracked) await api.unstage({ ...target, paths: [path] })
        await api.discard({ ...target, paths: [path], includeUntracked: untracked })
      }
      const key = kind === 'stage' ? 'gitStageDone' : kind === 'unstage' ? 'gitUnstageDone' : 'gitDiscardDone'
      props.onToast(t(key, { path }), '', 'success')
      setConfirmDiscard(null)
      props.onRefresh()
    } catch (failure) {
      props.onToast(t('gitActionFailed'), messageOf(failure), 'error')
    } finally {
      setWorking(null)
    }
  }

  const expandAll = (): void => setExpanded(new Set(stack.map((file) => stackKey(file))))
  const collapseAll = (): void => setExpanded(new Set())

  const baseLabel = overview.branchChanges?.baseRef ?? overview.repo.defaultBranch ?? ''
  const totals = scope === 'branch'
    ? { insertions: overview.branchChanges?.insertions ?? 0, deletions: overview.branchChanges?.deletions ?? 0 }
    : { insertions: overview.stats.additions, deletions: overview.stats.deletions }
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
    h('span', { className: 'ph-dim ph-tiny' }, t('gitFilesMany', { count: files.length })),
    h(Counts, { additions: totals.insertions, deletions: totals.deletions }),
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
          staged: stagedPaths.get(file.path) === true,
          actionBusy: working === file.path,
          onToggle: () => toggleExpanded(key),
          onSelect: (next: boolean) => toggleSelected(file.path, next),
          onCopied: (path: string) => props.onToast(t('gitCopied'), path, 'success'),
          onStage: scope === 'working' ? () => void runFileAction('stage', file.path, file.untracked) : undefined,
          onUnstage: scope === 'working' ? () => void runFileAction('unstage', file.path, file.untracked) : undefined,
          onDiscard: scope === 'working'
            ? () => setConfirmDiscard({ path: file.path, untracked: file.untracked })
            : undefined,
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
      })),
    confirmDiscard === null
      ? null
      : h('div', { className: 'ph-overlay', role: 'presentation' },
          h('div', { className: 'ph-dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': t('gitDiscard') },
            h('div', { className: 'ph-dialog-title' }, t('gitDiscard')),
            h('p', { className: 'ph-dialog-body' },
              t(confirmDiscard.untracked ? 'gitDiscardUntracked' : 'gitDiscardConfirm', { path: confirmDiscard.path })),
            h('div', { className: 'ph-dialog-actions' },
              h('button', {
                type: 'button',
                className: 'ph-button',
                disabled: working !== null,
                onClick: () => setConfirmDiscard(null),
              }, t('gitDefaultAbort')),
              h('button', {
                type: 'button',
                className: 'ph-primary ph-danger',
                disabled: working !== null,
                onClick: () => {
                  const target = confirmDiscard
                  void runFileAction('discard', target.path, target.untracked)
                },
              }, working === confirmDiscard.path ? t('gitDiscardBusy') : t('gitDiscard'))))))
}

/** The clean-tree placeholder. */
function EmptyChanges(props: { t: Translate }): ReturnType<typeof h> {
  return h('div', { className: 'ph-empty' },
    h('span', { className: 'ph-empty-icon' }, h(Icon, { name: 'check', size: 26 })),
    h('span', { className: 'ph-empty-title' }, props.t('gitClean')),
    h('span', { className: 'ph-empty-hint' }, props.t('gitCleanHint')))
}
