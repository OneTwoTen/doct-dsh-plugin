/**
 * The plugin row's Web Remote card.
 *
 * It is the only place the pairing code, the connection state, and the relay
 * settings are visible inside DSH: the Host routes under
 * `/api/personal-hub-web-remote` answer snapshots, and the card polls them while
 * the document is visible. Settings are persisted into the profile row through
 * the configuration editor, so a save reloads the plugin row.
 */
import { h, useCallback, useEffect, useState } from './runtime.ts'
import type { Translate } from './i18n.ts'
import type {
  WebRemoteApi,
  WebRemoteCardState,
  WebRemoteRuntimeStatus,
  WebRemoteSettingsView,
} from '../shared/protocol.ts'
import { codeOf, messageOf } from './api.ts'
import { copyText, relativeTime, useDocumentVisible, useNowSecond } from './hooks.ts'
import { Icon } from './icons.tsx'

/** The fields the card edits. */
export interface WebRemoteDraft {
  enabled: boolean
  relayUrl: string
  deviceName: string
  autoPair: boolean
}

/** A snapshot used before the first answer arrives. */
export function emptyCardState(): WebRemoteCardState {
  return {
    writable: false,
    settings: { enabled: false, relayUrl: '', deviceName: '', effectiveDeviceName: '', autoPair: true },
    status: {
      state: 'starting',
      deviceId: '',
      deviceName: '',
      fingerprint: '',
      relayUrl: '',
      paired: false,
      pairedAt: null,
      connectedAt: null,
      pairing: null,
      pairingStatus: null,
      watching: [],
      lastError: null,
      updatedAt: null,
    },
  }
}

/** The draft a loaded snapshot suggests. */
export function draftOf(settings: WebRemoteSettingsView): WebRemoteDraft {
  return {
    enabled: settings.enabled,
    relayUrl: settings.relayUrl,
    deviceName: settings.deviceName,
    autoPair: settings.autoPair,
  }
}

/** The translation key of one Host state. */
const STATE_KEYS: Record<string, string> = {
  starting: 'webRemoteStateStarting',
  disabled: 'webRemoteStateDisabled',
  'waiting-relay': 'webRemoteStateWaitingRelay',
  pairing: 'webRemoteStatePairing',
  'waiting-pairing': 'webRemoteStateWaitingPairing',
  'pairing-required': 'webRemoteStatePairingRequired',
  connecting: 'webRemoteStateConnecting',
  reconnecting: 'webRemoteStateReconnecting',
  connected: 'webRemoteStateConnected',
  paired: 'webRemoteStatePaired',
  'auth-required': 'webRemoteStateAuthRequired',
  revoked: 'webRemoteStateRevoked',
  error: 'webRemoteStateError',
  stopped: 'webRemoteStateStopped',
  disconnected: 'webRemoteStateDisconnected',
}

/**
 * The dot tone of one state.
 * @param state the Host state.
 */
export function stateTone(state: string): 'success' | 'warn' | 'error' | 'idle' {
  if (state === 'connected' || state === 'paired') return 'success'
  if (state === 'error' || state === 'auth-required' || state === 'revoked') return 'error'
  if (['pairing', 'waiting-pairing', 'pairing-required', 'connecting', 'reconnecting', 'waiting-relay'].includes(state)) {
    return 'warn'
  }
  return 'idle'
}

/**
 * Localised text of one Host state.
 * @param t the page's locale reader.
 * @param state the Host state.
 */
export function stateLabel(t: Translate, state: string): string {
  const key = STATE_KEYS[state]
  return key === undefined ? state : t(key)
}

/**
 * A `m:ss` countdown.
 * @param remainingMs milliseconds left before the code expires.
 */
export function countdownText(remainingMs: number): string {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return '0:00'
  const seconds = Math.floor(remainingMs / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Whether the typed relay URL can reach `relayEndpoints` on the Host.
 * @param value what the reader typed.
 */
export function relayLooksValid(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length === 0) return true
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'ws:' || url.protocol === 'wss:'
  } catch {
    return false
  }
}

