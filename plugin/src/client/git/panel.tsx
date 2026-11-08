/**
 * The Git panel a right-sidebar tab renders.
 *
 * It owns the overview, the active view, the open detail, the running action,
 * and the toasts; each child view loads its own slice through the same Host
 * channel, so switching a tab never refetches what the header already has.
 */
import { h, useEffect, useRef, useState } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import { useLoader, useDocumentVisible } from '../hooks.ts'
import { messageOf } from '../api.ts'
import type { GitApi } from '../api.ts'
import type { Translate } from '../i18n.ts'
import { actionStatusOf, buildActionMenuItems, resolveQuickAction, needsDefaultBranchConfirmation, actionIncludesCommit } from './action-logic.ts'
import type { ActionStatus, QuickAction } from './action-logic.ts'
import { GitActions, DefaultBranchDialog, PublishDialog } from './actions.tsx'
import type { InlineSuccess } from './actions.tsx'
import { BranchSelector } from './branch-selector.tsx'
import { ChangesView, ChangesSummary } from './changes.tsx'
import type { CommitRequest } from './commit-composer.tsx'
import { CommitsView, CommitPane } from './commits.tsx'
import { PullsView, PullPane } from './pulls.tsx'
import { IssuesView, IssuePane } from './issues.tsx'
import { Empty, Failure, Loading, DetailBar, stateLabel } from './common.tsx'
import type { GitActionProgress, GitOverview, GitStackedAction } from '../../shared/protocol.ts'

/** The tab kinds the panel shows. */
type ViewId = 'changes' | 'pulls' | 'issues' | 'commits'

/** The open detail, if any. */
type Selection =
  | { type: 'commit'; hash: string }
  | { type: 'pull'; number: number }
  | { type: 'issue'; number: number }
  | null

/** One toast the panel shows. */
interface Toast {
  id: number
  title: string
  description: string
  tone: 'error' | 'success' | 'info'
}

/** What the panel needs from the slot. */
export interface GitPanelProps {
  api: GitApi
  t: Translate
  sessionId?: string
  /** The slot's session store hook, used to follow a worktree switch. */
  useSessions?: (selector: (snapshot: { byId?: Record<string, { cwd?: string }> }) => string) => string
  useTabInfo?: () => { tab?: { visible?: boolean } } | undefined
  newChat?: (path: string) => Promise<unknown>
}

/** Options one action run carries. */
interface ActionOptions {
  commitMessage?: string
  paths?: string[]
  featureBranch?: boolean
  base?: string
}

