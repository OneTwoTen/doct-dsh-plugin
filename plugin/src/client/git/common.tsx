/**
 * Presentation pieces shared by the list and detail views.
 */
import { h } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import type { IconName } from '../icons.tsx'
import type { Translate } from '../i18n.ts'
import { relativeTime } from '../hooks.ts'
import { messageOf, codeOf } from '../api.ts'
import type { ForgeCheck, ForgeState, PullSummary } from '../../shared/protocol.ts'

/** One empty or placeholder state. */
export function Empty(props: { title: string; hint?: string; icon?: IconName }): ReturnType<typeof h> {
  return h('div', { className: 'ph-empty' },
    h('span', { className: 'ph-empty-icon' }, h(Icon, { name: props.icon ?? 'git', size: 26 })),
    h('span', { className: 'ph-empty-title' }, props.title),
    props.hint === undefined ? null : h('span', { className: 'ph-empty-hint' }, props.hint))
}

/** One failed load, with the Host's code so a report can be acted on. */
export function Failure(props: {
  error: unknown
  title: string
  retryLabel: string
  onRetry?: () => void
  hint?: string
}): ReturnType<typeof h> {
  const code = codeOf(props.error)
  return h('div', { className: 'ph-error' },
    h('span', { className: 'ph-error-title' }, h(Icon, { name: 'alert', size: 14 }), props.title),
    h('span', null, messageOf(props.error)),
    code === undefined ? null : h('span', { className: 'ph-error-code' }, code),
    props.onRetry === undefined
      ? null
      : h('button', { type: 'button', className: 'ph-button', onClick: props.onRetry },
          h(Icon, { name: 'refresh', size: 11 }), props.retryLabel),
    props.hint === undefined ? null : h('span', { className: 'ph-dim ph-tiny' }, props.hint))
}

/** A loading row. */
export function Loading(props: { label: string }): ReturnType<typeof h> {
  return h('div', { className: 'ph-loading' }, h('span', { className: 'ph-spinner' }), props.label)
}

/** A detail pane's top bar, with Back and the title. */
export function DetailBar(props: {
  t: Translate
  name: string
  dir?: string
  onBack(): void
  children?: unknown
}): ReturnType<typeof h> {
  return h('div', { className: 'ph-toolbar' },
    h('button', {
      type: 'button',
      className: 'ph-icon-button',
      title: props.t('gitBack'),
      'aria-label': props.t('gitBack'),
      onClick: props.onBack,
    }, h(Icon, { name: 'back', size: 15 })),
    h('span', { className: 'ph-file-path', title: props.name },
      props.dir !== undefined && props.dir.length > 0
        ? [
            h('span', { className: 'ph-file-dir', key: 'dir' }, props.dir.replace(/\/+$/, '')),
            h('span', { className: 'ph-file-sep', key: 'sep' }, '/'),
          ]
        : null,
      h('span', { className: 'ph-file-name' }, props.name)),
    h('span', { className: 'ph-spacer' }),
    props.children as never)
}

/** The filter chips shared by the change-request and issue lists. */
export function Filters(props: {
  value: string
  options: Array<{ id: string; label: string }>
  onChange(next: string): void
}): ReturnType<typeof h> {
  return h('div', { className: 'ph-filters', role: 'group' },
    props.options.map((option) => h('button', {
      key: option.id,
      type: 'button',
      className: 'ph-filter',
      'aria-pressed': props.value === option.id ? 'true' : 'false',
      onClick: () => props.onChange(option.id),
    }, option.label)))
}

/** The panel's own label for a change-request state. */
export function stateLabel(t: Translate, state: string): string {
  switch (state) {
    case 'open':
      return t('gitStateOpen')
    case 'draft':
      return t('gitStateDraft')
    case 'merged':
      return t('gitStateMerged')
    case 'closed':
      return t('gitStateClosed')
    default:
      return state
  }
}

