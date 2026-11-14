import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { mountGit } from '../src/features/git.ts'
import { normalizeConfig } from '../src/lib/config.ts'

/** Keep the plugin's durable state out of the real Harness home. */
const testHome = await mkdtemp(join(tmpdir(), 'personal-hub-home-'))
process.env.DSH_HOME = testHome
process.once('exit', () => rmSync(testHome, { recursive: true, force: true }))

/** The routes the feature registers, so a removed or renamed one fails the suite. */
const EXPECTED_ROUTES = [
  'actionState', 'branchPull', 'branches', 'cleanupRun', 'cleanupState', 'commit', 'commitChanges', 'commits',
  'counts', 'createBranch', 'createPull', 'diff', 'diffAll', 'discard', 'draftMessage', 'draftPull', 'forge',
  'issue', 'issues', 'mergePull', 'mergeSettings', 'mergeSettingsSet', 'overview', 'publish', 'pull',
  'pullRequest', 'pulls', 'push', 'stage', 'startAction', 'switchBranch', 'unstage', 'worktreeAdd',
  'worktreeCreate', 'worktreePrune', 'worktreeRemove', 'worktreeRemovePath', 'worktreeState', 'worktreeSwitch',
  'worktrees',
].sort()

/** Initialize a repository with a committed file, a modified file, a staged file, and an untracked file. */
async function makeRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'personal-hub-git-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q', '-b', 'main')
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

/** One feature mounted over a fake Connection fetch registry. */
interface MountedFeature {
  notices: unknown[]
  routes: Map<string, { fetch(request: Request): Promise<Response> }>
  dispose(): void
  call(endpoint: string, payload?: unknown): Promise<{ ok: boolean; value?: never; error?: { code: string; message: string } } & Record<string, unknown>>
}

