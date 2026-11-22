import assert from 'node:assert/strict'
import { test } from 'node:test'

import { autoArchiveDecision, createAutoArchiver } from '../src/lib/auto-archive.ts'
import type { AutoArchiveFact, AutoArchiveRuntime } from '../src/lib/auto-archive.ts'
import { normalizeConfig } from '../src/lib/config.ts'
import type { AutoArchiveReport, AutoArchiveSettings } from '../src/shared/protocol.ts'

const quietLogger = { info() {}, warn() {} }
const DAY = 86400000

const enabled: AutoArchiveSettings = {
  enabled: true,
  inactiveDays: 2,
  checkMs: 3600000,
  skipActive: true,
  archiveRunning: false,
  archiveBlank: true,
  dryRun: false,
  maxPerPass: 50,
}

/** One Session that is due: idle for three days, nothing else special. */
function fact(overrides: Partial<AutoArchiveFact> = {}): AutoArchiveFact {
  return { sessionId: 'session-1', updatedAt: Date.now() - 3 * DAY, ...overrides }
}

test('a disabled feature archives nothing', () => {
  assert.deepEqual(autoArchiveDecision({ ...enabled, enabled: false }, fact()), { archive: false, reason: 'disabled' })
  assert.deepEqual(autoArchiveDecision(undefined, fact()), { archive: false, reason: 'disabled' })
})

test('the protections win over the age rule', () => {
  assert.deepEqual(autoArchiveDecision(enabled, fact({ archived: true })), { archive: false, reason: 'already-archived' })
  assert.deepEqual(autoArchiveDecision(enabled, fact({ pinned: true })), { archive: false, reason: 'pinned' })
  assert.deepEqual(autoArchiveDecision(enabled, fact({ subagent: true })), { archive: false, reason: 'subagent' })
  assert.deepEqual(autoArchiveDecision(enabled, fact({ active: true })), { archive: false, reason: 'active' })
  assert.deepEqual(autoArchiveDecision(enabled, fact({ running: true })), { archive: false, reason: 'running' })
})

test('a chat that is open or still running is archived only when the configuration says so', () => {
  assert.deepEqual(autoArchiveDecision({ ...enabled, skipActive: false }, fact({ active: true })), {
    archive: true,
    reason: 'archive',
  })
  assert.deepEqual(autoArchiveDecision({ ...enabled, archiveRunning: true }, fact({ running: true })), {
    archive: true,
    reason: 'archive',
  })
  assert.deepEqual(autoArchiveDecision({ ...enabled, archiveBlank: false }, fact({ blank: true })), {
    archive: false,
    reason: 'blank',
  })
})

test('the age rule archives exactly once the idle threshold is reached', () => {
  const now = 1_700_000_000_000
  const due = fact({ updatedAt: now - 2 * DAY })
  const recent = fact({ updatedAt: now - 2 * DAY + 60000 })
  assert.deepEqual(autoArchiveDecision(enabled, due, now), { archive: true, reason: 'archive' })
  assert.deepEqual(autoArchiveDecision(enabled, recent, now), { archive: false, reason: 'recent' })
  assert.deepEqual(autoArchiveDecision({ ...enabled, inactiveDays: 0 }, due, now), {
    archive: false,
    reason: 'idle-rule-off',
  })
  // A clock skew that puts the watermark in the future is not an idle chat.
  assert.deepEqual(autoArchiveDecision(enabled, fact({ updatedAt: now + DAY }), now), {
    archive: false,
    reason: 'recent',
  })
})

/** A store stand-in with the same contract the plugin's JSON store offers. */
function fakeStore(initial: Record<string, unknown> = {}) {
  const store = {
    state: { version: 1, last: null, ...structuredClone(initial) } as Record<string, unknown>,
    async load() {
      return store.state
    },
    async update(mutate: (state: Record<string, unknown>) => unknown) {
      mutate(store.state)
      return store.state
    },
  }
  return store
}

