/**
 * The Git actions control: one primary button that names the next useful action,
 * a dropdown for the explicit actions, and the running/success states that
 * replace the whole control while an action runs.
 *
 * The decision table itself lives in `action-logic.ts`, so this file only
 * renders what that module decided.
 */
import { h, useState } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import { formatElapsed, useNowSecond } from '../hooks.ts'
import type { Translate } from '../i18n.ts'
import type { QuickAction, ActionMenuItem } from './action-logic.ts'
import type { GitActionProgress, GitStackedAction } from '../../shared/protocol.ts'

/** One inline success the control shows for a few seconds. */
export interface InlineSuccess {
  title: string
  description: string
  /** A link the success row offers, such as the created pull request. */
  href?: string
  hrefLabel?: string
}

/** Props of the actions control. */
export interface GitActionsProps {
  t: Translate
  quick: QuickAction
  menuItems: ActionMenuItem[]
  running: boolean
  progress: GitActionProgress | null
  success: InlineSuccess | null
  menuOpen: boolean
  onToggleMenu(): void
  onQuick(): void
  onRun(action: GitStackedAction): void
  onOpenPublish(): void
  onPull(): void
  /** Show the reason a disabled action is disabled. */
  onHint(key: string): void
}

/** The control. */
export function GitActions(props: GitActionsProps): ReturnType<typeof h> {
  const { t, quick, progress } = props
  const now = useNowSecond(props.running)

  if (props.running) {
    const label = progress?.label ?? t('gitStarting')
    const startedAt = progress?.startedAt ?? null
    const elapsed = formatElapsed(startedAt, now)
    const output = progress?.output ?? []
    return h('div', { className: 'ph-progress', role: 'status', 'aria-live': 'polite' },
      h('div', { className: 'ph-progress-row' },
        h('span', { className: 'ph-spinner', 'aria-hidden': 'true' }),
        h('span', { className: 'ph-progress-text' }, label),
        elapsed === null ? null : h('span', { className: 'ph-progress-elapsed' }, elapsed)),
      output.length > 0 ? h('p', { className: 'ph-progress-output', title: output[output.length - 1] }, output[output.length - 1]) : null)
  }

  if (props.success !== null) {
    return h('div', { className: 'ph-success', role: 'status', 'aria-live': 'polite' },
      h(Icon, { name: 'check', size: 14, weight: 2 }),
      h('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 auto' } },
        h('span', { className: 'ph-success-text' }, props.success.title),
        props.success.description.length > 0 ? h('span', { className: 'ph-success-desc' }, props.success.description) : null),
      props.success.href === undefined
        ? null
        : h('a', {
            className: 'ph-button',
            href: props.success.href,
            target: '_blank',
            rel: 'noreferrer noopener',
            style: { textDecoration: 'none', flex: 'none' },
          }, h(Icon, { name: 'external', size: 11 }), props.success.hrefLabel ?? t('gitViewPr')))
  }

  const disabled = quick.disabled
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' } },
    h('div', {
      className: 'ph-actions',
      role: 'group',
      'aria-label': t('gitActions'),
      'data-running': 'false',
    },
      h('button', {
        type: 'button',
        className: 'ph-action-primary',
        disabled,
        title: disabled && quick.hintKey !== undefined ? t(quick.hintKey) : undefined,
        'aria-disabled': disabled ? 'true' : 'false',
        onClick: () => {
          if (disabled) {
            if (quick.hintKey !== undefined) props.onHint(quick.hintKey)
            return
          }
          props.onQuick()
        },
      },
        h(Icon, { name: quickIcon(quick), size: 14 }),
        h('span', { className: 'ph-ellipsis' }, t(quick.labelKey))),
      h('button', {
        type: 'button',
        className: 'ph-action-caret',
        title: t('gitActionOptions'),
        'aria-label': t('gitActionOptions'),
        'aria-expanded': props.menuOpen ? 'true' : 'false',
        onClick: props.onToggleMenu,
      }, h(Icon, { name: 'chevronDown', size: 12 }))),

    props.menuOpen
      ? h('div', { className: 'ph-menu', role: 'menu', 'aria-label': t('gitActionOptions') },
          props.menuItems.map((item) => h('button', {
            key: item.id,
            type: 'button',
            role: 'menuitem',
            className: 'ph-menu-item',
            disabled: item.disabled,
            title: item.disabled && item.disabledHintKey !== undefined ? t(item.disabledHintKey) : undefined,
            onClick: () => {
              if (item.disabled) return
              if (item.id === 'commit') props.onRun('commit')
              else if (item.id === 'push') props.onRun('push')
              else props.onRun('create_pr')
            },
          },
            h(Icon, { name: item.id === 'commit' ? 'commit' : item.id === 'push' ? 'upload' : 'merge', size: 13 }),
            h('span', { className: 'ph-ellipsis' }, t(item.labelKey)))),
          props.menuItems.length === 0
            ? h('div', { className: 'ph-menu-hint' }, t('gitHintNoStatus'))
            : null,
          h('div', { className: 'ph-menu-sep' }),
          h('button', {
            type: 'button',
            role: 'menuitem',
            className: 'ph-menu-item',
            onClick: props.onOpenPublish,
          }, h(Icon, { name: 'globe', size: 13 }), h('span', { className: 'ph-ellipsis' }, t('gitActionPublish'))))
      : null,

    disabled && quick.hintKey !== undefined
      ? h('p', { className: 'ph-action-hint' }, t(quick.hintKey))
      : null)
}