/** Mount the feature over a fake Connection fetch registry and return its routes. */
function mountFeature({ config = {}, agents }: { config?: Record<string, unknown>; agents?: unknown } = {}): MountedFeature {
  const settings = { ...normalizeConfig({}).git, ...config }
  const routes = new Map<string, { fetch(request: Request): Promise<Response> }>()
  const notices: unknown[] = []
  const connection = {
    // The legacy registrar is what broke: touching it must never happen again.
    rpc: {
      handle() {
        throw new Error('connection.rpc.handle must not be used')
      },
    },
    fetch: {
      register(route: { path: string; fetch(request: Request): Promise<Response> }) {
        if (routes.has(route.path)) throw new Error(`duplicate route ${route.path}`)
        routes.set(route.path, route)
        notices.push(route.path)
        return () => routes.delete(route.path)
      },
    },
  }
  const ctx = {
    get(name: string): unknown {
      if (name === 'connection') return connection
      if (name === 'agents' && agents !== undefined) return agents
      return undefined
    },
  }
  const logger = {
    info: (...args: unknown[]) => notices.push(args),
    warn: (...args: unknown[]) => notices.push(args),
    error: (...args: unknown[]) => notices.push(args),
  }
  const dispose = mountGit(ctx as never, settings, { logger })
  return {
    notices,
    routes,
    dispose,
    async call(endpoint, payload) {
      const route = routes.get(`/api/personal-hub-git/${endpoint}`)
      if (route === undefined) return { ok: false, error: { code: 'gateway/not-found', message: 'no such route' } }
      const request = new Request(`http://dsh.internal/api/personal-hub-git/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      })
      return await route.fetch(request).then((response) => response.json()) as never
    },
  }
}

/** Poll one started action until it settles. */
async function settle(feature: MountedFeature, actionId: string): Promise<Record<string, unknown>> {
  const deadline = Date.now() + 15000
  for (;;) {
    const answer = await feature.call('actionState', { actionId })
    assert.equal(answer.ok, true, JSON.stringify(answer))
    const value = answer.value as unknown as Record<string, unknown>
    if (value.status !== 'running') return value
    assert.ok(Date.now() < deadline, 'the action settled')
    await new Promise((resolve) => setTimeout(resolve, 40))
  }
}

test('overview reports the branch, the changed files, and their line counts', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    assert.ok(feature.routes.has('/api/personal-hub-git/overview'), 'the overview route is registered')

    const result = await feature.call('overview', { cwd: root })
    assert.equal(result.ok, true, JSON.stringify(result))
    const value = result.value as unknown as Record<string, never>
    const repo = value.repo as unknown as Record<string, unknown>
    assert.equal(repo.name, root.split(/[\\/]/).pop())
    assert.equal(repo.branch, 'main')
    assert.equal(repo.isDefaultRef, true)
    assert.equal(repo.hasUpstream, false)
    assert.equal(repo.defaultBranch, 'main')

    const files = value.files as unknown as Array<Record<string, unknown>>
    const byPath = new Map(files.map((file) => [file.path as string, file]))
    assert.equal(byPath.get('a.txt')?.kind, 'modified')
    assert.equal(byPath.get('a.txt')?.staged, false)
    assert.equal((byPath.get('a.txt')?.additions as number) > 0, true)
    assert.equal(byPath.get('staged.txt')?.kind, 'added')
    assert.equal(byPath.get('staged.txt')?.staged, true)
    assert.equal(byPath.get('new.txt')?.untracked, true)
    assert.equal(byPath.get('new.txt')?.additions, 2)

    const stats = value.stats as unknown as Record<string, number>
    assert.equal(stats.files, 3)
    assert.equal(stats.untracked, 1)
    assert.equal(stats.staged, 1)
    const commits = value.commits as unknown as Array<Record<string, unknown>>
    assert.ok(commits.length >= 1)
    assert.equal(commits[0].subject, 'first commit')
    const forge = value.forge as unknown as Record<string, unknown>
    assert.equal(forge.provider, 'none')
    assert.equal(forge.available, false)
    assert.equal(forge.backend, null)
    assert.equal(typeof value.refreshMs, 'number')
    assert.equal(value.branchChanges, null)
    assert.equal(value.aheadOfDefault, 0)
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('diff renders one file, and diffAll renders every file in one answer', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    const tracked = await feature.call('diff', { cwd: root, path: 'a.txt' })
    assert.equal(tracked.ok, true, JSON.stringify(tracked))
    const trackedValue = tracked.value as unknown as Record<string, never>
    const [patch] = trackedValue.files as unknown as Array<Record<string, never>>
    assert.equal(patch.path, 'a.txt')
    const hunks = patch.hunks as unknown as Array<Record<string, never>>
    assert.ok(hunks.length >= 1)
    const lines = hunks[0].lines as unknown as Array<Record<string, unknown>>
    const types = lines.map((line) => line.type)
    assert.ok(types.includes('del'))
    assert.ok(types.includes('add'))
    assert.equal(lines.some((line) => line.text === 'TWO'), true)

    const staged = await feature.call('diff', { cwd: root, path: 'staged.txt', staged: true })
    assert.equal(staged.ok, true, JSON.stringify(staged))
    const stagedValue = staged.value as unknown as Record<string, never>
    assert.equal((stagedValue.files as unknown as Array<Record<string, never>>)[0].additions, 1)

    const untracked = await feature.call('diff', { cwd: root, path: 'new.txt', untracked: true })
    assert.equal(untracked.ok, true, JSON.stringify(untracked))
    const untrackedValue = untracked.value as unknown as Record<string, never>
    assert.equal(untrackedValue.untracked, true)
    const untrackedPatch = (untrackedValue.files as unknown as Array<Record<string, never>>)[0]
    assert.equal(untrackedPatch.additions, 2)
    assert.deepEqual(
      ((untrackedPatch.hunks as unknown as Array<Record<string, never>>)[0].lines as unknown as Array<Record<string, unknown>>).map((line) => line.text),
      ['hello', 'world'],
    )

    const bundle = await feature.call('diffAll', { cwd: root, scope: 'working' })
    assert.equal(bundle.ok, true, JSON.stringify(bundle))
    const bundleValue = bundle.value as unknown as Record<string, never>
    const bundleFiles = bundleValue.files as unknown as Array<Record<string, unknown>>
    assert.equal(bundleValue.scope, 'working')
    assert.equal(bundleValue.baseRef, null)
    assert.deepEqual(bundleFiles.map((file) => file.path).sort(), ['a.txt', 'new.txt', 'staged.txt'])
    const a = bundleFiles.find((file) => file.path === 'a.txt')
    assert.equal((a?.files as unknown as Array<Record<string, never>>).length, 1)
    assert.equal(bundleValue.truncated, false)
    assert.equal(bundleValue.totalFiles, 3)
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('commit, commits, branches, and ref changes answer from the repository', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    const log = await feature.call('commits', { cwd: root, limit: 5 })
    assert.equal(log.ok, true, JSON.stringify(log))
    const logValue = log.value as unknown as Record<string, never>
    const commits = logValue.commits as unknown as Array<Record<string, unknown>>
    assert.equal(commits[0].subject, 'first commit')

    const detail = await feature.call('commit', { cwd: root, hash: commits[0].hash })
    assert.equal(detail.ok, true, JSON.stringify(detail))
    const detailValue = detail.value as unknown as Record<string, never>
    assert.equal((detailValue.commit as unknown as Record<string, unknown>).subject, 'first commit')
    const files = detailValue.files as unknown as Array<Record<string, unknown>>
    assert.equal(files.length, 1)
    assert.equal(files[0].path, 'a.txt')
    assert.ok((detailValue.patches as unknown as Array<Record<string, never>>)[0].hunks)

    const branches = await feature.call('branches', { cwd: root, limit: 5 })
    assert.equal(branches.ok, true, JSON.stringify(branches))
    const branchesValue = branches.value as unknown as Record<string, never>
    const branchList = branchesValue.branches as unknown as Array<Record<string, unknown>>
    assert.equal(branchList[0].current, true)
    assert.equal(branchesValue.defaultBranch, 'main')
    assert.equal(branchesValue.hasPrimaryRemote, false)

    const created = await feature.call('createBranch', { cwd: root, name: 'feature/panel' })
    assert.equal(created.ok, true, JSON.stringify(created))
    assert.deepEqual(created.value, { branch: 'feature/panel' })
    const switched = await feature.call('switchBranch', { cwd: root, name: 'main' })
    assert.equal(switched.ok, true, JSON.stringify(switched))
    assert.deepEqual(switched.value, { branch: 'main' })

    const unknown = await feature.call('switchBranch', { cwd: root, name: 'nope' })
    assert.equal(unknown.ok, false)
    assert.equal(unknown.error?.code, 'branch/unknown')
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('stage, unstage, discard, and a selected commit change only the chosen files', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    const staged = await feature.call('stage', { cwd: root, paths: ['a.txt'] })
    assert.equal(staged.ok, true, JSON.stringify(staged))
    let overview = (await feature.call('overview', { cwd: root })).value as unknown as Record<string, never>
    let files = overview.files as unknown as Array<Record<string, unknown>>
    assert.equal(files.find((file) => file.path === 'a.txt')?.staged, true)

    const unstaged = await feature.call('unstage', { cwd: root, paths: ['a.txt'] })
    assert.equal(unstaged.ok, true, JSON.stringify(unstaged))
    overview = (await feature.call('overview', { cwd: root })).value as unknown as Record<string, never>
    files = overview.files as unknown as Array<Record<string, unknown>>
    assert.equal(files.find((file) => file.path === 'a.txt')?.staged, false)

    const committed = await feature.call('commitChanges', {
      cwd: root,
      message: 'change a only',
      paths: ['a.txt'],
    })
    assert.equal(committed.ok, true, JSON.stringify(committed))
    const committedValue = committed.value as unknown as Record<string, unknown>
    assert.equal(typeof committedValue.sha, 'string')
    assert.equal(committedValue.subject, 'change a only')

    overview = (await feature.call('overview', { cwd: root })).value as unknown as Record<string, never>
    files = overview.files as unknown as Array<Record<string, unknown>>
    assert.equal(files.some((file) => file.path === 'a.txt'), false)
    assert.equal(files.find((file) => file.path === 'staged.txt')?.staged, false, 'the index was reset for the selection')

    const discarded = await feature.call('discard', { cwd: root, paths: ['staged.txt'], includeUntracked: true })
    assert.equal(discarded.ok, true, JSON.stringify(discarded))
    overview = (await feature.call('overview', { cwd: root })).value as unknown as Record<string, never>
    files = overview.files as unknown as Array<Record<string, unknown>>
    assert.equal(files.some((file) => file.path === 'staged.txt'), false)
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('a drafted commit message falls back to the files when no model is available', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    const draft = await feature.call('draftMessage', { cwd: root, paths: ['a.txt'] })
    assert.equal(draft.ok, true, JSON.stringify(draft))
    const value = draft.value as unknown as Record<string, unknown>
    assert.equal(value.source, 'fallback')
    assert.equal(value.error, 'model-unavailable')
    assert.match(String(value.message), /Update a\.txt/)
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('a stacked action commits and pushes through its progress record', async () => {
  const root = await makeRepository()
  const remoteRoot = await mkdtemp(join(tmpdir(), 'personal-hub-remote-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main'], { cwd: remoteRoot, encoding: 'utf8' })
  git('remote', 'add', 'origin', remoteRoot)
  const feature = mountFeature()
  try {
    const started = await feature.call('startAction', {
      cwd: root,
      action: 'commit_push',
      commitMessage: 'commit and push',
      paths: ['a.txt'],
    })
    assert.equal(started.ok, true, JSON.stringify(started))
    const { actionId } = started.value as unknown as { actionId: string }
    assert.equal(typeof actionId, 'string')

    const state = await settle(feature, actionId)
    assert.equal(state.status, 'done', JSON.stringify(state))
    const result = state.result as unknown as Record<string, unknown>
    assert.equal((result.commit as Record<string, unknown>).status, 'created')
    assert.equal((result.commit as Record<string, unknown>).subject, 'commit and push')
    assert.equal((result.push as Record<string, unknown>).status, 'pushed')
    assert.equal((result.push as Record<string, unknown>).setUpstream, true)
    const toast = result.toast as Record<string, unknown>
    assert.match(String(toast.title), /Pushed/)

    const branches = await feature.call('branches', { cwd: root, limit: 20 })
    const branchValue = branches.value as unknown as Record<string, never>
    assert.equal(branchValue.hasPrimaryRemote, true)
    const branchList = branchValue.branches as unknown as Array<Record<string, unknown>>
    assert.ok(branchList.some((branch) => branch.isRemote === true), 'the pushed branch is listed as a remote ref')
    assert.ok(branchList.some((branch) => branch.isDefault === true && branch.isRemote === false))

    const again = await feature.call('startAction', { cwd: root, action: 'push' })
    const againId = (again.value as unknown as { actionId: string }).actionId
    const againState = await settle(feature, againId)
    const againResult = againState.result as unknown as Record<string, unknown>
    assert.equal((againResult.push as Record<string, unknown>).status, 'skipped_up_to_date')

    const unknown = await feature.call('actionState', { actionId: 'missing' })
    assert.equal(unknown.ok, false)
    assert.equal(unknown.error?.code, 'action/unknown')
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
    await rm(remoteRoot, { recursive: true, force: true })
  }
})

test('a push-only action can publish a feature branch instead of the default branch', async () => {
  const root = await makeRepository()
  const remoteRoot = await mkdtemp(join(tmpdir(), 'personal-hub-remote-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main'], { cwd: remoteRoot, encoding: 'utf8' })
  git('remote', 'add', 'origin', remoteRoot)
  git('add', '-A')
  git('commit', '-qm', 'panel work')
  git('push', '-q', '-u', 'origin', 'main')
  const feature = mountFeature()
  try {
    const started = await feature.call('startAction', {
      cwd: root,
      action: 'push',
      featureBranch: true,
    })
    const { actionId } = started.value as unknown as { actionId: string }
    const state = await settle(feature, actionId)
    assert.equal(state.status, 'done', JSON.stringify(state))
    const result = state.result as unknown as Record<string, unknown>
    const branch = result.branch as Record<string, unknown>
    assert.equal(branch.status, 'created')
    assert.match(String(branch.name), /^feature\//)
    const push = result.push as Record<string, unknown>
    assert.equal(push.status, 'pushed')
    assert.equal(push.branch, branch.name)
    assert.equal(push.setUpstream, true)

    // The commit landed on the feature branch on the remote, not on main again.
    const remoteRefs = execFileSync('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads'], {
      cwd: remoteRoot,
      encoding: 'utf8',
    })
    assert.match(remoteRefs, new RegExp(String(branch.name).replace('/', '\\/')))
    assert.match(remoteRefs, /main/)
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
    await rm(remoteRoot, { recursive: true, force: true })
  }
})

test('a stacked action refuses to push from a detached HEAD', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  try {
    git('checkout', '--detach', '-q')
    const started = await feature.call('startAction', { cwd: root, action: 'push' })
    const { actionId } = started.value as unknown as { actionId: string }
    const state = await settle(feature, actionId)
    assert.equal(state.status, 'failed')
    assert.equal((state.error as Record<string, unknown>).code, 'action/detached')
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('the tab counters report local commits and checkouts without a code host', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    const answer = await feature.call('counts', { cwd: root })
    assert.equal(answer.ok, true, JSON.stringify(answer))
    const value = answer.value as unknown as Record<string, unknown>
    assert.equal(value.commits, 1)
    assert.equal(value.worktrees, 1)
    assert.equal(value.pulls, null, 'no remote means no code-host counters')
    assert.equal(value.issues, null)
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('a merge without a remote is refused with a code the pane can explain', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    const answer = await feature.call('mergePull', { cwd: root, number: 1, method: 'squash' })
    assert.equal(answer.ok, false)
    assert.equal(answer.error?.code, 'pr/no-remote')
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('drafting a pull request without a remote refuses early', async () => {
  const root = await makeRepository()
  const feature = mountFeature()
  try {
    const answer = await feature.call('draftPull', { cwd: root })
    assert.equal(answer.ok, false)
    assert.equal(answer.error?.code, 'pr/no-remote')
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
  }
})

test('drafting a pull request returns a commit-backed draft without pushing', async () => {
  const root = await makeRepository()
  const remoteRoot = await mkdtemp(join(tmpdir(), 'personal-hub-remote-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main'], { cwd: remoteRoot, encoding: 'utf8' })
  git('remote', 'add', 'origin', remoteRoot)
  git('add', '-A')
  git('commit', '-qm', 'panel work')
  git('push', '-q', '-u', 'origin', 'main')
  git('checkout', '-q', '-b', 'feature/draft')
  await writeFile(join(root, 'b.txt'), 'draft route\n', 'utf8')
  git('add', '-A')
  git('commit', '-qm', 'add the draft route')
  const feature = mountFeature()
  try {
    const answer = await feature.call('draftPull', { cwd: root, locale: 'en' })
    assert.equal(answer.ok, true, JSON.stringify(answer))
    const value = answer.value as unknown as Record<string, unknown>
    assert.equal(value.title, 'add the draft route')
    assert.equal(value.base, 'main')
    assert.equal(value.head, 'feature/draft')
    assert.equal(value.ahead, 1)
    assert.equal(value.source, 'commits')
    assert.match(String(value.body), /## Changes/)
    assert.equal(typeof value.error, 'string')

    // Drafting never publishes anything: the remote still only has main.
    const remoteRefs = execFileSync('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads'], {
      cwd: remoteRoot,
      encoding: 'utf8',
    })
    assert.doesNotMatch(remoteRefs, /feature\/draft/)
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
    await rm(remoteRoot, { recursive: true, force: true })
  }
})

test('a draft compares with the remote base, not a stale local branch', async () => {
  const root = await makeRepository()
  const remoteRoot = await mkdtemp(join(tmpdir(), 'personal-hub-remote-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main'], { cwd: remoteRoot, encoding: 'utf8' })
  git('remote', 'add', 'origin', remoteRoot)
  git('add', '-A')
  git('commit', '-qm', 'panel work')
  git('push', '-q', '-u', 'origin', 'main')
  const firstMain = String(git('rev-parse', 'HEAD')).trim()

  // The code host gains a commit the local base branch has not seen yet.
  await writeFile(join(root, 'c.txt'), 'remote only\n', 'utf8')
  git('add', '-A')
  git('commit', '-qm', 'a change merged on the code host')
  git('push', '-q', 'origin', 'main')

  // A fresh checkout starts from the remote base while local main stays
  // behind, which is what a new worktree does.
  git('reset', '-q', '--hard', firstMain)
  git('checkout', '-q', '-b', 'feature/draft', 'origin/main')
  await writeFile(join(root, 'b.txt'), 'draft route\n', 'utf8')
  git('add', '-A')
  git('commit', '-qm', 'add the draft route')

  const feature = mountFeature()
  try {
    const answer = await feature.call('draftPull', { cwd: root, locale: 'en' })
    assert.equal(answer.ok, true, JSON.stringify(answer))
    const value = answer.value as unknown as Record<string, unknown>
    assert.equal(value.base, 'main', 'the request still targets the base branch name')
    assert.equal(value.ahead, 1, 'only this branch commits count, not the remote-only one')
    assert.equal(value.title, 'add the draft route')
    assert.doesNotMatch(String(value.body), /c\.txt/)
    assert.doesNotMatch(String(value.body), /merged on the code host/)
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
    await rm(remoteRoot, { recursive: true, force: true })
  }
})

test('a session id resolves the working folder through the agents service', async () => {
  const root = await makeRepository()
  const agents = { get: (id: string) => (id === 'session-1' ? { session: { header: { cwd: root } } } : undefined) }
  const feature = mountFeature({ agents })
  try {
    const result = await feature.call('overview', { sessionId: 'session-1' })
    assert.equal(result.ok, true, JSON.stringify(result))
    assert.equal((result.value as unknown as Record<string, never>).repo && ((result.value as unknown as Record<string, never>).repo as unknown as Record<string, unknown>).root, root)
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
    assert.equal(feature.routes.size, EXPECTED_ROUTES.length)
    assert.deepEqual(
      [...feature.routes.keys()].sort(),
      EXPECTED_ROUTES.map((endpoint) => `/api/personal-hub-git/${endpoint}`).sort(),
    )

    // A body that is not JSON is refused before any repository work starts.
    const route = feature.routes.get('/api/personal-hub-git/overview')!
    const response = await route.fetch(new Request('http://dsh.internal/api/personal-hub-git/overview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    }))
    const refused = await response.json() as Record<string, unknown>
    assert.equal(refused.ok, false)
    assert.equal((refused.error as Record<string, unknown>).code, 'input/invalid')

    const missing = await feature.call('overview', {})
    assert.equal(missing.ok, false)
    assert.equal(missing.error?.code, 'git/no-directory')

    const relative = await feature.call('overview', { cwd: 'relative/path' })
    assert.equal(relative.ok, false)
    assert.equal(relative.error?.code, 'input/invalid')

    const notRepo = await feature.call('overview', { cwd: outside })
    assert.equal(notRepo.ok, false)
    assert.equal(notRepo.error?.code, 'git/not-a-repository')

    const escape = await feature.call('diff', { cwd: root, path: '../outside.txt' })
    assert.equal(escape.ok, false)
    assert.equal(escape.error?.code, 'input/invalid')

    const badHash = await feature.call('commit', { cwd: root, hash: 'zzz' })
    assert.equal(badHash.ok, false)
    assert.equal(badHash.error?.code, 'input/invalid')
  } finally {
    feature.dispose()
    await rm(root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})

test('without a connection service the feature mounts as a no-op', () => {
  const notices: unknown[] = []
  const ctx = { get: () => undefined }
  const dispose = mountGit(ctx as never, normalizeConfig({}).git, {
    logger: { info: (...args: unknown[]) => notices.push(args), warn: () => {}, error: () => {} },
  })
  assert.equal(typeof dispose, 'function')
  dispose()
  assert.equal(notices.length, 1)
})