/** A runtime stand-in that records every archive call. */
function fakeRuntime(facts: AutoArchiveFact[], options: {
  fail?: (sessionId: string) => Error | undefined
} = {}) {
  const archived: string[] = []
  const stops: boolean[] = []
  let scans = 0
  const runtime: AutoArchiveRuntime = {
    async facts() {
      scans += 1
      return facts
    },
    async archive(sessionId, callOptions) {
      const failure = options.fail?.(sessionId)
      if (failure !== undefined) {
        if (failure.name === 'WorkspaceActiveSessionError') return { archived: false, active: true }
        throw failure
      }
      archived.push(sessionId)
      stops.push(callOptions.stopActivity)
      return { archived: true }
    },
  }
  return { runtime, archived, stops, scans: () => scans }
}

test('one pass archives the idle chats and records the report', async () => {
  const store = fakeStore()
  const { runtime, archived } = fakeRuntime([
    fact({ sessionId: 'old-a', title: 'Old A' }),
    fact({ sessionId: 'old-b' }),
    fact({ sessionId: 'fresh', updatedAt: Date.now() - DAY }),
    fact({ sessionId: 'pinned', pinned: true }),
    fact({ sessionId: 'open', active: true }),
    fact({ sessionId: 'busy', running: true }),
    fact({ sessionId: 'child', subagent: true }),
    fact({ sessionId: 'stored', archived: true }),
  ])
  const archiver = createAutoArchiver({ settings: enabled, logger: quietLogger, store, runtime })
  const report = (await archiver.runOnce())!
  assert.deepEqual(archived, ['old-a', 'old-b'])
  assert.equal(report.scanned, 8)
  assert.equal(report.due, 2)
  assert.equal(report.recent, 1)
  assert.equal(report.pinned, 1)
  assert.equal(report.archivedCount, 2)
  assert.equal(report.failedCount, 0)
  assert.equal(report.activeCount, 0)
  assert.equal(report.deferredCount, 0)
  assert.equal(report.archived[0].sessionId, 'old-a')
  assert.equal(report.archived[0].title, 'Old A')
  assert.equal(report.archived[0].idleDays >= 2, true)
  assert.deepEqual(store.state.last, report)
  assert.deepEqual(archiver.last(), report)
  // A stopped feature runs no further pass.
  archiver.stop()
  assert.equal(await archiver.runOnce(), report)
})

test('a pass archives one chat at a time and leaves the rest for the next one', async () => {
  const { runtime, archived } = fakeRuntime([
    fact({ sessionId: 'a' }),
    fact({ sessionId: 'b' }),
    fact({ sessionId: 'c' }),
  ])
  const archiver = createAutoArchiver({
    settings: { ...enabled, maxPerPass: 1 },
    logger: quietLogger,
    store: fakeStore(),
    runtime,
  })
  const report = (await archiver.runOnce())!
  assert.deepEqual(archived, ['a'])
  assert.equal(report.archivedCount, 1)
  assert.equal(report.deferredCount, 2)
  assert.deepEqual(report.deferred.map((entry) => entry.sessionId), ['b', 'c'])
})

test('a dry run reports without archiving', async () => {
  const { runtime, archived } = fakeRuntime([fact({ sessionId: 'a' })])
  const archiver = createAutoArchiver({
    settings: { ...enabled, dryRun: true },
    logger: quietLogger,
    store: fakeStore(),
    runtime,
  })
  const report = (await archiver.runOnce())!
  assert.deepEqual(archived, [])
  assert.equal(report.dryRun, true)
  assert.equal(report.archivedCount, 1)
  assert.equal(report.archived[0].sessionId, 'a')
})

