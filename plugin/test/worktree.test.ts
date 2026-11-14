import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createCommandRunner } from '../src/lib/git-run.ts'
import {
  createWorktree,
  fetchRemoteBranch,
  generatedWorktreeName,
  isInside,
  parseWorktreeList,
  poolDirectory,
  readBases,
  removeWorktree,
  renameWorktreeBranch,
  resolveDefaultBase,
  worktreePath,
} from '../src/lib/worktree.ts'

const quietLogger = { info: () => {}, warn: () => {}, error: () => {} }
const gitRunner = () => createCommandRunner({ ctx: { get: () => undefined }, logger: quietLogger, timeoutMs: 30000 })
const config = { directory: '.agents/worktrees', namePrefix: 'dsh' }

test('a worktree name carries the Session digits and a random suffix', () => {
  const name = generatedWorktreeName('session-ad0ab5d0-bb7b-4713-8ff9-ce1842335e26')
  assert.match(name, /^dsh-ad0ab5d0-[0-9a-f]{4}$/)
  assert.notEqual(name, generatedWorktreeName('session-ad0ab5d0-bb7b-4713-8ff9-ce1842335e26'))
  assert.match(generatedWorktreeName('session-ad0ab5d0-bb7b-4713-8ff9-ce1842335e26', 'team'), /^team-ad0ab5d0-/)
  assert.match(generatedWorktreeName('no-uuid-here'), /^dsh-[0-9a-f]{8}-[0-9a-f]{4}$/)
  assert.match(generatedWorktreeName('session-ad0ab5d0-bb7b-4713-8ff9-ce1842335e26', ''), /^ad0ab5d0-/)
})

test('the pool directory follows the configuration, absolutely when given so', () => {
  assert.equal(poolDirectory('C:/repo', { directory: '.agents/worktrees' }), join('C:/repo', '.agents', 'worktrees'))
  assert.equal(poolDirectory('C:/repo', { directory: '' }), join('C:/repo', '.agents', 'worktrees'))
  assert.equal(poolDirectory('C:/repo', { directory: 'C:/elsewhere' }), 'C:/elsewhere')
})

test('a worktree path never leaves the pool', () => {
  const pool = poolDirectory('C:/repo', config)
  assert.equal(worktreePath('C:/repo', config, 'dsh-1'), join(pool, 'dsh-1'))
  assert.throws(() => worktreePath('C:/repo', config, '../escape'), /không hợp lệ/i)
  assert.throws(() => worktreePath('C:/repo', config, '..'), /không hợp lệ/i)
  assert.throws(() => worktreePath('C:/repo', config, ''), /không hợp lệ/i)
})

test('one directory is recognized as inside another', () => {
  assert.equal(isInside('C:/repo', 'C:/repo/.agents/worktrees/x'), true)
  assert.equal(isInside('C:/repo', 'C:/repo'), true)
  assert.equal(isInside('C:/repo', 'C:/repo-other'), false)
  assert.equal(isInside('C:/repo', 'C:/elsewhere/x'), false)
})

test('the porcelain worktree list is parsed into records', () => {
  const raw = [
    'worktree C:/repo',
    'HEAD 0123456789abcdef',
    'branch refs/heads/main',
    '',
    'worktree C:/repo/.agents/worktrees/dsh-1',
    'HEAD fedcba9876543210',
    'branch refs/heads/dsh-1',
    '',
    'worktree C:/repo/detached',
    'HEAD aaaabbbbccccdddd',
    'detached',
    '',
  ].join('\n')
  const records = parseWorktreeList(raw)
  assert.equal(records.length, 3)
  assert.equal(records[0].path, 'C:/repo')
  assert.equal(records[0].branch, 'main')
  assert.equal(records[1].branch, 'dsh-1')
  assert.equal(records[2].detached, true)
  assert.equal(records[2].branch, null)
})

/**
 * A project with one commit on `main` and a bare remote holding it, so both the
 * local and the remote starting point can be exercised without a network.
 */
