/**
 * The worktree manager: every checkout of the repository, with the actions that
 * make worktrees usable from the panel instead of only from the New Session row.
 *
 * A checkout can be created here, a chat can move into one (or back to the
 * project), and a checkout can be removed or its stale registration pruned.
 */
import { h, useEffect, useState } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import { useLoader, relativeTime, splitPath, copyText } from '../hooks.ts'
import type { Translate } from '../i18n.ts'
import type { GitApi } from '../api.ts'
import { messageOf } from '../api.ts'
import { Empty, Failure, Loading } from './common.tsx'
import type { WorktreeInfo, WorktreeState } from '../../shared/protocol.ts'

/** Props of the worktree manager. */
export interface WorktreesViewProps {
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  revision: number
  /** Start a chat in a checkout, when the slot provides the capability. */
  newChat?: (path: string) => Promise<unknown>
  onToast(title: string, description: string, tone: 'error' | 'success' | 'info'): void
  /** Refresh the panel's overview after the checkout the Session uses changed. */
  onChanged(): void
}

/** The worktree manager. */
export function WorktreesView(props: WorktreesViewProps): ReturnType<typeof h> {
  const { t, api } = props
  const sessionId = typeof props.sessionId === 'string' ? props.sessionId : ''
  const [creating, setCreating] = useState(false)
  const [bases, setBases] = useState<WorktreeState | undefined>(undefined)
  const [name, setName] = useState('')
  const [base, setBase] = useState('')
  const [source, setSource] = useState<'local' | 'remote'>('local')
  const [switchHere, setSwitchHere] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)
  const [deleteBranch, setDeleteBranch] = useState(false)
  const [force, setForce] = useState(false)
  const [pruning, setPruning] = useState(false)
  const [copied, setCopied] = useState('')

  const state = useLoader(
    () => api.worktrees({ sessionId: sessionId || undefined, cwd: props.cwd || undefined }),
    [sessionId, props.cwd, props.revision],
  )

  useEffect(() => {
    if (!creating) return undefined
    let alive = true
    setBases(undefined)
    api.worktreeState({ sessionId: sessionId || undefined, cwd: props.cwd || undefined })
      .then((value) => {
        if (!alive) return
        setBases(value)
        setBase((current) => current.length > 0 ? current : value.bases?.defaultBase ?? '')
        setSource(value.sourceDefault === 'remote' ? 'remote' : 'local')
      })
      .catch(() => {
        if (alive) setBases(undefined)
      })
    return () => {
      alive = false
    }
  }, [creating, api, sessionId, props.cwd])

  const reload = (): void => props.onChanged()

  const create = async (): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      const answer = await api.worktreeAdd({
        sessionId: sessionId || undefined,
        cwd: props.cwd || undefined,
        name: name.trim().length > 0 ? name.trim() : undefined,
        base: base.length > 0 ? base : undefined,
        source,
        switch: sessionId.length > 0 ? switchHere : false,
      })
      setCreating(false)
      setName('')
      props.onToast(
        answer.switched ? t('wtCreatedSwitched', { branch: answer.worktree.branch }) : t('wtCreatedNotice', { branch: answer.worktree.branch }),
        '',
        'success',
      )
      setName('')
      setBases(undefined)
      // The list and the header both read the new checkout.
      props.onChanged()
    } catch (failure) {
      setError(`${t('wtAddFailed')}: ${messageOf(failure)}`)
    } finally {
      setBusy(false)
    }
  }

  const switchTo = async (entry: WorktreeInfo): Promise<void> => {
    if (sessionId.length === 0) {
      props.onToast(t('wtError'), t('wtNoSession'), 'info')
      return
    }
    setError('')
    try {
      const answer = await api.worktreeSwitch({ sessionId, path: entry.path })
      props.onToast(t('wtSwitched', { branch: answer.branch ?? entry.branch ?? entry.path }), '', 'success')
      reload()
    } catch (failure) {
      props.onToast(t('wtError'), messageOf(failure), 'error')
    }
  }

  const openChat = async (entry: WorktreeInfo): Promise<void> => {
    if (typeof props.newChat !== 'function') {
      props.onToast(t('wtError'), t('gitSessionUnavailable'), 'error')
      return
    }
    try {
      await props.newChat(entry.path)
      props.onToast(t('wtOpenChat'), entry.branch ?? entry.path, 'success')
    } catch (failure) {
      props.onToast(t('wtError'), messageOf(failure), 'error')
    }
  }

  const remove = async (entry: WorktreeInfo): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      await api.worktreeRemovePath({
        sessionId: sessionId || undefined,
        cwd: props.cwd || undefined,
        path: entry.path,
        deleteBranch,
        force,
      })
      props.onToast(t('wtRemovedNotice', { branch: entry.branch ?? entry.path }), '', 'success')
      setRemoving(null)
      setDeleteBranch(false)
      setForce(false)
      reload()
    } catch (failure) {
      setError(`${t('wtError')}: ${messageOf(failure)}`)
    } finally {
      setBusy(false)
    }
  }

  const prune = async (): Promise<void> => {
    setPruning(true)
    setError('')
    try {
      const answer = await api.worktreePrune({ sessionId: sessionId || undefined, cwd: props.cwd || undefined })
      props.onToast(
        answer.pruned > 0 ? t('wtPruned', { count: answer.pruned }) : t('wtPrunedNone'),
        '',
        'success',
      )
      reload()
    } catch (failure) {
      setError(`${t('wtError')}: ${messageOf(failure)}`)
    } finally {
      setPruning(false)
    }
  }

  const copy = async (path: string): Promise<void> => {
    const ok = await copyText(path)
    if (!ok) return
    setCopied(path)
    setTimeout(() => setCopied(''), 1500)
    props.onToast(t('gitCopied'), path, 'success')
  }

  const toolbar = h('div', { className: 'ph-toolbar' },
    h(Icon, { name: 'tree', size: 13 }),
    h('span', { className: 'ph-toolbar-title' }, t('wtManagerTitle')),
    h('span', { className: 'ph-spacer' }),
    h('button', {
      type: 'button',
      className: 'ph-icon-button',
      title: t('wtPruneHint'),
      'aria-label': t('wtPrune'),
      disabled: pruning,
      onClick: () => void prune(),
    }, h(Icon, { name: 'refresh', size: 13 })),
    h('button', {
      type: 'button',
      className: 'ph-button',
      disabled: creating,
      onClick: () => {
        setCreating((value) => !value)
        setError('')
      },
    }, h(Icon, { name: 'branchPlus', size: 12 }), t('wtNew')))

  const createCard = creating
    ? h('div', { className: 'ph-card', style: { margin: '8px 10px' } },
        h('div', { className: 'ph-card-title' }, h(Icon, { name: 'branchPlus', size: 12 }), t('wtCreateTitle')),
        h('p', { className: 'ph-hint' }, t('wtCreateHint')),
        h('label', { className: 'ph-field' },
          h('span', { className: 'ph-field-label' }, t('wtName')),
          h('input', {
            className: 'ph-input',
            value: name,
            placeholder: t('wtNamePlaceholder'),
            spellcheck: false,
            disabled: busy,
            onInput: (event: { target: { value: string } }) => setName(event.target.value),
            onChange: (event: { target: { value: string } }) => setName(event.target.value),
            onKeyDown: (event: { key: string }) => {
              if (event.key === 'Enter' && !busy) void create()
            },
          })),
        h('label', { className: 'ph-field' },
          h('span', { className: 'ph-field-label' }, t('wtBase')),
          h('select', {
            className: 'ph-select',
            value: base,
            disabled: busy || bases === undefined,
            onChange: (event: { target: { value: string } }) => setBase(event.target.value),
          },
            h('option', { value: '' }, bases?.bases?.defaultBase ?? t('wtLoadBases')),
            (source === 'remote' ? bases?.bases?.remote ?? [] : bases?.bases?.local ?? []).map((item) => h('option', {
              key: `${source}:${'branch' in item ? item.branch : item.name}`,
              value: 'branch' in item ? item.branch : item.name,
            }, item.name)))),
        (bases?.bases?.remote ?? []).length === 0
          ? null
          : h('div', { className: 'ph-field' },
              h('span', { className: 'ph-field-label' }, t('wtSource')),
              h('div', { style: { display: 'inline-flex', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '7px', overflow: 'hidden' } },
                (['local', 'remote'] as const).map((kind) => h('button', {
                  key: kind,
                  type: 'button',
                  className: 'ph-filter',
                  style: { border: 0, borderRadius: 0 },
                  'aria-pressed': source === kind ? 'true' : 'false',
                  disabled: busy,
                  onClick: () => {
                    setSource(kind)
                    setBase('')
                  },
                }, kind === 'remote' ? t('wtRemote') : t('wtLocal'))))),
        sessionId.length === 0
          ? h('p', { className: 'ph-hint' }, t('wtNoSession'))
          : h('label', { className: 'ph-check-row' },
              h('input', {
                type: 'checkbox',
                checked: switchHere,
                disabled: busy,
                onChange: (event: { target: { checked: boolean } }) => setSwitchHere(event.target.checked),
              }),
              h('span', null, t('wtSwitchThisChat'))),
        error.length > 0 ? h('p', { className: 'ph-error-text' }, error) : null,
        h('div', { className: 'ph-dialog-actions' },
          h('button', {
            type: 'button',
            className: 'ph-button',
            disabled: busy,
            onClick: () => {
              setCreating(false)
              setError('')
            },
          }, t('wtCancel')),
          h('button', {
            type: 'button',
            className: 'ph-primary',
            disabled: busy || bases === undefined,
            onClick: () => void create(),
          }, busy ? t('wtCreating') : t('wtCreate'))))
    : null

  let body: unknown
  if (state.status === 'error' && state.value === undefined) {
    body = h(Failure, { error: state.error, title: t('wtLoadError'), retryLabel: t('gitRetry'), onRetry: reload })
  } else if (state.value === undefined) {
    body = h(Loading, { label: t('gitLoading') })
  } else if (state.value.worktrees.length === 0) {
    body = h(Empty, { icon: 'tree', title: t('wtEmpty'), hint: t('wtEmptyHint') })
  } else {
    body = state.value.worktrees.map((entry) => h(WorktreeRow, {
      key: entry.path,
      t,
      entry,
      main: entry.path === state.value?.root,
      sessionId,
      busy,
      copied: copied === entry.path,
      removing: removing === entry.path,
      deleteBranch,
      force,
      onCopy: () => void copy(entry.path),
      onSwitch: () => void switchTo(entry),
      onOpenChat: typeof props.newChat === 'function' ? () => void openChat(entry) : undefined,
      onRemove: () => {
        setRemoving(entry.path)
        setDeleteBranch(false)
        setForce(false)
        setError('')
      },
      onCancelRemove: () => setRemoving(null),
      onDeleteBranch: (next: boolean) => setDeleteBranch(next),
      onForce: (next: boolean) => setForce(next),
      onConfirmRemove: () => void remove(entry),
    }))
  }

  return h('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto' } },
    toolbar,
    createCard,
    error.length > 0 && !creating
      ? h('div', { className: 'ph-error' },
          h('span', { className: 'ph-error-title' }, h(Icon, { name: 'alert', size: 13 }), t('wtError')),
          h('span', null, error))
      : null,
    h('div', { className: 'ph-body', style: { flex: '1 1 auto' } },
      h('p', { className: 'ph-hint', style: { padding: '8px 10px 0' } }, t('wtManagerHint')),
      body))
}

