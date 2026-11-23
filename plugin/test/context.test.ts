import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createCommandRunner } from '../src/lib/git-run.ts'
import { ensureContext, materializeRepo, readContext, removeRepoCheckout } from '../src/lib/context.ts'
import { resolveRepoSet } from '../src/lib/repo-set.ts'

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
