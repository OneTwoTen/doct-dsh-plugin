/**
 * The change-request list and one change request in full.
 */
import { h } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import { useLoader, relativeTime } from '../hooks.ts'
import type { Translate } from '../i18n.ts'
import type { GitApi } from '../api.ts'
import { Empty, Failure, Loading, DetailBar, Filters, ForgeNotice, PullMeta, CheckRow, reviewLabel, stateLabel } from './common.tsx'
import { Counts } from './diff-view.tsx'
import type { ForgeState } from '../../shared/protocol.ts'

/** Props of the change-request list. */
export interface PullsViewProps {
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

/** The change-request list. */
export function PullsView(props: PullsViewProps): ReturnType<typeof h> {
  const { t, api } = props
  const state = useLoader(
    () => api.pulls({
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
  const pulls = value.pulls ?? []
  return h('div', null,
    h(Filters, {
      value: props.filter,
      onChange: props.onFilter,
      options: [
        { id: 'open', label: t('gitFilterOpen') },
        { id: 'merged', label: t('gitFilterMerged') },
        { id: 'closed', label: t('gitFilterClosed') },
        { id: 'all', label: t('gitFilterAll') },
      ],
    }),
    pulls.length === 0
      ? h(Empty, { icon: 'merge', title: t('gitEmptyPulls'), hint: t('gitEmptyPullsHint') })
      : h('div', null, pulls.map((pull) => h('button', {
          key: pull.number,
          type: 'button',
          className: 'ph-item',
          onClick: () => props.onSelect(pull.number),
        },
          h('span', { className: 'ph-item-title' },
            h('span', { className: 'ph-dot', 'data-state': pull.state }),
            h('span', { className: 'ph-item-number' }, `#${pull.number}`),
            h('span', { className: 'ph-item-text' }, pull.title)),
          h(PullMeta, { t, pull })))))
}

/** Props of one change request's detail. */
export interface PullPaneProps {
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  revision: number
  number: number
  onBack(): void
}

/** One change request in full: checks, review, body, comments, and its files. */
export function PullPane(props: PullPaneProps): ReturnType<typeof h> {
  const { t, api } = props
  const state = useLoader(
    () => api.pullRequest({
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
  const pull = value.pull
  if (pull === undefined) {
    return h('div', null, h(DetailBar, { t, name: `#${props.number}`, onBack: props.onBack }), h(Empty, { title: t('gitEmptyPulls') }))
  }
  const reviews = (value.reviews ?? []).filter((review) => review.state !== 'commented' || review.body.length > 0)
  return h('div', null,
    h(DetailBar, { t, name: `#${pull.number}`, onBack: props.onBack },
      pull.url.length > 0
        ? h('a', {
            className: 'ph-icon-button',
            href: pull.url,
            target: '_blank',
            rel: 'noreferrer noopener',
            title: t('gitOpenOnWeb'),
            'aria-label': t('gitOpenOnWeb'),
          }, h(Icon, { name: 'external', size: 13 }))
        : null),
    h('div', { className: 'ph-detail' },
      h('div', { className: 'ph-detail-title' }, pull.title),
      h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
        h('span', { className: 'ph-chip', 'data-tone': pull.state === 'merged' ? 'business' : pull.state === 'closed' ? 'error' : 'success' },
          h('span', { className: 'ph-dot', 'data-state': pull.state }),
          stateLabel(t, pull.state)),
        pull.branch.length > 0 ? h('span', { className: 'ph-chip ph-mono' }, t('gitFrom', { branch: pull.branch })) : null,
        pull.base.length > 0 ? h('span', { className: 'ph-chip ph-mono' }, `→ ${pull.base}`) : null),
      h('div', { className: 'ph-detail-meta' },
        h('div', { className: 'ph-detail-row' },
          h('span', { className: 'ph-detail-label' }, t('gitAuthor')),
          h('span', { className: 'ph-detail-value' }, pull.author.length > 0 ? pull.author : '—')),
        h('div', { className: 'ph-detail-row' },
          h('span', { className: 'ph-detail-label' }, t('gitUpdated')),
          h('span', { className: 'ph-detail-value' }, relativeTime(pull.updatedAt))),
        h('div', { className: 'ph-detail-row' },
          h('span', { className: 'ph-detail-label' }, t('gitReview')),
          h('span', { className: 'ph-detail-value' }, reviewLabel(t, pull.review))),
        h('div', { className: 'ph-detail-row' },
          h('span', { className: 'ph-detail-label' }, t('gitMergeable')),
          h('span', { className: 'ph-detail-value' },
            pull.mergeable === true ? t('gitMergeable') : pull.mergeable === false ? t('gitConflicting') : t('gitMergeUnknown'))),
        h('div', { className: 'ph-detail-row' },
          h('span', { className: 'ph-detail-label' }, t('gitFilesHeading')),
          h('span', { className: 'ph-detail-value' },
            t('gitChangedFiles', { count: pull.changedFiles }),
            h(Counts, { additions: pull.additions, deletions: pull.deletions })))),
      h('div', { className: 'ph-card' },
        h('div', { className: 'ph-card-title' }, h(Icon, { name: 'check', size: 12 }), t('gitChecks')),
        value.checksUnavailable === true
          ? h('div', { className: 'ph-dim ph-tiny' }, t('gitChecksUnavailable'))
          : (value.checks ?? []).length === 0
            ? h('div', { className: 'ph-dim ph-tiny' }, t('gitNoChecks'))
            : (value.checks ?? []).map((check) => h(CheckRow, { key: check.name, check }))),
      h('div', { className: 'ph-card' },
        h('div', { className: 'ph-card-title' }, h(Icon, { name: 'file', size: 12 }), t('gitDescription')),
        (value.body ?? '').length === 0
          ? h('div', { className: 'ph-dim ph-tiny' }, t('gitNoDescription'))
          : h('p', { className: 'ph-prose' }, value.body)),
      reviews.length === 0 ? null : h('div', { className: 'ph-card' },
        h('div', { className: 'ph-card-title' }, h(Icon, { name: 'comment', size: 12 }), t('gitReview')),
        reviews.map((review, index) => h('div', { key: `review-${index}`, className: 'ph-comment' },
          h('div', { className: 'ph-comment-head' },
            h('span', { className: 'ph-comment-author' }, review.author.length > 0 ? review.author : '—'),
            h('span', null, review.state),
            review.submittedAt === null ? null : h('span', null, relativeTime(review.submittedAt))),
          review.body.length > 0 ? h('p', { className: 'ph-prose' }, review.body) : null))),
      (value.files ?? []).length === 0 ? null : h('div', { className: 'ph-card' },
        h('div', { className: 'ph-card-title' }, h(Icon, { name: 'folder', size: 12 }), t('gitFilesHeading')),
        (value.files ?? []).map((file) => h('div', { key: file.path, className: 'ph-row' },
          h('span', { className: 'ph-ellipsis', style: { flex: '1 1 auto' }, title: file.path }, file.path),
          h(Counts, { additions: file.additions, deletions: file.deletions })))),
      (value.comments ?? []).length === 0 ? null : h('div', { className: 'ph-card' },
        h('div', { className: 'ph-card-title' }, h(Icon, { name: 'comment', size: 12 }), t('gitCommented', { count: (value.comments ?? []).length })),
        (value.comments ?? []).map((comment, index) => h('div', { key: `comment-${index}`, className: 'ph-comment' },
          h('div', { className: 'ph-comment-head' },
            h('span', { className: 'ph-comment-author' }, comment.author.length > 0 ? comment.author : '—'),
            h('span', null, relativeTime(comment.createdAt))),
          h('p', { className: 'ph-prose' }, comment.body))))))
}