/** The panel. */
export function GitPanel(props: GitPanelProps): ReturnType<typeof h> {
  const { t, api } = props
  const sessionId = typeof props.sessionId === 'string' ? props.sessionId : ''
  const tabInfo = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined
  const visible = tabInfo?.tab?.visible !== false
  const documentVisible = useDocumentVisible()
  const cwd = typeof props.useSessions === 'function'
    ? props.useSessions((snapshot) => snapshot?.byId?.[sessionId]?.cwd ?? '')
    : ''

  const [view, setView] = useState<ViewId>('changes')
  const [selection, setSelection] = useState<Selection>(null)
  const [pullFilter, setPullFilter] = useState('open')
  const [issueFilter, setIssueFilter] = useState('open')
  const [revision, setRevision] = useState(0)
  const [progress, setProgress] = useState<GitActionProgress | null>(null)
  const [running, setRunning] = useState(false)
  const [success, setSuccess] = useState<InlineSuccess | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [pending, setPending] = useState<{ action: GitStackedAction; options: ActionOptions } | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishError, setPublishError] = useState('')
  const mounted = useRef(true)
  const toastId = useRef(0)
  const successTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => {
    mounted.current = false
    if (successTimer.current !== undefined) clearTimeout(successTimer.current)
  }, [])

  const reload = (): void => setRevision((value) => value + 1)

  const overviewState = useLoader(
    () => api.overview({ sessionId, cwd: cwd || undefined }),
    [sessionId, cwd, revision],
  )
  const overview = overviewState.value
  const status = actionStatusOf(overview)

  // Poll while the tab is on screen; a hidden tab stops asking.
  useEffect(() => {
    if (!visible || !documentVisible) return undefined
    const interval = Math.max(8000, Number(overview?.refreshMs) || 30000)
    const timer = setInterval(reload, interval)
    return () => clearInterval(timer)
  }, [visible, documentVisible, overview?.refreshMs])

  // Coming back on screen refreshes once, so a long-hidden tab is not stale.
  const shown = useRef(visible)
  useEffect(() => {
    if (visible && shown.current !== true) reload()
    shown.current = visible
  }, [visible])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Escape closes the menu and the dialogs, like every other popup in the app.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onKey = (event: { key: string }): void => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      setPending(null)
      setPublishOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const toast = (title: string, description: string, tone: Toast['tone']): void => {
    const id = toastId.current += 1
    setToasts((previous) => [...previous.slice(-2), { id, title, description, tone }])
    if (tone !== 'error') {
      setTimeout(() => {
        if (!mounted.current) return
        setToasts((previous) => previous.filter((item) => item.id !== id))
      }, 6000)
    }
  }

  const showSuccess = (next: InlineSuccess): void => {
    if (successTimer.current !== undefined) clearTimeout(successTimer.current)
    setSuccess(next)
    successTimer.current = setTimeout(() => {
      if (mounted.current) setSuccess(null)
    }, 10000)
  }

  const pollAction = async (actionId: string): Promise<void> => {
    for (;;) {
      let state: GitActionProgress
      try {
        state = await api.actionState({ actionId })
      } catch (failure) {
        if (!mounted.current) return
        setRunning(false)
        toast(t('gitActionFailed'), messageOf(failure), 'error')
        return
      }
      if (!mounted.current) return
      setProgress(state)
      if (state.status === 'running') {
        await sleep(300)
        continue
      }
      setRunning(false)
      reload()
      if (state.status === 'failed') {
        toast(t('gitActionFailed'), state.error?.message ?? t('gitActionFailed'), 'error')
        return
      }
      const result = state.result
      if (result === null) return
      const toastInfo = result.toast
      showSuccess({
        title: toastInfo.title,
        description: toastInfo.description ?? '',
        ...(toastInfo.cta.kind === 'open_pr'
          ? { href: toastInfo.cta.url, hrefLabel: toastInfo.cta.label }
          : {}),
      })
      return
    }
  }

  const startAction = async (action: GitStackedAction, options: ActionOptions, confirmed = false): Promise<void> => {
    if (running) return
    if (!confirmed && needsDefaultBranchConfirmation(action, status?.isDefaultRef === true)) {
      setPending({ action, options })
      return
    }
    setMenuOpen(false)
    setPending(null)
    setRunning(true)
    setSuccess(null)
    setProgress({
      actionId: '',
      action,
      status: 'running',
      phases: [],
      phase: null,
      label: t('gitStarting'),
      startedAt: Date.now(),
      finishedAt: null,
      output: [],
      result: null,
      error: null,
    })
    try {
      const started = await api.startAction({
        sessionId,
        cwd: cwd || undefined,
        action,
        commitMessage: options.commitMessage !== undefined && options.commitMessage.length > 0 ? options.commitMessage : undefined,
        paths: options.paths !== undefined && options.paths.length > 0 ? options.paths : undefined,
        featureBranch: options.featureBranch === true,
        base: options.base,
        locale: typeof navigator === 'undefined' ? '' : navigator.language,
      })
      await pollAction(started.actionId)
    } catch (failure) {
      if (!mounted.current) return
      setRunning(false)
      toast(t('gitActionFailed'), messageOf(failure), 'error')
    }
  }

  const runPull = async (): Promise<void> => {
    if (running) return
    setRunning(true)
    setSuccess(null)
    setProgress({
      actionId: 'pull',
      action: 'push',
      status: 'running',
      phases: ['push'],
      phase: 'push',
      label: t('gitPullStatus'),
      startedAt: Date.now(),
      finishedAt: null,
      output: [],
      result: null,
      error: null,
    })
    try {
      const result = await api.pull({ sessionId, cwd: cwd || undefined })
      if (!mounted.current) return
      setRunning(false)
      reload()
      showSuccess({
        title: result.status === 'pulled' ? t('gitPullDone') : t('gitPullUpToDate'),
        description: result.status === 'pulled'
          ? t('gitPullUpdated', { branch: result.branch })
          : t('gitPullSynced', { branch: result.branch }),
      })
    } catch (failure) {
      if (!mounted.current) return
      setRunning(false)
      toast(t('gitPullFailed'), messageOf(failure), 'error')
    }
  }

  const publish = async (provider: 'github' | 'gitlab', repository: string, visibility: 'private' | 'public'): Promise<void> => {
    setPublishBusy(true)
    setPublishError('')
    try {
      const result = await api.publish({ sessionId, cwd: cwd || undefined, provider, repository, visibility })
      if (!mounted.current) return
      setPublishOpen(false)
      reload()
      showSuccess({
        title: t('gitPublishDone'),
        description: result.url ?? repository,
        ...(result.url === null ? {} : { href: result.url, hrefLabel: t('gitPublishOpen') }),
      })
    } catch (failure) {
      if (mounted.current) setPublishError(messageOf(failure))
    } finally {
      if (mounted.current) setPublishBusy(false)
    }
  }

  const quick = resolveQuickAction(status, running)
  const menuItems = buildActionMenuItems(status, running)

  const runQuick = (): void => {
    if (quick.kind === 'run_pull') {
      void runPull()
      return
    }
    if (quick.kind === 'open_publish') {
      setPublishOpen(true)
      return
    }
    if (quick.kind === 'run_action' && quick.action !== undefined) {
      void startAction(quick.action, {})
    }
  }

  const focusComposer = (): void => {
    setView('changes')
    setSelection(null)
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const field = document.getElementById('personal-hub-commit-message')
        if (field !== null && typeof (field as { focus?: () => void }).focus === 'function') (field as { focus(): void }).focus()
      }, 0)
    }
  }

  const onMenuRun = (action: GitStackedAction): void => {
    if (action === 'commit') {
      setMenuOpen(false)
      focusComposer()
      return
    }
    void startAction(action, {})
  }

  const onCommit = (request: CommitRequest): void => {
    void startAction('commit', {
      commitMessage: request.message,
      paths: request.paths,
      featureBranch: request.featureBranch,
    })
  }

  const header = overview === undefined ? null : h(PanelHeader, {
    t,
    overview,
    status,
    quick,
    menuItems,
    running,
    progress,
    success,
    menuOpen,
    api,
    sessionId,
    cwd,
    onToggleMenu: () => setMenuOpen((value) => !value),
    onQuick: runQuick,
    onRun: onMenuRun,
    onOpenPublish: () => {
      setMenuOpen(false)
      setPublishOpen(true)
    },
    onPull: () => void runPull(),
    onHint: (key: string) => toast(t('gitActions'), t(key), 'info'),
    onRefresh: reload,
    onOpenPull: (number: number) => {
      setView('pulls')
      setSelection({ type: 'pull', number })
    },
    onBranchChanged: (branch: string | null) => {
      reload()
      toast(t('gitBranchSelect'), branch ?? t('gitDetachedHead'), 'success')
    },
    onOpenChanges: () => {
      setView('changes')
      setSelection(null)
    },
  })

  let body: ReturnType<typeof h> | ReturnType<typeof h>[]
  if (overviewState.status === 'error' && overview === undefined) {
    const error = overviewState.error
    const code = errorCode(error)
    body = h(Failure, {
      error,
      title: code === 'git/no-directory'
        ? t('gitNoDirectory')
        : code === 'git/not-a-repository' ? t('gitNoRepo') : t('gitReadError'),
      hint: code === 'git/not-a-repository'
        ? t('gitNoRepoHint')
        : code === 'connection/failed' ? t('gitBridgeHint') : undefined,
      retryLabel: t('gitRetry'),
      onRetry: reload,
    })
  } else if (overview === undefined) {
    body = h(Loading, { label: t('gitLoadingLong') })
  } else if (selection !== null && view === 'commits' && selection.type === 'commit') {
    body = h(CommitPane, {
      api, t, sessionId, cwd, revision,
      hash: selection.hash,
      onBack: () => setSelection(null),
    })
  } else if (selection !== null && view === 'pulls' && selection.type === 'pull') {
    body = h(PullPane, {
      api, t, sessionId, cwd, revision,
      number: selection.number,
      onBack: () => setSelection(null),
    })
  } else if (selection !== null && view === 'issues' && selection.type === 'issue') {
    body = h(IssuePane, {
      api, t, sessionId, cwd, revision,
      number: selection.number,
      onBack: () => setSelection(null),
    })
  } else if (view === 'pulls') {
    body = h(PullsView, {
      api, t, sessionId, cwd, revision,
      filter: pullFilter,
      forgeState: overview.forge,
      onFilter: setPullFilter,
      onSelect: (number: number) => setSelection({ type: 'pull', number }),
    })
  } else if (view === 'issues') {
    body = h(IssuesView, {
      api, t, sessionId, cwd, revision,
      filter: issueFilter,
      forgeState: overview.forge,
      onFilter: setIssueFilter,
      onSelect: (number: number) => setSelection({ type: 'issue', number }),
    })
  } else if (view === 'commits') {
    body = h(CommitsView, {
      api, t, sessionId, cwd, revision,
      onSelect: (hash: string) => setSelection({ type: 'commit', hash }),
    })
  } else {
    body = h(ChangesView, {
      api, t, sessionId, cwd, overview, revision,
      busy: running,
      onCommit,
      onToast: toast,
      onRefresh: reload,
    })
  }

  const isDetail = selection !== null

  return h('div', { className: 'ph-git', 'data-personal-hub-git': true, style: { position: 'relative' } },
    header,
    h(PanelTabs, {
      t,
      value: view,
      counts: {
        changes: overview?.stats.files ?? 0,
        pulls: 0,
        issues: 0,
        commits: 0,
      },
      onChange: (next: ViewId) => {
        setView(next)
        setSelection(null)
      },
    }),
    h('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto', overflow: isDetail || view === 'changes' ? 'hidden' : 'auto' } },
      body),

    pending === null
      ? null
      : h(DefaultBranchDialog, {
          t,
          branch: overview?.repo.branch ?? '',
          action: pending.action,
          includesCommit: actionIncludesCommit(pending.action),
          busy: running,
          onAbort: () => setPending(null),
          onContinue: () => {
            const next = pending
            setPending(null)
            void startAction(next.action, next.options, true)
          },
          onFeatureBranch: () => {
            const next = pending
            setPending(null)
            void startAction(next.action, { ...next.options, featureBranch: true }, true)
          },
        }),

    publishOpen
      ? h(PublishDialog, {
          t,
          busy: publishBusy,
          error: publishError,
          providers: publishProviders(overview?.forge),
          onCancel: () => setPublishOpen(false),
          onPublish: (provider: 'github' | 'gitlab', repository: string, visibility: 'private' | 'public') =>
            void publish(provider, repository, visibility),
        })
      : null,

    toasts.length === 0
      ? null
      : h('div', { className: 'ph-toasts' }, toasts.map((item) => h('div', {
          key: item.id,
          className: 'ph-toast',
          'data-tone': item.tone === 'info' ? 'success' : item.tone,
          role: item.tone === 'error' ? 'alert' : 'status',
        },
          h(Icon, { name: item.tone === 'error' ? 'alert' : item.tone === 'success' ? 'check' : 'info', size: 13 }),
          h('div', { className: 'ph-toast-text' },
            h('div', { className: 'ph-toast-title' }, item.title),
            item.description.length > 0 ? h('div', { className: 'ph-toast-desc' }, item.description) : null),
          h('button', {
            type: 'button',
            className: 'ph-icon-button',
            'aria-label': t('gitDefaultAbort'),
            onClick: () => setToasts((previous) => previous.filter((toastItem) => toastItem.id !== item.id)),
          }, h(Icon, { name: 'cross', size: 11 }))))))
}

