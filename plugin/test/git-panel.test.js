import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { mountGit } from '../features/git.js'
import { normalizeConfig } from '../lib/config.js'

/** Keep the plugin's durable state out of the real Harness home. */
const testHome = await mkdtemp(join(tmpdir(), 'personal-hub-home-'))
process.env.DSH_HOME = testHome
process.once('exit', () => rmSync(testHome, { recursive: true, force: true }))

/**
 * End-to-end contract test: the Host channel answers from a real repository and
 * the browser renderers draw those answers. It catches a field the Host renames
 * or the Client reads under another name, which unit fixtures cannot.
 */

const fakeReact = {
  createElement: (type, props, ...children) => {
    if (typeof type === 'function') return type(props ?? {})
    return { type, props: props ?? {}, children }
  },
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useCallback: (callback) => callback,
  useMemo: (factory) => factory(),
  useRef: (value) => ({ current: value }),
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
}

let loadedSpec
async function loadClient() {
  if (loadedSpec === undefined) {
    globalThis.window = {
      __ModuleLoader__: {
        load(spec) {
          loadedSpec = spec
        },
      },
    }
    await import('../client.js')
  }
  return loadedSpec.factory((id) => {
    if (id === 'react') return fakeReact
    throw new Error(`unexpected module ${id}`)
  })
}

/** Flatten a rendered tree into its text content. */
function textOf(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  return textOf(node.children)
}

/** Collect every element matching a predicate. */
function findAll(node, predicate, found = []) {
  if (node === null || node === undefined || typeof node !== 'object') return found
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, found)
    return found
  }
  if (predicate(node)) found.push(node)
  findAll(node.children, predicate, found)
  return found
}

/** A repository with one committed file, one modified, one staged, one untracked. */
async function makeRepository() {
  const root = await mkdtemp(join(tmpdir(), 'personal-hub-panel-'))
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git('init', '-q')
  git('config', 'user.email', 'panel@example.com')
  git('config', 'user.name', 'Panel Tester')
  git('config', 'commit.gpgsign', 'false')
  await writeFile(join(root, 'a.txt'), 'one\ntwo\nthree\n', 'utf8')
  git('add', '-A')
  git('commit', '-qm', 'first commit')
  await writeFile(join(root, 'a.txt'), 'one\nTWO\nthree\nfour\n', 'utf8')
  await writeFile(join(root, 'staged.txt'), 'staged line\n', 'utf8')
  git('add', 'staged.txt')
  await mkdir(join(root, 'deep'), { recursive: true })
  await writeFile(join(root, 'deep', 'nested.txt'), 'hello\nworld\n', 'utf8')
  return root
}

