/**
 * The plugin row's Git settings card: merge cleanup and worktree cleanup.
 */
import { h, useEffect, useState } from '../runtime.ts'
import { Icon } from '../icons.tsx'
import type { Translate } from '../i18n.ts'
import type { GitApi } from '../api.ts'
import { messageOf } from '../api.ts'
import type { CleanupSettings, MergeSettings, MergeSettingsState } from '../../shared/protocol.ts'

/** A partial edit the form hands back. */
export interface SettingsPatch {
  merge?: Partial<MergeSettings>
  cleanup?: Partial<CleanupSettings>
  forge?: Partial<Pick<MergeSettingsState, 'forge' | 'gitlabHosts' | 'cliPath'>>
}

/** Props of the settings card. */
export interface MergeSettingsCardProps {
  api: GitApi
  t: Translate
  /** `summary` renders the one-line row description instead of the form. */
  view?: string
}

/** A settings object for a card that has not loaded yet. */
function emptySettings(): MergeSettingsState {
  return {
    enabled: false,
    removeWorktree: true,
    deleteBranch: false,
    archiveSession: true,
    cleanup: {
      enabled: false,
      inactiveDays: 7,
      whenNoCommits: true,
      noCommitsAfterHours: 6,
      keepChanges: 'tracked',
      deleteBranch: false,
    },
    cleanupLast: null,
    writable: false,
    forge: 'auto',
    gitlabHosts: [],
    cliPath: '',
  }
}

/** Parse the comma or newline separated host field. */
function parseHostList(value: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of value.split(/[\s,]+/)) {
    const host = item.trim().replace(/\/+$/, '')
    if (host.length === 0 || seen.has(host.toLowerCase())) continue
    seen.add(host.toLowerCase())
    result.push(host)
  }
  return result
}

