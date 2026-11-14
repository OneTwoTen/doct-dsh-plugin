/**
 * The commit box docked under the change list.
 *
 * It is the commit dialog of the reference implementation, folded into the
 * panel: the selected files, an optional message that is generated when left
 * empty, and the commit actions themselves.
 */
import { h, useState } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import type { Translate } from '../i18n.ts'
import { currentLocale } from '../i18n.ts'
import type { GitApi } from '../api.ts'
import { messageOf } from '../api.ts'
import type { GitFileChange } from '../../shared/protocol.ts'

/** What the commit box asks the panel to run. */
export interface CommitRequest {
  message: string
  paths: string[]
  /** Check out a feature branch named after the message first. */
  featureBranch: boolean
}

/** Props of the commit box. */
export interface CommitComposerProps {
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  files: GitFileChange[]
  selected: Set<string>
  busy: boolean
  onSelectAll(next: boolean): void
  onToggleFile(path: string, next: boolean): void
  onCommit(request: CommitRequest): void
  onToast(title: string, description: string, tone: 'error' | 'success'): void
}

/** The commit box. */
export function CommitComposer(props: CommitComposerProps): ReturnType<typeof h> {
  const { t, api, files } = props
  const [message, setMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [showFiles, setShowFiles] = useState(false)

  const selectedPaths = files.filter((file) => props.selected.has(file.path)).map((file) => file.path)
  const allSelected = files.length > 0 && selectedPaths.length === files.length

  const generate = async (): Promise<void> => {
    setGenerating(true)
    setError('')
    try {
      const draft = await api.draftMessage({
        sessionId: props.sessionId,
        cwd: props.cwd || undefined,
        paths: selectedPaths.length > 0 ? selectedPaths : undefined,
        locale: currentLocale(t),
      })
      setMessage(draft.message)
      if (draft.error !== undefined && draft.source !== 'model') {
        props.onToast(t('gitCommitGenerate'), draft.error, 'error')
      }
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setGenerating(false)
    }
  }

  const commit = (featureBranch: boolean): void => {
    if (props.busy) return
    if (selectedPaths.length === 0) {
      setError(t('gitCommitNoFiles'))
      return
    }
    setError('')
    props.onCommit({ message: message.trim(), paths: selectedPaths, featureBranch })
  }

  return h('div', { className: 'ph-commit', 'data-personal-hub-commit': true },
    h('div', { className: 'ph-commit-head' },
      h(Icon, { name: 'commit', size: 12 }),
      h('span', { style: { fontWeight: 600 } }, t('gitCommitTitle')),
      h('span', { className: 'ph-spacer' }),
      h('span', { className: 'ph-dim ph-tiny' },
        allSelected ? t('gitFilesMany', { count: files.length }) : t('gitCommitSelected', { selected: selectedPaths.length, total: files.length })),
      h('label', {
        className: 'ph-check-inline',
        title: allSelected ? t('gitClearSelection') : t('gitSelectAll'),
      },
        h('input', {
          type: 'checkbox',
          checked: allSelected,
          disabled: files.length === 0,
          'aria-label': allSelected ? t('gitClearSelection') : t('gitSelectAll'),
          onChange: () => props.onSelectAll(!allSelected),
        }),
        h('span', null, allSelected ? t('gitClearSelection') : t('gitSelectAll'))),
      h('button', {
        type: 'button',
        className: 'ph-icon-button',
        title: t('gitFilesHeading'),
        'aria-label': t('gitFilesHeading'),
        'aria-expanded': showFiles ? 'true' : 'false',
        onClick: () => setShowFiles((value) => !value),
      }, h(Icon, { name: 'chevronDown', size: 12 }))),

    showFiles
      ? h('div', { className: 'ph-commit-files' }, files.map((file) => h('button', {
          key: file.path,
          type: 'button',
          className: 'ph-commit-file',
          'data-excluded': props.selected.has(file.path) ? 'false' : 'true',
          title: file.path,
          onClick: () => props.onToggleFile(file.path, !props.selected.has(file.path)),
        },
          h('input', {
            type: 'checkbox',
            checked: props.selected.has(file.path),
            'aria-label': file.path,
            onClick: (event: { stopPropagation(): void }) => event.stopPropagation(),
            onChange: (event: { target: { checked: boolean } }) => props.onToggleFile(file.path, event.target.checked),
          }),
          h('span', { className: 'ph-ellipsis', style: { flex: '1 1 auto' } }, file.path),
          props.selected.has(file.path)
            ? h('span', { className: 'ph-counts' },
                file.additions > 0 ? h('span', { className: 'ph-add' }, `+${file.additions}`) : null,
                file.deletions > 0 ? h('span', { className: 'ph-del' }, `−${file.deletions}`) : null)
            : h('span', { className: 'ph-dim ph-tiny' }, t('gitExcluded')))))
      : null,

    h('div', { className: 'ph-field' },
      h('div', { className: 'ph-row' },
        h('label', { className: 'ph-field-label', htmlFor: 'personal-hub-commit-message' }, t('gitCommitMessage')),
        h('span', { className: 'ph-spacer' }),
        h('button', {
          type: 'button',
          className: 'ph-button',
          title: t('gitCommitGenerate'),
          disabled: generating || props.busy,
          onClick: () => void generate(),
        }, h(Icon, { name: 'sparkles', size: 11 }), generating ? t('gitCommitGenerating') : t('gitCommitGenerate'))),
      h('textarea', {
        id: 'personal-hub-commit-message',
        className: 'ph-textarea',
        value: message,
        placeholder: t('gitCommitPlaceholder'),
        spellcheck: false,
        onInput: (event: { target: { value: string } }) => setMessage(event.target.value),
        onChange: (event: { target: { value: string } }) => setMessage(event.target.value),
        onKeyDown: (event: { key: string; metaKey: boolean; ctrlKey: boolean; preventDefault(): void }) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            commit(false)
          }
        },
      })),

    error.length > 0 ? h('p', { className: 'ph-error-text' }, error) : null,

    h('div', { className: 'ph-commit-actions' },
      h('button', {
        type: 'button',
        className: 'ph-button',
        disabled: props.busy || selectedPaths.length === 0,
        title: t('gitCommitOnNewBranch'),
        onClick: () => commit(true),
      }, h(Icon, { name: 'branchPlus', size: 11 }), t('gitCommitOnNewBranch')),
      h('span', { className: 'ph-spacer' }),
      h('button', {
        type: 'button',
        className: 'ph-primary',
        disabled: props.busy || selectedPaths.length === 0,
        onClick: () => commit(false),
      }, h(Icon, { name: 'commit', size: 11 }), t('gitCommitButton'))),

    h('p', { className: 'ph-hint' }, t('gitCommitHint')))
}
