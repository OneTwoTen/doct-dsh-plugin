/**
 * The create-pull-request dialog.
 *
 * It drafts the title and description with the Session's model, shows both for
 * review, and only pushes and opens the request after the user accepts them.
 * Editing either field or asking for another draft never touches the repository.
 */
import { h, useEffect, useState } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import type { Translate } from '../i18n.ts'
import { currentLocale } from '../i18n.ts'
import type { GitApi } from '../api.ts'
import { codeOf, messageOf } from '../api.ts'

/** Props of the create dialog. */
export interface CreatePullDialogProps {
  api: GitApi
  t: Translate
  sessionId?: string
  cwd?: string
  /** The base branch the panel already knows, if any. */
  base?: string
  onClose(): void
  onCreated(pull: { number: number | null; url: string; title: string }): void
}

/** The dialog. */
export function CreatePullDialog(props: CreatePullDialogProps): ReturnType<typeof h> {
  const { t, api } = props
  const [base, setBase] = useState(props.base ?? '')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [drafting, setDrafting] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [draftSource, setDraftSource] = useState<{ source: string; model: string | null; error: string | null } | null>(null)
  const [ahead, setAhead] = useState(0)
  const [branchHint, setBranchHint] = useState('')

  /** Ask the Host for a draft, optionally against a new base. */
  const draft = async (nextBase?: string): Promise<void> => {
    setDrafting(true)
    setError('')
    setDraftSource(null)
    try {
      const value = await api.draftPull({
        sessionId: props.sessionId,
        cwd: props.cwd || undefined,
        base: nextBase ?? (base.trim().length > 0 ? base.trim() : undefined),
        locale: currentLocale(t),
      })
      setBase(value.base)
      setTitle(value.title)
      setBody(value.body)
      setAhead(value.ahead)
      setDraftSource({ source: value.source, model: value.model, error: value.error })
    } catch (failure) {
      setError(messageOf(failure))
      if (codeOf(failure) === 'pr/same-branch') {
        setBranchHint(t('gitPrDefaultBranchHint', { branch: base || 'main' }))
      }
    } finally {
      setDrafting(false)
    }
  }

  useEffect(() => {
    void draft()
    // The dialog drafts once for the branch it was opened on.
  }, [])

  /** Push the branch and open the request with the edited text. */
  const create = async (): Promise<void> => {
    if (creating || drafting || title.trim().length === 0) return
    setCreating(true)
    setError('')
    try {
      const answer = await api.createPull({
        sessionId: props.sessionId,
        cwd: props.cwd || undefined,
        base: base.trim().length > 0 ? base.trim() : undefined,
        title: title.trim(),
        body,
        push: true,
        locale: currentLocale(t),
      })
      props.onCreated({
        number: answer.pull.number,
        url: answer.pull.url,
        title: answer.pull.title,
      })
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setCreating(false)
    }
  }

  const sourceLine = (): string => {
    if (drafting) return t('gitPrDrafting')
    if (draftSource === null) return ''
    if (draftSource.source === 'model') {
      return draftSource.model === null ? t('gitPrDraftModel') : t('gitPrDraftModel', { model: draftSource.model })
    }
    if (draftSource.source === 'manual') return ''
    return draftSource.error === null
      ? t('gitPrDraftFallback')
      : t('gitPrDraftFallbackReason', { reason: draftSource.error })
  }

  const canCreate = !drafting && !creating && ahead > 0 && title.trim().length > 0

  return h('div', { className: 'ph-overlay', role: 'presentation' },
    h('div', {
      className: 'ph-dialog ph-create',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': t('gitPrAction'),
    },
      h('div', { className: 'ph-create-head' },
        h('span', { className: 'ph-create-title' }, h(Icon, { name: 'branchPlus', size: 14 }), t('gitPrAction')),
        h('button', {
          type: 'button',
          className: 'ph-icon-button',
          title: t('gitPrCancel'),
          'aria-label': t('gitPrCancel'),
          onClick: props.onClose,
        }, h(Icon, { name: 'cross', size: 13 }))),

      h('p', { className: 'ph-hint' }, t('gitPrConfirmHint')),

      h('div', { className: 'ph-create-fields' },
        h('label', { className: 'ph-field' },
          h('span', { className: 'ph-field-label' }, t('gitPrBase')),
          h('input', {
            className: 'ph-input',
            value: base,
            spellcheck: false,
            disabled: creating || drafting,
            onChange: (event: { target: { value: string } }) => setBase(event.target.value),
          })),
        h('label', { className: 'ph-field' },
          h('span', { className: 'ph-field-label' }, t('gitPrTitleLabel')),
          h('input', {
            className: 'ph-input',
            value: title,
            spellcheck: false,
            disabled: creating || drafting,
            placeholder: t('gitPrTitlePlaceholder'),
            onInput: (event: { target: { value: string } }) => setTitle(event.target.value),
            onChange: (event: { target: { value: string } }) => setTitle(event.target.value),
          })),
        h('label', { className: 'ph-field' },
          h('span', { className: 'ph-field-label' }, t('gitPrBodyLabel')),
          h('textarea', {
            className: 'ph-textarea ph-create-body',
            value: body,
            spellcheck: false,
            disabled: creating || drafting,
            placeholder: t('gitPrBodyPlaceholder'),
            onInput: (event: { target: { value: string } }) => setBody(event.target.value),
            onChange: (event: { target: { value: string } }) => setBody(event.target.value),
          })),
        sourceLine().length > 0
          ? h('p', { className: 'ph-dim ph-tiny ph-create-source' },
              drafting ? h('span', { className: 'ph-spinner' }) : null,
              sourceLine())
          : null,
        ahead === 0 && !drafting
          ? h('p', { className: 'ph-hint' }, t('gitPrNoCommitsHint'))
          : null),

      branchHint.length > 0 ? h('p', { className: 'ph-hint' }, branchHint) : null,
      error.length > 0 ? h('p', { className: 'ph-error-text' }, `${t('gitPrFailed')}: ${error}`) : null,

      h('div', { className: 'ph-dialog-actions' },
        h('button', {
          type: 'button',
          className: 'ph-button',
          disabled: drafting || creating,
          onClick: () => void draft(),
        }, h(Icon, { name: 'sparkles', size: 11 }), drafting ? t('gitPrDrafting') : t('gitPrRegenerate')),
        h('span', { className: 'ph-spacer' }),
        h('button', {
          type: 'button',
          className: 'ph-button',
          disabled: creating,
          onClick: props.onClose,
        }, t('gitPrCancel')),
        h('button', {
          type: 'button',
          className: 'ph-primary',
          disabled: !canCreate,
          onClick: () => void create(),
        }, creating ? t('gitPrCreating') : t('gitPrCreate')))))
}