test('a refused or failed archive does not stop the pass', async () => {
  const { runtime, archived } = fakeRuntime(
    [fact({ sessionId: 'busy' }), fact({ sessionId: 'broken' }), fact({ sessionId: 'fine' })],
    {
      fail(sessionId) {
        if (sessionId === 'busy') return Object.assign(new Error('still working'), { name: 'WorkspaceActiveSessionError' })
        if (sessionId === 'broken') return new Error('disk is full')
        return undefined
      },
    },
  )
  const archiver = createAutoArchiver({
    settings: { ...enabled, archiveRunning: true },
    logger: quietLogger,
    store: fakeStore(),
    runtime,
  })
  const report = (await archiver.runOnce())!
  assert.deepEqual(archived, ['fine'])
  assert.equal(report.activeCount, 1)
  assert.equal(report.active[0].sessionId, 'busy')
  assert.equal(report.failedCount, 1)
  assert.equal(report.failed[0].sessionId, 'broken')
  assert.match(report.failed[0].error, /disk is full/)
  assert.equal(report.archivedCount, 1)
})

test('a disabled feature neither scans nor archives', async () => {
  const { runtime, archived, scans } = fakeRuntime([fact()])
  const archiver = createAutoArchiver({
    settings: { ...enabled, enabled: false },
    logger: quietLogger,
    store: fakeStore(),
    runtime,
  })
  assert.equal(await archiver.runOnce(), null)
  assert.equal(scans(), 0)
  assert.deepEqual(archived, [])
})

test('the first pass waits for the startup grace and stop cancels it', async () => {
  const { runtime, scans } = fakeRuntime([fact()])
  const archiver = createAutoArchiver({
    settings: { ...enabled, startupDelayMs: 5, checkMs: 60000 },
    logger: quietLogger,
    store: fakeStore(),
    runtime,
  })
  archiver.start()
  archiver.stop()
  await new Promise((resolve) => setTimeout(resolve, 25))
  assert.equal(scans(), 0)
})

test('a running pass outlives a shutdown request until it finishes', async () => {
  const store = fakeStore()
  let release: (() => void) | undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const runtime: AutoArchiveRuntime = {
    async facts() {
      await gate
      return [fact({ sessionId: 'a' })]
    },
    async archive() {
      return { archived: true }
    },
  }
  const archiver = createAutoArchiver({ settings: enabled, logger: quietLogger, store, runtime })
  const pass = archiver.runOnce()
  archiver.stop()
  release?.()
  const report: AutoArchiveReport | null = await pass
  assert.equal(report?.archivedCount, 1)
})

test('normalization fills the automatic-archive defaults and keeps zero meaningful', () => {
  const defaults = normalizeConfig({}).autoArchive
  assert.equal(defaults.enabled, true)
  assert.equal(defaults.inactiveDays, 2)
  assert.equal(defaults.checkMs, 3600000)
  assert.equal(defaults.skipActive, true)
  assert.equal(defaults.archiveRunning, false)
  assert.equal(defaults.archiveBlank, true)
  assert.equal(defaults.dryRun, false)
  assert.equal(defaults.maxPerPass, 50)
  assert.equal(defaults.startupDelayMs, 60000)

  const custom = normalizeConfig({
    autoArchive: {
      enabled: true,
      inactiveDays: 0,
      checkMs: 1000,
      maxPerPass: 0,
      startupDelayMs: '5000',
      archiveRunning: 'true',
    },
  }).autoArchive
  assert.equal(custom.enabled, true)
  assert.equal(custom.inactiveDays, 0)
  // The schedule has a floor, so a typo cannot make it spin.
  assert.equal(custom.checkMs, 60000)
  assert.equal(custom.maxPerPass, 0)
  assert.equal(custom.startupDelayMs, 5000)
  assert.equal(custom.archiveRunning, true)

  // A malformed section falls back instead of keeping the plugin from mounting.
  const malformed = normalizeConfig({ autoArchive: 'off' }).autoArchive
  assert.equal(malformed.enabled, true)
  assert.equal(malformed.inactiveDays, 2)
})
