import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createCommandRunner } from '../src/lib/git-run.ts'
import {
  ensureContext,
  materializeRepo,
  readContext,
  removeRepoCheckout,
  renderContextInstructions,
  writeContextInstructions,
} from '../src/lib/context.ts'
import { resolveRepoSet, type WorkspaceRepoEntry } from '../src/lib/repo-set.ts'

const quietLogger = { info: () => {}, warn: () => {}, error: () => {} }
const runner = () => createCommandRunner({ ctx: { get: () => undefined }, logger: quietLogger, timeoutMs: 30000 })
const config = { source: 'local' as const, dirtyMain: 'warn' as const }

async function makeRepo(root: string, name: string): Promise<string> {
  const directory = join(root, name)
  await mkdir(directory, { recursive: true })
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 'tester@example.com')
  git('config', 'user.name', 'Tester')
  git('config', 'commit.gpgsign', 'false')
  await writeFile(join(directory, 'README.md'), `${name}\n`, 'utf8')
  git('add', '-A')
  git('commit', '-qm', 'first')
  return directory
}

/** A repo with two remotes (`origin` and `upstream`) pointing at a local bare repo. */
async function makeRepoWithRemote(root: string, name: string): Promise<string> {
  const directory = await makeRepo(root, name)
  const remote = join(root, `${name}-remote.git`)
  execFileSync('git', ['init', '-q', '--bare', remote], { stdio: 'ignore' })
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] })
  git('remote', 'add', 'origin', remote)
  git('remote', 'add', 'upstream', remote)
  git('push', '-q', 'origin', 'main')
  git('push', '-q', 'upstream', 'main')
  return directory
}

