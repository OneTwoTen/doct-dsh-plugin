import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { mountAutoArchive } from '../src/features/auto-archive.ts'
import { AUTO_ARCHIVE_PATH_PREFIX } from '../src/features/auto-archive-routes.ts'
import type { AutoArchiveConfig } from '../src/lib/config.ts'
import type { Logger } from '../src/host/dsh.ts'

const quietLogger: Logger = { info() {}, warn() {}, error() {} }
const DAY = 86400000

const config: AutoArchiveConfig = {
  enabled: true,
  inactiveDays: 2,
  checkMs: 3600000,
  skipActive: true,
  archiveRunning: false,
  archiveBlank: true,
  dryRun: false,
  maxPerPass: 50,
  startupDelayMs: 3600000,
}

/** One row as the Host's Session list answers it. */
function summary(sessionId: string, overrides: Record<string, unknown> = {}) {
  return {
    sessionId,
    updatedAt: Date.now() - 3 * DAY,
    running: false,
    blank: false,
    agentAvailable: false,
    cwd: 'C:/work/demo',
    projections: { values: { title: `Chat ${sessionId}` } },
    ...overrides,
  }
}

/**
 * Mount the feature over fake services.
 *
 * @param options overrides for the served Sessions and the composition.
 */
async function mountFeature(options: {
  items?: Record<string, unknown>[]
  withArchive?: boolean
  row?: Record<string, unknown>
} = {}) {
  const home = await mkdtemp(join(tmpdir(), 'personal-hub-auto-archive-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home

  const items = options.items ?? [
    summary('due'),
    summary('fresh', { updatedAt: Date.now() - DAY }),
    summary('pinned'),
    summary('open', { agentAvailable: true }),
    summary('busy', { running: true }),
    summary('child', { origin: 'subagent' }),
    summary('already'),
  ]
  const archivedIds = new Set<string>(['already'])
  const pinnedIds = new Set<string>(['pinned'])
  const calls: Array<{ sessionId: string; stopActivity: boolean }> = []
  let scans = 0
  const routes = new Map<string, { fetch(request: Request): Promise<Response> }>()
  let row: Record<string, unknown> = options.row ?? { git: { enabled: true }, autoArchive: { enabled: true, inactiveDays: 2 } }

  const configEditor = {
    entries: () => [{ options: { name: '@local/personal-hub' } }],
    edit: async (_entry: unknown, change: (raw: unknown) => unknown) => {
      row = change(row) as Record<string, unknown>
    },
  }

  const ctx = {
    get(name: string): unknown {
      switch (name) {
        case 'sessionController':
          return {
            async list() {
              scans += 1
              return { items }
            },
          }
        case 'workspaceRegistry':
          return options.withArchive === false
            ? {}
            : {
                get archivedSessionIds() {
                  return [...archivedIds]
                },
                get pinnedSessionIds() {
                  return [...pinnedIds]
                },
                async archiveSession(sessionId: string, archiveOptions: { stopActivity?: boolean } = {}) {
                  calls.push({ sessionId, stopActivity: archiveOptions.stopActivity === true })
                  archivedIds.add(sessionId)
                },
              }
        case 'connection':
          return {
            fetch: {
              register(route: { path: string; fetch(request: Request): Promise<Response> }) {
                routes.set(route.path, route)
                return () => routes.delete(route.path)
              },
            },
          }
        case 'configEditor':
          return configEditor
        default:
          return undefined
      }
    },
  }

  const dispose = mountAutoArchive(ctx as never, config, { logger: quietLogger })

  return {
    home,
    routes,
    calls,
    row: () => row,
    scans: () => scans,
    dispose,
    async call(endpoint: string, payload?: unknown): Promise<any> {
      const route = routes.get(`${AUTO_ARCHIVE_PATH_PREFIX}/${endpoint}`)
      assert.ok(route, `route ${endpoint} is registered`)
      const request = new Request(`http://dsh.internal${AUTO_ARCHIVE_PATH_PREFIX}/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      })
      const response = await route.fetch(request)
      return await response.json()
    },
    async cleanup(): Promise<void> {
      dispose()
      process.env.DSH_HOME = previousHome
      await rm(home, { recursive: true, force: true })
    },
  }
}

test('one pass archives exactly the idle, unpinned, inactive chats', async () => {
  const feature = await mountFeature()
  try {
    const answer = await feature.call('runNow')
    assert.equal(answer.ok, true)
    assert.equal(answer.value.ran, true)
    assert.deepEqual(feature.calls, [{ sessionId: 'due', stopActivity: false }])
    assert.equal(answer.value.last.scanned, 7)
    assert.equal(answer.value.last.archivedCount, 1)
    assert.equal(answer.value.last.pinned, 1)
    assert.equal(answer.value.last.archived[0].sessionId, 'due')
    assert.equal(answer.value.last.archived[0].title, 'Chat due')

    // The pass endures for the next mount: the report is on disk.
    const stateFile = join(feature.home, 'personal-hub', 'auto-archive', 'state.json')
    const stored = JSON.parse(await readFile(stateFile, 'utf8'))
    assert.equal(stored.last.archivedCount, 1)

    // The registry's archive set now holds the chat, so a second pass skips it.
    const again = await feature.call('runNow')
    assert.equal(again.value.last.archivedCount, 0)
    assert.equal(feature.calls.length, 1)
  } finally {
    await feature.cleanup()
  }
})

test('archiveRunning stops the work instead of leaving the chat behind', async () => {
  const feature = await mountFeature({
    items: [summary('busy', { running: true })],
  })
  try {
    await feature.call('settingsSet', { archiveRunning: true })
    const answer = await feature.call('runNow')
    assert.equal(answer.value.ran, true)
    assert.deepEqual(feature.calls, [{ sessionId: 'busy', stopActivity: true }])
    assert.equal(answer.value.last.archivedCount, 1)
  } finally {
    await feature.cleanup()
  }
})

test('a saved edit applies to the next pass without a remount', async () => {
  const feature = await mountFeature()
  try {
    const saved = await feature.call('settingsSet', { inactiveDays: 5 })
    assert.equal(saved.ok, true)
    assert.equal(saved.value.settings.inactiveDays, 5)
    assert.equal((feature.row().autoArchive as Record<string, unknown>).inactiveDays, 5)
    // A three-day-old chat is no longer due under the new rule.
    const answer = await feature.call('runNow')
    assert.equal(answer.value.last.archivedCount, 0)
    assert.deepEqual(feature.calls, [])
  } finally {
    await feature.cleanup()
  }
})

test('turning the feature off records a pass and archives nothing', async () => {
  const feature = await mountFeature()
  try {
    await feature.call('settingsSet', { enabled: false })
    const answer = await feature.call('runNow')
    assert.equal(answer.value.ran, false)
    assert.equal(answer.value.reason, 'disabled')
    assert.deepEqual(feature.calls, [])
    assert.equal(feature.scans(), 0)
  } finally {
    await feature.cleanup()
  }
})

test('a build without an archive surface mounts nothing', async () => {
  const feature = await mountFeature({ withArchive: false })
  try {
    assert.equal(feature.routes.size, 0)
    assert.equal(feature.scans(), 0)
  } finally {
    await feature.cleanup()
  }
})

test('a Workspace registry that loads later still gets the feature', async () => {
  const home = await mkdtemp(join(tmpdir(), 'personal-hub-auto-archive-late-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  const routes = new Map<string, unknown>()
  const archived: string[] = []
  let deliver: ((scoped: unknown) => void) | undefined
  const sessions = { async list() { return { items: [summary('due')] } } }
  const registry = {
    archivedSessionIds: [] as string[],
    pinnedSessionIds: [] as string[],
    async archiveSession(sessionId: string) {
      archived.push(sessionId)
    },
  }
  const ctx = {
    get(name: string): unknown {
      if (name === 'sessionController') return sessions
      if (name === 'connection') {
        return {
          fetch: {
            register(route: { path: string }) {
              routes.set(route.path, route)
              return () => routes.delete(route.path)
            },
          },
        }
      }
      if (name === 'configEditor') {
        return { entries: () => [], edit: async () => {} }
      }
      return undefined
    },
    inject(_names: string[], callback: (scoped: unknown) => void) {
      deliver = callback
      return { dispose() {} }
    },
  }

  const dispose = mountAutoArchive(ctx as never, config, { logger: quietLogger })
  try {
    assert.equal(routes.size, 0)
    assert.equal(deliver !== undefined, true)
    deliver?.({
      get: (name: string) => (name === 'workspaceRegistry' ? registry : ctx.get(name)),
    })
    assert.equal(routes.size, 3)
    const route = routes.get(`${AUTO_ARCHIVE_PATH_PREFIX}/runNow`) as { fetch(request: Request): Promise<Response> }
    const response = await route.fetch(new Request('http://dsh.internal/runNow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }))
    const answer = await response.json() as { ok: boolean; value: { last: { archivedCount: number } } }
    assert.equal(answer.ok, true)
    assert.equal(answer.value.last.archivedCount, 1)
    assert.deepEqual(archived, ['due'])
  } finally {
    dispose()
    process.env.DSH_HOME = previousHome
    await rm(home, { recursive: true, force: true })
  }
})