async function makeRepositoryWithRemote() {
  const base = await mkdtemp(join(tmpdir(), 'personal-hub-worktree-'))
  const remoteDir = join(base, 'remote.git')
  const root = join(base, 'project')
  const git = (args: string[], cwd?: string) => execFileSync('git', args, { cwd: cwd ?? base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

  git(['init', '-q', '--bare', remoteDir])
  git(['init', '-q', root])
  git(['config', 'user.email', 'worktree@example.com'], root)
  git(['config', 'user.name', 'Worktree Tester'], root)
  git(['config', 'commit.gpgsign', 'false'], root)
  await writeFile(join(root, 'a.txt'), 'one\n', 'utf8')
  git(['add', '-A'], root)
  git(['commit', '-qm', 'first commit'], root)
  git(['branch', '-M', 'main'], root)
  git(['remote', 'add', 'origin', remoteDir], root)
  git(['push', '-q', '-u', 'origin', 'main'], root)
  git(['checkout', '-q', '-b', 'feature/remote-only'], root)
  git(['push', '-q', '-u', 'origin', 'feature/remote-only'], root)
  git(['checkout', '-q', 'main'], root)
  git(['branch', '-q', '-D', 'feature/remote-only'], root)
  // The push also stored a remote-tracking ref locally; drop it so "from
  // remote" has to fetch the branch back from the code host.
  git(['update-ref', '-d', 'refs/remotes/origin/feature/remote-only'], root)
  return { base, root, remoteDir, git }
}

test('a checkout starts from a local branch and can be removed again', async () => {
  const { root, git } = await makeRepositoryWithRemote()
  const runner = gitRunner()
  try {
    const bases = await readBases(runner, { root })
    assert.equal(bases.defaultBase, 'main')
    assert.ok(bases.local.some((branch) => branch.name === 'main'))
    assert.ok(bases.remote.some((branch) => branch.name === 'origin/main'))
    assert.equal(await resolveDefaultBase(runner, { root }), 'main')

    const created = await createWorktree(runner, { repoRoot: root, name: 'dsh-test-0001', base: 'main', config })
    assert.equal(created.branch, 'dsh-test-0001')
    assert.equal(created.source, 'local')
    assert.equal((await stat(created.path)).isDirectory(), true)
    assert.equal((await readFile(join(created.path, 'a.txt'), 'utf8')).trim(), 'one')
    // The pool annotates itself so the checkout never shows up in the project.
    assert.match(await readFile(join(root, '.agents', 'worktrees', '.gitignore'), 'utf8'), /\*/)
    const list = await runner.run('git', ['worktree', 'list', '--porcelain'], { cwd: root })
    assert.match(list.stdout, /dsh-test-0001/)

    // A second attempt with the same name is refused rather than overwriting.
    await assert.rejects(() => createWorktree(runner, { repoRoot: root, name: 'dsh-test-0001', base: 'main', config }), /đã tồn tại/i)

    const removed = await removeWorktree(runner, { repoRoot: root, path: created.path, branch: created.branch, deleteBranch: true })
    assert.equal(removed.removed, true)
    assert.equal(removed.branchDeleted, true)
    await assert.rejects(() => stat(created.path))
    const branches = git(['branch', '--list'], root)
    assert.doesNotMatch(branches, /dsh-test-0001/)
  } finally {
    await rm(root.slice(0, root.lastIndexOf('\\project')), { recursive: true, force: true }).catch(() => {})
  }
})

test('a checkout starts from a branch the code host has, after fetching it', async () => {
  const { root } = await makeRepositoryWithRemote()
  const runner = gitRunner()
  try {
    const remoteBranch = await readBases(runner, { root })
    assert.equal(remoteBranch.remote.some((branch) => branch.branch === 'feature/remote-only'), false)

    const ref = await fetchRemoteBranch(runner, { root, remote: 'origin', branch: 'feature/remote-only' })
    assert.equal(ref, 'refs/remotes/origin/feature/remote-only')

    const created = await createWorktree(runner, {
      repoRoot: root,
      name: 'dsh-test-0002',
      base: 'feature/remote-only',
      source: 'remote',
      remote: 'origin',
      config,
    })
    assert.equal(created.source, 'remote')
    assert.equal(created.start, 'refs/remotes/origin/feature/remote-only')
    assert.equal((await runner.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: created.path })).stdout.trim(), 'dsh-test-0002')
    // Starting from a remote-tracking ref must not make the checkout track it:
    // a later push would publish this branch over the base branch.
    const upstream = await runner.run('git', ['rev-parse', '--abbrev-ref', '@{upstream}'], { cwd: created.path })
    assert.notEqual(upstream.code, 0, 'the new checkout has no upstream')

    await removeWorktree(runner, { repoRoot: root, path: created.path, branch: created.branch, deleteBranch: true })
  } finally {
    await rm(root.slice(0, root.lastIndexOf('\\project')), { recursive: true, force: true }).catch(() => {})
  }
})

