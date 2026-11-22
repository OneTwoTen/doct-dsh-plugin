import assert from 'node:assert/strict'
import { test } from 'node:test'

import { AUTO_ARCHIVE_ENDPOINTS, AUTO_ARCHIVE_PATH_PREFIX, mountAutoArchiveRoutes } from '../src/features/auto-archive-routes.ts'
import type { AutoArchiveRouteDeps } from '../src/features/auto-archive-routes.ts'
import type { AutoArchiveReport, AutoArchiveSettings } from '../src/shared/protocol.ts'

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
 * @param options overrides for the fake services, settings, and row.
 */
function mountFeature(options: {
  settings?: Partial<AutoArchiveSettings>
  last?: AutoArchiveReport | null
  withConfigEditor?: boolean
  row?: Record<string, unknown>
  hasConnection?: boolean
} = {}) {
  let settings: AutoArchiveSettings = {
    enabled: true,
    inactiveDays: 2,
    checkMs: 3600000,
    skipActive: true,
    archiveRunning: false,
    archiveBlank: true,
    dryRun: false,
    maxPerPass: 50,
    ...options.settings,
  }
  const report: AutoArchiveReport = {
    at: 1_700_000_000_000,
    dryRun: false,
    scanned: 4,
    due: 1,
    recent: 3,
    pinned: 0,
    archivedCount: 1,
    failedCount: 0,
    activeCount: 0,
    deferredCount: 0,
    archived: [{ sessionId: 'old', idleDays: 3 }],
    failed: [],
    active: [],
    deferred: [],
  }
  let last: AutoArchiveReport | null = options.last === undefined ? report : options.last

  const routes = new Map<string, { fetch(request: Request): Promise<Response> }>()
  const edits: Array<{ raw: unknown; next: unknown }> = []
  const applied: AutoArchiveSettings[] = []
  let runs = 0
  let row: Record<string, unknown> = options.row ?? {
    telegram: { token: 'kept' },
    git: { merged: { enabled: true } },
    webRemote: { relayUrl: 'https://old.test' },
    autoArchive: { enabled: false, inactiveDays: 7, checkMs: 7200000, unknownKey: 'kept' },
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
  const deps: AutoArchiveRouteDeps = {
    logger: quietLogger,
    settings: () => settings,
    last: () => last,
    run: async () => {
      runs += 1
      last = report
      return report
    },
    applySettings: (next) => {
      settings = next
      applied.push(next)
    },
  }

  const dispose = mountAutoArchiveRoutes(ctx as never, deps)

  return {
    routes,
    edits,
    applied,
    dispose,
    row: () => row,
    runs: () => runs,
    async call(endpoint: string, payload?: unknown): Promise<Answer> {
      const route = routes.get(`${AUTO_ARCHIVE_PATH_PREFIX}/${endpoint}`)
      if (route === undefined) return { ok: false, error: { code: 'gateway/not-found', message: 'no such route' } }
      const request = new Request(`http://dsh.internal${AUTO_ARCHIVE_PATH_PREFIX}/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      })
      return await route.fetch(request).then((response) => response.json()) as Answer
    },
  }
}

test('the card routes are exactly the three the client calls', () => {
  const feature = mountFeature()
  try {
    assert.deepEqual(
      [...feature.routes.keys()].sort(),
      AUTO_ARCHIVE_ENDPOINTS.map((endpoint) => `${AUTO_ARCHIVE_PATH_PREFIX}/${endpoint}`).sort(),
    )
  } finally {
    feature.dispose()
  }
})

test('state answers the settings, the last pass, and whether the row is editable', async () => {
  const feature = mountFeature({ settings: { inactiveDays: 3 } })
  try {
    const answer = await feature.call('state')
    assert.equal(answer.ok, true)
    assert.equal(answer.value.writable, true)
    assert.equal(answer.value.settings.inactiveDays, 3)
    assert.equal(answer.value.last.archivedCount, 1)
  } finally {
    feature.dispose()
  }
})

test('a deployment without a configuration editor reports the card read-only', async () => {
  const feature = mountFeature({ withConfigEditor: false })
  try {
    const answer = await feature.call('state')
    assert.equal(answer.value.writable, false)
  } finally {
    feature.dispose()
  }
})

test('settingsSet writes only the autoArchive fields into the profile row', async () => {
  const feature = mountFeature()
  try {
    const answer = await feature.call('settingsSet', {
      enabled: true,
      inactiveDays: 5,
      dryRun: true,
      checkMs: 7200000,
    })
    assert.equal(answer.ok, true)
    assert.equal(answer.value.settings.inactiveDays, 5)
    assert.equal(answer.value.settings.dryRun, true)
    assert.equal(feature.edits.length, 1)
    const next = feature.edits[0].next as Record<string, any>
    assert.deepEqual(next.telegram, { token: 'kept' })
    assert.deepEqual(next.git, { merged: { enabled: true } })
    assert.deepEqual(next.webRemote, { relayUrl: 'https://old.test' })
    assert.equal(next.autoArchive.enabled, true)
    assert.equal(next.autoArchive.inactiveDays, 5)
    assert.equal(next.autoArchive.dryRun, true)
    // A field the card does not own survives the write.
    assert.equal(next.autoArchive.unknownKey, 'kept')
    assert.deepEqual(feature.applied[0], answer.value.settings)
  } finally {
    feature.dispose()
  }
})

test('an unchanged form writes nothing', async () => {
  const feature = mountFeature()
  try {
    const answer = await feature.call('settingsSet', {
      enabled: true,
      inactiveDays: 2,
      skipActive: true,
      archiveRunning: false,
      archiveBlank: true,
      dryRun: false,
      maxPerPass: 50,
    })
    assert.equal(answer.ok, true)
    assert.equal(feature.edits.length, 0)
  } finally {
    feature.dispose()
  }
})

test('invalid edits are refused with a readable code', async () => {
  const feature = mountFeature()
  try {
    const notBoolean = await feature.call('settingsSet', { enabled: 'yes' })
    assert.equal(notBoolean.ok, false)
    assert.equal(notBoolean.error?.code, 'input/invalid')

    const days = await feature.call('settingsSet', { inactiveDays: 4000 })
    assert.equal(days.ok, false)
    assert.match(days.error?.message ?? '', /inactiveDays/)

    const fraction = await feature.call('settingsSet', { maxPerPass: 1.5 })
    assert.equal(fraction.ok, false)
    assert.equal(feature.edits.length, 0)
  } finally {
    feature.dispose()
  }
})

test('runNow refuses while the feature is off and runs one pass otherwise', async () => {
  const off = mountFeature({ settings: { enabled: false } })
  try {
    const answer = await off.call('runNow')
    assert.equal(answer.ok, true)
    assert.equal(answer.value.ran, false)
    assert.equal(answer.value.reason, 'disabled')
    assert.equal(off.runs(), 0)
  } finally {
    off.dispose()
  }

  const on = mountFeature()
  try {
    const answer = await on.call('runNow')
    assert.equal(answer.ok, true)
    assert.equal(answer.value.ran, true)
    assert.equal(answer.value.last.archivedCount, 1)
    assert.equal(on.runs(), 1)
  } finally {
    on.dispose()
  }
})

test('routes wait for the Connection service when it loads later', async () => {
  const registrations: Array<{ path: string }> = []
  let deliver: ((scoped: unknown) => void) | undefined
  const ctx = {
    get: () => undefined,
    inject(_names: string[], callback: (scoped: unknown) => void) {
      deliver = callback
      return { dispose() {} }
    },
  }
  const settings: AutoArchiveSettings = {
    enabled: true,
    inactiveDays: 2,
    checkMs: 3600000,
    skipActive: true,
    archiveRunning: false,
    archiveBlank: true,
    dryRun: false,
    maxPerPass: 50,
  }
  const dispose = mountAutoArchiveRoutes(ctx as never, {
    logger: quietLogger,
    settings: () => settings,
    last: () => null,
    run: async () => null,
    applySettings: () => {},
  })
  try {
    assert.equal(deliver !== undefined, true)
    deliver?.({
      get: () => ({
        fetch: {
          register(route: { path: string }) {
            registrations.push(route)
            return () => {}
          },
        },
      }),
    })
    assert.equal(registrations.length, AUTO_ARCHIVE_ENDPOINTS.length)
  } finally {
    dispose()
  }
})
