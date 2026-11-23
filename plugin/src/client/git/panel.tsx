/**
 * The Git panel a right-sidebar tab renders.
 *
 * It owns the overview, the active view, the open detail, the running action,
 * and the toasts; each child view loads its own slice through the same Host
 * channel, so switching a tab never refetches what the header already has.
 */
import { h, useEffect, useMemo, useRef, useState } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import { useLoader, useDocumentVisible, splitPath } from '../hooks.ts'
import { messageOf } from '../api.ts'
import type { GitApi } from '../api.ts'
import type { Translate } from '../i18n.ts'
import { currentLocale } from '../i18n.ts'
import { actionStatusOf, buildActionMenuItems, resolvePrAction, resolveQuickAction, needsDefaultBranchConfirmation, actionIncludesCommit } from './action-logic.ts'
import type { ActionStatus, PrAction, QuickAction } from './action-logic.ts'
import { GitActions, CreatePullButton, DefaultBranchDialog, PublishDialog } from './actions.tsx'
import type { InlineSuccess } from './actions.tsx'
import { BranchSelector } from './branch-selector.tsx'
import { ChangesView } from './changes.tsx'
import type { CommitRequest } from './commit-composer.tsx'
import { CommitsView, CommitPane } from './commits.tsx'
import { PullsView, PullPane } from './pulls.tsx'
import { IssuesView, IssuePane } from './issues.tsx'
import { WorktreesView } from './worktrees.tsx'
import { Empty, Failure, Loading, DetailBar, stateLabel } from './common.tsx'
import type { GitActionProgress, GitOverview, GitStackedAction, WorkspaceRepo, WorkspaceReposResult } from '../../shared/protocol.ts'