/** Props of the panel header. */
interface PanelHeaderProps {
  t: Translate
  overview: GitOverview
  status: ActionStatus | null
  quick: QuickAction
  menuItems: ReturnType<typeof buildActionMenuItems>
  running: boolean
  progress: GitActionProgress | null
  success: InlineSuccess | null
  menuOpen: boolean
  api: GitApi
  sessionId: string
  cwd: string
  onToggleMenu(): void
  onQuick(): void
  onRun(action: GitStackedAction): void
  onOpenPublish(): void
  onPull(): void
  onHint(key: string): void
  onRefresh(): void
  onOpenPull(number: number): void
  onBranchChanged(branch: string | null): void
  onOpenChanges(): void
}

/** The header: repository, branch, actions, and the changes summary. */
function PanelHeader(props: PanelHeaderProps): ReturnType<typeof h> {
  const { t, overview } = props
  const repo = overview.repo
  const pull = overview.branchPull
  return h('div', { className: 'ph-head' },
    h('div', { className: 'ph-repo-row' },
      h('span', { style: { display: 'flex', color: 'var(--dsw-alias-label-tertiary)' } }, h(Icon, { name: 'git', size: 14 })),
      h('span', { className: 'ph-repo', title: repo.root }, repo.name),
      h('span', { className: 'ph-spacer' }),
      h('button', {
        type: 'button',
        className: 'ph-icon-button',
        title: t('gitRefresh'),
        'aria-label': t('gitRefresh'),
        onClick: props.onRefresh,
      }, h(Icon, { name: 'refresh', size: 13 }))),

    h('div', { className: 'ph-branch-row' },
      h(BranchSelector, {
        api: props.api,
        t,
        sessionId: props.sessionId,
        cwd: props.cwd,
        branch: repo.branch,
        defaultBranch: repo.defaultBranch,
        disabled: props.running,
        onChanged: props.onBranchChanged,
      }),
      repo.ahead > 0 ? h('span', { className: 'ph-pill', title: t('gitAhead', { count: repo.ahead }) }, `↑${repo.ahead}`) : null,
      repo.behind > 0 ? h('span', { className: 'ph-pill', 'data-tone': 'warn', title: t('gitBehind', { count: repo.behind }) }, `↓${repo.behind}`) : null,
      pull === null
        ? null
        : h('button', {
            type: 'button',
            className: 'ph-chip',
            'data-tone': pull.state === 'merged' ? 'business' : pull.state === 'closed' ? 'error' : 'success',
            title: pull.title,
            onClick: () => props.onOpenPull(pull.number),
          },
            h('span', { className: 'ph-dot', 'data-state': pull.state }),
            `#${pull.number}`,
            stateLabel(t, pull.state)),
      repo.remote?.slug !== null && repo.remote?.slug !== undefined
        ? h('span', { className: 'ph-dim ph-tiny ph-ellipsis', title: repo.remote.slug }, repo.remote.slug)
        : null),

    h(GitActions, {
      t,
      quick: props.quick,
      menuItems: props.menuItems,
      running: props.running,
      progress: props.progress,
      success: props.success,
      menuOpen: props.menuOpen,
      onToggleMenu: props.onToggleMenu,
      onQuick: props.onQuick,
      onRun: props.onRun,
      onOpenPublish: props.onOpenPublish,
      onPull: props.onPull,
      onHint: props.onHint,
    }),

    h(ChangesSummary, {
      t,
      stats: overview.stats,
      branchChanges: overview.branchChanges,
      onClick: props.onOpenChanges,
    }))
}

