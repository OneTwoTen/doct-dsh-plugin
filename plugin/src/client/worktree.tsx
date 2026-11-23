/**
 * Worktrees in the conversation, the way a chat is started.
 *
 * The New Session row only records what the first message should do: nothing is
 * created while the user is still typing, and a chat that is never sent leaves
 * no branch and no folder behind. The Host creates the checkout when that
 * message arrives, from the fetched base branch, and moves the Session in
 * before the turn starts.
 *
 * The status card then reports the creation that runs while the message waits,
 * or the failure that let the message go on in the project folder.
 */
import { h, useEffect, useCallback, useState } from './runtime.ts'
import { Icon } from './icons.tsx'
import { messageOf } from './api.ts'
import type { GitApi } from './api.ts'
import type { Translate } from './i18n.ts'
import type { WorktreeState, WorktreeRecord, WorktreeCreation, WorktreeRequest } from '../shared/protocol.ts'

/** How often the status card asks the Host while a checkout is in flight. */
const DOCK_POLL_MS = 1200
/** How long a finished creation stays on screen. */
const DOCK_SUCCESS_MS = 8000

/** Props of the pure option row. */
export interface WorktreeOptionProps {
  t: Translate
  info: WorktreeState
  source: 'local' | 'remote'
  base: string
  /** Whether the next message creates a checkout. */
  wanted: boolean
  busy: boolean
  error: string
  notice: string
  onToggle(next: boolean): void
  onBase(value: string): void
  onSource(kind: 'local' | 'remote'): void
}

/** The option row, pure presentation. */
export function WorktreeOption(props: WorktreeOptionProps): ReturnType<typeof h> | null {
  const { t, info } = props
  if (info.enabled !== true || info.supported !== true) {
    // A project that is itself a linked worktree cannot host a second checkout,
    // so the row explains itself instead of offering a dead control.
    return info.reason === 'linked-project'
      ? h('span', { className: 'ph-hint ph-tiny', 'data-personal-hub-worktree': true }, t('wtLinkedProject'))
      : null
  }
  const current: WorktreeRecord | null = info.current ?? null
  // A multi-repo workspace has no base picker: each repository is checked out
  // on demand, from its own default branch.
  if (info.kind === 'context') {
    const ready = info.repos?.filter((repo) => repo.state === 'ready').length ?? 0
    return h('span', { className: 'ph-wrap', 'data-personal-hub-worktree': true },
      current === null
        ? h('label', {
            className: 'ph-check-inline ph-wt-toggle',
            title: t('wtContextHint'),
          },
            h('input', {
              type: 'checkbox',
              checked: props.wanted,
              disabled: props.busy,
              onChange: (event: { target: { checked: boolean } }) => props.onToggle(event.target.checked),
            }),
            h(Icon, { name: 'branch', size: 11 }),
            h('span', null, t('wtContext')))
        : h('span', { className: 'ph-chip ph-mono', title: String(current.path ?? '') },
            h(Icon, { name: 'branch', size: 11 }),
            h('span', { className: 'ph-ellipsis' }, t('wtContextRepos', { count: ready }))),
      h('span', { className: 'ph-hint ph-tiny' }, t('wtContextHint')),
      props.error.length > 0 ? h('span', { className: 'ph-error-text' }, props.error) : null,
      props.notice.length > 0 ? h('span', { className: 'ph-ok ph-tiny' }, props.notice) : null)
  }
  const bases = props.source === 'remote' ? info.bases?.remote ?? [] : info.bases?.local ?? []
  const options = bases.map((item) => ({
    value: props.source === 'remote' ? (item as { branch: string }).branch : item.name,
    label: item.name,
  }))
  if (props.base.length > 0 && !options.some((option) => option.value === props.base)) {
    options.unshift({ value: props.base, label: props.base })
  }
  const creating = info.creating ?? null
  return h('span', { className: 'ph-wrap', 'data-personal-hub-worktree': true },
    current === null
      ? h('label', {
          className: 'ph-check-inline ph-wt-toggle',
          title: t('wtAutoHint'),
        },
          h('input', {
            type: 'checkbox',
            checked: props.wanted,
            disabled: props.busy,
            onChange: (event: { target: { checked: boolean } }) => props.onToggle(event.target.checked),
          }),
          h(Icon, { name: 'branch', size: 11 }),
          h('span', null, t('wtAuto')))
      : h('span', { className: 'ph-chip ph-mono', title: String(current.path ?? '') },
          h(Icon, { name: 'branch', size: 11 }),
          h('span', { className: 'ph-ellipsis' }, String(current.branch ?? ''))),
    props.wanted || current !== null
      ? h('select', {
          className: 'ph-select',
          style: { width: 'auto', maxWidth: '168px' },
          value: props.base,
          disabled: props.busy || options.length === 0 || current !== null,
          'aria-label': t('wtBase'),
          title: t('wtBase'),
          onChange: (event: { target: { value: string } }) => props.onBase(event.target.value),
        }, options.length === 0
          ? h('option', { value: '' }, t('wtNoBase'))
          : options.map((option) => h('option', { key: option.value, value: option.value }, option.label)))
      : null,
    props.wanted || current !== null
      ? h('div', { style: { display: 'inline-flex', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '7px', overflow: 'hidden' } },
          (['local', 'remote'] as const).map((kind) => h('button', {
            key: kind,
            type: 'button',
            className: 'ph-filter',
            style: { border: 0, borderRadius: 0 },
            'aria-pressed': props.source === kind ? 'true' : 'false',
            disabled: props.busy || current !== null,
            onClick: () => props.onSource(kind),
          }, kind === 'remote' ? t('wtRemote') : t('wtLocal'))))
      : null,
    creating === null
      ? null
      : h('span', { className: 'ph-chip', 'data-tone': 'business' },
          h('span', { className: 'ph-spinner' }),
          t('wtCreatingBranch', { branch: creating.branch })),
    props.error.length > 0 ? h('span', { className: 'ph-error-text' }, props.error) : null,
    current !== null && props.notice.length > 0 ? h('span', { className: 'ph-ok ph-tiny' }, props.notice) : null)
}

