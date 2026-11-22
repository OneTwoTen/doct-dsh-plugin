import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createMergeWatcher, mayAdoptBranchPull, mergedCleanup } from '../src/lib/merge-watch.ts'

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
function makeWatcher({ state, worktrees = {}, config = merged, active = false, pullState, archive }: {
  state: string
  worktrees?: Record<string, unknown>
  config?: typeof merged
  active?: boolean
  pullState?: () => Promise<{ number?: number; state?: string; url?: string }>
  archive?: () => Promise<boolean>
}) {
  const store = fakeStore({
    pulls: { 'session-a': { root: 'C:/repo/.agents/worktrees/x', remote: { slug: 'o/r' }, number: 7, url: 'u', branch: 'b', done: false } },
    worktrees: { ...worktrees },
  })
  const effects: { removed: Array<{ record: unknown; sessionId: string }>; archived: string[] } = { removed: [], archived: [] }
  const watcher = createMergeWatcher({
    config: { merged: config },
    logger: quietLogger,
    store,
    forge: { pullState: pullState ?? (async () => ({ number: 7, state, url: 'https://host/pr/7' })) },
    runtime: {
      isSessionActive: () => active,
      async removeSessionWorktree(record, sessionId) {
        effects.removed.push({ record, sessionId })
        return { removed: true, branchDeleted: false }
      },
      async archiveSession(sessionId) {
        effects.archived.push(sessionId)
        return archive === undefined ? true : await archive()
      },
    },
  })
  return { watcher, store, effects }
}

