/**
 * The branch switcher: a searchable list of local and remote refs, plus the
 * "create branch" row that appears when the search text names nothing.
 */
import { h, useEffect, useRef, useState } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import type { Translate } from '../i18n.ts'
import type { GitApi } from '../api.ts'
import { messageOf } from '../api.ts'
import type { GitBranch } from '../../shared/protocol.ts'

/** Props of the branch switcher. */
export interface BranchSelectorProps {
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  branch: string | null
  defaultBranch: string | null
  disabled?: boolean
  /** Called after a branch switch or creation, so the panel refreshes. */
  onChanged(branch: string | null): void
}

/** The branch switcher. */
export function BranchSelector(props: BranchSelectorProps): ReturnType<typeof h> {
  const { t, api } = props
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const box = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event: { target: unknown }): void => {
      if (box.current !== null && event.target instanceof Node && !box.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const load = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const answer = await api.branches({
        sessionId: props.sessionId,
        cwd: props.cwd || undefined,
        limit: 120,
        refresh: true,
      })
      setBranches(answer.branches)
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setLoading(false)
    }
  }

  const toggle = (): void => {
    if (props.disabled === true) return
    const next = !open
    setOpen(next)
    setQuery('')
    if (next) void load()
  }

  const switchTo = async (name: string): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      const answer = await api.switchBranch({ sessionId: props.sessionId, cwd: props.cwd || undefined, name })
      setOpen(false)
      props.onChanged(answer.branch)
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setBusy(false)
    }
  }

  const createAndSwitch = async (name: string): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      const answer = await api.createBranch({ sessionId: props.sessionId, cwd: props.cwd || undefined, name })
      setOpen(false)
      props.onChanged(answer.branch)
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setBusy(false)
    }
  }

  const text = query.trim().toLowerCase()
  const matches = branches.filter((item) => text.length === 0 || item.name.toLowerCase().includes(text))
  const exact = branches.some((item) => item.name.toLowerCase() === text)
  const label = props.branch ?? t('gitDetachedHead')

  return h('div', { style: { position: 'relative', minWidth: 0, display: 'flex' }, ref: box },
    h('button', {
      type: 'button',
      className: 'ph-branch-button',
      title: t('gitBranchSelect'),
      'aria-label': t('gitBranchSelect'),
      disabled: props.disabled === true,
      onClick: toggle,
    },
      h(Icon, { name: 'branch', size: 11 }),
      h('span', { className: 'ph-ellipsis' }, label),
      h(Icon, { name: 'chevronDown', size: 10 })),
    open
      ? h('div', { className: 'ph-branch-pop', role: 'dialog', 'aria-label': t('gitBranchSelect') },
          h('div', { className: 'ph-pop-search' },
            h(Icon, { name: 'search', size: 12 }),
            h('input', {
              className: 'ph-pop-input',
              type: 'search',
              autoFocus: true,
              placeholder: t('gitBranchSearch'),
              value: query,
              'aria-label': t('gitBranchSearch'),
              onInput: (event: { target: { value: string } }) => setQuery(event.target.value),
              onChange: (event: { target: { value: string } }) => setQuery(event.target.value),
              onKeyDown: (event: { key: string }) => {
                if (event.key === 'Enter' && text.length > 0 && !exact) void createAndSwitch(query.trim())
              },
            })),
          h('div', { className: 'ph-pop-list' },
            loading
              ? h('div', { className: 'ph-pop-foot' }, t('gitBranchLoading'))
              : matches.length === 0 && text.length === 0
                ? h('div', { className: 'ph-pop-foot' }, t('gitBranchNoMatch'))
                : matches.map((item) => h('button', {
                    key: `${item.isRemote ? 'r' : 'l'}:${item.name}`,
                    type: 'button',
                    className: 'ph-ref',
                    'data-current': item.current ? 'true' : 'false',
                    title: item.subject,
                    disabled: busy,
                    onClick: () => void switchTo(item.name),
                  },
                    h(Icon, { name: item.isRemote ? 'globe' : 'branch', size: 11 }),
                    h('span', { className: 'ph-ref-name' }, item.name),
                    item.isDefault ? h('span', { className: 'ph-ref-tag' }, t('gitBranchDefault')) : null,
                    item.current ? h('span', { className: 'ph-ref-tag' }, t('gitBranchCurrent')) : null,
                    item.isRemote ? h('span', { className: 'ph-ref-tag' }, t('gitBranchRemote')) : null)),
            text.length > 0 && !exact
              ? h('button', {
                  type: 'button',
                  className: 'ph-ref',
                  disabled: busy,
                  onClick: () => void createAndSwitch(query.trim()),
                },
                  h(Icon, { name: 'branchPlus', size: 11 }),
                  h('span', { className: 'ph-ref-name' }, t('gitBranchCreate', { name: query.trim() })))
              : null),
          error.length > 0 ? h('div', { className: 'ph-pop-foot' }, h('span', { className: 'ph-error-text' }, error)) : null)
      : null)
}
