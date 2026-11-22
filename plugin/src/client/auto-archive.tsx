/**
 * The plugin row's automatic-archive card.
 *
 * It edits the rules that decide which idle chats are hidden from the Session
 * list, can run one pass immediately, and reports what the last pass did. All
 * of it talks to the mounted Host feature through its own POST routes, so the
 * card shows the running state rather than a copy of the configuration file.
 */
import { h, useEffect, useState } from './runtime.ts'
import type { Translate } from './i18n.ts'
import type { AutoArchiveApi } from './api.ts'
import { messageOf } from './api.ts'
import type { AutoArchiveReport, AutoArchiveSettings } from '../shared/protocol.ts'

/** The rules the card edits when its first answer has not arrived yet. */
const EMPTY_SETTINGS: AutoArchiveSettings = {
  enabled: true,
  inactiveDays: 2,
  checkMs: 3600000,
  skipActive: true,
  archiveRunning: false,
  archiveBlank: true,
  dryRun: false,
  maxPerPass: 50,
}

/** Longest and shortest day count the Host accepts. */
const MAX_DAYS = 3650
/** Check interval bounds, in milliseconds, converted to minutes in the field. */
const MIN_CHECK_MS = 60000
const MAX_CHECK_MS = 86400000

/**
 * Clamp one whole number into an inclusive range.
 * @param value the field's text as a number.
 * @param min smallest allowed value.
 * @param max largest allowed value.
 */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** Props of the card. */
export interface AutoArchiveCardProps {
  api: AutoArchiveApi
  t: Translate
  /** `summary` renders the one-line row description instead of the form. */
  view?: string
}

