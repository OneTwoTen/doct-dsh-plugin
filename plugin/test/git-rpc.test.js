import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { mountGit } from '../features/git.js'
import { normalizeConfig } from '../lib/config.js'

/** Keep the plugin's durable state out of the real Harness home. */
const testHome = await mkdtemp(join(tmpdir(), 'personal-hub-home-'))
process.env.DSH_HOME = testHome
process.once('exit', () => rmSync(testHome, { recursive: true, force: true }))

/** Initialize a repository with a committed file, a modified file, a staged file, and an untracked file. */
async function makeRepository() {
  const root = await mkdtemp(join(tmpdir(), 'personal-hub-git-'))
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q')
  git('config', 'user.email', 'tester@example.com')
  git('config', 'user.name', 'Tester')
  git('config', 'commit.gpgsign', 'false')
  await writeFile(join(root, 'a.txt'), 'one\ntwo\nthree\n', 'utf8')
  git('add', '-A')
  git('commit', '-qm', 'first commit')
  await writeFile(join(root, 'a.txt'), 'one\nTWO\nthree\nfour\n', 'utf8')
  await writeFile(join(root, 'staged.txt'), 'staged line\n', 'utf8')
  git('add', 'staged.txt')
  await writeFile(join(root, 'new.txt'), 'hello\nworld\n', 'utf8')
  return root
}