/** Props of the card. */
export interface WebRemoteCardProps {
  api: WebRemoteApi
  t: Translate
  /** `summary` renders the one-line row description instead of the card. */
  view?: string
}

/** The plugin row's Web Remote section. */
export function WebRemoteCard(props: WebRemoteCardProps): ReturnType<typeof h> {
  const { t, api } = props
  const [loaded, setLoaded] = useState<WebRemoteCardState | undefined>(undefined)
  const [draft, setDraft] = useState<WebRemoteDraft | undefined>(undefined)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [unpairArmed, setUnpairArmed] = useState(false)
  const visible = useDocumentVisible()
  const now = useNowSecond(true)

  const reload = useCallback(async (): Promise<void> => {
    try {
      const value = await api.state({})
      setLoaded(value)
      setLoadError('')
    } catch (failure) {
      // A save reloads the plugin row, so one rejected poll during that window
      // is expected; the card keeps the last snapshot on screen.
      setLoadError(messageOf(failure))
    }
  }, [api])

  useEffect(() => {
    let alive = true
    const load = async (): Promise<void> => {
      await reload()
      if (!alive) return
    }
    void load()
    if (!visible) {
      return () => {
        alive = false
      }
    }
    const timer = setInterval(() => void load(), 2000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [reload, visible])

  // A save reloads the row; once the fresh settings arrive the untouched form
  // follows them. A dirty form keeps what the reader typed.
  useEffect(() => {
    if (loaded === undefined || dirty) return
    setDraft(draftOf(loaded.settings))
  }, [loaded, dirty])

  const changeDraft = (patch: Partial<WebRemoteDraft>): void => {
    setDraft((current) => ({ ...(current ?? draftOf(emptyCardState().settings)), ...patch }))
    setDirty(true)
    setNotice('')
    setError('')
  }

  const run = async (label: string, task: () => Promise<void>, done: string): Promise<void> => {
    setBusy(label)
    setError('')
    setNotice('')
    try {
      await task()
      setNotice(done)
    } catch (failure) {
      setError(t('webRemoteActionFailed', { message: messageOf(failure) }))
    } finally {
      setBusy('')
    }
  }

  const save = (): void => {
    const value = draft ?? draftOf(emptyCardState().settings)
    if (!relayLooksValid(value.relayUrl)) {
      setError(t('webRemoteRelayInvalid'))
      return
    }
    void run('save', async () => {
      try {
        const answer = await api.settingsSet(value)
        setLoaded((current) => (current === undefined ? current : { ...current, settings: answer.settings }))
        setDraft(draftOf(answer.settings))
      } catch (failure) {
        // The save reloads the plugin row, so this request is often cut short.
        // Anything else — a validation failure, a read-only row — is real.
        const code = codeOf(failure)
        if (code !== 'connection/failed' && code !== 'connection/empty') throw failure
      }
      setDirty(false)
    }, t('webRemoteSaved'))
  }

  const pair = (): void => {
    void run('pair', async () => {
      await api.pair({})
    }, '')
  }

  const cancelPairing = (): void => {
    void run('cancel', async () => {
      await api.pairCancel({})
    }, '')
  }

  const unpair = (): void => {
    setUnpairArmed(false)
    void run('unpair', async () => {
      await api.unpair({})
    }, t('webRemoteUnpaired'))
  }

  const copyCode = (): void => {
    const code = loaded?.status.pairing?.code ?? ''
    if (code.length === 0) return
    void copyText(code).then((ok) => {
      setCopied(ok)
      if (ok) setTimeout(() => setCopied(false), 2000)
    })
  }

  if (props.view === 'summary') return h('span', null, t('webRemoteSummary'))

  if (loaded === undefined) {
    return h('div', { 'data-personal-hub-web-remote': true, style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
      h('div', { className: 'ph-setting-head' }, t('webRemoteTitle')),
      h('p', { className: 'ph-hint' }, t('webRemoteLoading')),
      loadError.length > 0 ? h('p', { className: 'ph-hint' }, t('webRemoteUnavailable')) : null)
  }

  return h(WebRemoteForm, {
    t,
    state: loaded,
    draft: draft ?? draftOf(loaded.settings),
    dirty,
    busy,
    error,
    notice,
    copied,
    unpairArmed,
    now,
    stale: loadError.length > 0,
    onDraft: changeDraft,
    onSave: save,
    onRefresh: () => void reload(),
    onPair: pair,
    onCancelPairing: cancelPairing,
    onArmUnpair: () => setUnpairArmed(true),
    onCancelUnpair: () => setUnpairArmed(false),
    onUnpair: unpair,
    onCopyCode: copyCode,
  })
}

/** Props of the presentational form. */
export interface WebRemoteFormProps {
  t: Translate
  state: WebRemoteCardState
  draft: WebRemoteDraft
  dirty: boolean
  busy: string
  error: string
  notice: string
  copied: boolean
  unpairArmed: boolean
  now: number
  /** The last poll failed, so the snapshot may be older than it looks. */
  stale: boolean
  onDraft(patch: Partial<WebRemoteDraft>): void
  onSave(): void
  onRefresh(): void
  onPair(): void
  onCancelPairing(): void
  onArmUnpair(): void
  onCancelUnpair(): void
  onUnpair(): void
  onCopyCode(): void
}

/** The card's whole visible surface, pure so tests can render it directly. */
export function WebRemoteForm(props: WebRemoteFormProps): ReturnType<typeof h> {
  const { t, state, draft } = props
  const status = state.status
  const writable = state.writable
  const busy = props.busy
  const paired = status.paired
  const pairing = status.pairing
  const remaining = pairing === null ? 0 : Date.parse(pairing.expiresAt) - props.now
  const expired = pairing !== null && remaining <= 0
  const off = status.state === 'disabled'
  const relayMissing = status.relayUrl.length === 0

  return h('div', { 'data-personal-hub-web-remote': true, style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
    h('div', { className: 'ph-setting-head' }, t('webRemoteTitle')),

    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
      h('span', { className: 'ph-dot', 'data-state': stateTone(status.state) }),
      h('span', null, stateLabel(t, status.state)),
      paired ? h('span', { className: 'ph-chip', 'data-tone': 'success' }, t('webRemotePairedBadge')) : null,
      h('button', {
        type: 'button',
        className: 'ph-icon-button',
        title: t('webRemoteRefresh'),
        'aria-label': t('webRemoteRefresh'),
        disabled: busy.length > 0,
        onClick: props.onRefresh,
      }, h(Icon, { name: 'refresh', size: 11 }))),

    h('p', { className: 'ph-hint' }, t('webRemoteIntro')),
    props.stale ? h('p', { className: 'ph-hint' }, t('webRemoteStale')) : null,

    pairing === null ? null : h(PairBlock, { t, pairing, remaining, expired, copied: props.copied, busy, onCopy: props.onCopyCode, onCancel: props.onCancelPairing }),
    // A cancelled or finished attempt leaves a note without a code to show.
    pairing === null && status.pairingStatus === 'cancelled'
      ? h('p', { className: 'ph-hint' }, t('webRemotePairCancelled'))
      : null,

    relayMissing || off
      ? h('p', { className: 'ph-hint' }, off ? t('webRemoteDisabledHint') : t('webRemoteNoRelayHint'))
      : h(StatusDetails, { t, status, paired, busy, unpairArmed: props.unpairArmed, onPair: props.onPair, onArmUnpair: props.onArmUnpair, onCancelUnpair: props.onCancelUnpair, onUnpair: props.onUnpair }),

    h('div', { className: 'ph-setting' },
      h('div', { className: 'ph-setting-head' }, t('webRemoteSettingsTitle')),
      h('label', { className: 'ph-check-row' },
        h('input', {
          type: 'checkbox',
          checked: draft.enabled,
          disabled: !writable || busy.length > 0,
          onChange: (event: { target: { checked: boolean } }) => props.onDraft({ enabled: event.target.checked }),
        }),
        h('span', null, t('webRemoteEnabled'))),
      h('div', { className: 'ph-field' },
        h('label', { className: 'ph-field-label', htmlFor: 'personal-hub-web-relay' }, t('webRemoteRelayLabel')),
        h('input', {
          id: 'personal-hub-web-relay',
          className: 'ph-input',
          type: 'url',
          inputMode: 'url',
          autoComplete: 'off',
          spellCheck: false,
          value: draft.relayUrl,
          placeholder: t('webRemoteRelayPlaceholder'),
          disabled: !writable || busy.length > 0,
          onInput: (event: { target: { value: string } }) => props.onDraft({ relayUrl: event.target.value }),
          onChange: (event: { target: { value: string } }) => props.onDraft({ relayUrl: event.target.value }),
        })),
      h('div', { className: 'ph-field' },
        h('label', { className: 'ph-field-label', htmlFor: 'personal-hub-web-name' }, t('webRemoteDeviceLabel')),
        h('input', {
          id: 'personal-hub-web-name',
          className: 'ph-input',
          type: 'text',
          autoComplete: 'off',
          spellCheck: false,
          value: draft.deviceName,
          placeholder: status.deviceName.length > 0 ? status.deviceName : t('webRemoteDevicePlaceholder'),
          disabled: !writable || busy.length > 0,
          onInput: (event: { target: { value: string } }) => props.onDraft({ deviceName: event.target.value }),
          onChange: (event: { target: { value: string } }) => props.onDraft({ deviceName: event.target.value }),
        })),
      h('label', { className: 'ph-check-row' },
        h('input', {
          type: 'checkbox',
          checked: draft.autoPair,
          disabled: !writable || busy.length > 0,
          onChange: (event: { target: { checked: boolean } }) => props.onDraft({ autoPair: event.target.checked }),
        }),
        h('span', null, t('webRemoteAutoPair'))),
      h('p', { className: 'ph-hint' }, t('webRemoteRelayHint')),
      writable
        ? h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            h('button', {
              type: 'button',
              className: 'ph-primary',
              disabled: busy.length > 0 || !props.dirty,
              onClick: props.onSave,
            }, busy === 'save' ? t('webRemoteSaving') : t('webRemoteSave')))
        : h('p', { className: 'ph-hint' }, t('webRemoteReadOnly'))),

    props.error.length > 0 ? h('p', { className: 'ph-error-text' }, props.error) : null,
    props.notice.length > 0 ? h('p', { className: 'ph-ok' }, props.notice) : null)
}

/** The pairing code, the approval link, and the cancel button. */
function PairBlock(props: {
  t: Translate
  pairing: NonNullable<WebRemoteRuntimeStatus['pairing']>
  remaining: number
  expired: boolean
  copied: boolean
  busy: string
  onCopy(): void
  onCancel(): void
}): ReturnType<typeof h> {
  const { t, pairing } = props
  return h('div', { className: 'ph-pair', 'data-expired': props.expired },
    h('div', { className: 'ph-setting-head' }, t('webRemotePairTitle')),
    h('p', { className: 'ph-hint' }, t('webRemotePairStep')),
    h('div', { className: 'ph-pair-code-row' },
      h('code', { className: 'ph-pair-code' }, pairing.code),
      h('button', {
        type: 'button',
        className: 'ph-button',
        disabled: props.busy.length > 0,
        onClick: props.onCopy,
      }, h(Icon, { name: 'copy', size: 11 }), props.copied ? t('webRemotePairCopied') : t('webRemotePairCopy'))),
    h('p', { className: 'ph-hint' },
      props.expired
        ? t('webRemotePairExpired')
        : t('webRemotePairExpires', { time: countdownText(props.remaining) })),
    h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      h('a', {
        className: 'ph-button',
        href: pairing.uri,
        target: '_blank',
        rel: 'noreferrer',
      }, h(Icon, { name: 'external', size: 11 }), t('webRemotePairOpen')),
      h('button', {
        type: 'button',
        className: 'ph-button',
        disabled: props.busy.length > 0,
        onClick: props.onCancel,
      }, t('webRemotePairCancel'))))
}

/** Device identity, connection facts, and the pairing controls. */
function StatusDetails(props: {
  t: Translate
  status: WebRemoteRuntimeStatus
  paired: boolean
  busy: string
  unpairArmed: boolean
  onPair(): void
  onArmUnpair(): void
  onCancelUnpair(): void
  onUnpair(): void
}): ReturnType<typeof h> {
  const { t, status } = props
  const pairingBusy = props.busy === 'pair' || props.busy === 'cancel' || props.busy === 'unpair'
  return h('div', { className: 'ph-setting' },
    h('div', { className: 'ph-detail-meta' },
      h('div', { className: 'ph-detail-row' },
        h('span', { className: 'ph-detail-label' }, t('webRemoteDevice')),
        h('span', { className: 'ph-detail-value' }, status.deviceName)),
      status.fingerprint.length > 0
        ? h('div', { className: 'ph-detail-row' },
            h('span', { className: 'ph-detail-label' }, t('webRemoteFingerprint')),
            h('span', { className: 'ph-detail-value ph-mono ph-fingerprint' }, status.fingerprint))
        : null,
      status.connectedAt === null
        ? null
        : h('div', { className: 'ph-detail-row' },
            h('span', { className: 'ph-detail-label' }, t('webRemoteConnection')),
            h('span', { className: 'ph-detail-value' }, t('webRemoteConnectedAt', { when: relativeTime(status.connectedAt) }))),
      status.pairedAt === null
        ? null
        : h('div', { className: 'ph-detail-row' },
            h('span', { className: 'ph-detail-label' }, t('webRemotePaired')),
            h('span', { className: 'ph-detail-value' }, t('webRemotePairedAt', { when: relativeTime(status.pairedAt) }))),
      h('div', { className: 'ph-detail-row' },
        h('span', { className: 'ph-detail-label' }, t('webRemoteWatching')),
        h('span', { className: 'ph-detail-value' }, status.watching.length > 0
          ? t('webRemoteWatchingCount', { count: status.watching.length })
          : t('webRemoteWatchingNone'))),
      status.lastError === null
        ? null
        : h('div', { className: 'ph-detail-row' },
            h('span', { className: 'ph-detail-label' }, t('webRemoteLastError')),
            h('span', { className: 'ph-detail-value ph-error-text' }, status.lastError))),

    h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      h('button', {
        type: 'button',
        className: 'ph-button',
        disabled: pairingBusy || props.busy.length > 0 || status.pairing !== null,
        onClick: props.onPair,
      }, h(Icon, { name: 'refresh', size: 11 }), props.paired ? t('webRemotePairAgain') : t('webRemotePairNow')),
      props.paired
        ? (props.unpairArmed
            ? h('span', { className: 'ph-wrap' },
                h('span', { className: 'ph-hint' }, t('webRemoteUnpairConfirm')),
                h('button', {
                  type: 'button',
                  className: 'ph-button',
                  disabled: props.busy.length > 0,
                  onClick: props.onUnpair,
                }, t('webRemoteUnpairYes')),
                h('button', {
                  type: 'button',
                  className: 'ph-button',
                  disabled: props.busy.length > 0,
                  onClick: props.onCancelUnpair,
                }, t('webRemoteUnpairCancel')))
            : h('button', {
                type: 'button',
                className: 'ph-button',
                disabled: props.busy.length > 0,
                onClick: props.onArmUnpair,
              }, h(Icon, { name: 'cross', size: 11 }), t('webRemoteUnpair')))
        : null),
    status.relayUrl.length > 0
      ? h('a', { className: 'ph-hint', href: status.relayUrl, target: '_blank', rel: 'noreferrer' }, t('webRemoteOpenWebChat'))
      : null)
}