/** What the slot injects. */
export interface WorktreeHeroProps {
  api: GitApi
  t: Translate
  sessionId?: string
  session?: { id?: string }
  useSessions?: (selector: (snapshot: { byId?: Record<string, { cwd?: string }> }) => string) => string
}

/** The worktree option in the New Session row. */
export function WorktreeHero(props: WorktreeHeroProps): ReturnType<typeof h> | null {
  const { t, api } = props
  const sessionId = typeof props.sessionId === 'string'
    ? props.sessionId
    : typeof props.session?.id === 'string' ? props.session.id : ''
  const cwd = typeof props.useSessions === 'function'
    ? props.useSessions((snapshot) => snapshot?.byId?.[sessionId]?.cwd ?? '')
    : ''

  const [info, setInfo] = useState<WorktreeState | undefined>(undefined)
  const [wanted, setWanted] = useState(false)
  const [source, setSource] = useState<'local' | 'remote'>('local')
  const [base, setBase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (sessionId.length === 0) return undefined
    let alive = true
    api.worktreeState({ sessionId, cwd: cwd || undefined, probe: true })
      .then((value) => {
        if (!alive) return
        setInfo(value)
        setSource(value.request?.source ?? value.sourceDefault ?? 'local')
        setBase(value.request?.base ?? value.bases?.defaultBase ?? '')
        setWanted(value.request === null || value.request === undefined ? value.auto !== false : value.request.enabled)
      })
      .catch(() => {
        if (alive) setInfo(undefined)
      })
    return () => {
      alive = false
    }
  }, [api, sessionId, cwd])

  /** Keep one choice, then reflect it locally; the Host creates nothing yet. */
  const apply = useCallback(async (
    next: { wanted: boolean; base: string; source: 'local' | 'remote' },
  ) => {
    if (sessionId.length === 0) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api.worktreeRequest({
        sessionId,
        cwd: cwd || undefined,
        enabled: next.wanted,
        base: next.base,
        source: next.source,
      })
      setWanted(next.wanted)
      setBase(next.base)
      setSource(next.source)
      setNotice(next.wanted
        ? t('wtNextMessage', { branch: next.base.length > 0 ? next.base : t('wtDefaultBranch') })
        : t('wtOff'))
    } catch (failure) {
      setError(`${t('wtFailed')}: ${messageOf(failure)}`)
    } finally {
      setBusy(false)
    }
  }, [api, sessionId, cwd, t])

  if (sessionId.length === 0 || info === undefined) return null

  return h(WorktreeOption, {
    t,
    info,
    source,
    base,
    wanted,
    busy,
    error,
    notice,
    onToggle: (next: boolean) => void apply({ wanted: next, base, source }),
    onBase: (value: string) => void apply({ wanted, base: value, source }),
    onSource: (kind: 'local' | 'remote') => {
      const list = kind === 'remote' ? info.bases?.remote ?? [] : info.bases?.local ?? []
      const preferred = info.bases?.defaultBase ?? ''
      const names = list.map((item) => (kind === 'remote' ? (item as { branch: string }).branch : item.name))
      const next = names.includes(preferred) ? preferred : names[0] ?? ''
      void apply({ wanted, base: next, source: kind })
    },
  })
}