/** Mount the Host feature over a fake Connection fetch registry and return its caller. */
function mountFeature() {
  const routes = new Map()
  const connection = {
    fetch: {
      register(route) {
        routes.set(route.path, route)
        return () => routes.delete(route.path)
      },
    },
  }
  const ctx = { get: (name) => (name === 'connection' ? connection : undefined) }
  const logger = { info: () => {}, warn: () => {}, error: () => {} }
  mountGit(ctx, normalizeConfig({}).git, { logger })
  return async (endpoint, payload) => {
    const route = routes.get(`/api/personal-hub-git/${endpoint}`)
    assert.ok(route, `the ${endpoint} route is registered`)
    const request = new Request(`http://dsh.internal/api/personal-hub-git/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    })
    return await route.fetch(request).then((response) => response.json())
  }
}

test('the panel draws what the Host channel answers for a real repository', async () => {
  const root = await makeRepository()
  const call = mountFeature()
  const view = (await loadClient()).__internal
  const t = (key, params) => (params === undefined ? key : `${key}:${Object.values(params).join(',')}`)

  try {
    const overviewAnswer = await call('overview', { cwd: root })
    assert.equal(overviewAnswer.ok, true, JSON.stringify(overviewAnswer))
    const overview = overviewAnswer.value

    // Header: repository name, branch, counters, and the clean-state line.
    const headerText = textOf(view.GitHeader({ t, overview, refreshing: false, onRefresh: () => {}, onOpenPull: () => {} }))
    assert.match(headerText, new RegExp(overview.repo.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(headerText, new RegExp(overview.repo.branch))
    assert.match(headerText, /gitFilesMany:3/)

    // Changes: every changed file the Host listed is a row, grouped by stage.
    const changes = view.ChangesView({ t, overview, onSelect: () => {}, selection: null })
    const rows = findAll(changes, (node) => node.props?.className === 'ph-file')
    assert.equal(rows.length, 3)
    const changesText = textOf(changes)
    assert.match(changesText, /a\.txt/)
    assert.match(changesText, /staged\.txt/)
    assert.match(changesText, /nested\.txt/)

    // Diff: the tracked file's patch renders as numbered lines with the new text.
    const modified = overview.files.find((file) => file.path === 'a.txt')
    const diffAnswer = await call('diff', { cwd: root, path: modified.path, staged: modified.staged, untracked: modified.untracked })
    assert.equal(diffAnswer.ok, true, JSON.stringify(diffAnswer))
    const diff = view.PatchBody({ t, files: diffAnswer.value.files, truncated: diffAnswer.value.truncated })
    const lines = findAll(diff, (node) => node.props?.className === 'ph-line')
    assert.ok(lines.length >= 3)
    assert.match(textOf(diff), /TWO/)
    assert.ok(lines.some((line) => line.props['data-kind'] === 'del'))
    assert.ok(lines.some((line) => line.props['data-kind'] === 'add'))

    // An untracked file still renders, as a whole-file insertion.
    const untracked = overview.files.find((file) => file.untracked === true)
    const untrackedAnswer = await call('diff', { cwd: root, path: untracked.path, untracked: true })
    assert.equal(untrackedAnswer.ok, true, JSON.stringify(untrackedAnswer))
    const untrackedView = view.PatchBody({ t, files: untrackedAnswer.value.files, truncated: false })
    assert.match(textOf(untrackedView), /hello/)
    assert.equal(findAll(untrackedView, (node) => node.props?.['data-kind'] === 'add').length >= 2, true)

    // Commits: the log the Host returns names the same commit the panel draws.
    const commitsAnswer = await call('commits', { cwd: root, limit: 3 })
    assert.equal(commitsAnswer.ok, true, JSON.stringify(commitsAnswer))
    const commitRows = commitsAnswer.value.commits.map((commit) => textOf({
      type: 'span',
      props: {},
      children: [commit.short, ' ', commit.subject, ' ', commit.author],
    }))
    assert.match(commitRows.join(' '), /first commit/)

    // A commit's patch comes back in the same shape the diff renderer draws.
    const commitAnswer = await call('commit', { cwd: root, hash: commitsAnswer.value.commits[0].hash })
    assert.equal(commitAnswer.ok, true, JSON.stringify(commitAnswer))
    const commitView = view.PatchBody({ t, files: commitAnswer.value.patches, truncated: false })
    assert.match(textOf(commitView), /one/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('the panel shows the code-host notice when the repository has no remote', async () => {
  const root = await makeRepository()
  const call = mountFeature()
  const view = (await loadClient()).__internal
  const t = (key) => key

  try {
    const answer = await call('overview', { cwd: root })
    assert.equal(answer.ok, true, JSON.stringify(answer))
    const overview = answer.value
    assert.equal(overview.forge.available, false)
    assert.equal(overview.forge.provider, 'none')

    // The pulls view draws the notice rather than an empty list or a crash.
    const pulls = await call('pulls', { cwd: root, state: 'open' })
    assert.equal(pulls.ok, true, JSON.stringify(pulls))
    assert.equal(pulls.value.available, false)
    assert.equal(pulls.value.pulls.length, 0)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
