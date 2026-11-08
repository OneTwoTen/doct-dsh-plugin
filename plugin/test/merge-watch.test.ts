import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createMergeWatcher, mergedCleanup } from '../src/lib/merge-watch.ts'

const quietLogger = { info: () => {}, warn: () => {}, error: () => {} }

/** A store stand-in with the same contract the plugin's JSON store offers. */
function fakeStore(initial: Record<string, any>) {
  const store = {
    state: structuredClone(initial),
    writes: 0,
    async load() {
      return store.state
    },
    async update(mutate: (state: Record<string, any>) => void) {
      store.writes += 1
      mutate(store.state)
      return store.state
    },
  }
  return store
}

const merged = { enabled: true, removeWorktree: true, deleteBranch: false, archiveSession: true, checkMs: 60000 }

test('every cleanup switch is independent and off means off', () => {
  assert.deepEqual(mergedCleanup({ ...merged }, { hasWorktree: true }), {
    removeWorktree: true,
    deleteBranch: false,
    archiveSession: true,
    active: true,
  })
  assert.deepEqual(mergedCleanup({ ...merged }, { hasWorktree: false }), {
    removeWorktree: false,
    deleteBranch: false,
    archiveSession: true,
    active: true,
  })
  assert.deepEqual(mergedCleanup({ ...merged, removeWorktree: false, archiveSession: false }, { hasWorktree: true }), {
    removeWorktree: false,
    deleteBranch: false,
    archiveSession: false,
    active: true,
  })
  assert.deepEqual(mergedCleanup({ ...merged, enabled: false }, { hasWorktree: true }), {
    removeWorktree: false,
    deleteBranch: false,
    archiveSession: false,
    active: false,
  })
  assert.deepEqual(mergedCleanup(undefined, { hasWorktree: true }), {
    removeWorktree: false,
    deleteBranch: false,
    archiveSession: false,
    active: false,
  })
})

/** One watcher over a fixed code-host answer. */
function makeWatcher({ state, worktrees = {}, config = merged, pullState }: {
  state: string
  worktrees?: Record<string, unknown>
  config?: typeof merged
  pullState?: () => Promise<{ number?: number; state?: string; url?: string }>
}) {
  const store = fakeStore({
    pulls: { 'session-a': { root: 'C:/repo', remote: { slug: 'o/r' }, number: 7, url: 'u', branch: 'b', done: false } },
    worktrees: { ...worktrees },
  })
  const effects: { removed: Array<{ record: unknown; sessionId: string }>; archived: string[] } = { removed: [], archived: [] }
  const watcher = createMergeWatcher({
    config: { merged: config },
    logger: quietLogger,
    store,
    forge: { pullState: pullState ?? (async () => ({ number: 7, state, url: 'https://host/pr/7' })) },
    runtime: {
      async removeSessionWorktree(record, sessionId) {
        effects.removed.push({ record, sessionId })
        return { removed: true, branchDeleted: false }
      },
      async archiveSession(sessionId) {
        effects.archived.push(sessionId)
        return true
      },
    },
  })
  return { watcher, store, effects }
}

test('a merged change request removes the worktree and archives the chat', async () => {
  const { watcher, store, effects } = makeWatcher({
    state: 'merged',
    worktrees: { 'session-a': { path: 'C:/repo/.agents/worktrees/x', branch: 'x', repositoryRoot: 'C:/repo' } },
  })
  await watcher.runOnce()
  assert.equal(effects.removed.length, 1)
  assert.equal(effects.removed[0].sessionId, 'session-a')
  assert.deepEqual(effects.archived, ['session-a'])
  assert.equal(store.state.pulls['session-a'].done, true)
  assert.equal(store.state.pulls['session-a'].state, 'merged')
  assert.equal(store.state.pulls['session-a'].worktreeRemoved, true)
  assert.equal(store.state.pulls['session-a'].archived, true)
})

test('a merged change request without a worktree only archives', async () => {
  const { watcher, store, effects } = makeWatcher({ state: 'merged' })
  await watcher.runOnce()
  assert.equal(effects.removed.length, 0)
  assert.deepEqual(effects.archived, ['session-a'])
  assert.equal(store.state.pulls['session-a'].done, true)
})

test('a closed change request settles tracking without cleanup', async () => {
  const { watcher, store, effects } = makeWatcher({
    state: 'closed',
    worktrees: { 'session-a': { path: 'p', branch: 'b', repositoryRoot: 'C:/repo' } },
  })
  await watcher.runOnce()
  assert.equal(effects.removed.length, 0)
  assert.equal(effects.archived.length, 0)
  assert.equal(store.state.pulls['session-a'].done, true)
  assert.equal(store.state.pulls['session-a'].state, 'closed')
})

test('an open change request stays tracked', async () => {
  const { watcher, store } = makeWatcher({ state: 'open' })
  await watcher.runOnce()
  assert.equal(store.state.pulls['session-a'].done, false)
  assert.equal(store.state.pulls['session-a'].state, 'open')
})

test('a settled binding is never polled again', async () => {
  let polls = 0
  const { watcher, store } = makeWatcher({ state: 'merged', pullState: async () => { polls += 1; return { state: 'merged' } } })
  await watcher.runOnce()
  await watcher.runOnce()
  assert.equal(polls, 1)
  assert.equal(store.state.pulls['session-a'].done, true)
})

test('nothing is polled while the feature is off', async () => {
  let polls = 0
  const { watcher } = makeWatcher({ state: 'merged', config: { ...merged, enabled: false }, pullState: async () => { polls += 1; return { state: 'merged' } } })
  await watcher.runOnce()
  assert.equal(polls, 0)
})

test('a failing poll keeps the binding for the next pass', async () => {
  const { watcher, store } = makeWatcher({
    state: 'open',
    pullState: async () => {
      throw new Error('offline')
    },
  })
  await watcher.runOnce()
  assert.equal(store.state.pulls['session-a'].done, false)
})

test('tracking the same change request twice writes once', async () => {
  const { watcher, store } = makeWatcher({ state: 'open' })
  await watcher.track('session-a', { root: 'C:/repo', remote: { slug: 'o/r' }, number: 7, url: 'u', branch: 'b', base: 'main' })
  const first = store.writes
  await watcher.track('session-a', { root: 'C:/repo', remote: { slug: 'o/r' }, number: 7, url: 'u', branch: 'b', base: 'main' })
  assert.equal(store.writes, first)
  await watcher.track('session-a', { root: 'C:/repo', remote: { slug: 'o/r' }, number: 8, url: 'u2', branch: 'b', base: 'main' })
  assert.equal(store.writes, first + 1)
  assert.equal(store.state.pulls['session-a'].number, 8)
})

test('a binding without a number is ignored', async () => {
  const { watcher, store } = makeWatcher({ state: 'open' })
  await watcher.track('session-b', { root: 'C:/repo', number: 0 })
  assert.equal(store.state.pulls['session-b'], undefined)
})
