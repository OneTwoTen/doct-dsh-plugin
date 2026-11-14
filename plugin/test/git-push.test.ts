import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createCommandRunner, pushCurrentBranch } from '../src/lib/git-run.ts'

const quietLogger = { info: () => {}, warn: () => {}, error: () => {} }
const gitRunner = () => createCommandRunner({ ctx: { get: () => undefined }, logger: quietLogger, timeoutMs: 30000 })

/**
 * A project with one commit on `main`, a bare remote holding it, and a worktree
 * branch cut from `origin/main` that carries one commit of its own.
 */
async function makeRepositoryWithTrackedWorktree() {
  const base = await mkdtemp(join(tmpdir(), 'personal-hub-push-'))
  const remoteDir = join(base, 'remote.git')
  const root = join(base, 'project')
  const worktree = join(base, 'checkout')
  const git = (args: string[], cwd = base) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

  git(['init', '-q', '--bare', remoteDir])
  git(['init', '-q', root])
  git(['config', 'user.email', 'push@example.com'], root)
  git(['config', 'user.name', 'Push Tester'], root)
  git(['config', 'commit.gpgsign', 'false'], root)
  await writeFile(join(root, 'a.txt'), 'one\n', 'utf8')
  git(['add', '-A'], root)
  git(['commit', '-qm', 'first commit'], root)
  git(['branch', '-M', 'main'], root)
  git(['remote', 'add', 'origin', remoteDir], root)
  git(['push', '-q', '-u', 'origin', 'main'], root)

  // The old worktree flow cut this branch from `origin/main`, so Git made it
  // track the base branch: the shape that published a feature branch onto main.
  git(['worktree', 'add', '-q', '-b', 'dsh-push-0001', worktree, 'origin/main'], root)
  await writeFile(join(worktree, 'b.txt'), 'feature work\n', 'utf8')
  git(['add', '-A'], worktree)
  git(['commit', '-qm', 'feature commit'], worktree)
  return { base, root, worktree, remoteDir, git }
}

test('a branch tracking another branch publishes under its own name, not over that branch', async () => {
  const { base, root, worktree, remoteDir, git } = await makeRepositoryWithTrackedWorktree()
  try {
    // The checkout starts in the broken shape.
    assert.equal(git(['rev-parse', '--abbrev-ref', '@{upstream}'], worktree).trim(), 'origin/main')
    const mainBefore = git(['rev-parse', 'refs/heads/main'], remoteDir).trim()

    const outcome = await pushCurrentBranch(gitRunner(), { root: worktree, branch: 'dsh-push-0001', remote: 'origin' })
    assert.equal(outcome.status, 'pushed')
    assert.equal(outcome.upstream, 'origin/dsh-push-0001')
    assert.equal(outcome.setUpstream, true)

    // The commit landed on its own branch on the remote, never on main.
    assert.match(git(['for-each-ref', '--format=%(refname)', 'refs/heads'], remoteDir), /refs\/heads\/dsh-push-0001/)
    assert.equal(git(['rev-parse', 'refs/heads/main'], remoteDir).trim(), mainBefore)
    assert.equal(
      git(['rev-parse', 'refs/heads/dsh-push-0001'], remoteDir).trim(),
      git(['rev-parse', 'HEAD'], worktree).trim(),
    )
    // The checkout now tracks the branch that actually holds its commits.
    assert.equal(git(['rev-parse', '--abbrev-ref', '@{upstream}'], worktree).trim(), 'origin/dsh-push-0001')
    assert.equal(git(['rev-parse', 'refs/heads/main'], root).trim(), mainBefore)
  } finally {
    await rm(base, { recursive: true, force: true }).catch(() => {})
  }
})

test('a branch tracking its own remote branch keeps pushing there, and skips when up to date', async () => {
  const { base, worktree, remoteDir, git } = await makeRepositoryWithTrackedWorktree()
  try {
    const first = await pushCurrentBranch(gitRunner(), { root: worktree, branch: 'dsh-push-0001', remote: 'origin' })
    assert.equal(first.upstream, 'origin/dsh-push-0001')

    const again = await pushCurrentBranch(gitRunner(), { root: worktree, branch: 'dsh-push-0001', remote: 'origin' })
    assert.equal(again.status, 'skipped_up_to_date')
    assert.equal(again.upstream, 'origin/dsh-push-0001')
    assert.equal(again.setUpstream, false)

    await writeFile(join(worktree, 'b.txt'), 'more feature work\n', 'utf8')
    git(['add', '-A'], worktree)
    git(['commit', '-qm', 'second feature commit'], worktree)
    const third = await pushCurrentBranch(gitRunner(), { root: worktree, branch: 'dsh-push-0001', remote: 'origin' })
    assert.equal(third.status, 'pushed')
    assert.equal(third.setUpstream, false)
    assert.equal(
      git(['rev-parse', 'refs/heads/dsh-push-0001'], remoteDir).trim(),
      git(['rev-parse', 'HEAD'], worktree).trim(),
    )
  } finally {
    await rm(base, { recursive: true, force: true }).catch(() => {})
  }
})