test('renaming a checkout branch drops an upstream that names another branch', async () => {
  const { root, git } = await makeRepositoryWithRemote()
  const runner = gitRunner()
  try {
    const created = await createWorktree(runner, {
      repoRoot: root,
      name: 'dsh-test-0005',
      base: 'feature/remote-only',
      source: 'remote',
      remote: 'origin',
      config,
    })
    // Checkouts created before the tracking fix inherited the base as upstream.
    const tracked = await runner.run('git', ['branch', '--set-upstream-to=origin/main', created.branch], { cwd: created.path })
    assert.equal(tracked.code, 0)

    const renamed = await renameWorktreeBranch(runner, { path: created.path, branch: 'feat/named' })
    assert.equal(renamed, 'feat/named')
    assert.equal(git(['rev-parse', '--abbrev-ref', 'HEAD'], created.path).trim(), 'feat/named')
    const upstream = await runner.run('git', ['rev-parse', '--abbrev-ref', '@{upstream}'], { cwd: created.path })
    assert.notEqual(upstream.code, 0, 'the inherited upstream is gone')

    await removeWorktree(runner, { repoRoot: root, path: created.path, branch: renamed, deleteBranch: true })
  } finally {
    await rm(root.slice(0, root.lastIndexOf('\\project')), { recursive: true, force: true }).catch(() => {})
  }
})

test('a checkout with uncommitted changes is kept and reported', async () => {
  const { root } = await makeRepositoryWithRemote()
  const runner = gitRunner()
  try {
    const created = await createWorktree(runner, { repoRoot: root, name: 'dsh-test-0003', base: 'main', config })
    await writeFile(join(created.path, 'a.txt'), 'changed\n', 'utf8')
    await assert.rejects(
      () => removeWorktree(runner, { repoRoot: root, path: created.path, branch: created.branch }),
      (error: any) => {
        assert.equal(error.code, 'worktree/dirty')
        return true
      },
    )
    assert.equal((await readFile(join(created.path, 'a.txt'), 'utf8')).trim(), 'changed')
    // Committing the work makes the checkout removable again.
    execFileSync('git', ['-C', created.path, 'commit', '-qam', 'work'], { stdio: 'ignore' })
    await removeWorktree(runner, { repoRoot: root, path: created.path, branch: created.branch })
  } finally {
    await rm(root.slice(0, root.lastIndexOf('\\project')), { recursive: true, force: true }).catch(() => {})
  }
})

test('an unknown base branch is refused before anything is created', async () => {
  const { root } = await makeRepositoryWithRemote()
  const runner = gitRunner()
  try {
    await assert.rejects(
      () => createWorktree(runner, { repoRoot: root, name: 'dsh-test-0004', base: 'nope', config }),
      (error: any) => {
        assert.equal(error.code, 'worktree/unknown-base')
        return true
      },
    )
    await assert.rejects(() => stat(join(root, '.agents', 'worktrees', 'dsh-test-0004')))
  } finally {
    await rm(root.slice(0, root.lastIndexOf('\\project')), { recursive: true, force: true }).catch(() => {})
  }
})
