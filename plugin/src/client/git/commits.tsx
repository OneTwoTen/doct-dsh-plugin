/**
 * The commit log and one commit in full.
 */
import { h } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import { useLoader, relativeTime } from '../hooks.ts'
import type { Translate } from '../i18n.ts'
import type { GitApi } from '../api.ts'
import { Empty, Failure, Loading, DetailBar } from './common.tsx'
import { Counts, StaticPatch } from './diff-view.tsx'

/** Props of the commit list. */
export interface CommitsViewProps {
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  revision: number
  onSelect(hash: string): void
}

/** The commit list. */
export function CommitsView(props: CommitsViewProps): ReturnType<typeof h> {
  const { t, api } = props
  const state = useLoader(
    () => api.commits({ sessionId: props.sessionId, cwd: props.cwd || undefined, limit: 60 }),
    [props.sessionId, props.cwd, props.revision],
  )
  const commits = state.value?.commits ?? []
  if (state.status === 'error' && state.value === undefined) {
    return h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry') })
  }
  if (state.value === undefined) return h(Loading, { label: t('gitLoading') })
  if (commits.length === 0) {
    return h(Empty, { icon: 'commit', title: t('gitCommitListEmpty'), hint: t('gitCommitListEmptyHint') })
  }
  return h('div', null, commits.map((commit) => h('button', {
    key: commit.hash,
    type: 'button',
    className: 'ph-item',
    onClick: () => props.onSelect(commit.hash),
  },
    h('span', { className: 'ph-item-title' },
      h('span', { className: 'ph-item-number' }, commit.short),
      commit.refs.length > 0
        ? h('span', { className: 'ph-chip', 'data-tone': 'business', title: commit.refs }, commit.refs.split(',')[0].trim())
        : null,
      h('span', { className: 'ph-item-text' }, commit.subject)),
    h('span', { className: 'ph-item-meta' },
      h('span', null, commit.author),
      h('span', null, relativeTime(commit.date))))))
}

/** Props of one commit's detail. */
export interface CommitPaneProps {
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  revision: number
  hash: string
  onBack(): void
}

/** One commit: metadata, its files, and its patch. */
export function CommitPane(props: CommitPaneProps): ReturnType<typeof h> {
  const { t, api } = props
  const state = useLoader(
    () => api.commit({ sessionId: props.sessionId, cwd: props.cwd || undefined, hash: props.hash }),
    [props.hash, props.revision, props.sessionId, props.cwd],
  )
  const short = props.hash.slice(0, 8)
  if (state.status === 'error' && state.value === undefined) {
    return h('div', null,
      h(DetailBar, { t, name: short, onBack: props.onBack }),
      h(Failure, { error: state.error, title: t('gitReadError'), retryLabel: t('gitRetry') }))
  }
  if (state.value === undefined) {
    return h('div', null, h(DetailBar, { t, name: short, onBack: props.onBack }), h(Loading, { label: t('gitLoading') }))
  }
  const value = state.value
  const commit = value.commit
  const additions = value.files.reduce((sum, file) => sum + file.additions, 0)
  const deletions = value.files.reduce((sum, file) => sum + file.deletions, 0)
  return h('div', null,
    h(DetailBar, { t, name: commit.short, onBack: props.onBack },
      h(Counts, { additions, deletions })),
    h('div', { className: 'ph-detail' },
      h('div', { className: 'ph-detail-title' }, commit.subject),
      h('div', { className: 'ph-detail-meta' },
        h('div', { className: 'ph-detail-row' },
          h('span', { className: 'ph-detail-label' }, t('gitAuthor')),
          h('span', { className: 'ph-detail-value' }, commit.author)),
        h('div', { className: 'ph-detail-row' },
          h('span', { className: 'ph-detail-label' }, t('gitDate')),
          h('span', { className: 'ph-detail-value' }, relativeTime(commit.date))),
        h('div', { className: 'ph-detail-row' },
          h('span', { className: 'ph-detail-label' }, t('gitHash')),
          h('span', { className: 'ph-detail-value ph-mono ph-tiny' }, commit.hash))),
      commit.body.length > 0 ? h('div', { className: 'ph-card' }, h('p', { className: 'ph-prose' }, commit.body)) : null,
      value.files.length === 0 ? null : h('div', { className: 'ph-card' },
        h('div', { className: 'ph-card-title' }, h(Icon, { name: 'folder', size: 12 }), t('gitFilesHeading')),
        value.files.map((file) => h('div', { key: file.path, className: 'ph-row' },
          h('span', { className: 'ph-ellipsis', style: { flex: '1 1 auto' }, title: file.path }, file.path),
          h(Counts, { additions: file.additions, deletions: file.deletions }))))),
    value.patches.length === 0
      ? null
      : h('div', { style: { display: 'flex', flexDirection: 'column' } },
          value.patches.map((patch, index) => h('section', { key: `${patch.path ?? index}`, className: 'ph-file' },
            h('div', { className: 'ph-file-head', style: { cursor: 'default' } },
              h('span', { className: 'ph-file-path' }, patch.path ?? ''),
              h(Counts, { additions: patch.additions, deletions: patch.deletions })),
            h(StaticPatch, { file: patch, t })))))
}
