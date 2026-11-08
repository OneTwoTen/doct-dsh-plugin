/**
 * The plugin row's Telegram card: the bot token lives in the credential store,
 * so the card reads its state and writes a new token through the Client remote.
 */
import { h, useState, useSyncExternalStore } from './runtime.ts'
import type { ClientContext } from '../host/dsh.ts'
import type { Translate } from './i18n.ts'
import { messageOf } from './api.ts'

/** Credential reference the Host resolves as the bot token. */
export const TOKEN_REF = 'DSH_TELEGRAM_BOT_TOKEN'

/** The card's state. */
export interface ControllerState {
  configured: boolean
  writable: boolean
  known: boolean
  busy: boolean
  error: string
  notice: string
}

/** The controller one card subscribes to. */
export interface TelegramController {
  getState(): ControllerState
  subscribe(listener: () => void): () => void
  refresh(): Promise<void>
  save(value: string): Promise<void>
  clear(): Promise<void>
  dispose(): void
}

/**
 * One card controller: reads the credential state and writes the token.
 * @param ctx the browser plugin context.
 * @param t the page's locale reader.
 */
export function createController(ctx: ClientContext, t: Translate): TelegramController {
  let snapshot: ControllerState = { configured: false, writable: true, known: false, busy: false, error: '', notice: '' }
  const listeners = new Set<() => void>()
  let disposed = false

  const publish = (patch: Partial<ControllerState>): void => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch {
        // A listener's failure must not break the others.
      }
    }
  }

  async function refresh(): Promise<void> {
    try {
      const response = await ctx.remote.credentials.describe([TOKEN_REF])
      if (disposed) return
      if (response === null || response === undefined || response.ok !== true) {
        publish({ known: false, error: response?.error?.message ?? '' })
        return
      }
      const view = response.value?.[TOKEN_REF] ?? { configured: false, writable: true }
      publish({
        known: true,
        configured: view.configured === true,
        writable: view.writable !== false,
        error: '',
      })
    } catch (error) {
      if (!disposed) publish({ known: false, error: messageOf(error) })
    }
  }

  async function save(value: string): Promise<void> {
    const token = String(value ?? '').trim()
    if (token.length === 0) {
      publish({ error: t('empty'), notice: '' })
      return
    }
    publish({ busy: true, error: '', notice: '' })
    try {
      await ctx.remote.credentials.set(TOKEN_REF, token)
      await refresh()
      if (!disposed) publish({ busy: false, notice: t('saved') })
    } catch (error) {
      if (!disposed) publish({ busy: false, error: t('error', { message: messageOf(error) }) })
    }
  }

  async function clear(): Promise<void> {
    publish({ busy: true, error: '', notice: '' })
    try {
      await ctx.remote.credentials.unset(TOKEN_REF)
      await refresh()
      if (!disposed) publish({ busy: false, notice: t('cleared') })
    } catch (error) {
      if (!disposed) publish({ busy: false, error: t('error', { message: messageOf(error) }) })
    }
  }

  return {
    getState: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    refresh,
    save,
    clear,
    dispose: () => {
      disposed = true
      listeners.clear()
    },
  }
}

/** Props of the Telegram card. */
export interface TelegramCardProps {
  t: Translate
  view?: string
  subscribe: (listener: () => void) => () => void
  getState: () => ControllerState
  save(value: string): Promise<void>
  clear(): Promise<void>
}

/** The row's configuration card. */
export function TelegramCard(props: TelegramCardProps): ReturnType<typeof h> {
  const { t } = props
  const [draft, setDraft] = useState('')
  const state = useSyncExternalStore(props.subscribe, props.getState, props.getState)

  if (props.view === 'summary') return h('span', null, t('summary'))

  const dotColor = state.known
    ? state.configured
      ? 'var(--dsw-alias-state-success-primary)'
      : 'var(--dsw-alias-state-idle-primary)'
    : 'var(--dsw-alias-state-warn-primary)'
  const statusText = state.known ? (state.configured ? t('stateOn') : t('stateOff')) : t('stateUnknown')

  return h('div', { 'data-personal-hub-telegram': true, style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
      h('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flex: 'none' } }),
      h('span', null, statusText)),
    h('p', { className: 'ph-hint' }, t('intro')),
    h('div', { className: 'ph-field' },
      h('label', { className: 'ph-field-label', htmlFor: 'personal-hub-token' }, t('tokenLabel')),
      h('input', {
        id: 'personal-hub-token',
        className: 'ph-input',
        type: 'password',
        autoComplete: 'off',
        spellCheck: false,
        value: draft,
        placeholder: t('tokenPlaceholder'),
        disabled: !state.writable || state.busy,
        onInput: (event: { target: { value: string } }) => setDraft(event.target.value),
        onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
        onKeyDown: (event: { key: string }) => {
          if (event.key === 'Enter' && draft.trim().length > 0 && !state.busy) {
            void props.save(draft).then(() => setDraft(''))
          }
        },
      })),
    h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      h('button', {
        type: 'button',
        className: state.writable ? 'ph-primary' : 'ph-button',
        disabled: !state.writable || state.busy || draft.trim().length === 0,
        onClick: () => void props.save(draft).then(() => setDraft('')),
      }, state.busy ? t('saving') : t('save')),
      state.configured
        ? h('button', {
            type: 'button',
            className: 'ph-button',
            disabled: !state.writable || state.busy,
            onClick: () => void props.clear(),
          }, t('clear'))
        : null),
    state.writable ? null : h('p', { className: 'ph-hint' }, t('readOnly')),
    state.error.length > 0 ? h('p', { className: 'ph-error-text' }, state.error) : null,
    state.notice.length > 0 ? h('p', { className: 'ph-ok' }, state.notice) : null,
    h('p', { className: 'ph-hint' }, t('hint')))
}
