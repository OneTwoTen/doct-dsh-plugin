import assert from 'node:assert/strict'
import { test } from 'node:test'

import { mountWebRemoteRoutes, WEB_REMOTE_ENDPOINTS, WEB_REMOTE_PATH_PREFIX } from '../src/features/web-remote-routes.ts'
import type { WebRemoteRouteDeps } from '../src/features/web-remote-routes.ts'
import type { WebRemoteRuntimeStatus, WebRemoteSettingsView } from '../src/shared/protocol.ts'

const quietLogger = { info() {}, warn() {}, error() {} }

/** One route call's answer, already unwrapped from JSON. */
type Answer = { ok: boolean; value?: any; error?: { code: string; message: string } }

/** A row as the configuration editor holds it. */
interface FakeEntry {
  options: { name: string }
}

/**
 * Mount the routes over a fake Connection registry.
 *
 * @param options overrides for the fake services and control counts.
 */
function mountFeature(options: {
  settings?: Partial<WebRemoteSettingsView>
  status?: Partial<WebRemoteRuntimeStatus>
  withConfigEditor?: boolean
  row?: Record<string, unknown>
  hasConnection?: boolean
} = {}) {
  const settings: WebRemoteSettingsView = {
    enabled: true,
    relayUrl: 'https://relay.test',
    deviceName: 'PC-Test',
    effectiveDeviceName: 'PC-Test',
    autoPair: true,
    ...options.settings,
  }
  // A real save reloads the plugin row and hands the next mount new settings;
  // tests simulate that with `setSettings`.
  let liveSettings: WebRemoteSettingsView = settings
  const status: WebRemoteRuntimeStatus = {
    state: 'connected',
    deviceId: 'dev_1',
    deviceName: 'PC-Test',
    fingerprint: 'SHA256:AA:BB',
    relayUrl: settings.relayUrl,
    paired: true,
    pairedAt: new Date(1_700_000_000_000).toISOString(),
    connectedAt: new Date(1_700_000_100_000).toISOString(),
    pairing: null,
    pairingStatus: null,
    watching: [],
    lastError: null,
    updatedAt: new Date(1_700_000_200_000).toISOString(),
    ...options.status,
  }

  const routes = new Map<string, { fetch(request: Request): Promise<Response> }>()
  const calls = { pair: 0, cancel: 0, unpair: 0 }
  const edits: Array<{ raw: unknown; next: unknown }> = []
  let row: Record<string, unknown> = options.row ?? {
    telegram: { token: 'kept' },
    git: { merged: { enabled: true } },
    webRemote: { relayUrl: 'https://old.test', heartbeatMs: 20000 },
  }

  const connection = {
    fetch: {
      register(route: { path: string; fetch(request: Request): Promise<Response> }) {
        if (routes.has(route.path)) throw new Error(`duplicate route ${route.path}`)
        routes.set(route.path, route)
        return () => routes.delete(route.path)
      },
    },
  }
  const configEditor = {
    entries: () => [{ options: { name: '@local/personal-hub' } }] as FakeEntry[],
    edit: async (entry: FakeEntry, change: (raw: unknown) => unknown) => {
      assert.equal(entry.options.name, '@local/personal-hub')
      const next = change(row)
      edits.push({ raw: row, next })
      row = next as Record<string, unknown>
    },
  }

  const ctx = {
    get(name: string): unknown {
      if (name === 'connection') return options.hasConnection === false ? undefined : connection
      if (name === 'configEditor') return options.withConfigEditor === false ? undefined : configEditor
      return undefined
    },
  }
  const deps: WebRemoteRouteDeps = {
    logger: quietLogger,
    settings: () => liveSettings,
    status: () => status,
    pair: async () => {
      calls.pair += 1
    },
    cancelPairing: async () => {
      calls.cancel += 1
    },
    unpair: async () => {
      calls.unpair += 1
    },
  }

  const dispose = mountWebRemoteRoutes(ctx as never, deps)

  return {
    routes,
    calls,
    edits,
    dispose,
    row: () => row,
    setSettings(patch: Partial<WebRemoteSettingsView>): void {
      liveSettings = { ...liveSettings, ...patch }
    },
    async call(endpoint: string, payload?: unknown): Promise<Answer> {
      const route = routes.get(`${WEB_REMOTE_PATH_PREFIX}/${endpoint}`)
      if (route === undefined) return { ok: false, error: { code: 'gateway/not-found', message: 'no such route' } }
      const request = new Request(`http://dsh.internal${WEB_REMOTE_PATH_PREFIX}/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      })
      return await route.fetch(request).then((response) => response.json()) as Answer
    },
  }
}

test('the card routes are exactly the five the client calls', () => {
  const feature = mountFeature()
  try {
    assert.deepEqual(
      [...feature.routes.keys()].sort(),
      WEB_REMOTE_ENDPOINTS.map((endpoint) => `${WEB_REMOTE_PATH_PREFIX}/${endpoint}`).sort(),
    )
  } finally {
    feature.dispose()
  }
})

test('state answers the settings, the runtime status, and whether the row is editable', async () => {
  const feature = mountFeature()
  try {
    const answer = await feature.call('state')
    assert.equal(answer.ok, true)
    assert.equal(answer.value.writable, true)
    assert.equal(answer.value.settings.relayUrl, 'https://relay.test')
    assert.equal(answer.value.settings.effectiveDeviceName, 'PC-Test')
    assert.equal(answer.value.status.state, 'connected')
    assert.equal(answer.value.status.paired, true)
    assert.deepEqual(answer.value.status.watching, [])
  } finally {
    feature.dispose()
  }
})

test('state reports a read-only row when the composition has no configuration editor', async () => {
  const feature = mountFeature({ withConfigEditor: false })
  try {
    const answer = await feature.call('state')
    assert.equal(answer.ok, true)
    assert.equal(answer.value.writable, false)
    const save = await feature.call('settingsSet', { relayUrl: 'https://relay.test' })
    assert.equal(save.ok, false)
    assert.equal(save.error?.code, 'config/unavailable')
  } finally {
    feature.dispose()
  }
})

test('settingsSet writes only the Web Remote keys and keeps the other features', async () => {
  const feature = mountFeature()
  try {
    const answer = await feature.call('settingsSet', {
      relayUrl: ' https://chat.example.com ',
      deviceName: ' Office PC ',
      autoPair: false,
    })
    assert.equal(answer.ok, true)
    assert.deepEqual(answer.value.settings, {
      enabled: true,
      relayUrl: 'https://chat.example.com',
      deviceName: 'Office PC',
      effectiveDeviceName: 'Office PC',
      autoPair: false,
    })

    const row = feature.row() as Record<string, Record<string, unknown>>
    assert.deepEqual(row.telegram, { token: 'kept' })
    assert.deepEqual(row.git, { merged: { enabled: true } })
    assert.deepEqual(row.webRemote, {
      enabled: true,
      relayUrl: 'https://chat.example.com',
      deviceName: 'Office PC',
      autoPair: false,
      heartbeatMs: 20000,
    })
  } finally {
    feature.dispose()
  }
})

test('settingsSet skips the reload when the form did not change anything', async () => {
  const feature = mountFeature()
  try {
    const answer = await feature.call('settingsSet', { relayUrl: 'https://relay.test', deviceName: 'PC-Test' })
    assert.equal(answer.ok, true)
    assert.equal(feature.edits.length, 0)
  } finally {
    feature.dispose()
  }
})

test('settingsSet rejects a relay URL the transport could not use', async () => {
  const feature = mountFeature()
  try {
    for (const relayUrl of ['ftp://relay.test', 'not a url', 'https://relay.test/?token=1']) {
      const answer = await feature.call('settingsSet', { relayUrl })
      assert.equal(answer.ok, false, relayUrl)
      assert.equal(answer.error?.code, 'pair/invalid-url', relayUrl)
    }
    const wrongType = await feature.call('settingsSet', { autoPair: 'yes' })
    assert.equal(wrongType.ok, false)
    assert.equal(wrongType.error?.code, 'input/invalid')
    assert.equal(feature.edits.length, 0)
  } finally {
    feature.dispose()
  }
})

test('settingsSet accepts clearing the relay URL', async () => {
  const feature = mountFeature()
  try {
    const answer = await feature.call('settingsSet', { relayUrl: '' })
    assert.equal(answer.ok, true)
    assert.equal(answer.value.settings.relayUrl, '')
    assert.equal((feature.row().webRemote as Record<string, unknown>).relayUrl, '')
  } finally {
    feature.dispose()
  }
})

test('settingsSet can turn the feature off and on from the card', async () => {
  const feature = mountFeature()
  try {
    const disabled = await feature.call('settingsSet', { enabled: false })
    assert.equal(disabled.ok, true, JSON.stringify(disabled))
    assert.equal(disabled.value.settings.enabled, false)
    assert.equal((feature.row().webRemote as Record<string, unknown>).enabled, false)
    // A save reloads the row: the next mount reads the new config.
    feature.setSettings({ enabled: false })

    const enabled = await feature.call('settingsSet', { enabled: true })
    assert.equal(enabled.ok, true, JSON.stringify(enabled))
    assert.equal(enabled.value.settings.enabled, true)
    assert.equal((feature.row().webRemote as Record<string, unknown>).enabled, true)
  } finally {
    feature.dispose()
  }
})

test('settingsSet rejects a non-boolean enabled flag', async () => {
  const feature = mountFeature()
  try {
    const answer = await feature.call('settingsSet', { enabled: 'on' })
    assert.equal(answer.ok, false)
    assert.equal(answer.error?.code, 'input/invalid')
    assert.equal(feature.edits.length, 0)
  } finally {
    feature.dispose()
  }
})

test('the pairing controls delegate to the feature and answer its published state', async () => {
  const feature = mountFeature({ status: { state: 'pairing-required' } })
  try {
    const pair = await feature.call('pair')
    assert.equal(pair.ok, true)
    assert.deepEqual(pair.value, { state: 'pairing-required' })
    assert.equal(feature.calls.pair, 1)

    const cancel = await feature.call('pairCancel')
    assert.equal(cancel.ok, true)
    assert.equal(feature.calls.cancel, 1)

    const unpair = await feature.call('unpair')
    assert.equal(unpair.ok, true)
    assert.equal(feature.calls.unpair, 1)
  } finally {
    feature.dispose()
  }
})

test('a rejected control is reported with its code', async () => {
  const { PairingError } = await import('../src/lib/remote-pairing.ts')
  const feature = mountFeature()
  const failing: WebRemoteRouteDeps = {
    logger: quietLogger,
    settings: () => ({
      enabled: true,
      relayUrl: '',
      deviceName: '',
      effectiveDeviceName: 'host',
      autoPair: true,
    }),
    status: () => ({
      state: 'waiting-relay',
      deviceId: '',
      deviceName: 'host',
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
    }),
    pair: async () => {
      throw new PairingError('pair/no-relay', 'Set a relay URL before pairing this device')
    },
    cancelPairing: async () => {},
    unpair: async () => {},
  }
  const routes = new Map<string, { fetch(request: Request): Promise<Response> }>()
  const ctx = {
    get: (name: string) => name === 'connection'
      ? { fetch: { register: (route: { path: string; fetch(request: Request): Promise<Response> }) => {
          routes.set(route.path, route)
          return () => routes.delete(route.path)
        } } }
      : undefined,
  }
  const dispose = mountWebRemoteRoutes(ctx as never, failing)
  try {
    const route = routes.get(`${WEB_REMOTE_PATH_PREFIX}/pair`)
    assert.ok(route)
    const response = await route.fetch(new Request('http://dsh.internal/pair', { method: 'POST', body: '{}' }))
    const answer = await response.json() as Answer
    assert.equal(answer.ok, false)
    assert.equal(answer.error?.code, 'pair/no-relay')
  } finally {
    dispose()
    feature.dispose()
  }
})

test('without a live Connection the routes wait for it and disappear on dispose', async () => {
  const routes = new Map<string, { fetch(request: Request): Promise<Response> }>()
  const scoped = {
    get: (name: string) => name === 'connection'
      ? { fetch: { register: (route: { path: string; fetch(request: Request): Promise<Response> }) => {
          routes.set(route.path, route)
          return () => routes.delete(route.path)
        } } }
      : undefined,
  }
  const deps: WebRemoteRouteDeps = {
    logger: quietLogger,
    settings: () => ({ enabled: true, relayUrl: '', deviceName: '', effectiveDeviceName: 'host', autoPair: true }),
    status: () => ({
      state: 'waiting-relay',
      deviceId: '',
      deviceName: 'host',
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
    }),
    pair: async () => {},
    cancelPairing: async () => {},
    unpair: async () => {},
  }
  let injected = false
  const ctx = {
    get: () => undefined,
    inject: (names: string[], callback: (value: unknown) => void) => {
      assert.deepEqual(names, ['connection'])
      injected = true
      callback(scoped)
      return {}
    },
  }

  const dispose = mountWebRemoteRoutes(ctx as never, deps)
  try {
    assert.equal(injected, true)
    assert.equal(routes.size, WEB_REMOTE_ENDPOINTS.length)
  } finally {
    dispose()
  }
  assert.equal(routes.size, 0)
})
