import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createCommandRunner } from '../lib/git-run.js'
import { cleanupDecision, createWorktreeCleanup, inspectWorktree } from '../lib/worktree-cleanup.js'
import { createWorktree } from '../lib/worktree.js'

const quietLogger = { info: () => {}, warn: () => {} }
const DAY = 86400000
const HOUR = 3600000
const runner = () => createCommandRunner({ ctx: { get: () => undefined }, logger: quietLogger, timeoutMs: 30000 })
const config = { directory: '.agents/worktrees', namePrefix: 'dsh' }

const enabled = { enabled: true, inactiveDays: 7, whenNoCommits: true, noCommitsAfterHours: 6, keepChanges: 'tracked' }
const clean = { ageMs: 0, localFiles: 0, trackedChanges: 0, commitsAhead: 1, active: false }

test('a disabled policy removes nothing', () => {
  assert.deepEqual(cleanupDecision({ ...enabled, enabled: false }, { ...clean, ageMs: 90 * DAY }), {
    remove: false,
    reason: 'disabled',
  })
  assert.deepEqual(cleanupDecision(undefined, { ...clean, ageMs: 90 * DAY }), { remove: false, reason: 'disabled' })
})

test('a live Session keeps its checkout whatever the age', () => {
  assert.deepEqual(cleanupDecision(enabled, { ...clean, active: true, ageMs: 90 * DAY }), {
    remove: false,
    reason: 'session-active',
  })
})

test('uncommitted work is protected according to the configured rule', () => {
  const dirty = { ...clean, ageMs: 90 * DAY, localFiles: 3, trackedChanges: 1 }
  assert.equal(cleanupDecision({ ...enabled, keepChanges: 'tracked' }, dirty).reason, 'uncommitted-changes')
  assert.equal(cleanupDecision({ ...enabled, keepChanges: 'any' }, dirty).reason, 'local-files')
  assert.equal(cleanupDecision({ ...enabled, keepChanges: 'tracked' }, dirty).remove, false)
  // `none` ignores local files entirely.
  assert.deepEqual(cleanupDecision({ ...enabled, keepChanges: 'none' }, dirty), { remove: true, reason: 'inactive' })

  // Untracked-only files are removable under `tracked` but not under `any`.
  const untracked = { ...clean, ageMs: 90 * DAY, localFiles: 2, trackedChanges: 0 }
  assert.deepEqual(cleanupDecision({ ...enabled, keepChanges: 'tracked' }, untracked), { remove: true, reason: 'inactive' })
  assert.deepEqual(cleanupDecision({ ...enabled, keepChanges: 'any' }, untracked), { remove: false, reason: 'local-files' })
})

test('the inactive rule removes a checkout once it is old enough', () => {
  assert.deepEqual(cleanupDecision(enabled, { ...clean, ageMs: 7 * DAY }), { remove: true, reason: 'inactive' })
  assert.deepEqual(cleanupDecision(enabled, { ...clean, ageMs: 6 * DAY }), { remove: false, reason: 'kept' })
  // Turning the rule off leaves the checkout even after a year.
  assert.deepEqual(cleanupDecision({ ...enabled, inactiveDays: 0 }, { ...clean, ageMs: 365 * DAY }), {
    remove: false,
    reason: 'kept',
  })
})

test('the no-commit rule waits for its grace period', () => {
  const idle = { ...clean, commitsAhead: 0 }
  assert.deepEqual(cleanupDecision(enabled, { ...idle, ageMs: 5 * HOUR }), { remove: false, reason: 'kept' })
  assert.deepEqual(cleanupDecision(enabled, { ...idle, ageMs: 7 * HOUR }), { remove: true, reason: 'no-commits' })
  // A checkout that gained a commit is only removed by the inactivity rule.
  assert.deepEqual(cleanupDecision(enabled, { ...clean, ageMs: 7 * HOUR }), { remove: false, reason: 'kept' })
  assert.deepEqual(cleanupDecision({ ...enabled, whenNoCommits: false }, { ...idle, ageMs: 7 * HOUR }), {
    remove: false,
    reason: 'kept',
  })
})