/** The tab kinds the panel shows. */
type ViewId = 'changes' | 'worktrees' | 'pulls' | 'issues' | 'commits'

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
  const { t } = props
  const baseApi = props.api
  const sessionId = typeof props.sessionId === 'string' ? props.sessionId : ''
  const tabInfo = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined
  const visible = tabInfo?.tab?.visible !== false
  const documentVisible = useDocumentVisible()
  const cwd = typeof props.useSessions === 'function'
    ? props.useSessions((snapshot) => snapshot?.byId?.[sessionId]?.cwd ?? '')
    : ''

  /** The repository chip the panel currently shows; null is the summary. */
  const [repoId, setRepoId] = useState<string | null>(null)
  const repoPicked = useRef(false)
  const [checkoutBusy, setCheckoutBusy] = useState('')
  // Every existing route gets the selected repo without threading a new prop
  // through every child: the panel hands its children a scoped API.
  const scopedApi = useMemo<GitApi>(() => {
    if (repoId === null || repoId.length === 0) return baseApi
    return new Proxy(baseApi, {
      get(target, property, receiver) {
        const value = Reflect.get(target, property, receiver) as unknown
        if (typeof value !== 'function') return value
        return (payload?: unknown) => (value as (input: unknown) => unknown)(
          payload === undefined || payload === null
            ? { repo: repoId }
            : { ...(payload as Record<string, unknown>), repo: repoId },
        )
      },
    }) as GitApi
  }, [baseApi, repoId])
  const api = scopedApi

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

  // The workspace's repositories are the panel's first question. The answer
  // decides which repository every other route addresses.
  const reposState = useLoader(
    () => baseApi.repos({ sessionId, cwd: cwd || undefined }),
    [baseApi, sessionId, cwd, revision],
  )
  const workspace = reposState.value
  const allMode = repoId === null
  const selectedRepo = workspace === undefined
    ? null
    : workspace.repos.find((repo) => repo.id === repoId) ?? null
  const needsCheckout = workspace !== undefined
    && workspace.isolation
    && selectedRepo !== null
    && selectedRepo.state !== 'ready'

  useEffect(() => {
    if (repoPicked.current || workspace === undefined || workspace.repos.length === 0) return
    repoPicked.current = true
    const pick = workspace.repos.find((repo) => repo.state === 'ready' && (repo.changedFiles ?? 0) > 0)
      ?? workspace.repos.find((repo) => repo.state === 'ready')
      ?? workspace.repos[0]
    setRepoId(pick.id)
  }, [workspace])

  const overviewState = useLoader(
    () => repoId === null ? Promise.resolve(null) : api.overview({ sessionId, cwd: cwd || undefined }),
    [api, sessionId, cwd, revision, repoId],
  )
  const overview = overviewState.value ?? undefined
  const status = actionStatusOf(overview)
  const countsState = useLoader(
    () => repoId === null ? Promise.resolve(null) : api.counts({ sessionId, cwd: cwd || undefined }),
    [api, sessionId, cwd, revision, repoId],
  )
  const counts = countsState.value ?? undefined

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

  /** Create one repository's checkout for this chat. */
  const createCheckout = async (id: string): Promise<void> => {
    if (checkoutBusy.length > 0) return
    setCheckoutBusy(id)
    try {
      await baseApi.checkoutRepo({ sessionId, cwd: cwd || undefined, repo: id })
      repoPicked.current = true
      setRepoId(id)
      reload()
      toast(t('gitRepoReady'), t('gitRepoCreateCheckout'), 'success')
    } catch (failure) {
      toast(t('gitRepoCheckoutFailed'), messageOf(failure), 'error')
    } finally {
      setCheckoutBusy('')
    }
  }

  /**
   * Poll one action to completion.
   * @param actionId the Host action id.
   */
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

  const startAction = async (
    action: GitStackedAction,
    options: ActionOptions,
    confirmed = false,
  ): Promise<void> => {
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
        locale: currentLocale(t),
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
  const prAction = resolvePrAction(status, running)

  /**
   * Run the change-request action directly: the Host pushes the branch, drafts
   * the title and description, and opens the request without an intermediate
   * review dialog. The default branch still asks for a feature branch first.
   */
  const openCreatePull = (): void => {
    void startAction('create_pr', {})
  }

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

  const repoBar = workspace !== undefined && workspace.kind === 'multi'
    ? h(RepoBar, {
        t,
        workspace,
        selected: repoId,
        busy: checkoutBusy,
        onSelect: (id: string | null) => {
          repoPicked.current = true
          setRepoId(id)
          setSelection(null)
        },
        onCreate: (id: string) => void createCheckout(id),
        onRefresh: reload,
      })
    : null

  const header = overview === undefined ? null : h(PanelHeader, {
    t,
    overview,
    status,
    quick,
    menuItems,
    prAction,
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
    onCreatePr: openCreatePull,
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
    onOpenWorktrees: () => {
      setView('worktrees')
      setSelection(null)
    },
    onBranchChanged: (branch: string | null) => {
      reload()
      toast(t('gitBranchSelect'), branch ?? t('gitDetachedHead'), 'success')
    },
  })

  let body: ReturnType<typeof h> | ReturnType<typeof h>[]
  if (allMode) {
    body = h(ReposOverview, {
      t,
      workspace: workspace ?? null,
      error: reposState.error,
      busy: checkoutBusy,
      onSelect: (id: string) => {
        repoPicked.current = true
        setRepoId(id)
        setSelection(null)
      },
      onCreate: (id: string) => void createCheckout(id),
      onRefresh: reload,
    })
  } else if (workspace === undefined && reposState.status === 'error') {
    body = h(Failure, {
      error: reposState.error,
      title: t('gitReadError'),
      retryLabel: t('gitRetry'),
      onRetry: reload,
    })
  } else if (workspace === undefined) {
    body = h(Loading, { label: t('gitLoadingLong') })
  } else if (needsCheckout && selectedRepo !== null) {
    body = h(RepoCheckoutCard, {
      t,
      repo: selectedRepo,
      busy: checkoutBusy === selectedRepo.id,
      onCreate: () => void createCheckout(selectedRepo.id),
    })
  } else if (overviewState.status === 'error' && overview === undefined) {
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
      onChanged: reload,
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
      prAction,
      onCreatePr: openCreatePull,
      onFilter: setPullFilter,
      onSelect: (number: number) => setSelection({ type: 'pull', number }),
    })
  } else if (view === 'worktrees') {
    body = h(WorktreesView, {
      api, t, sessionId, cwd, revision,
      contextMode: workspace?.isolation === true,
      onSelectRepo: (id: string) => {
        repoPicked.current = true
        setRepoId(id)
      },
      newChat: props.newChat,
      onToast: toast,
      onChanged: reload,
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
  const showTabs = !allMode && !needsCheckout && overview !== undefined

  return h('div', { className: 'ph-git', 'data-personal-hub-git': true, style: { position: 'relative' } },
    repoBar,
    header,
    showTabs ? h(PanelTabs, {
      t,
      value: view,
      counts: {
        changes: overview === undefined ? null : { value: overview.stats.files },
        worktrees: counts === undefined ? null : { value: counts.worktrees },
        pulls: counts === undefined || counts.pulls === null
          ? null
          : { value: counts.pulls, capped: counts.pullsCapped },
        issues: counts === undefined || counts.issues === null
          ? null
          : { value: counts.issues, capped: counts.issuesCapped },
        commits: counts === undefined ? null : { value: counts.commits },
      },
      onChange: (next: ViewId) => {
        setView(next)
        setSelection(null)
      },
    }) : null,
    // The list views scroll as a whole, so their toolbars travel with the
    // content. The Changes and Worktrees views and every detail pane own their
    // scroller instead: a detail that is merely clipped cannot be read below
    // the fold, which is what this wrapper used to do.
    h('div', { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto', overflow: isDetail || view === 'changes' || view === 'worktrees' ? 'hidden' : 'auto' } },
      isDetail ? h('div', { className: 'ph-detail-body', 'data-personal-hub-detail-body': true }, body) : body),

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
  prAction: PrAction
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
  onCreatePr(): void
  onOpenPublish(): void
  onPull(): void
  onHint(key: string): void
  onRefresh(): void
  onOpenPull(number: number): void
  onOpenWorktrees(): void
  onBranchChanged(branch: string | null): void
}

/** The header: repository, branch, and the action control. */
function PanelHeader(props: PanelHeaderProps): ReturnType<typeof h> {
  const { t, overview } = props
  const repo = overview.repo
  const pull = overview.branchPull
  const inWorktree = props.cwd.length > 0 && props.cwd.toLowerCase() !== repo.root.toLowerCase()
  const worktreeName = inWorktree ? splitPath(props.cwd).name : ''
  const remoteLabel = repo.remote?.slug ?? null
  return h('div', { className: 'ph-head' },
    h('div', { className: 'ph-repo-row' },
      h('span', { style: { display: 'flex', color: 'var(--dsw-alias-label-tertiary)' } }, h(Icon, { name: 'git', size: 14 })),
      h('span', { className: 'ph-repo', title: remoteLabel === null ? repo.root : `${remoteLabel}\n${repo.root}` }, repo.name),
      inWorktree
        ? h('button', {
            type: 'button',
            className: 'ph-chip ph-worktree-chip',
            title: props.cwd,
            onClick: props.onOpenWorktrees,
          }, h(Icon, { name: 'folder', size: 10 }), h('span', { className: 'ph-ellipsis' }, worktreeName))
        : null,
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
      h('span', { className: 'ph-spacer' }),
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
            stateLabel(t, pull.state))),

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

    // The change request control is always on screen once a remote exists, so
    // "create pull request" never hides behind the caret menu.
    props.status !== null && props.status.hasPrimaryRemote
      ? h(CreatePullButton, {
          t,
          enabled: props.prAction.enabled,
          hintKey: props.prAction.hintKey,
          // The primary control already explains the same blocker.
          showHint: props.quick.hintKey !== props.prAction.hintKey,
          onClick: props.onCreatePr,
        })
      : null)
}

/** One count the tab strip may show. */
interface TabCount {
  value: number
  /** The page was full, so the real number may be larger. */
  capped?: boolean
}

/** Props of the tab strip. */
interface PanelTabsProps {
  t: Translate
  value: ViewId
  counts: Record<ViewId, TabCount | null>
  onChange(next: ViewId): void
}

/** The views' tab strip. */
function PanelTabs(props: PanelTabsProps): ReturnType<typeof h> {
  const items: Array<{ id: ViewId; label: string }> = [
    { id: 'changes', label: props.t('gitChanges') },
    { id: 'worktrees', label: props.t('gitWorktrees') },
    { id: 'pulls', label: props.t('gitPulls') },
    { id: 'issues', label: props.t('gitIssues') },
    { id: 'commits', label: props.t('gitCommits') },
  ]
  return h('div', { className: 'ph-tabs', role: 'tablist' },
    items.map((item) => {
      const count = props.counts[item.id]
      return h('button', {
        key: item.id,
        type: 'button',
        role: 'tab',
        className: 'ph-tab',
        'aria-selected': props.value === item.id ? 'true' : 'false',
        onClick: () => props.onChange(item.id),
      },
        h('span', null, item.label),
        count === null || count.value === 0
          ? null
          : h('span', { className: 'ph-tab-count' }, count.capped === true ? `${count.value}+` : String(count.value)))
    }))
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

/** One chip per repository, plus the summary the panel starts on. */
function RepoBar(props: {
  t: Translate
  workspace: WorkspaceReposResult
  selected: string | null
  busy: string
  onSelect(id: string | null): void
  onCreate(id: string): void
  onRefresh(): void
}): ReturnType<typeof h> {
  const { t, workspace } = props
  return h('div', {
    className: 'ph-repo-bar',
    'data-personal-hub-repos': true,
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '5px',
      padding: '7px 10px 6px',
      borderBottom: '1px solid var(--dsw-alias-border-l1)',
    },
  },
    h('button', {
      type: 'button',
      className: 'ph-chip',
      'data-tone': props.selected === null ? 'business' : undefined,
      title: workspace.workspaceRoot,
      onClick: () => props.onSelect(null),
    }, t('gitRepoAll')),
    workspace.repos.map((repo) => {
      const selected = props.selected === repo.id
      const busy = props.busy === repo.id
      const changed = repo.state === 'ready' && repo.changedFiles !== null && repo.changedFiles > 0
        ? ` •${repo.changedFiles}`
        : ''
      const label = repo.role !== '' && repo.role !== repo.name ? `${repo.name} · ${repo.role}` : repo.name
      const tone = repo.state === 'missing' ? 'error' : repo.state === 'not-checked-out' ? 'warn' : selected ? 'business' : undefined
      return h('button', {
        key: repo.id,
        type: 'button',
        className: 'ph-chip',
        'data-tone': tone,
        title: `${repo.root}${repo.description === '' ? '' : `\n${repo.description}`}`,
        style: repo.available ? { opacity: 0.75 } : undefined,
        onClick: () => {
          if (repo.state === 'not-checked-out' && workspace.isolation) {
            props.onCreate(repo.id)
            return
          }
          props.onSelect(repo.id)
        },
      },
        h('span', { className: 'ph-ellipsis' }, `${label}${busy ? ` · ${t('gitRepoCreating')}` : changed}`),
        repo.state === 'missing' ? h(Icon, { name: 'alert', size: 10 }) : null)
    }),
    h('span', { style: { flex: '1 1 auto' } }),
    h('button', {
      type: 'button',
      className: 'ph-icon-button',
      title: t('gitRefresh'),
      'aria-label': t('gitRefresh'),
      onClick: props.onRefresh,
    }, h(Icon, { name: 'refresh', size: 13 })))
}

/** The "All repositories" summary: state, role, and one action per row. */
function ReposOverview(props: {
  t: Translate
  workspace: WorkspaceReposResult | null
  error: unknown
  busy: string
  onSelect(id: string): void
  onCreate(id: string): void
  onRefresh(): void
}): ReturnType<typeof h> {
  const { t, workspace } = props
  if (workspace === null) {
    return props.error === undefined
      ? h(Loading, { label: t('gitLoadingLong') })
      : h(Failure, { error: props.error, title: t('gitReadError'), retryLabel: t('gitRetry'), onRetry: props.onRefresh })
  }
  if (workspace.kind === 'none') {
    return h(Empty, { icon: 'git', title: t('gitRepoNone'), hint: t('gitRepoNoneHint') })
  }
  return h('div', { style: { padding: '10px 12px', overflow: 'auto', minHeight: 0 } },
    h('div', { className: 'ph-hint', style: { marginBottom: '8px' } }, workspace.workspaceRoot),
    workspace.warnings.length === 0
      ? null
      : h('div', { className: 'ph-hint', style: { marginBottom: '8px', color: 'var(--dsw-alias-state-warn-primary)' } },
          workspace.warnings.join(' · ')),
    workspace.repos.map((repo) => h('div', {
      key: repo.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 0',
        borderTop: '1px solid var(--dsw-alias-border-l1)',
      },
    },
      h('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 auto' } },
        h('span', { style: { display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 } },
          h('span', { className: 'ph-ellipsis', style: { fontWeight: 600 } }, repo.name),
          repo.role !== '' && repo.role !== repo.name
            ? h('span', { className: 'ph-chip' }, repo.role)
            : null,
          h('span', { className: 'ph-chip', 'data-tone': repo.state === 'ready' ? 'success' : repo.state === 'missing' ? 'error' : 'warn' },
            repoStateLabel(t, repo))),
        h('span', { className: 'ph-hint ph-ellipsis' }, repo.root),
        repo.description === '' ? null : h('span', { className: 'ph-hint' }, repo.description)),
      repo.state === 'not-checked-out' && workspace.isolation
        ? h('button', {
            type: 'button',
            className: 'ph-button',
            disabled: props.busy === repo.id,
            onClick: () => props.onCreate(repo.id),
          }, props.busy === repo.id ? t('gitRepoCreating') : t('gitRepoCreateCheckout'))
        : h('button', {
            type: 'button',
            className: 'ph-button',
            onClick: () => props.onSelect(repo.id),
          }, t('gitRepoOpen')))))
}