/** Props of one worktree row. */
interface WorktreeRowProps {
  t: Translate
  entry: WorktreeInfo
  main: boolean
  sessionId: string
  busy: boolean
  copied: boolean
  removing: boolean
  deleteBranch: boolean
  force: boolean
  onCopy(): void
  onSwitch(): void
  onOpenChat?: () => void
  onRemove(): void
  onCancelRemove(): void
  onDeleteBranch(next: boolean): void
  onForce(next: boolean): void
  onConfirmRemove(): void
}

/** One checkout row. */
export function WorktreeRow(props: WorktreeRowProps): ReturnType<typeof h> {
  const { t, entry } = props
  const parts = splitPath(entry.path)
  const label = entry.branch ?? parts.name
  const dirty = entry.changedFiles !== null && entry.changedFiles > 0
  return h('section', { className: 'ph-file', 'data-path': entry.path },
    h('div', { className: 'ph-file-head', style: { cursor: 'default' } },
      h('span', { style: { display: 'flex', color: 'var(--dsw-alias-label-tertiary)' } },
        h(Icon, { name: props.main ? 'folder' : 'branch', size: 13 })),
      h('span', { className: 'ph-file-path', title: entry.path },
        h('span', { className: 'ph-file-name' }, label)),
      entry.current ? h('span', { className: 'ph-chip', 'data-tone': 'success' }, t('wtCurrent')) : null,
      props.main ? h('span', { className: 'ph-chip' }, t('wtMain')) : null,
      entry.detached ? h('span', { className: 'ph-chip', 'data-tone': 'warn' }, t('wtDetached')) : null,
      entry.locked ? h('span', { className: 'ph-chip', 'data-tone': 'warn' }, t('wtLocked')) : null,
      entry.prunable ? h('span', { className: 'ph-chip', 'data-tone': 'error' }, t('wtPrunable')) : null,
      dirty ? h('span', { className: 'ph-chip', 'data-tone': 'warn' }, t('wtDirty', { count: entry.changedFiles ?? 0 })) : null,
      !dirty && entry.changedFiles === 0 ? h('span', { className: 'ph-chip' }, t('wtClean')) : null,
      h('span', { className: 'ph-spacer' }),
      h('button', {
        type: 'button',
        className: 'ph-icon-button',
        title: props.copied ? t('gitCopied') : t('gitCopyPath'),
        'aria-label': t('gitCopyPath'),
        onClick: props.onCopy,
      }, h(Icon, { name: props.copied ? 'check' : 'copy', size: 12 }))),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', padding: '5px 10px 8px' } },
      h('span', { className: 'ph-mono ph-tiny ph-dim ph-ellipsis', title: entry.path }, entry.path),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' } },
        entry.sessionId !== null
          ? h('span', { className: 'ph-chip ph-mono' },
              t(entry.sessionId === props.sessionId ? 'wtThisChat' : 'wtOtherChat', { id: entry.sessionId.slice(0, 8) }))
          : null,
        entry.createdAt === null ? null : h('span', { className: 'ph-dim ph-tiny' }, t('wtCreatedAt', { when: relativeTime(entry.createdAt) })),
        h('span', { className: 'ph-spacer' }),
        entry.current || entry.prunable
          ? null
          : h('button', {
              type: 'button',
              className: 'ph-button',
              disabled: props.busy || props.sessionId.length === 0,
              title: props.sessionId.length === 0 ? t('wtNoSession') : t('wtSwitchThisChat'),
              onClick: props.onSwitch,
            }, h(Icon, { name: 'branch', size: 11 }), t('wtSwitchHere')),
        props.onOpenChat === undefined || entry.bare || entry.prunable
          ? null
          : h('button', {
              type: 'button',
              className: 'ph-button',
              disabled: props.busy,
              onClick: props.onOpenChat,
            }, h(Icon, { name: 'comment', size: 11 }), t('wtOpenChat')),
        entry.isPool || entry.prunable || !props.main
          ? h('button', {
              type: 'button',
              className: 'ph-button',
              disabled: props.busy,
              onClick: props.onRemove,
            }, h(Icon, { name: 'trash', size: 11 }), t('wtRemoveAction'))
          : null)),
    props.removing
      ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 10px 10px' } },
          h('div', { className: 'ph-confirm-text' }, t('wtRemoveConfirm', { branch: label })),
          h('p', { className: 'ph-hint' }, t('wtRemoveHint')),
          h('label', { className: 'ph-check-row' },
            h('input', {
              type: 'checkbox',
              checked: props.deleteBranch,
              onChange: (event: { target: { checked: boolean } }) => props.onDeleteBranch(event.target.checked),
            }),
            h('span', null, t('wtDeleteBranch'))),
          h('label', { className: 'ph-check-row' },
            h('input', {
              type: 'checkbox',
              checked: props.force,
              onChange: (event: { target: { checked: boolean } }) => props.onForce(event.target.checked),
            }),
            h('span', null, t('wtForce'))),
          h('div', { className: 'ph-dialog-actions' },
            h('button', { type: 'button', className: 'ph-button', disabled: props.busy, onClick: props.onCancelRemove }, t('wtCancel')),
            h('button', { type: 'button', className: 'ph-primary', disabled: props.busy, onClick: props.onConfirmRemove }, t('wtRemoveAction'))))
      : null)
}

