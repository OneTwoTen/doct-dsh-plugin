import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
test('apply reports a waiting-token status when no token is configured', async () => {
  const home = await mkdtemp(join(tmpdir(), 'personal-hub-home-'))
  const previousHome = process.env.DSH_HOME
  const previousEnv = process.env.DSH_TELEGRAM_BOT_TOKEN
  process.env.DSH_HOME = home
  delete process.env.DSH_TELEGRAM_BOT_TOKEN

  const disposers: any[] = []
  const ctx = {
    get(key: string): any {
      return key === 'sessionController' ? { create: async () => ({ sessionId: 's' }) } : undefined
    },
    logger() {
      return { info() {}, warn() {}, error() {}, debug() {} }
    },
    effect(fn: () => (() => void) | void) {
      disposers.push(fn())
    },
  }

  try {
    const { apply } = await import('../src/index.ts')
    apply(ctx as unknown as Parameters<typeof apply>[0], { telegram: { enabled: true } })

    const statusFile = join(home, 'personal-hub', 'telegram-remote', 'status.json')
    const started = Date.now()
    let status
    while (Date.now() - started < 3000) {
      try {
        status = JSON.parse(await readFile(statusFile, 'utf8'))
        break
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
    }
    assert.ok(status, 'status file was written')
    assert.equal(status.state, 'waiting-token')
    assert.match(status.hint, /token/)
  } finally {
    for (const dispose of disposers) dispose?.()
    process.env.DSH_HOME = previousHome
    if (previousEnv !== undefined) process.env.DSH_TELEGRAM_BOT_TOKEN = previousEnv
    await rm(home, { recursive: true, force: true })
  }
})

test('the built Host bundle mounts the automatic-archive card and its routes', async () => {
  const home = await mkdtemp(join(tmpdir(), 'personal-hub-bundle-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home

  const routes = new Map<string, { fetch(request: Request): Promise<Response> }>()
  const disposers: Array<() => void> = []
  const ctx = {
    get(name: string): unknown {
      switch (name) {
        case 'sessionController':
          return { list: async () => ({ items: [] }) }
        case 'workspaceRegistry':
          return {
            archivedSessionIds: [],
            pinnedSessionIds: [],
            archiveSession: async () => {},
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
          return { entries: () => [], edit: async () => {} }
        default:
          return undefined
      }
    },
    logger() {
      return { info() {}, warn() {}, error() {}, debug() {} }
    },
    effect(fn: () => (() => void) | void) {
      const dispose = fn()
      if (typeof dispose === 'function') disposers.push(dispose)
    },
  }

  try {
    // The installed plugin loads `dist/index.js`, so the artifact itself must
    // bring the feature up; a source-only test would pass while the build is stale.
    const { apply } = await import('../dist/index.js') as {
      apply(value: unknown, config: unknown): void
    }
    apply(ctx, {
      telegram: { enabled: false },
      git: { enabled: false },
      webRemote: { enabled: false },
      autoArchive: { enabled: true, startupDelayMs: 3600000 },
    })

    const stateRoute = routes.get('/api/personal-hub-auto-archive/state')
    assert.ok(stateRoute, 'the automatic-archive card has a Host side')
    const response = await stateRoute.fetch(new Request('http://dsh.internal/api/personal-hub-auto-archive/state', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }))
    const answer = await response.json() as { ok: boolean; value: { settings: { enabled: boolean; inactiveDays: number } } }
    assert.equal(answer.ok, true)
    assert.equal(answer.value.settings.enabled, true)
    assert.equal(answer.value.settings.inactiveDays, 2)
  } finally {
    for (const dispose of disposers.splice(0)) dispose()
    process.env.DSH_HOME = previousHome
    // The Web Remote feature may still be settling a file write when its
    // disposer returns, so the temporary profile is removed with retries.
    await rm(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 })
  }
})