test('a context starts empty and materializes only the repo that changes', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-context-'))
  try {
    const be = await makeRepo(workspace, 'be')
    const fe = await makeRepo(workspace, 'fe')
    const set = await resolveRepoSet(runner(), workspace)
    const context = await ensureContext({ workspaceRoot: workspace, sessionId: 'session-1', name: 'dsh-test' })
    assert.equal(context.repos && Object.keys(context.repos).length, 0)
    assert.equal((await stat(context.path)).isDirectory(), true)
    assert.notEqual(await readContext(context.path), undefined)

    const repo = set.repos.find((item) => item.id === 'be')
    assert.ok(repo)
    const made = await materializeRepo({ runner: runner(), context, repo, set, config, timeoutMs: 30000 })
    assert.equal(made.created, true)
    assert.equal((await stat(made.checkout.path)).isDirectory(), true)
    assert.equal(made.checkout.repositoryRoot, await realpath(be))
    assert.equal(context.repos.be.branch, 'dsh-test')
    // The untouched repository has no checkout in the context.
    await assert.rejects(() => stat(join(context.path, 'fe')))
    await assert.rejects(() => stat(fe).then(() => stat(join(context.path, 'fe'))))

    const again = await materializeRepo({ runner: runner(), context, repo, set, config, timeoutMs: 30000 })
    assert.equal(again.created, false)
    assert.equal(again.checkout.path, made.checkout.path)

    // A dirty main checkout is reported, not copied.
    await writeFile(join(fe, 'dirty.txt'), 'uncommitted\n', 'utf8')
    const feRepo = set.repos.find((item) => item.id === 'fe')
    assert.ok(feRepo)
    const dirty = await materializeRepo({ runner: runner(), context, repo: feRepo, set, config, timeoutMs: 30000 })
    assert.equal(dirty.created, true)
    assert.match(String(dirty.warning), /uncommitted changes/)

    const removed = await removeRepoCheckout({
      runner: runner(),
      context,
      repoId: 'be',
      deleteBranch: true,
      timeoutMs: 30000,
    })
    assert.equal(removed.removed, true)
    assert.equal(context.repos.be, undefined)
    await assert.rejects(() => stat(made.checkout.path))
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('a failed manifest write rolls back the worktree, its branch, and its directory', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-rollback-'))
  try {
    const be = await makeRepo(workspace, 'be')
    const set = await resolveRepoSet(runner(), workspace)
    const repo = set.repos.find((item) => item.id === 'be')
    assert.ok(repo)
    const context = await ensureContext({ workspaceRoot: workspace, sessionId: 'session-rollback', name: 'dsh-rollback' })
    // Force writeContext to fail: the manifest directory becomes a plain file.
    await rm(join(context.path, '.dsh'), { recursive: true, force: true })
    await writeFile(join(context.path, '.dsh'), 'not a directory\n', 'utf8')

    await assert.rejects(() => materializeRepo({ runner: runner(), context, repo, set, config, timeoutMs: 30000 }))

    // Nothing survives: no checkout directory, no worktree registration, no branch.
    await assert.rejects(() => stat(join(context.path, 'be')))
    const list = execFileSync('git', ['-C', be, 'worktree', 'list', '--porcelain'], { encoding: 'utf8' })
    assert.equal(list.includes(context.path), false)
    const branches = execFileSync('git', ['-C', be, 'branch', '--list', 'dsh-rollback*'], { encoding: 'utf8' })
    assert.equal(branches.trim(), '')
    assert.equal(context.repos.be, undefined)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('a per-repo manifest remote overrides the configured remote', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-manifest-remote-'))
  try {
    await makeRepoWithRemote(workspace, 'be')
    await writeFile(join(workspace, '.dsh-workspace.json'), JSON.stringify({ remote: { be: 'upstream' } }), 'utf8')
    const set = await resolveRepoSet(runner(), workspace)
    const repo = set.repos.find((item) => item.id === 'be')
    assert.ok(repo)
    const context = await ensureContext({ workspaceRoot: workspace, sessionId: 'session-mremote', name: 'dsh-mremote' })
    const made = await materializeRepo({
      runner: runner(),
      context,
      repo,
      set,
      config: { source: 'remote', remote: 'origin', base: 'main', fetchOnCheckout: true },
      timeoutMs: 30000,
    })
    assert.equal(made.checkout.source, 'remote')
    assert.equal(made.checkout.remote, 'upstream')
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('a manifest remote keyed by repo name is used when the id key is absent', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-manifest-name-'))
  try {
    await mkdir(join(workspace, 'apps'), { recursive: true })
    await makeRepoWithRemote(join(workspace, 'apps'), 'fe')
    await writeFile(join(workspace, '.dsh-workspace.json'), JSON.stringify({ remote: { fe: 'upstream' } }), 'utf8')
    const set = await resolveRepoSet(runner(), workspace)
    const repo = set.repos.find((item) => item.id === 'apps/fe')
    assert.ok(repo)
    assert.equal(repo.name, 'fe')
    const context = await ensureContext({ workspaceRoot: workspace, sessionId: 'session-nremote', name: 'dsh-nremote' })
    const made = await materializeRepo({
      runner: runner(),
      context,
      repo,
      set,
      config: { source: 'remote', remote: 'origin', base: 'main', fetchOnCheckout: true },
      timeoutMs: 30000,
    })
    assert.equal(made.checkout.remote, 'upstream')
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('fetchOnCheckout false forces a local source even when a remote is configured', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-no-fetch-'))
  try {
    const be = await makeRepo(workspace, 'be')
    // A remote that cannot be fetched: the old code would attempt it, fail,
    // and report a warning even though the local base is perfectly usable.
    execFileSync('git', ['remote', 'add', 'origin', join(workspace, 'missing-remote.git')], {
      cwd: be,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const set = await resolveRepoSet(runner(), workspace)
    const repo = set.repos.find((item) => item.id === 'be')
    assert.ok(repo)
    const context = await ensureContext({ workspaceRoot: workspace, sessionId: 'session-nofetch', name: 'dsh-nofetch' })
    const made = await materializeRepo({
      runner: runner(),
      context,
      repo,
      set,
      config: { source: 'remote', remote: 'origin', base: 'main', fetchOnCheckout: false },
      timeoutMs: 30000,
    })
    assert.equal(made.checkout.source, 'local')
    assert.equal(made.checkout.remote, null)
    assert.equal(made.warning, null)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('writeContextInstructions generates an AGENTS.md naming every repo and only real instruction files', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-context-md-'))
  try {
    const be = await makeRepo(workspace, 'be')
    const fe = await makeRepo(workspace, 'fe')
    await mkdir(join(workspace, 'apps'), { recursive: true })
    const api = await makeRepo(join(workspace, 'apps'), 'api')
    // Only `be` actually ships repository instructions.
    await writeFile(join(be, 'AGENTS.md'), '# Backend rules\n', 'utf8')
    const set = await resolveRepoSet(runner(), workspace)
    assert.equal(set.repos.length, 3)

    const context = await ensureContext({ workspaceRoot: workspace, sessionId: 'session-md', name: 'dsh-md' })
    await writeContextInstructions(context, set.repos)

    const target = join(context.path, 'AGENTS.md')
    assert.equal((await stat(target)).isFile(), true)
    const text = await readFile(target, 'utf8')
    assert.match(text, /Generated by DeepSeek Harness/)
    assert.match(text, /never overwritten/)
    assert.ok(text.includes(workspace), `workspace root missing from:\n${text}`)
    for (const repo of set.repos) {
      assert.ok(text.includes(repo.id), `repo id ${repo.id} missing from:\n${text}`)
      assert.ok(text.includes(repo.root), `main checkout ${repo.root} missing from:\n${text}`)
    }
    // No invented guidance: only the AGENTS.md that exists is listed.
    assert.ok(text.includes(join(be, 'AGENTS.md')))
    assert.equal(text.includes(join(fe, 'AGENTS.md')), false)
    assert.equal(text.includes(join(api, 'AGENTS.md')), false)
    assert.equal(text.includes('CLAUDE.md'), false)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('writeContextInstructions leaves an edited AGENTS.md untouched on a second call', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-context-md-keep-'))
  try {
    await makeRepo(workspace, 'be')
    const set = await resolveRepoSet(runner(), workspace)
    const context = await ensureContext({ workspaceRoot: workspace, sessionId: 'session-md-keep', name: 'dsh-md-keep' })

    await writeContextInstructions(context, set.repos)
    const target = join(context.path, 'AGENTS.md')
    const edited = '<!-- my own edits -->\n# Chat rules\nKeep this.\n'
    await writeFile(target, edited, 'utf8')
    await writeContextInstructions(context, set.repos)

    assert.equal(await readFile(target, 'utf8'), edited)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('renderContextInstructions is pure: it renders roles and only the instruction paths it is given', () => {
  const workspace = join(tmpdir(), 'dsh-virtual-workspace')
  const be: WorkspaceRepoEntry = {
    id: 'be', name: 'be', root: join(workspace, 'be'), relativePath: 'be',
    role: 'backend', description: '', core: true, available: false, source: 'scan',
  }
  const fe: WorkspaceRepoEntry = {
    id: 'apps/fe', name: 'fe', root: join(workspace, 'apps', 'fe'), relativePath: 'apps/fe',
    role: 'fe', description: '', core: true, available: false, source: 'scan',
  }
  const beAgents = join(be.root, 'AGENTS.md')
  const feClaude = join(fe.root, 'CLAUDE.md')
  const input: ReadonlySet<string> = new Set([beAgents, feClaude])

  const text = renderContextInstructions(workspace, [be, fe], input)
  assert.match(text, /Role: backend/)
  assert.equal(text.includes('Role: fe'), false)
  assert.ok(text.includes(beAgents))
  assert.ok(text.includes(feClaude))
  assert.equal(text.includes(join(fe.root, 'AGENTS.md')), false)
  assert.equal(renderContextInstructions(workspace, [be, fe], input), text)

  const withoutFiles = renderContextInstructions(workspace, [be, fe])
  assert.equal(withoutFiles.includes(beAgents), false)
  assert.equal(withoutFiles.includes(feClaude), false)
})