/** The card a repository shows before this chat has checked it out. */
function RepoCheckoutCard(props: {
  t: Translate
  repo: WorkspaceRepo
  busy: boolean
  onCreate(): void
}): ReturnType<typeof h> {
  const { t, repo } = props
  return h('div', { className: 'ph-empty' },
    h('span', { className: 'ph-empty-icon' }, h(Icon, { name: 'git', size: 26 })),
    h('span', { className: 'ph-empty-title' }, `${repo.name} · ${repoStateLabel(t, repo)}`),
    h('span', { className: 'ph-empty-hint' }, repo.description === '' ? t('gitRepoCheckoutHint') : repo.description),
    h('button', {
      type: 'button',
      className: 'ph-button',
      disabled: props.busy,
      onClick: props.onCreate,
    }, props.busy ? t('gitRepoCreating') : t('gitRepoCreateCheckout')))
}

/** One repository's state in the user's language. */
function repoStateLabel(t: Translate, repo: WorkspaceRepo): string {
  if (repo.state === 'ready') {
    return repo.checkout === null ? t('gitRepoMainCheckout') : t('gitRepoReady')
  }
  if (repo.state === 'missing') return t('gitRepoMissing')
  if (repo.state === 'materializing') return t('gitRepoCreating')
  return t('gitRepoNotCheckedOut')
}