/** What the conversation input dock injects. */
export interface WorktreeDockProps {
  api: GitApi
  t: Translate
  sessionId?: string
  session?: { id?: string }
  useSessions?: (selector: (snapshot: { byId?: Record<string, { cwd?: string }> }) => string) => string
}

/** Props of the pure status card. */
export interface WorktreeDockCardProps {
  t: Translate
  /** The checkout being created for the waiting message. */
  creating: WorktreeCreation | null
  /** The Session's recorded request, which carries a failure. */
  request: WorktreeRequest | null
  /** The branch of a checkout that just became the Session's folder. */
  created: string
  busy: boolean
  error: string
  onRetry(): void
  onContinue(): void
  onDismiss(): void
}

/**
 * The card itself: one creation in flight, the success just after it, or the
 * failure that let the message go on in the project folder.
 */
export function WorktreeDockCard(props: WorktreeDockCardProps): ReturnType<typeof h> | null {
  const { t } = props
  const failed = props.request !== null && props.request.error !== null && props.request.error !== undefined
  if (!failed && props.creating === null && props.created.length === 0) return null

  const detail = props.creating === null
    ? failed
      ? t('wtDockFailedHint', { base: props.request?.base.length === 0 ? t('wtDefaultBranch') : String(props.request?.base) })
      : t('wtDockCreatedHint')
    : t('wtDockHint', {
        base: props.creating.remote
          ? `${props.creating.remote}/${props.creating.base ?? ''}`
          : String(props.creating.base ?? ''),
      })
  const title = props.creating === null
    ? failed ? t('wtDockFailed') : t('wtDockCreated', { branch: props.created })
    : t('wtDockCreating', { branch: props.creating.branch })

  return h('div', {
    className: 'ph-dock',
    'data-tone': failed ? 'error' : props.creating === null ? 'success' : 'busy',
    role: props.creating === null && !failed ? 'status' : undefined,
  },
    h('span', { className: 'ph-dock-icon' },
      props.creating === null
        ? h(Icon, { name: failed ? 'alert' : 'check', size: 13 })
        : h('span', { className: 'ph-spinner' })),
    h('span', { className: 'ph-dock-text' },
      h('span', { className: 'ph-dock-title' }, title),
      h('span', { className: 'ph-dock-detail' }, detail)),
    props.error.length > 0 ? h('span', { className: 'ph-error-text' }, props.error) : null,
    h('span', { className: 'ph-spacer' }),
    failed
      ? h('button', {
          type: 'button',
          className: 'ph-button',
          disabled: props.busy,
          onClick: props.onContinue,
        }, t('wtDockContinue'))
      : null,
    failed
      ? h('button', {
          type: 'button',
          className: 'ph-primary',
          disabled: props.busy,
          onClick: props.onRetry,
        }, t('wtDockRetry'))
      : h('button', {
          type: 'button',
          className: 'ph-icon-button',
          title: t('wtDockDismiss'),
          'aria-label': t('wtDockDismiss'),
          onClick: props.onDismiss,
        }, h(Icon, { name: 'cross', size: 11 })))
}

