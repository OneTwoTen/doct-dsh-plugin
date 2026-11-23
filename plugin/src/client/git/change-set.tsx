/**
 * The read-only change summary for a multi-repository workspace.
 *
 * The panel's normal views address one repository at a time, so the "All" tab
 * has no commit box: it shows what changed across the workspace and lets the
 * user open a repository before staging or committing anything there.
 */
import { h } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import { useLoader } from '../hooks.ts'
import type { Translate } from '../i18n.ts'
import type { GitApi } from '../api.ts'
import { messageOf } from '../api.ts'
import { Counts } from './diff-view.tsx'
import { Empty, Failure, Loading } from './common.tsx'
import type { GitFileChange, WorkspaceChangeRepo, WorkspaceChangesResult } from '../../shared/protocol.ts'

/** Props of the pure, grouped summary. */
export interface ChangeSetViewProps {
  t: Translate
  result: WorkspaceChangesResult
  /** Open one repository in the normal, single-repository panel. */
  onOpenRepo(id: string): void
}

/** Props of the loader that reads the summary from the Host. */
export interface ChangeSetLoaderProps {
  /** Always the panel's base API: the summary spans repositories, so it must
   * not go through the selected-repository proxy. */
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  revision?: number
  onRefresh?(): void
  onOpenRepo(id: string): void
}

/** One repository's state in the user's language. */
function repoStateLabel(t: Translate, repo: WorkspaceChangeRepo): string {
  if (repo.state === 'ready') return t('gitRepoReady')
  if (repo.state === 'missing') return t('gitRepoMissing')
  if (repo.state === 'error') return t('gitRepoError')
  if (repo.state === 'materializing') return t('gitRepoCreating')
  if (repo.state === 'single') return t('gitRepoMainCheckout')
  return t('gitRepoNotCheckedOut')
}

/** One changed-file row: the path, a repo badge, and its line counts. */
function ChangeFileRow(props: { t: Translate; file: GitFileChange; repo: WorkspaceChangeRepo }): ReturnType<typeof h> {
  const { file, repo } = props
  return h('div', {
    key: `${file.path}:${file.origPath ?? ''}`,
    style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', minWidth: 0 },
  },
    h('span', { className: 'ph-chip ph-tiny', title: repo.name }, repo.name),
    h('span', { className: 'ph-file-path ph-ellipsis', title: file.path }, file.path),
    h('span', { className: 'ph-spacer' }),
    h(Counts, { additions: file.additions, deletions: file.deletions }))
}

/** One repository's group in the workspace-wide summary. */
function ChangeRepoGroup(props: {
  t: Translate
  repo: WorkspaceChangeRepo
  onOpenRepo(id: string): void
}): ReturnType<typeof h> {
  const { t, repo } = props
  const tone = repo.state === 'ready' ? 'success' : repo.state === 'missing' || repo.state === 'error' ? 'error' : 'warn'
  return h('div', { key: repo.id, style: { padding: '8px 0', borderTop: '1px solid var(--dsw-alias-border-l1)' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
      h('span', { style: { fontWeight: 600 } }, repo.name),
      repo.role.length > 0 && repo.role !== repo.name
        ? h('span', { className: 'ph-chip' }, repo.role)
        : null,
      h('span', { className: 'ph-chip ph-mono', title: repo.branch ?? '' }, repo.branch ?? t('gitDetachedHead')),
      h('span', { className: 'ph-chip', 'data-tone': tone }, repoStateLabel(t, repo)),
      h('span', { className: 'ph-dim ph-tiny' },
        t(repo.stats.files === 1 ? 'gitFilesOne' : 'gitFilesMany', { count: repo.stats.files })),
      h(Counts, { additions: repo.stats.additions, deletions: repo.stats.deletions }),
      h('span', { className: 'ph-spacer' }),
      h('button', {
        type: 'button',
        className: 'ph-button',
        onClick: () => props.onOpenRepo(repo.id),
      }, t('gitRepoOpen'))),
    h('div', { className: 'ph-hint ph-tiny ph-ellipsis', title: repo.root }, repo.root),
    repo.error === undefined
      ? null
      : h('div', { className: 'ph-error-text ph-tiny' },
          `${repo.error.code.length > 0 ? `${repo.error.code}: ` : ''}${messageOf(repo.error)}`),
    repo.files.length === 0
      ? h('div', { className: 'ph-hint ph-tiny' }, t('gitChangeSetClean'))
      : h('div', { style: { marginTop: '4px' } },
          repo.files.map((file) => h(ChangeFileRow, { key: file.path, t, file, repo }))))
}

/** The pure, grouped change summary. */
export function ChangeSetView(props: ChangeSetViewProps): ReturnType<typeof h> {
  const { t, result } = props
  return h('div', { style: { padding: '10px 12px', overflow: 'auto', minHeight: 0 } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
      h(Icon, { name: 'git', size: 13 }),
      h('span', { style: { fontWeight: 600 } }, t('gitChangeSetTitle')),
      h('span', { className: 'ph-hint ph-tiny' }, t('gitChangeSetHint'))),
    result.warnings.length === 0
      ? null
      : h('div', { className: 'ph-hint ph-tiny', style: { color: 'var(--dsw-alias-state-warn-primary)' } },
          result.warnings.join(' · ')),
    result.repos.length === 0
      ? h(Empty, { icon: 'git', title: t('gitChangeSetEmpty') })
      : result.repos.map((repo) => h(ChangeRepoGroup, {
          key: repo.id,
          t,
          repo,
          onOpenRepo: props.onOpenRepo,
        })))
}

/** Load the workspace-wide summary from the Host and render its groups. */
export function ChangeSetLoader(props: ChangeSetLoaderProps): ReturnType<typeof h> {
  const { t } = props
  const sessionId = typeof props.sessionId === 'string' ? props.sessionId : ''
  const state = useLoader<WorkspaceChangesResult>(
    () => props.api.workspaceChanges({
      sessionId: sessionId || undefined,
      cwd: props.cwd || undefined,
    }),
    [props.api, sessionId, props.cwd, props.revision ?? 0],
  )
  if (state.status === 'error' && state.value === undefined) {
    return h(Failure, {
      error: state.error,
      title: t('gitChangeSetError'),
      retryLabel: t('gitRetry'),
      onRetry: props.onRefresh,
    })
  }
  if (state.value === undefined) return h(Loading, { label: t('gitLoadingLong') })
  return h(ChangeSetView, { t, result: state.value, onOpenRepo: props.onOpenRepo })
}