/** The icon the primary button carries. */
function quickIcon(quick: QuickAction): 'commit' | 'upload' | 'download' | 'merge' | 'globe' | 'info' {
  if (quick.kind === 'open_publish') return 'globe'
  if (quick.kind === 'run_pull') return 'download'
  if (quick.kind === 'show_hint') return 'info'
  if (quick.action === 'push') return 'upload'
  if (quick.action === 'create_pr' || quick.action === 'commit_push_pr') return 'merge'
  return 'commit'
}

/** Props of the default-branch confirmation. */
export interface DefaultBranchDialogProps {
  t: Translate
  branch: string
  action: GitStackedAction
  includesCommit: boolean
  busy: boolean
  onAbort(): void
  onContinue(): void
  onFeatureBranch(): void
}

/** The confirmation shown before an action runs on the default branch. */
export function DefaultBranchDialog(props: DefaultBranchDialogProps): ReturnType<typeof h> {
  const { t } = props
  const title = props.action === 'push'
    ? t('gitDefaultPushTitle', { branch: props.branch })
    : props.action === 'create_pr'
      ? t('gitDefaultPrTitle', { branch: props.branch })
      : t('gitDefaultTitle', { branch: props.branch })
  return h('div', { className: 'ph-overlay', role: 'presentation' },
    h('div', { className: 'ph-dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { className: 'ph-dialog-title' }, title),
      h('p', { className: 'ph-dialog-body' }, t('gitDefaultBody', { branch: props.branch })),
      props.includesCommit ? null : h('p', { className: 'ph-hint' }, t('gitDefaultWarning')),
      h('div', { className: 'ph-dialog-actions' },
        h('button', { type: 'button', className: 'ph-button', disabled: props.busy, onClick: props.onAbort }, t('gitDefaultAbort')),
        h('button', { type: 'button', className: 'ph-button', disabled: props.busy, onClick: props.onFeatureBranch }, t('gitDefaultFeature')),
        h('button', { type: 'button', className: 'ph-primary', disabled: props.busy, onClick: props.onContinue },
          t('gitDefaultContinue', { branch: props.branch })))))
}

/** Props of the publish dialog. */
export interface PublishDialogProps {
  t: Translate
  providers: Array<{ id: 'github' | 'gitlab'; label: string; ready: boolean }>
  busy: boolean
  error: string
  onCancel(): void
  onPublish(provider: 'github' | 'gitlab', repository: string, visibility: 'private' | 'public'): void
}

/** The publish-repository wizard, reduced to one step. */
export function PublishDialog(props: PublishDialogProps): ReturnType<typeof h> {
  const { t } = props
  const ready = props.providers.filter((item) => item.ready)
  const [provider, setProvider] = useProvider(ready[0]?.id ?? props.providers[0]?.id ?? 'github')
  const [repository, setRepository] = useRepository('')
  const [visibility, setVisibility] = useVisibility('private')
  return h('div', { className: 'ph-overlay', role: 'presentation' },
    h('div', { className: 'ph-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('gitPublishTitle') },
      h('div', { className: 'ph-dialog-title' }, t('gitPublishTitle')),
      h('p', { className: 'ph-dialog-body' }, t('gitPublishHint')),
      h('div', { className: 'ph-field' },
        h('span', { className: 'ph-field-label' }, t('gitPublishProvider')),
        props.providers.map((item) => h('label', {
          key: item.id,
          className: 'ph-radio',
          'data-checked': provider === item.id ? 'true' : 'false',
        },
          h('input', {
            type: 'radio',
            name: 'personal-hub-publish-provider',
            checked: provider === item.id,
            disabled: !item.ready || props.busy,
            onChange: () => setProvider(item.id),
          }),
          h('span', { className: 'ph-radio-text' },
            h('span', { className: 'ph-radio-title' }, item.label),
            item.ready ? null : h('span', { className: 'ph-radio-hint' }, t('gitActionUnavailable')))))),
      h('label', { className: 'ph-field' },
        h('span', { className: 'ph-field-label' }, t('gitPublishRepository')),
        h('input', {
          className: 'ph-input',
          value: repository,
          placeholder: 'owner/repository',
          spellcheck: false,
          disabled: props.busy,
          onInput: (event: { target: { value: string } }) => setRepository(event.target.value),
          onChange: (event: { target: { value: string } }) => setRepository(event.target.value),
        })),
      h('div', { className: 'ph-field' },
        h('span', { className: 'ph-field-label' }, t('gitPublishVisibility')),
        h('label', { className: 'ph-radio', 'data-checked': visibility === 'private' ? 'true' : 'false' },
          h('input', { type: 'radio', name: 'personal-hub-publish-visibility', checked: visibility === 'private', disabled: props.busy, onChange: () => setVisibility('private') }),
          h('span', { className: 'ph-radio-text' },
            h('span', { className: 'ph-radio-title' }, t('gitPublishPrivate')),
            h('span', { className: 'ph-radio-hint' }, t('gitPublishPrivateHint')))),
        h('label', { className: 'ph-radio', 'data-checked': visibility === 'public' ? 'true' : 'false' },
          h('input', { type: 'radio', name: 'personal-hub-publish-visibility', checked: visibility === 'public', disabled: props.busy, onChange: () => setVisibility('public') }),
          h('span', { className: 'ph-radio-text' },
            h('span', { className: 'ph-radio-title' }, t('gitPublishPublic')),
            h('span', { className: 'ph-radio-hint' }, t('gitPublishPublicHint'))))),
      props.error.length > 0 ? h('p', { className: 'ph-error-text' }, props.error) : null,
      h('div', { className: 'ph-dialog-actions' },
        h('button', { type: 'button', className: 'ph-button', disabled: props.busy, onClick: props.onCancel }, t('gitDefaultAbort')),
        h('button', {
          type: 'button',
          className: 'ph-primary',
          disabled: props.busy || repository.trim().length === 0,
          onClick: () => props.onPublish(provider, repository.trim(), visibility),
        }, props.busy ? t('gitPublishBusy') : t('gitPublishButton')))))
}

/* The three dialog fields are local state; keeping the setters in one place
 * avoids threading a form object through the render function. */

function useProvider(initial: 'github' | 'gitlab'): ['github' | 'gitlab', (next: 'github' | 'gitlab') => void] {
  return useState(initial)
}

function useRepository(initial: string): [string, (next: string) => void] {
  return useState(initial)
}

function useVisibility(initial: 'private' | 'public'): ['private' | 'public', (next: 'private' | 'public') => void] {
  return useState(initial)
}