/** The status card above the composer while a message waits for its checkout. */
export function WorktreeDock(props: WorktreeDockProps): ReturnType<typeof h> | null {
  const { t, api } = props
  const sessionId = typeof props.sessionId === 'string'
    ? props.sessionId
    : typeof props.session?.id === 'string' ? props.session.id : ''
  const cwd = typeof props.useSessions === 'function'
    ? props.useSessions((snapshot) => snapshot?.byId?.[sessionId]?.cwd ?? '')
    : ''

  const [info, setInfo] = useState<WorktreeState | undefined>(undefined)
  const [created, setCreated] = useState('')
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const creating = info?.creating ?? null
  const request = info?.request ?? null
  const waiting = info !== undefined
    && info.current === null
    && (creating !== null || (request !== null && request.enabled && request.error === null))
  // A new chat has no checkout yet, and its first message is what creates one.
  const fresh = info !== undefined && info.current === null && info.started !== true && info.supported === true
  const poll = waiting || fresh

  useEffect(() => {
    if (sessionId.length === 0 || !poll) return undefined
    let alive = true
    let stopped = false
    const load = async (): Promise<void> => {
      try {
        const value = await api.worktreeState({ sessionId, cwd: cwd || undefined, lite: true })
        if (!alive) return
        setInfo(value)
        if (value.current !== null && value.current !== undefined) {
          setCreated(value.current.branch)
          stopped = true
        }
      } catch {
        // A failed poll keeps the last card on screen; the next one asks again.
      }
    }
    void load()
    const timer = setInterval(() => {
      if (stopped) return
      void load()
    }, DOCK_POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [api, sessionId, cwd, poll])

  useEffect(() => {
    if (created.length === 0) return undefined
    const timer = setTimeout(() => setCreated(''), DOCK_SUCCESS_MS)
    return () => clearTimeout(timer)
  }, [created])

  // The first load has to happen even when nothing looks interesting yet.
  useEffect(() => {
    if (sessionId.length === 0 || info !== undefined) return undefined
    let alive = true
    api.worktreeState({ sessionId, cwd: cwd || undefined, lite: true })
      .then((value) => {
        if (alive) setInfo(value)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [api, sessionId, cwd, info])

  const retry = async (): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      const answer = await api.worktreeRequest({ sessionId, cwd: cwd || undefined, enabled: true, retry: true })
      setInfo((previous) => (previous === undefined ? previous : { ...previous, request: answer.request }))
      setHidden(false)
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setBusy(false)
    }
  }

  const continueHere = async (): Promise<void> => {
    setBusy(true)
    try {
      const answer = await api.worktreeRequest({ sessionId, cwd: cwd || undefined, enabled: false })
      setInfo((previous) => (previous === undefined ? previous : { ...previous, request: answer.request }))
      setHidden(true)
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setBusy(false)
    }
  }

  if (hidden || sessionId.length === 0 || info === undefined) return null

  return h(WorktreeDockCard, {
    t,
    creating,
    request,
    created,
    busy,
    error,
    onRetry: () => void retry(),
    onContinue: () => void continueHere(),
    onDismiss: () => setHidden(true),
  })
}