/** The card: loads the rules, saves them, and runs one pass on request. */
export function AutoArchiveCard(props: AutoArchiveCardProps): ReturnType<typeof h> {
  const { api, t } = props
  const [settings, setSettings] = useState<AutoArchiveSettings | undefined>(undefined)
  const [last, setLast] = useState<AutoArchiveReport | null>(null)
  const [writable, setWritable] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let alive = true
    api.state({})
      .then((state) => {
        if (!alive) return
        setSettings(state.settings)
        setLast(state.last)
        setWritable(state.writable)
        setStatus('ready')
      })
      .catch((failure) => {
        if (!alive) return
        setError(`${t('aaLoadFailed')}: ${messageOf(failure)}`)
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [api, t])

  if (props.view === 'summary') return h('span', null, t('aaSummary'))

  const value = settings ?? EMPTY_SETTINGS
  const update = (patch: Partial<AutoArchiveSettings>): void => {
    setSettings((current) => ({ ...(current ?? EMPTY_SETTINGS), ...patch }))
  }

  const save = async (): Promise<void> => {
    setStatus('saving')
    setError('')
    setNotice('')
    try {
      const answer = await api.settingsSet(value)
      setSettings(answer.settings)
      setStatus('ready')
      setNotice(t('aaSaved'))
    } catch (failure) {
      setStatus('ready')
      setError(`${t('aaSaveFailed')}: ${messageOf(failure)}`)
    }
  }

  const run = async (): Promise<void> => {
    setRunning(true)
    setError('')
    setNotice('')
    try {
      const answer = await api.runNow({})
      setLast(answer.last)
      if (!answer.ran) setNotice(t('aaOff'))
      else if (answer.last !== null) {
        setNotice(t('aaRunDone', {
          archived: answer.last.archivedCount,
          failed: answer.last.failedCount,
        }))
      }
    } catch (failure) {
      setError(`${t('aaRunFailed')}: ${messageOf(failure)}`)
    } finally {
      setRunning(false)
    }
  }

  if (status === 'loading') return h('p', { className: 'ph-hint' }, t('gitLoading'))

  return h(AutoArchiveForm, {
    t,
    settings: value,
    last,
    writable,
    status,
    error,
    notice,
    running,
    onChange: update,
    onSave: () => void save(),
    onRun: () => void run(),
  })
}

/** Props of the form, split out so a test can render it without the Host. */
export interface AutoArchiveFormProps {
  t: Translate
  settings: AutoArchiveSettings
  last: AutoArchiveReport | null
  writable: boolean
  status: string
  error: string
  notice: string
  running: boolean
  onChange(patch: Partial<AutoArchiveSettings>): void
  onSave(): void
  onRun(): void
}

/** The rules, as one form. */
export function AutoArchiveForm(props: AutoArchiveFormProps): ReturnType<typeof h> {
  const { t, settings } = props
  const disabled = !props.writable || props.status === 'saving'
  const minutes = Math.round(settings.checkMs / 60000)
  return h('div', { 'data-personal-hub-auto-archive': true, className: 'ph-setting' },
    h('div', { className: 'ph-setting-head' }, t('aaTitle')),
    h('p', { className: 'ph-hint' }, t('aaIntro')),

    h('label', { className: 'ph-check-row' },
      h('input', {
        type: 'checkbox',
        checked: settings.enabled,
        disabled,
        onChange: (event: { target: { checked: boolean } }) => props.onChange({ enabled: event.target.checked }),
      }),
      h('span', null, t('aaEnabled'))),

    h('label', { className: 'ph-field' },
      h('span', { className: 'ph-field-label' }, t('aaInactiveDays')),
      h('input', {
        className: 'ph-input',
        type: 'number',
        min: 0,
        max: MAX_DAYS,
        value: settings.inactiveDays,
        disabled: disabled || !settings.enabled,
        onChange: (event: { target: { value: string } }) => props.onChange({
          inactiveDays: clamp(Number(event.target.value), 0, MAX_DAYS),
        }),
      }),
      h('span', { className: 'ph-hint' }, t('aaInactiveDaysHint'))),

    h('label', { className: 'ph-field' },
      h('span', { className: 'ph-field-label' }, t('aaCheckMinutes')),
      h('input', {
        className: 'ph-input',
        type: 'number',
        min: 1,
        max: MAX_CHECK_MS / 60000,
        value: minutes,
        disabled: disabled || !settings.enabled,
        onChange: (event: { target: { value: string } }) => props.onChange({
          checkMs: clamp(Number(event.target.value) * 60000, MIN_CHECK_MS, MAX_CHECK_MS),
        }),
      }),
      h('span', { className: 'ph-hint' }, t('aaCheckMinutesHint'))),

    h('label', { className: 'ph-check-row' },
      h('input', {
        type: 'checkbox',
        checked: settings.skipActive,
        disabled: disabled || !settings.enabled,
        onChange: (event: { target: { checked: boolean } }) => props.onChange({ skipActive: event.target.checked }),
      }),
      h('span', null, t('aaSkipActive'))),

    h('label', { className: 'ph-check-row' },
      h('input', {
        type: 'checkbox',
        checked: settings.archiveBlank,
        disabled: disabled || !settings.enabled,
        onChange: (event: { target: { checked: boolean } }) => props.onChange({ archiveBlank: event.target.checked }),
      }),
      h('span', null, t('aaBlank'))),

    h('label', { className: 'ph-check-row' },
      h('input', {
        type: 'checkbox',
        checked: settings.archiveRunning,
        disabled: disabled || !settings.enabled,
        onChange: (event: { target: { checked: boolean } }) => props.onChange({ archiveRunning: event.target.checked }),
      }),
      h('span', null, t('aaRunning'))),

    h('label', { className: 'ph-check-row' },
      h('input', {
        type: 'checkbox',
        checked: settings.dryRun,
        disabled: disabled || !settings.enabled,
        onChange: (event: { target: { checked: boolean } }) => props.onChange({ dryRun: event.target.checked }),
      }),
      h('span', null, t('aaDryRun'))),

    h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      h('button', {
        type: 'button',
        className: 'ph-primary',
        disabled: disabled,
        onClick: props.onSave,
      }, props.status === 'saving' ? t('aaSaving') : t('aaSave')),
      h('button', {
        type: 'button',
        className: 'ph-button',
        disabled: disabled || !settings.enabled || props.running,
        onClick: props.onRun,
      }, props.running ? t('aaRunningNow') : t('aaRunNow'))),

    h('p', { className: 'ph-hint' },
      props.last === null
        ? t('aaNever')
        : props.last.dryRun
          ? t('aaLastDry', { scanned: props.last.scanned, due: props.last.due })
          : t('aaLast', {
              scanned: props.last.scanned,
              archived: props.last.archivedCount,
              failed: props.last.failedCount,
              active: props.last.activeCount,
            })),
    settings.enabled ? null : h('p', { className: 'ph-hint' }, t('aaOffHint')),
    h('p', { className: 'ph-hint' }, t('aaRestoreHint')),
    props.error.length > 0 ? h('p', { className: 'ph-error-text' }, props.error) : null,
    props.notice.length > 0 ? h('p', { className: 'ph-ok' }, props.notice) : null)
}
