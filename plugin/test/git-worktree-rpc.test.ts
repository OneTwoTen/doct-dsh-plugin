import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { mountGit } from '../src/features/git.ts'
import { normalizeConfig } from '../src/lib/config.ts'

/**
 * Contract test for the Host half of the new actions: a Session gets its own
 * worktree, a change request binds to it, and the merge-cleanup setting is
 * written into the profile's plugin row.
 */

/** A repository with one commit on `main`, so a checkout has a base. */
async function makeRepository() {
  const root = await mkdtemp(join(tmpdir(), 'personal-hub-worktree-rpc-'))
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q')
  git('config', 'user.email', 'rpc@example.com')
  git('config', 'user.name', 'RPC Tester')
  git('config', 'commit.gpgsign', 'false')
  await writeFile(join(root, 'a.txt'), 'one\n', 'utf8')
  git('add', '-A')
  git('commit', '-qm', 'first commit')
  git('branch', '-M', 'main')
  return root
}

/**
 * Mount the feature over a fake Connection registry and a fake Host context.
 * @param {{ root: string, services?: Record<string, unknown>, config?: Record<string, unknown> }} options
 */
async function mountFeature({ root, services = {}, config = {}, on }: { root: string; services?: Record<string, unknown>; config?: Record<string, unknown>; on?: (name: string, listener: (payload: unknown) => void) => void }) {
  const dataDir = await mkdtemp(join(tmpdir(), 'personal-hub-home-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = dataDir

  const routes = new Map()
  const disposers = []
  const listeners = []
  const connection = {
    fetch: {
      register(route) {
        routes.set(route.path, route)
        const dispose = () => routes.delete(route.path)
        disposers.push(dispose)
        return dispose
      },
    },
  }
  const agent = { session: { id: 'session-ad0ab5d0-bb7b-4713-8ff9-ce1842335e26', header: { cwd: root } } }
  const base = {
    agents: { get: (id) => (id === 'session-ad0ab5d0-bb7b-4713-8ff9-ce1842335e26' ? agent : undefined) },
    ...services,
  }
  const ctx = {
    get: (name) => (name === 'connection' ? connection : base[name]),
    ...(on === undefined
      ? {}
      : {
          on(name, listener) {
            listeners.push({ name, listener })
            on(name, listener)
            return () => {}
          },
        }),
  }
  const logger = { info: () => {}, warn: () => {}, error: () => {} }
  mountGit(ctx as never, normalizeConfig({ git: config }).git, { logger })

  return {
    agent,
    routes,
    listeners,
    dataDir,
    async call(endpoint, payload) {
      const route = routes.get(`/api/personal-hub-git/${endpoint}`)
      assert.ok(route, `the ${endpoint} route is registered`)
      const request = new Request(`http://dsh.internal/api/personal-hub-git/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      })
      const response = await route.fetch(request)
      return await response.json()
    },
    async dispose() {
      for (const dispose of disposers) dispose()
      if (previous === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = previous
      // The mount records itself asynchronously, so a removal can race that write.
      for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
          await rm(dataDir, { recursive: true, force: true })
          return
        } catch (error) {
          if (error?.code !== 'ENOTEMPTY') throw error
          await new Promise((resolve) => setTimeout(resolve, 20))
        }
      }
    },
  }
}

const SESSION = 'session-ad0ab5d0-bb7b-4713-8ff9-ce1842335e26'

/** Poll one value until it answers, so a fire-and-forget listener can finish. */
async function waitFor(probe, timeoutMs = 4000) {
  const started = Date.now()
  for (;;) {
    const value = await probe()
    if (value !== null && value !== undefined) return value
    if (Date.now() - started > timeoutMs) throw new Error('timed out waiting for a background effect')
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

/** A model stand-in that answers one fixed JSON draft. */
function fakeNamingModel(answer) {
  const seen = { effort: null, sessionId: null }
  return {
    seen,
    async prepareCall(config, _signal, configure) {
      const controls = configure({}, { reasoning: { efforts: [{ id: 'low' }, { id: 'high' }] } })
      seen.effort = controls.reasoningEffort
      return {
        config: { provider: config.provider, model: config.model, ...controls },
        async *stream(options) {
          seen.sessionId = options.sessionId
          yield { type: 'text-delta', index: 0, text: answer }
        },
      }
    },
  }
}

test('the New Session option reports the bases and hides itself outside a repository', async () => {
  const root = await makeRepository()
  const feature = await mountFeature({ root })
  const outside = await mkdtemp(join(tmpdir(), 'personal-hub-plain-'))
  try {
    const answer = await feature.call('worktreeState', { sessionId: SESSION, probe: true })
    assert.equal(answer.ok, true, JSON.stringify(answer))
    assert.equal(answer.value.supported, true)
    assert.equal(answer.value.reason, null)
    assert.equal(answer.value.bases.defaultBase, 'main')
    assert.ok(answer.value.bases.local.some((branch) => branch.name === 'main'))
    assert.equal(answer.value.current, null)

    // The probe is recorded, which is how the Host can tell the Client rendered.
    const stored = JSON.parse(await readFile(join(feature.dataDir, 'personal-hub', 'git.json'), 'utf8'))
    assert.equal(stored.probe.sessionId, SESSION)
    assert.equal(stored.probe.supported, true)

    const plain = await feature.call('worktreeState', { cwd: outside })
    assert.equal(plain.ok, true, JSON.stringify(plain))
    assert.equal(plain.value.supported, false)
    assert.equal(plain.value.reason, 'not-a-repository')

    const noDirectory = await feature.call('worktreeState', {})
    assert.equal(noDirectory.ok, true, JSON.stringify(noDirectory))
    assert.equal(noDirectory.value.reason, 'no-directory')
  } finally {
    await feature.dispose()
    await rm(root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})

test('a Session moves into its own worktree and back', async () => {
  const root = await makeRepository()
  const moves = []
  let current = root
  const feature = await mountFeature({
    root,
    services: {
      // The working-directory service, not the immutable Session header, is
      // what follows a checkout switch.
      workingDirectory: {
        get: (session) => current ?? session.header.cwd,
        set: async (_agent, path) => {
          moves.push(path)
          current = path
          return path
        },
      },
    },
  })
  try {
    const created = await feature.call('worktreeCreate', { sessionId: SESSION })
    assert.equal(created.ok, true, JSON.stringify(created))
    const record = created.value.worktree
    assert.match(record.branch, /^dsh-ad0ab5d0-[0-9a-f]{4}$/)
    assert.equal(record.base, 'main')
    assert.equal(record.source, 'local')
    assert.equal((await stat(record.path)).isDirectory(), true)
    assert.deepEqual(moves, [record.path])

    // The panel now reads the worktree of the Session it renders.
    const overview = await feature.call('overview', { sessionId: SESSION })
    assert.equal(overview.ok, true, JSON.stringify(overview))
    assert.equal(overview.value.worktree.branch, record.branch)
    assert.equal(overview.value.repo.root, record.path)
    assert.equal(overview.value.repo.branch, record.branch)

    // A second checkout for the same Session is refused, not silently replaced.
    const again = await feature.call('worktreeCreate', { sessionId: SESSION })
    assert.equal(again.ok, false)
    assert.equal(again.error.code, 'worktree/already')

    const state = await feature.call('worktreeState', { sessionId: SESSION })
    assert.equal(state.value.current.branch, record.branch)

    const removed = await feature.call('worktreeRemove', { sessionId: SESSION })
    assert.equal(removed.ok, true, JSON.stringify(removed))
    assert.equal(removed.value.removed, true)
    await assert.rejects(() => stat(record.path))
    assert.equal(moves.at(-1), root)

    const after = await feature.call('overview', { sessionId: SESSION })
    assert.equal(after.value.worktree, null)
    assert.equal(after.value.repo.root, root)
  } finally {
    await feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('a worktree needs an open Session and an enabled feature', async () => {
  const root = await makeRepository()
  const feature = await mountFeature({ root })
  try {
    const noAgent = await feature.call('worktreeCreate', { sessionId: 'session-unknown', cwd: root })
    assert.equal(noAgent.ok, false)
    assert.equal(noAgent.error.code, 'worktree/no-agent')

    const missing = await feature.call('worktreeRemove', { sessionId: SESSION })
    assert.equal(missing.ok, false)
    assert.equal(missing.error.code, 'worktree/unknown')
  } finally {
    await feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('a worktree the configuration disables is refused with its reason', async () => {
  const root = await makeRepository()
  const feature = await mountFeature({ root, config: { worktree: { enabled: false } } })
  try {
    const state = await feature.call('worktreeState', { sessionId: SESSION })
    assert.equal(state.value.supported, false)
    assert.equal(state.value.reason, 'disabled')
    const created = await feature.call('worktreeCreate', { sessionId: SESSION })
    assert.equal(created.ok, false)
    assert.equal(created.error.code, 'worktree/disabled')
  } finally {
    await feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('creating a pull request without a remote or a code host refuses early', async () => {
  const root = await makeRepository()
  const feature = await mountFeature({
    root,
    services: { llm: { prepareCall: async () => ({ config: {}, stream: async function* () {} }) } },
  })
  try {
    const answer = await feature.call('createPull', { sessionId: SESSION })
    assert.equal(answer.ok, false)
    assert.equal(answer.error.code, 'pr/no-remote')
  } finally {
    await feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('the merge setting is readable and refuses to write without a configuration editor', async () => {  const root = await makeRepository()
  const feature = await mountFeature({ root })
  try {
    const settings = await feature.call('mergeSettings', {})
    assert.equal(settings.ok, true, JSON.stringify(settings))
    assert.equal(settings.value.enabled, false)
    assert.equal(settings.value.removeWorktree, true)
    assert.equal(settings.value.deleteBranch, false)
    assert.equal(settings.value.archiveSession, true)
    assert.equal(settings.value.writable, false)

    const refused = await feature.call('mergeSettingsSet', { enabled: true })
    assert.equal(refused.ok, false)
    assert.equal(refused.error.code, 'config/unavailable')
  } finally {
    await feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('the merge setting is written into the plugin row through the configuration editor', async () => {
  const root = await makeRepository()
  const edits = []
  const entry = { options: { id: 'personal-hub', name: '@local/personal-hub', config: { telegram: { enabled: true }, git: { forge: 'auto' } } } }
  const editor = {
    entries: () => [entry, { options: { id: 'other', name: 'other' } }],
    edit: async (target, change) => {
      const next = change({ telegram: { enabled: true }, git: { forge: 'auto', merged: { checkMs: 30000 } } }, {})
      edits.push({ target, next })
    },
  }
  const feature = await mountFeature({ root, services: { configEditor: editor } })
  try {
    const settings = await feature.call('mergeSettings', {})
    assert.equal(settings.value.writable, true)

    const saved = await feature.call('mergeSettingsSet', { enabled: true, deleteBranch: true })
    assert.equal(saved.ok, true, JSON.stringify(saved))
    assert.equal(saved.value.merged.enabled, true)
    assert.equal(saved.value.merged.deleteBranch, true)
    assert.equal(edits.length, 1)
    assert.equal(edits[0].target.options.name, '@local/personal-hub')
    assert.deepEqual(edits[0].next.git.merged, { checkMs: 30000, enabled: true, removeWorktree: true, deleteBranch: true, archiveSession: true })
    // The cleanup rules ride the same row and keep their own defaults.
    assert.deepEqual(edits[0].next.git.worktree.cleanup, {
      enabled: false,
      inactiveDays: 7,
      whenNoCommits: true,
      keepChanges: 'tracked',
      deleteBranch: false,
    })
    // The row keeps the settings it does not own.
    assert.deepEqual(edits[0].next.telegram, { enabled: true })
  } finally {
    await feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('the first message renames the checkout branch when naming is semantic', async () => {
  const root = await makeRepository()
  let current = root
  const model = fakeNamingModel('{"prefix":"feat","slug":"add the panel"}')
  const feature = await mountFeature({
    root,
    config: { worktree: { naming: 'semantic' } },
    services: {
      llm: { prepareCall: model.prepareCall },
      agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
      workingDirectory: {
        get: (session) => current ?? session.header.cwd,
        set: async (_agent, path) => {
          current = path
          return path
        },
      },
    },
    on: () => {},
  })
  try {
    const created = await feature.call('worktreeCreate', { sessionId: SESSION })
    assert.equal(created.ok, true, JSON.stringify(created))
    const record = created.value.worktree
    const listener = feature.listeners.find((entry) => entry.name === 'agent/inbox/inserted')
    assert.ok(listener, 'the feature watches for the first message')

    listener.listener({
      agent: { session: { id: SESSION } },
      message: { content: [{ type: 'text', text: 'Please add the panel to the sidebar' }] },
    })

    const branch = await waitFor(() => {
      const out = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: record.path,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
      return out === record.branch ? null : out
    })
    assert.equal(branch, 'feat/add-the-panel')
    assert.equal(model.seen.effort, 'low')

    // The panel and the store now name the renamed branch.
    const state = await feature.call('worktreeState', { sessionId: SESSION })
    assert.equal(state.value.current.branch, 'feat/add-the-panel')
    assert.equal(state.value.current.name, record.name)
    assert.equal(state.value.current.path, record.path)
  } finally {
    await feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('cleanup settings and a manual pass are served to the panel', async () => {
  const root = await makeRepository()
  const enabled = await mountFeature({ root, config: { worktree: { cleanup: { enabled: true } } } })
  const disabled = await mountFeature({ root })
  try {
    const state = await enabled.call('cleanupState', {})
    assert.equal(state.ok, true, JSON.stringify(state))
    assert.equal(state.value.settings.enabled, true)
    assert.equal(state.value.last, null)

    const run = await enabled.call('cleanupRun', {})
    assert.equal(run.ok, true, JSON.stringify(run))
    assert.equal(run.value.ran, true)
    assert.deepEqual(run.value.last.removed, [])
    assert.deepEqual(run.value.last.kept, [])

    const refused = await disabled.call('cleanupRun', {})
    assert.equal(refused.ok, true, JSON.stringify(refused))
    assert.equal(refused.value.ran, false)
    assert.equal(refused.value.reason, 'disabled')
  } finally {
    await enabled.dispose()
    await disabled.dispose()
    await rm(root, { recursive: true, force: true })
  }
})