/** The panel's own label for a review verdict. */
export function reviewLabel(t: Translate, review: string): string {
  switch (review) {
    case 'approved':
      return t('gitReviewApproved')
    case 'changes_requested':
      return t('gitReviewChanges')
    case 'review_required':
      return t('gitReviewRequired')
    default:
      return t('gitReviewNone')
  }
}

/** One check row: outcome dot, name, and duration. */
export function CheckRow(props: { check: ForgeCheck }): ReturnType<typeof h> {
  const { check } = props
  const duration = check.startedAt !== null && check.completedAt !== null
    ? Math.max(0, Math.round((Date.parse(check.completedAt) - Date.parse(check.startedAt)) / 1000))
    : null
  const children = [
    h('span', { key: 'dot', className: 'ph-dot', 'data-state': check.state }),
    h('span', { key: 'name', className: 'ph-check-name', title: check.description.length > 0 ? check.description : check.name }, check.name),
    duration === null
      ? null
      : h('span', { key: 'time', className: 'ph-check-duration' }, duration >= 60 ? `${Math.round(duration / 60)}m` : `${duration}s`),
  ]
  if (check.url === null) return h('div', { className: 'ph-check' }, children)
  return h('a', {
    className: 'ph-check',
    href: check.url,
    target: '_blank',
    rel: 'noreferrer noopener',
    style: { color: 'inherit', textDecoration: 'none' },
  }, children)
}

/** The notice shown when the code host cannot be reached or is not signed in. */
export function ForgeNotice(props: { t: Translate; forge: Partial<ForgeState> | undefined }): ReturnType<typeof h> {
  const { t, forge } = props
  const reason = forge?.reason ?? forge?.note ?? ''
  const cli = forge?.cli ?? (forge?.provider === 'gitlab' ? 'glab' : forge?.provider === 'github' ? 'gh' : undefined)
  return h('div', { className: 'ph-notice' },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dsw-alias-label-primary)' } },
      h(Icon, { name: 'alert', size: 14 }),
      h('span', null, t('gitForgeOff'))),
    h('div', { style: { marginTop: '4px' } }, t('gitForgeHint')),
    reason.length > 0 ? h('div', { style: { marginTop: '4px' } }, reason) : null,
    cli === undefined ? null : h('div', { className: 'ph-error-code' }, `${cli} auth login`))
}

/** The chips one change-request row shows. */
export function PullMeta(props: { t: Translate; pull: PullSummary }): ReturnType<typeof h> {
  const { t, pull } = props
  return h('span', { className: 'ph-item-meta' },
    h('span', { className: 'ph-chip', 'data-tone': pull.state === 'merged' ? 'business' : pull.state === 'closed' ? 'error' : undefined },
      h('span', { className: 'ph-dot', 'data-state': pull.state }),
      stateLabel(t, pull.state)),
    pull.checks.total > 0
      ? h('span', {
          className: 'ph-chip',
          'data-tone': pull.checks.state === 'failure' ? 'error' : pull.checks.state === 'pending' ? 'warn' : pull.checks.state === 'success' ? 'success' : undefined,
        },
          h('span', { className: 'ph-dot', 'data-state': pull.checks.state }),
          pull.checks.failure > 0
            ? t('gitChecksFailure', { count: pull.checks.failure })
            : pull.checks.pending > 0
              ? t('gitChecksPending', { count: pull.checks.pending })
              : t('gitChecksSuccess', { count: pull.checks.success }))
      : null,
    pull.review === 'changes_requested' ? h('span', { className: 'ph-chip', 'data-tone': 'error' }, t('gitReviewChanges')) : null,
    pull.review === 'approved' ? h('span', { className: 'ph-chip', 'data-tone': 'success' }, t('gitReviewApproved')) : null,
    pull.branch.length > 0 ? h('span', { className: 'ph-chip ph-mono', title: pull.branch }, pull.branch) : null,
    pull.author.length > 0 ? h('span', null, t('gitBy', { author: pull.author })) : null,
    h('span', null, relativeTime(pull.updatedAt)))
}
