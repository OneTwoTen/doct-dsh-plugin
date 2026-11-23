import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createCommandRunner } from '../src/lib/git-run.ts'
import { resolveRepoSet } from '../src/lib/repo-set.ts'

const quietLogger = { info: () => {}, warn: () => {}, error: () => {} }
const runner = () => createCommandRunner({ ctx: { get: () => undefined }, logger: quietLogger, timeoutMs: 30000 })

/** Make one repository with one commit. */
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

test('flat sibling repositories become a multi-repo workspace', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-set-'))
  try {
    await makeRepo(workspace, 'be')
    await makeRepo(workspace, 'fe')
    await mkdir(join(workspace, 'docs'))
    // A context directory from an earlier chat lives under .agents; its
    // worktrees must never become workspace repositories.
    await makeRepo(join(workspace, '.agents', 'worktrees', 'old-chat'), 'be')
    const set = await resolveRepoSet(runner(), workspace)
    assert.equal(set.kind, 'multi')
    assert.deepEqual(set.repos.map((repo) => repo.id).sort(), ['be', 'fe'])
    assert.equal(set.repos.every((repo) => repo.core), true)
    assert.equal(set.repos.every((repo) => repo.role === repo.name), true)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('nested groups are discovered up to the configured depth', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-set-'))
  try {
    await makeRepo(join(workspace, 'apps'), 'web')
    await makeRepo(join(workspace, 'services'), 'api')
    const shallow = await resolveRepoSet(runner(), workspace, { scanDepth: 1 })
    assert.equal(shallow.kind, 'none')
    const deep = await resolveRepoSet(runner(), workspace, { scanDepth: 2 })
    assert.equal(deep.kind, 'multi')
    assert.deepEqual(deep.repos.map((repo) => repo.id).sort(), ['apps/web', 'services/api'])
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('a workspace that is a repository stays single even with nested repositories', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-set-'))
  try {
    const root = await makeRepo(workspace, 'outer')
    await makeRepo(root, 'inner')
    const set = await resolveRepoSet(runner(), root)
    assert.equal(set.kind, 'single')
    assert.equal(set.repos.length, 1)
    assert.equal(set.repos[0].root, await realpath(root))
    assert.equal(set.insideRepo, true)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('the manifest supplies roles, core membership, and exclusions', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-set-'))
  try {
    await makeRepo(workspace, 'be')
    await makeRepo(workspace, 'fe')
    await makeRepo(workspace, 'docs')
    await writeFile(join(workspace, '.dsh-workspace.json'), JSON.stringify({
      version: 1,
      core: ['be', 'docs'],
      exclude: ['fe'],
      roles: { be: 'Backend', docs: 'Documentation' },
    }), 'utf8')
    const set = await resolveRepoSet(runner(), workspace)
    assert.deepEqual(set.repos.map((repo) => repo.id).sort(), ['be', 'docs'])
    const be = set.repos.find((repo) => repo.id === 'be')
    assert.equal(be?.role, 'Backend')
    assert.equal(be?.core, true)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test('an ignored node_modules checkout is not a workspace repository', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'personal-hub-set-'))
  try {
    await makeRepo(join(workspace, 'node_modules'), 'dependency')
    const set = await resolveRepoSet(runner(), workspace, { scanDepth: 3 })
    assert.equal(set.kind, 'none')
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