/** The settings card. */
export function MergeSettingsCard(props: MergeSettingsCardProps): ReturnType<typeof h> {  const { t, api } = props
  const [settings, setSettings] = useState<MergeSettingsState | undefined>(undefined)
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading')
  const [runningCleanup, setRunningCleanup] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [hostsText, setHostsText] = useState('')

  useEffect(() => {
    let alive = true
    api.mergeSettings({})
      .then((value) => {
        if (!alive) return
        setSettings(value)
        setHostsText(value.gitlabHosts.join(', '))
        setStatus('ready')
      })
      .catch((failure) => {
        if (!alive) return
        setError(`${t('gitSettingsError')}: ${messageOf(failure)}`)
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [api, t])

  if (props.view === 'summary') return h('span', null, t('gitSettingsSummary'))
  if (status === 'loading') return h('p', { className: 'ph-hint' }, t('gitLoading'))

  const update = (patch: SettingsPatch): void => {
    setSettings((current) => {
      const base = current ?? emptySettings()
      const cleanup = patch.cleanup === undefined
        ? base.cleanup
        : ({ ...base.cleanup, ...patch.cleanup } as CleanupSettings)
      return {
        ...base,
        ...(patch.merge ?? {}),
        ...(patch.forge ?? {}),
        cleanup,
      }
    })
  }

  const save = async (): Promise<void> => {
    setStatus('saving')
    setError('')
    setNotice('')
    try {
      const value = await api.mergeSettingsSet({
        enabled: settings?.enabled === true,
        removeWorktree: settings?.removeWorktree === true,
        deleteBranch: settings?.deleteBranch === true,
        archiveSession: settings?.archiveSession === true,
        cleanup: settings?.cleanup ?? {},
        forge: settings?.forge ?? 'auto',
        gitlabHosts: settings?.gitlabHosts ?? [],
        cliPath: settings?.cliPath ?? '',
      })
      setSettings((current) => ({
        ...(current ?? emptySettings()),
        ...value.merged,
        cleanup: value.cleanup,
        ...value.forge,
      }))
      setHostsText(value.forge.gitlabHosts.join(', '))
      setStatus('ready')
      setNotice(t('gitSettingsSaved'))
    } catch (failure) {
      setStatus('ready')
      setError(`${t('gitSettingsFailed')}: ${messageOf(failure)}`)
    }
  }

  const runCleanup = async (): Promise<void> => {
    setRunningCleanup(true)
    setError('')
    setNotice('')
    try {
      const value = await api.cleanupRun({})
      setSettings((current) => ({ ...(current ?? emptySettings()), cleanupLast: value.last }))
      if (value.ran === false) setError(t('cleanupOff'))
      else if (value.last !== null) {
        setNotice(t('cleanupLast', { removed: value.last.removed.length, kept: value.last.kept.length }))
      }
    } catch (failure) {
      setError(`${t('gitSettingsFailed')}: ${messageOf(failure)}`)
    } finally {
      setRunningCleanup(false)
    }
  }

  const value = settings ?? emptySettings()
  return h(MergeSettingsForm, {
    t,
    settings: value,
    hostsText,
    status,
    error,
    notice,
    runningCleanup,
    onChange: update,
    onHostsText: (text: string) => {
      setHostsText(text)
      update({ forge: { gitlabHosts: parseHostList(text) } })
    },
    onSave: () => void save(),
    onRunCleanup: () => void runCleanup(),
  })
}

/** Props of the form. */
export interface MergeSettingsFormProps {
  t: Translate
  settings: MergeSettingsState
  hostsText: string
  status: string
  error: string
  notice: string
  runningCleanup: boolean
  onChange(patch: SettingsPatch): void
  onHostsText(value: string): void
  onSave(): void
  onRunCleanup(): void
}

/** The settings form. */
export function MergeSettingsForm(props: MergeSettingsFormProps): ReturnType<typeof h> {
  const { t, settings } = props
  const writable = settings.writable
  const enabled = settings.enabled
  const busy = props.status === 'saving'
  const disabled = !writable || busy
  return h('div', { 'data-personal-hub-git-settings': true },
    h('div', { className: 'ph-setting' },
      h('div', { className: 'ph-setting-head' }, t('gitCodeHost')),
      h('label', { className: 'ph-field' },
        h('span', { className: 'ph-field-label' }, t('gitCodeHostProvider')),
        h('select', {
          className: 'ph-select',
          value: settings.forge,
          disabled,
          onChange: (event: { target: { value: string } }) => props.onChange({
            forge: { forge: event.target.value as MergeSettingsState['forge'] },
          }),
        },
          h('option', { value: 'auto' }, t('gitCodeHostAuto')),
          h('option', { value: 'github' }, 'GitHub'),
          h('option', { value: 'gitlab' }, 'GitLab'),
          h('option', { value: 'none' }, t('gitCodeHostNone')))),
      h('label', { className: 'ph-field' },
        h('span', { className: 'ph-field-label' }, t('gitCodeHostGitlabHosts')),
        h('input', {
          className: 'ph-input',
          value: props.hostsText,
          placeholder: 'gitlab.example.com',
          spellcheck: false,
          disabled,
          onInput: (event: { target: { value: string } }) => props.onHostsText(event.target.value),
          onChange: (event: { target: { value: string } }) => props.onHostsText(event.target.value),
        })),
      h('p', { className: 'ph-hint' }, t('gitCodeHostHint')),
      h('label', { className: 'ph-field' },
        h('span', { className: 'ph-field-label' }, t('gitCodeHostCli')),
        h('input', {
          className: 'ph-input',
          value: settings.cliPath,
          placeholder: 'gh / glab',
          spellcheck: false,
          disabled,
          onInput: (event: { target: { value: string } }) => props.onChange({ forge: { cliPath: event.target.value } }),
          onChange: (event: { target: { value: string } }) => props.onChange({ forge: { cliPath: event.target.value } }),
        }))),

    h('div', { className: 'ph-setting' },
      h('div', { className: 'ph-setting-head' }, t('gitSettingsMerged')),
      h('label', { className: 'ph-check-row' },
        h('input', {
          type: 'checkbox',
          checked: enabled,
          disabled,
          onChange: (event: { target: { checked: boolean } }) => props.onChange({ merge: { enabled: event.target.checked } }),
        }),
        h('span', null, enabled ? t('gitSettingsSave') : t('gitSettingsOff'))),
      h('label', { className: 'ph-check-row' },
        h('input', {
          type: 'checkbox',
          checked: settings.removeWorktree,
          disabled: disabled || !enabled,
          onChange: (event: { target: { checked: boolean } }) => props.onChange({ merge: { removeWorktree: event.target.checked } }),
        }),
        h('span', null, t('gitSettingsRemove'))),
      h('label', { className: 'ph-check-row' },
        h('input', {
          type: 'checkbox',
          checked: settings.deleteBranch,
          disabled: disabled || !enabled || !settings.removeWorktree,
          onChange: (event: { target: { checked: boolean } }) => props.onChange({ merge: { deleteBranch: event.target.checked } }),
        }),
        h('span', null, t('gitSettingsDeleteBranch'))),
      h('label', { className: 'ph-check-row' },
        h('input', {
          type: 'checkbox',
          checked: settings.archiveSession,
          disabled: disabled || !enabled,
          onChange: (event: { target: { checked: boolean } }) => props.onChange({ merge: { archiveSession: event.target.checked } }),
        }),
        h('span', null, t('gitSettingsArchive')))),

    h(CleanupSection, {
      t,
      cleanup: settings.cleanup,
      last: settings.cleanupLast,
      writable,
      running: props.runningCleanup,
      onChange: (patch: Partial<CleanupSettings>) => props.onChange({ cleanup: patch }),
      onRun: props.onRunCleanup,
    }),

    writable
      ? h('div', { style: { display: 'flex', gap: '6px' } },
          h('button', {
            type: 'button',
            className: 'ph-primary',
            disabled: busy,
            onClick: props.onSave,
          }, busy ? t('gitSettingsSaving') : t('gitSettingsSave')))
      : h('p', { className: 'ph-hint' }, t('gitSettingsReadOnly')),
    props.error.length > 0 ? h('p', { className: 'ph-error-text' }, props.error) : null,
    props.notice.length > 0 ? h('p', { className: 'ph-ok' }, props.notice) : null,
    h('p', { className: 'ph-hint' }, t('gitSettingsSummary')))
}

/** Props of the cleanup section. */
interface CleanupSectionProps {
  t: Translate
  cleanup: CleanupSettings
  last: MergeSettingsState['cleanupLast']
  writable: boolean
  running: boolean
  onChange(patch: Partial<CleanupSettings>): void
  onRun(): void
}

/** The cleanup rules. */
function CleanupSection(props: CleanupSectionProps): ReturnType<typeof h> {
  const { t, cleanup } = props
  const disabled = !props.writable || props.running
  return h('div', { className: 'ph-setting' },
    h('div', { className: 'ph-setting-head' }, t('cleanupTitle')),
    h('label', { className: 'ph-check-row' },
      h('input', {
        type: 'checkbox',
        checked: cleanup.enabled,
        disabled,
        onChange: (event: { target: { checked: boolean } }) => props.onChange({ enabled: event.target.checked }),
      }),
      h('span', null, t('cleanupEnabled'))),
    h('label', { className: 'ph-check-row' },
      h('input', {
        type: 'number',
        min: 0,
        max: 3650,
        value: cleanup.inactiveDays,
        disabled: disabled || !cleanup.enabled,
        style: { width: '64px' },
        onChange: (event: { target: { value: string } }) => props.onChange({ inactiveDays: Number(event.target.value) || 0 }),
      }),
      h('span', null, t('cleanupInactiveDays'))),
    h('label', { className: 'ph-check-row' },
      h('input', {
        type: 'checkbox',
        checked: cleanup.whenNoCommits,
        disabled: disabled || !cleanup.enabled,
        onChange: (event: { target: { checked: boolean } }) => props.onChange({ whenNoCommits: event.target.checked }),
      }),
      h('span', null, t('cleanupNoCommits'))),
    h('label', { className: 'ph-field' },
      h('span', { className: 'ph-field-label' }, t('cleanupKeep')),
      h('select', {
        className: 'ph-select',
        value: cleanup.keepChanges,
        disabled: disabled || !cleanup.enabled,
        onChange: (event: { target: { value: string } }) => props.onChange({ keepChanges: event.target.value as CleanupSettings['keepChanges'] }),
      },
        h('option', { value: 'tracked' }, t('cleanupKeepTracked')),
        h('option', { value: 'any' }, t('cleanupKeepAny')),
        h('option', { value: 'none' }, t('cleanupKeepNone')))),
    h('div', { style: { display: 'flex', gap: '6px' } },
      h('button', {
        type: 'button',
        className: 'ph-button',
        disabled: disabled || !cleanup.enabled,
        onClick: props.onRun,
      }, h(Icon, { name: 'trash', size: 11 }), props.running ? t('cleanupRunning') : t('cleanupRun'))),
    h('p', { className: 'ph-hint' },
      props.last === null
        ? t('cleanupNever')
        : t('cleanupLast', { removed: props.last.removed.length, kept: props.last.kept.length })),
    cleanup.enabled ? null : h('p', { className: 'ph-hint' }, t('cleanupOff')))
}