test('a merged change request removes the worktree and archives the chat', async () => {
  const { watcher, store, effects } = makeWatcher({
    state: 'merged',
    worktrees: { 'session-a': { path: 'C:/repo/.agents/worktrees/x', branch: 'b', repositoryRoot: 'C:/repo' } },
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

test('a merged request for another branch never touches the Session checkout', async () => {
  const { watcher, store, effects } = makeWatcher({
    state: 'merged',
    // The stale PR of the main checkout's integration branch, bound by the old
    // panel to a Session whose own checkout is this worktree.
    worktrees: { 'session-a': { path: 'C:/repo/.agents/worktrees/x', branch: 'dsh-abc-1234', repositoryRoot: 'C:/repo' } },
  })
  await watcher.runOnce()
  assert.equal(effects.removed.length, 0)
  assert.equal(effects.archived.length, 0)
  assert.equal(store.state.pulls['session-a'].done, true)
  assert.equal(store.state.pulls['session-a'].skipped, 'checkout-mismatch')
  assert.equal(store.state.pulls['session-a'].state, 'merged')
})

test('a merged change request archives the chat even while its Session is active', async () => {
  const { watcher, store, effects } = makeWatcher({
    state: 'merged',
    active: true,
    worktrees: { 'session-a': { path: 'C:/repo/.agents/worktrees/x', branch: 'b', repositoryRoot: 'C:/repo' } },
  })
  await watcher.runOnce()
  // Archiving is what stops the running work; the checkout then leaves with it.
  assert.deepEqual(effects.archived, ['session-a'])
  assert.equal(effects.removed.length, 1)
  assert.equal(store.state.pulls['session-a'].done, true)
  assert.equal(store.state.pulls['session-a'].archived, true)
})

test('a merged request waits while its Session stays in the checkout when archiving is unavailable', async () => {
  const { watcher, store, effects } = makeWatcher({
    state: 'merged',
    active: true,
    archive: async () => false,
    worktrees: { 'session-a': { path: 'C:/repo/.agents/worktrees/x', branch: 'b', repositoryRoot: 'C:/repo' } },
  })
  await watcher.runOnce()
  assert.equal(effects.removed.length, 0)
  assert.equal(effects.archived.length, 1)
  assert.equal(store.state.pulls['session-a'].done, false)
  assert.equal(store.state.pulls['session-a'].deferred, 'session-active')
})

test('a refused archive keeps the binding open and succeeds on a later pass', async () => {
  let refusals = 1
  const { watcher, store, effects } = makeWatcher({
    state: 'merged',
    archive: async () => {
      if (refusals > 0) {
        refusals -= 1
        throw new Error('the session is active (turn)')
      }
      return true
    },
    worktrees: { 'session-a': { path: 'C:/repo/.agents/worktrees/x', branch: 'b', repositoryRoot: 'C:/repo' } },
  })
  await watcher.runOnce()
  assert.equal(store.state.pulls['session-a'].done, false)
  assert.match(String(store.state.pulls['session-a'].archiveError), /active/)
  await watcher.runOnce()
  assert.equal(store.state.pulls['session-a'].done, true)
  assert.equal(store.state.pulls['session-a'].archived, true)
  assert.equal(store.state.pulls['session-a'].archiveError, undefined)
  assert.equal(effects.archived.length, 2)
})

test('a settled record with a refused archive is repaired on the next pass', async () => {
  const { watcher, store, effects } = makeWatcher({ state: 'merged' })
  store.state.pulls['session-a'] = {
    ...store.state.pulls['session-a'],
    state: 'merged',
    done: true,
    archiveError: 'cannot archive session: the session is active (job, turn)',
  }
  await watcher.runOnce()
  assert.deepEqual(effects.archived, ['session-a'])
  assert.equal(store.state.pulls['session-a'].archived, true)
  assert.equal(store.state.pulls['session-a'].archiveError, undefined)
})

test('a settled repair stops after its retry budget', async () => {
  const { watcher, store, effects } = makeWatcher({ state: 'merged' })
  store.state.pulls['session-a'] = {
    ...store.state.pulls['session-a'],
    state: 'merged',
    done: true,
    attempts: 5,
    archiveError: 'cannot archive session: the session is active (turn)',
  }
  await watcher.runOnce()
  assert.equal(effects.archived.length, 0)
  assert.equal(store.state.pulls['session-a'].done, true)
})

test('a permanent archive refusal settles after the retry budget', async () => {
  const { watcher, store, effects } = makeWatcher({
    state: 'merged',
    archive: async () => {
      throw new Error('cannot archive session: unknown')
    },
  })
  for (let pass = 0; pass < 6; pass += 1) await watcher.runOnce()
  assert.equal(effects.archived.length, 5)
  assert.equal(store.state.pulls['session-a'].done, true)
  assert.match(String(store.state.pulls['session-a'].archiveError), /unknown/)
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

test('tracking a different change request clears the previous settlement', async () => {
  const { watcher, store } = makeWatcher({ state: 'open' })
  store.state.pulls['session-a'] = {
    ...store.state.pulls['session-a'],
    state: 'merged',
    done: true,
    archived: true,
    archiveError: 'cannot archive session: the session is active (turn)',
  }
  await watcher.track('session-a', { root: 'C:/repo', remote: { slug: 'o/r' }, number: 9, url: 'u9', branch: 'b', base: 'main' })
  assert.equal(store.state.pulls['session-a'].number, 9)
  assert.equal(store.state.pulls['session-a'].done, false)
  assert.equal(store.state.pulls['session-a'].archived, undefined)
  assert.equal(store.state.pulls['session-a'].archiveError, undefined)
  assert.equal(store.state.pulls['session-a'].state, undefined)
})

test('tracking refuses a change request that names another branch', async () => {
  const { watcher, store } = makeWatcher({
    state: 'open',
    worktrees: { 'session-a': { path: 'C:/repo/.agents/worktrees/x', branch: 'dsh-abc-1234', repositoryRoot: 'C:/repo' } },
  })
  await watcher.track('session-a', {
    root: 'C:/repo',
    remote: { slug: 'o/r' },
    number: 852,
    url: 'u',
    branch: 't3/better-auth-cutover',
    base: 'main',
  })
  assert.equal(store.state.pulls['session-a'].number, 7)
  assert.equal(store.state.pulls['session-a'].branch, 'b')
})

test('only an open request of the Session own checkout is adopted', () => {
  const checkout = { path: 'C:/repo/.agents/worktrees/x', repositoryRoot: 'C:/repo', branch: 'dsh-abc-1234' }
  const base = { root: 'C:/repo/.agents/worktrees/x', branch: 'dsh-abc-1234', checkout }

  // Already merged history is never adopted: that is what marked a live Session done.
  assert.equal(mayAdoptBranchPull({ ...base, pull: { state: 'merged' } }), false)
  assert.equal(mayAdoptBranchPull({ ...base, pull: { state: 'closed' } }), false)
  assert.equal(mayAdoptBranchPull({ ...base, pull: null }), false)

  // An open request is adoptable only from the Session's own branch and checkout.
  assert.equal(mayAdoptBranchPull({ ...base, pull: { state: 'open' } }), true)
  assert.equal(mayAdoptBranchPull({ ...base, pull: { state: 'draft' } }), true)
  assert.equal(mayAdoptBranchPull({ ...base, pull: { state: 'open' }, branch: 't3/better-auth-cutover' }), false)
  assert.equal(mayAdoptBranchPull({ ...base, pull: { state: 'open' }, root: 'C:/elsewhere' }), false)
  assert.equal(mayAdoptBranchPull({ ...base, pull: { state: 'open' }, checkout: null }), false)
})