/** A project with one commit on `main`. */
async function makeRepository() {
  const root = await mkdtemp(join(tmpdir(), 'personal-hub-cleanup-'))
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q')
  git('config', 'user.email', 'cleanup@example.com')
  git('config', 'user.name', 'Cleanup Tester')
  git('config', 'commit.gpgsign', 'false')
  await writeFile(join(root, 'a.txt'), 'one\n', 'utf8')
  git('add', '-A')
  git('commit', '-qm', 'first commit')
  git('branch', '-M', 'main')
  return root
}

/** A store stand-in with the same contract the plugin's JSON store offers. */
function fakeStore(initial) {
  const store = {
    state: structuredClone(initial),
    async load() {
      return store.state
    },
    async update(mutate) {
      mutate(store.state)
      return store.state
    },
  }
  return store
}

test('one checkout is inspected from real Git facts', async () => {
  const root = await makeRepository()
  const exec = runner()
  try {
    const created = await createWorktree(exec, { repoRoot: root, name: 'dsh-clean-0001', base: 'main', config })
    const fresh = await inspectWorktree(exec, { ...created, createdAt: Date.now() })
    assert.equal(fresh.missing, false)
    assert.equal(fresh.commitsAhead, 0)
    assert.equal(fresh.trackedChanges, 0)
    assert.equal(fresh.localFiles, 0)

    await writeFile(join(created.path, 'a.txt'), 'changed\n', 'utf8')
    await writeFile(join(created.path, 'new.txt'), 'untracked\n', 'utf8')
    const dirty = await inspectWorktree(exec, { ...created, createdAt: Date.now() })
    assert.equal(dirty.trackedChanges, 1)
    assert.equal(dirty.localFiles, 2)

    execFileSync('git', ['-C', created.path, 'commit', '-qam', 'work'], { stdio: 'ignore' })
    const ahead = await inspectWorktree(exec, { ...created, createdAt: Date.now() })
    assert.equal(ahead.commitsAhead, 1)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a cleanup pass removes an old empty checkout and keeps a live one', async () => {
  const root = await makeRepository()
  const exec = runner()
  try {
    const old = await createWorktree(exec, { repoRoot: root, name: 'dsh-clean-0002', base: 'main', config })
    const live = await createWorktree(exec, { repoRoot: root, name: 'dsh-clean-0003', base: 'main', config })
    const store = fakeStore({
      worktrees: {
        'session-old': { ...old, createdAt: Date.now() - 9 * DAY },
        'session-live': { ...live, createdAt: Date.now() - 9 * DAY },
      },
    })
    const cleanup = createWorktreeCleanup({
      runner: exec,
      config: { worktree: { ...config, cleanup: { ...enabled, checkMs: 300000 } }, worktreeTimeoutMs: 30000 },
      logger: quietLogger,
      store,
      runtime: { isSessionActive: (sessionId) => sessionId === 'session-live' },
      now: () => Date.now(),
    })
    const result = await cleanup.runOnce()
    assert.equal(result.removed.length, 1)
    assert.equal(result.removed[0].sessionId, 'session-old')
    assert.equal(result.removed[0].reason, 'inactive')
    assert.equal(result.kept[0].sessionId, 'session-live')
    assert.equal(result.kept[0].reason, 'session-active')
    await assert.rejects(() => stat(old.path))
    assert.equal((await stat(live.path)).isDirectory(), true)
    assert.equal(store.state.worktrees['session-old'], undefined)
    assert.ok(store.state.worktrees['session-live'])
    assert.equal(store.state.cleanup.at > 0, true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a cleanup pass leaves a disabled policy alone', async () => {
  const root = await makeRepository()
  const exec = runner()
  try {
    const created = await createWorktree(exec, { repoRoot: root, name: 'dsh-clean-0004', base: 'main', config })
    const store = fakeStore({ worktrees: { s: { ...created, createdAt: 0 } } })
    const cleanup = createWorktreeCleanup({
      runner: exec,
      config: { worktree: { ...config, cleanup: { ...enabled, enabled: false } } },
      logger: quietLogger,
      store,
      runtime: { isSessionActive: () => false },
    })
    assert.equal(await cleanup.runOnce(), null)
    assert.equal((await stat(created.path)).isDirectory(), true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