/** Props of the tab strip. */
interface PanelTabsProps {
  t: Translate
  value: ViewId
  counts: Record<ViewId, number>
  onChange(next: ViewId): void
}

/** The four views' tab strip. */
function PanelTabs(props: PanelTabsProps): ReturnType<typeof h> {
  const items: Array<{ id: ViewId; label: string; count: number }> = [
    { id: 'changes', label: props.t('gitChanges'), count: props.counts.changes },
    { id: 'pulls', label: props.t('gitPulls'), count: props.counts.pulls },
    { id: 'issues', label: props.t('gitIssues'), count: props.counts.issues },
    { id: 'commits', label: props.t('gitCommits'), count: props.counts.commits },
  ]
  return h('div', { className: 'ph-tabs', role: 'tablist' },
    items.map((item) => h('button', {
      key: item.id,
      type: 'button',
      role: 'tab',
      className: 'ph-tab',
      'aria-selected': props.value === item.id ? 'true' : 'false',
      onClick: () => props.onChange(item.id),
    },
      h('span', null, item.label),
      item.count > 0 ? h('span', { className: 'ph-tab-count' }, String(item.count)) : null)))
}

/** The publish providers the dialog offers, from the forge description. */
function publishProviders(forge: GitOverview['forge'] | undefined): Array<{ id: 'github' | 'gitlab'; label: string; ready: boolean }> {
  const provider = forge?.provider ?? ''
  return [
    { id: 'github', label: 'GitHub', ready: provider === 'github' && forge?.available === true },
    { id: 'gitlab', label: 'GitLab', ready: provider === 'gitlab' && forge?.available === true },
  ]
}

/** The failure code of a thrown value. */
function errorCode(error: unknown): string | undefined {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

/** Wait one poll interval. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** The Git header button, kept for the conversation header slot. */
export function GitHeaderButton(props: { t: Translate; open?: () => void }): ReturnType<typeof h> {
  return h('button', {
    type: 'button',
    className: 'ph-icon-button',
    title: props.t('gitOpen'),
    'aria-label': props.t('gitOpen'),
    onClick: () => props.open?.(),
    style: { width: '28px', height: '28px' },
  }, h(Icon, { name: 'git', size: 15 }))
}

/** The empty state a Session outside a repository shows. */
export function NoRepository(props: { t: Translate }): ReturnType<typeof h> {
  return h(Empty, { icon: 'git', title: props.t('gitNoRepo'), hint: props.t('gitNoRepoHint') })
}

/** The back bar a detail pane needs when it is rendered on its own. */
export function PanelBackBar(props: { t: Translate; name: string; onBack(): void }): ReturnType<typeof h> {
  return h(DetailBar, { t: props.t, name: props.name, onBack: props.onBack })
}