/** Mount the feature over a fake Connection fetch registry and return its routes. */
function mountFeature({ config = {}, agents } = {}) {
  const settings = { ...normalizeConfig({}).git, ...config }
  const routes = new Map()
  const notices = []
  const connection = {
    // The legacy registrar is what broke: touching it must never happen again.
    rpc: {
      handle() {
        throw new Error('connection.rpc.handle must not be used')
      },
    },
    fetch: {
      register(route) {
        if (routes.has(route.path)) throw new Error(`duplicate route ${route.path}`)
        routes.set(route.path, route)
        notices.push(route.path)
        return () => routes.delete(route.path)
      },
    },
  }
  const ctx = {
    get(name) {
      if (name === 'connection') return connection
      if (name === 'agents' && agents !== undefined) return agents
      return undefined
    },
  }
  const logger = {
    info: (...args) => notices.push(args),
    warn: (...args) => notices.push(args),
    error: (...args) => notices.push(args),
  }
  const dispose = mountGit(ctx, settings, { logger })
  return {
    notices,
    routes,
    dispose,
    call: async (endpoint, payload) => {
      const route = routes.get(`/api/personal-hub-git/${endpoint}`)
      if (route === undefined) return { ok: false, error: { code: 'gateway/not-found', message: 'no such route' } }
      const request = new Request(`http://dsh.internal/api/personal-hub-git/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      })
      return await route.fetch(request).then((response) => response.json())
    },
  }
}

test('overview reports the branch, the changed files, and their line counts', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    assert.ok(feature.routes.has('/api/personal-hub-git/overview'), 'the overview route is registered')

    const result = await feature.call('overview', { cwd: root })
    assert.equal(result.ok, true, JSON.stringify(result))
    const value = result.value
    assert.equal(value.repo.name, root.split(/[\\/]/).pop())
    assert.ok(typeof value.repo.branch === 'string' && value.repo.branch.length > 0)

    const byPath = new Map(value.files.map((file) => [file.path, file]))
    assert.equal(byPath.get('a.txt').kind, 'modified')
    assert.equal(byPath.get('a.txt').staged, false)
    assert.equal(byPath.get('a.txt').additions > 0, true)
    assert.equal(byPath.get('staged.txt').kind, 'added')
    assert.equal(byPath.get('staged.txt').staged, true)
    assert.equal(byPath.get('new.txt').untracked, true)
    assert.equal(byPath.get('new.txt').additions, 2)

    assert.equal(value.stats.files, 3)
    assert.equal(value.stats.untracked, 1)
    assert.equal(value.stats.staged, 1)
    assert.ok(value.commits.length >= 1)
    assert.equal(value.commits[0].subject, 'first commit')
    assert.deepEqual(value.forge, {
      provider: 'none',
      available: false,
      backend: null,
      reason: 'Kho mã không có remote',
    })
    assert.equal(typeof value.refreshMs, 'number')
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('diff renders the hunks of a tracked file and the content of an untracked one', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    const tracked = await feature.call('diff', { cwd: root, path: 'a.txt' })
    assert.equal(tracked.ok, true, JSON.stringify(tracked))
    const [patch] = tracked.value.files
    assert.equal(patch.path, 'a.txt')
    assert.ok(patch.hunks.length >= 1)
    const types = patch.hunks[0].lines.map((line) => line.type)
    assert.ok(types.includes('del'))
    assert.ok(types.includes('add'))
    assert.equal(patch.hunks[0].lines.some((line) => line.text === 'TWO'), true)

    const staged = await feature.call('diff', { cwd: root, path: 'staged.txt', staged: true })
    assert.equal(staged.ok, true, JSON.stringify(staged))
    assert.equal(staged.value.files[0].additions, 1)

    const untracked = await feature.call('diff', { cwd: root, path: 'new.txt', untracked: true })
    assert.equal(untracked.ok, true, JSON.stringify(untracked))
    assert.equal(untracked.value.untracked, true)
    assert.equal(untracked.value.files[0].additions, 2)
    assert.deepEqual(untracked.value.files[0].hunks[0].lines.map((line) => line.text), ['hello', 'world'])
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('commit, commits, and branches answer from the repository', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    const log = await feature.call('commits', { cwd: root, limit: 5 })
    assert.equal(log.ok, true, JSON.stringify(log))
    assert.equal(log.value.commits[0].subject, 'first commit')

    const detail = await feature.call('commit', { cwd: root, hash: log.value.commits[0].hash })
    assert.equal(detail.ok, true, JSON.stringify(detail))
    assert.equal(detail.value.commit.subject, 'first commit')
    assert.equal(detail.value.files.length, 1)
    assert.equal(detail.value.files[0].path, 'a.txt')
    assert.ok(detail.value.patches[0].hunks.length >= 1)

    const branches = await feature.call('branches', { cwd: root, limit: 5 })
    assert.equal(branches.ok, true, JSON.stringify(branches))
    assert.equal(branches.value.branches[0].current, true)
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('a session id resolves the working folder through the agents service', async () => {
  const root = await makeRepository()
  const agents = { get: (id) => (id === 'session-1' ? { session: { header: { cwd: root } } } : undefined) }
  const feature = mountFeature({ agents })
  try {
    const result = await feature.call('overview', { sessionId: 'session-1' })
    assert.equal(result.ok, true, JSON.stringify(result))
    assert.equal(result.value.repo.root, root)
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('failures carry a code the panel can act on', async () => {
  const root = await makeRepository()
  const outside = await mkdtemp(join(tmpdir(), 'personal-hub-plain-'))
  const feature = mountFeature()
  try {
    // Only the documented actions are routed; an unknown one never reaches the Host.
    assert.equal(feature.routes.has('/api/personal-hub-git/nope'), false)
    assert.equal(feature.routes.size, 19)
    assert.deepEqual(
      [...feature.routes.keys()].sort(),
      [
        'branchPull', 'branches', 'cleanupRun', 'cleanupState', 'commit', 'commits', 'createPull', 'diff', 'forge',
        'issue', 'issues', 'mergeSettings', 'mergeSettingsSet', 'overview', 'pull', 'pulls', 'worktreeCreate',
        'worktreeRemove', 'worktreeState',
      ]
        .map((endpoint) => `/api/personal-hub-git/${endpoint}`)
        .sort(),
    )

    // A body that is not JSON is refused before any repository work starts.
    const route = feature.routes.get('/api/personal-hub-git/overview')
    const response = await route.fetch(new Request('http://dsh.internal/api/personal-hub-git/overview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    }))
    const refused = await response.json()
    assert.equal(refused.ok, false)
    assert.equal(refused.error.code, 'input/invalid')

    const missing = await feature.call('overview', {})
    assert.equal(missing.ok, false)
    assert.equal(missing.error.code, 'git/no-directory')

    const relative = await feature.call('overview', { cwd: 'relative/path' })
    assert.equal(relative.ok, false)
    assert.equal(relative.error.code, 'input/invalid')

    const notRepo = await feature.call('overview', { cwd: outside })
    assert.equal(notRepo.ok, false)
    assert.equal(notRepo.error.code, 'git/not-a-repository')

    const escape = await feature.call('diff', { cwd: root, path: '../outside.txt' })
    assert.equal(escape.ok, false)
    assert.equal(escape.error.code, 'input/invalid')

    const badHash = await feature.call('commit', { cwd: root, hash: 'zzz' })
    assert.equal(badHash.ok, false)
    assert.equal(badHash.error.code, 'input/invalid')
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})

test('without a connection service the feature mounts as a no-op', () => {
  const notices = []
  const ctx = { get: () => undefined }
  const dispose = mountGit(ctx, normalizeConfig({}).git, {
    logger: { info: (...args) => notices.push(args), warn: () => {}, error: () => {} },
  })
  assert.equal(typeof dispose, 'function')
  dispose()
  assert.equal(notices.length, 1)
})
