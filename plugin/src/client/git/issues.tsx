/**
 * The issue list and one issue in full.
 */
import { h } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import { useLoader, relativeTime } from '../hooks.ts'
import type { Translate } from '../i18n.ts'
import type { GitApi } from '../api.ts'
import { Empty, Failure, Loading, DetailBar, Filters, ForgeNotice } from './common.tsx'
import type { ForgeState } from '../../shared/protocol.ts'

/** Props of the issue list. */
export interface IssuesViewProps {
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  revision: number
  filter: string
  forgeState: ForgeState | undefined
  onFilter(next: string): void
  onSelect(number: number): void
}

/** The issue list. */
export function IssuesView(props: IssuesViewProps): ReturnType<typeof h> {
  const { t, api } = props
  const state = useLoader(
    () => api.issues({
      sessionId: props.sessionId,
      cwd: props.cwd || undefined,
      state: props.filter,
      limit: 30,
    }),
    [props.sessionId, props.cwd, props.filter, props.revision],
  )
  if (state.status === 'error' && state.value === undefined) {
    return h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry') })
  }
  const value = state.value
  if (value === undefined) return h(Loading, { label: t('gitLoading') })
  if (value.available !== true) return h(ForgeNotice, { t, forge: props.forgeState ?? value })
  const issues = value.issues ?? []
  return h('div', null,
    h(Filters, {
      value: props.filter,
      onChange: props.onFilter,
      options: [
        { id: 'open', label: t('gitFilterOpen') },
        { id: 'closed', label: t('gitFilterClosed') },
        { id: 'all', label: t('gitFilterAll') },
      ],
    }),
    issues.length === 0
      ? h(Empty, { icon: 'issue', title: t('gitEmptyIssues'), hint: t('gitEmptyIssuesHint') })
      : h('div', null, issues.map((issue) => h('button', {
          key: issue.number,
          type: 'button',
          className: 'ph-item',
          onClick: () => props.onSelect(issue.number),
        },
          h('span', { className: 'ph-item-title' },
            h('span', { className: 'ph-glyph', style: { color: issue.state === 'open' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-label-tertiary)' } },
              h(Icon, { name: 'issue', size: 12 })),
            h('span', { className: 'ph-item-number' }, `#${issue.number}`),
            h('span', { className: 'ph-item-text' }, issue.title)),
          h('span', { className: 'ph-item-meta' },
            issue.labels.map((label) => h('span', { key: label.name, className: 'ph-chip' }, label.name)),
            issue.author.length > 0 ? h('span', null, t('gitBy', { author: issue.author })) : null,
            issue.commentCount > 0 ? h('span', null, t('gitCommented', { count: issue.commentCount })) : null,
            h('span', null, relativeTime(issue.updatedAt)))))))
}

/** Props of one issue's detail. */
export interface IssuePaneProps {
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  revision: number
  number: number
  onBack(): void
}

/** One issue in full. */
export function IssuePane(props: IssuePaneProps): ReturnType<typeof h> {
  const { t, api } = props
  const state = useLoader(
    () => api.issue({
      sessionId: props.sessionId,
      cwd: props.cwd || undefined,
      number: props.number,
    }),
    [props.number, props.revision, props.sessionId, props.cwd],
  )
  if (state.status === 'error' && state.value === undefined) {
    return h('div', null,
      h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }),
      h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry') }))
  }
  if (state.value === undefined) {
    return h('div', null, h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }), h(Loading, { label: t('gitLoading') }))
  }
  const value = state.value
  if (value.available !== true) {
    return h('div', null, h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }), h(ForgeNotice, { t, forge: value }))
  }
  const issue = value.issue
  if (issue === undefined) {
    return h('div', null, h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }), h(Empty, { title: t('gitEmptyIssues') }))
  }
  return h('div', null,
    h(DetailBar, { t, name: `#${issue.number}`, onBack: props.onBack },
      issue.url.length > 0
        ? h('a', {
            className: 'ph-icon-button',
            href: issue.url,
            target: '_blank',
            rel: 'noreferrer noopener',
            title: t('gitOpenOnWeb'),
            'aria-label': t('gitOpenOnWeb'),
          }, h(Icon, { name: 'external', size: 13 }))
        : null),
    h('div', { className: 'ph-detail' },
      h('div', { className: 'ph-detail-title' }, issue.title),
      h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
        h('span', { className: 'ph-chip', 'data-tone': issue.state === 'open' ? 'success' : undefined },
          issue.state === 'open' ? t('gitStateOpen') : t('gitStateClosed')),
        issue.labels.map((label) => h('span', { key: label.name, className: 'ph-chip' }, label.name))),
      h('div', { className: 'ph-detail-meta' },
        h('div', { className: 'ph-detail-row' },
          h('span', { className: 'ph-detail-label' }, t('gitAuthor')),
          h('span', { className: 'ph-detail-value' }, issue.author.length > 0 ? issue.author : '—')),
        h('div', { className: 'ph-detail-row' },
          h('span', { className: 'ph-detail-label' }, t('gitUpdated')),
          h('span', { className: 'ph-detail-value' }, relativeTime(issue.updatedAt)))),
      h('div', { className: 'ph-card' },
        h('div', { className: 'ph-card-title' }, h(Icon, { name: 'file', size: 12 }), t('gitDescription')),
        (value.body ?? '').length === 0
          ? h('div', { className: 'ph-dim ph-tiny' }, t('gitNoDescription'))
          : h('p', { className: 'ph-prose' }, value.body)),
      (value.comments ?? []).length === 0 ? null : h('div', { className: 'ph-card' },
        h('div', { className: 'ph-card-title' }, h(Icon, { name: 'comment', size: 12 }), t('gitCommented', { count: (value.comments ?? []).length })),
        (value.comments ?? []).map((comment, index) => h('div', { key: `comment-${index}`, className: 'ph-comment' },
          h('div', { className: 'ph-comment-head' },
            h('span', { className: 'ph-comment-author' }, comment.author.length > 0 ? comment.author : '—'),
            h('span', null, relativeTime(comment.createdAt))),
          h('p', { className: 'ph-prose' }, comment.body))))))
}
