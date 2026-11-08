/**
 * The New Session worktree option.
 *
 * Turning the toggle on creates the checkout at once, because DSH assembles a
 * step's prompt before any hook this plugin may await, so a checkout created
 * "at send" would leave the model's first step describing the old directory.
 * Changing the branch or its source recreates the checkout, which is safe
 * because the Session has not started a turn yet.
 */
import { h, useEffect, useCallback, useState } from './runtime.ts'
import { Icon } from './icons.tsx'
import { messageOf } from './api.ts'
import type { GitApi } from './api.ts'
import type { Translate } from './i18n.ts'
import type { WorktreeState, WorktreeRecord } from '../shared/protocol.ts'

/** Props of the pure option row. */
export interface WorktreeOptionProps {
  t: Translate
  info: WorktreeState | undefined
  source: 'local' | 'remote'
  base: string
  busy: boolean
  error: string
  notice: string
  onEnable(): void
  onRemove(): void
  onBase(value: string): void
  onSource(kind: 'local' | 'remote'): void
}

/** The option row, pure presentation. */
export function WorktreeOption(props: WorktreeOptionProps): ReturnType<typeof h> {
  const { t, info } = props
  const current: WorktreeRecord | null = info?.current ?? null
  const bases = props.source === 'remote' ? info?.bases?.remote ?? [] : info?.bases?.local ?? []
  const options = bases.map((item) => ({
    value: props.source === 'remote' ? (item as { branch: string }).branch : item.name,
    label: item.name,
  }))
  if (props.base.length > 0 && !options.some((option) => option.value === props.base)) {
    options.unshift({ value: props.base, label: props.base })
  }
  return h('span', { className: 'ph-wrap', 'data-personal-hub-worktree': true },
    current === null
      ? h('button', {
          type: 'button',
          className: 'ph-button',
          'aria-pressed': props.busy ? 'true' : 'false',
          title: t('wtHint'),
          disabled: props.busy || options.length === 0,
          onClick: props.onEnable,
        }, h(Icon, { name: 'folder', size: 11 }), props.busy ? t('wtBusy') : t('wtOption'))
      : h('span', { className: 'ph-chip ph-mono', title: String(current.path ?? '') },
          h(Icon, { name: 'branch', size: 11 }),
          h('span', { className: 'ph-ellipsis' }, String(current.branch ?? '')),
          h('button', {
            type: 'button',
            className: 'ph-icon-button',
            style: { width: '16px', height: '16px' },
            title: t('wtRemove'),
            'aria-label': t('wtRemove'),
            disabled: props.busy,
            onClick: props.onRemove,
          }, h(Icon, { name: 'cross', size: 10 }))),
    h('select', {
      className: 'ph-select',
      style: { width: 'auto', maxWidth: '168px' },
      value: props.base,
      disabled: props.busy || options.length === 0,
      'aria-label': t('wtBase'),
      title: t('wtBase'),
      onChange: (event: { target: { value: string } }) => props.onBase(event.target.value),
    }, options.length === 0
      ? h('option', { value: '' }, t('wtNoBase'))
      : options.map((option) => h('option', { key: option.value, value: option.value }, option.label))),
    current === null
      ? h('div', { style: { display: 'inline-flex', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '7px', overflow: 'hidden' } },
          (['local', 'remote'] as const).map((kind) => h('button', {
            key: kind,
            type: 'button',
            className: 'ph-filter',
            style: { border: 0, borderRadius: 0 },
            'aria-pressed': props.source === kind ? 'true' : 'false',
            disabled: props.busy,
            onClick: () => props.onSource(kind),
          }, kind === 'remote' ? t('wtRemote') : t('wtLocal'))))
      : null,
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
        setSource(value?.sourceDefault === 'remote' ? 'remote' : 'local')
        setBase(value?.bases?.defaultBase ?? '')
      })
      .catch(() => {
        if (alive) setInfo({ enabled: false, supported: false, reason: null, sessionId, current: null, bases: null, project: null })
      })
    return () => {
      alive = false
    }
  }, [api, sessionId, cwd])

  const create = useCallback(async (nextBase: string, nextSource: 'local' | 'remote') => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if ((info?.current ?? null) !== null) {
        await api.worktreeRemove({ sessionId, deleteBranch: true })
        setInfo((previous) => (previous === undefined ? previous : { ...previous, current: null }))
      }
      const answer = await api.worktreeCreate({ sessionId, cwd: cwd || undefined, base: nextBase, source: nextSource })
      setBase(nextBase)
      setSource(nextSource)
      setInfo((previous) => (previous === undefined ? previous : { ...previous, current: answer.worktree }))
      setNotice(t('wtCreated', { branch: String(answer.worktree?.branch ?? '') }))
    } catch (failure) {
      setError(`${t('wtFailed')}: ${messageOf(failure)}`)
    } finally {
      setBusy(false)
    }
  }, [api, sessionId, cwd, info, t])

  const remove = useCallback(async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api.worktreeRemove({ sessionId, deleteBranch: false })
      setInfo((previous) => (previous === undefined ? previous : { ...previous, current: null }))
      setNotice(t('wtRemoved'))
    } catch (failure) {
      setError(`${t('wtFailed')}: ${messageOf(failure)}`)
    } finally {
      setBusy(false)
    }
  }, [api, sessionId, t])

  if (sessionId.length === 0 || info === undefined) return null
  const current = info.current ?? null

  return h(WorktreeOption, {
    t,
    info,
    source,
    base,
    busy,
    error,
    notice,
    onEnable: () => void create(base, source),
    onRemove: () => void remove(),
    onBase: (value: string) => {
      setBase(value)
      if (current !== null) void create(value, source)
    },
    onSource: (kind: 'local' | 'remote') => {
      const list = kind === 'remote' ? info.bases?.remote ?? [] : info.bases?.local ?? []
      const preferred = info.bases?.defaultBase ?? ''
      const names = list.map((item) => (kind === 'remote' ? (item as { branch: string }).branch : item.name))
      const next = names.includes(preferred) ? preferred : names[0] ?? ''
      setSource(kind)
      setBase(next)
      if (current !== null) void create(next, kind)
    },
  })
}
