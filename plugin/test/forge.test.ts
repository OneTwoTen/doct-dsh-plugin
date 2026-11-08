import assert from 'node:assert/strict'
import { test } from 'node:test'

import { normalizeConfig } from '../src/lib/config.ts'
import { createForge } from '../src/lib/forge.ts'
import type { ForgeRunner, ForgeRunResult } from '../src/lib/forge.ts'

/** The logger the forge accepts; tests do not inspect it. */
const logger = { info: () => {}, warn: () => {}, error: () => {} }

/** One recorded command. */
interface Call {
  program: string
  args: string[]
  stdin?: string
}

/** A runner that answers by the shape of the command it receives. */
function fakeRunner(answer: (program: string, args: string[], stdin?: string) => ForgeRunResult): ForgeRunner {
  const calls: Call[] = []
  return {
    backend: 'fake',
    async run(program, args, options) {
      calls.push({ program, args, stdin: options?.stdin })
      return answer(program, args, options?.stdin)
    },
  }
}

/** A Git config with the fields a forge test changes. */
function gitConfig(overrides: Record<string, unknown> = {}) {
  return normalizeConfig({ git: overrides }).git
}

test('a configured self-hosted GitLab host is detected and read through glab', async () => {
  const remote = {
    name: 'origin',
    host: 'gitlab.example.com',
    slug: 'group/sub/repo',
    provider: 'other',
  }
  const mergeRequest = {
    iid: 5,
    title: 'Add GitLab support',
    state: 'opened',
    web_url: 'https://gitlab.example.com/group/sub/repo/-/merge_requests/5',
    author: { name: 'Ada' },
    source_branch: 'feat/gitlab',
    target_branch: 'main',
    description: 'The body',
    changes_count: '2',
    detailed_merge_status: 'mergeable',
    user_notes_count: 1,
    head_pipeline: { id: 77, status: 'success', name: 'CI', web_url: 'https://gitlab.example.com/p/77' },
  }
  const calls: Call[] = []
  const runner = fakeRunner((program, args, stdin) => {
    calls.push({ program, args, stdin })
    if (args[0] === '--version') return { code: 0, stdout: 'glab 1.0.0', stderr: '', truncated: false }
    if (args[0] === 'auth') return { code: 0, stdout: 'Logged in to gitlab.example.com as ada', stderr: '', truncated: false }
    const endpoint = args[args.length - 1]
    if (args.includes('POST')) {
      return { code: 0, stdout: JSON.stringify(mergeRequest), stderr: '', truncated: false }
    }
    if (endpoint.endsWith('/merge_requests/5/notes?per_page=50&sort=asc')) {
      return { code: 0, stdout: JSON.stringify([{ author: { name: 'Grace' }, body: 'looks good', created_at: '2024-01-01T00:00:00Z' }, { system: true, body: 'changed' }]), stderr: '', truncated: false }
    }
    if (endpoint.endsWith('/merge_requests/5/changes')) {
      return { code: 0, stdout: JSON.stringify({ changes: [{ new_path: 'src/a.ts', diff: '+a\n-b\n' }] }), stderr: '', truncated: false }
    }
    if (endpoint.endsWith('/merge_requests/5/approvals')) {
      return { code: 0, stdout: JSON.stringify({ approved_by: [{ user: { name: 'Ada' } }], approvals_required: 1, approvals_left: 0 }), stderr: '', truncated: false }
    }
    if (endpoint.includes('/pipelines/77/jobs')) {
      return { code: 0, stdout: JSON.stringify([{ name: 'build', status: 'success', web_url: 'https://x/1', stage: 'test' }]), stderr: '', truncated: false }
    }
    if (endpoint.endsWith('/merge_requests/5')) {
      return { code: 0, stdout: JSON.stringify(mergeRequest), stderr: '', truncated: false }
    }
    if (endpoint.includes('/merge_requests?')) {
      return { code: 0, stdout: JSON.stringify([mergeRequest]), stderr: '', truncated: false }
    }
    return { code: 0, stdout: '[]', stderr: '', truncated: false }
  })
  const forge = createForge({
    runner,
    config: gitConfig({ gitlabHosts: ['https://gitlab.example.com'] }),
    logger,
    env: {},
  })

  const info = await forge.describe({ root: '/repo', remote })
  assert.equal(info.available, true)
  assert.equal(info.provider, 'gitlab')
  assert.equal(info.backend, 'cli')
  assert.equal(info.terminology?.short, 'MR')
  assert.ok(calls.some((call) => call.args[0] === 'auth' && call.args.includes('--hostname')))
  assert.ok(calls.some((call) => call.args[0] === 'auth' && call.args.includes('gitlab.example.com')))

  const pulls = await forge.listPulls({ root: '/repo', remote, state: 'open', limit: 10 })
  assert.equal(pulls.pulls?.[0].number, 5)
  assert.equal(pulls.pulls?.[0].checks.state, 'success')

  const detail = await forge.pullDetail({ root: '/repo', remote, number: 5 })
  if (detail.available !== true) throw new Error('the GitLab host should be available')
  assert.equal(detail.pull?.number, 5)
  assert.equal(detail.body, 'The body')
  assert.equal(detail.pull?.review, 'approved')
  assert.equal(detail.checks?.[0].name, 'build')
  assert.equal(detail.comments?.length, 1)
  assert.equal(detail.files?.[0].path, 'src/a.ts')
  assert.equal(detail.files?.[0].additions, 1)
  assert.equal(detail.files?.[0].deletions, 1)

  const created = await forge.createPull({
    root: '/repo',
    remote,
    head: 'feat/gitlab',
    base: 'main',
    title: 'Release',
    body: 'Body line\nwith newline',
  })
  assert.equal(created.number, 5)
  const post = calls.find((call) => call.args.includes('--method') && call.args.includes('POST'))
  assert.ok(post)
  assert.ok(post?.args.includes('--input'))
  assert.deepEqual(JSON.parse(post?.stdin ?? '{}'), {
    source_branch: 'feat/gitlab',
    target_branch: 'main',
    title: 'Release',
    description: 'Body line\nwith newline',
  })

  const state = await forge.pullState({ root: '/repo', remote, number: 5 })
  assert.deepEqual(state, { number: 5, state: 'open', url: mergeRequest.web_url, mergedAt: null })
})

test('a self-hosted GitLab host without glab falls back to the REST API token', async () => {
  const remote = {
    name: 'origin',
    host: 'git.company.test',
    slug: 'team/repo',
    provider: 'other',
  }
  const mergeRequest = {
    iid: 8,
    title: 'A merge request',
    state: 'opened',
    web_url: 'https://git.company.test/team/repo/-/merge_requests/8',
    author: { name: 'Grace' },
    source_branch: 'feat',
    target_branch: 'main',
    head_pipeline: { id: 3, status: 'failed' },
  }
  const calls: Array<{ url: string; init: { method?: string; body?: string; headers: Record<string, string> } }> = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, init: { method?: string; body?: string; headers: Record<string, string> }) => {
    calls.push({ url, init })
    const body = url.includes('/pipelines/3/jobs')
      ? [{ name: 'lint', status: 'failed', web_url: 'https://x/2', stage: 'test' }]
      : url.includes('/notes')
        ? [{ author: { username: 'ada' }, body: 'hi' }]
        : url.includes('/changes')
          ? { changes: [] }
          : url.includes('/approvals')
            ? { approved_by: [] }
            : url.includes('/merge_requests/8')
              ? mergeRequest
              : [mergeRequest]
    return { ok: true, status: 200, json: async () => body }
  }) as typeof fetch
  try {
    const runner = fakeRunner(() => ({ code: 1, stdout: '', stderr: 'glab not found', truncated: false }))
    const forge = createForge({
      runner,
      config: gitConfig({ gitlabHosts: ['git.company.test'] }),
      logger,
      env: { GITLAB_TOKEN: 'secret-token' },
    })

    const info = await forge.describe({ root: '/repo', remote })
    assert.equal(info.available, true)
    assert.equal(info.provider, 'gitlab')
    assert.equal(info.backend, 'rest')
    assert.equal(info.authenticated, true)

    const pulls = await forge.listPulls({ root: '/repo', remote, state: 'open', limit: 10 })
    assert.equal(pulls.pulls?.[0].number, 8)
    assert.equal(pulls.pulls?.[0].checks.state, 'failure')

    const detail = await forge.pullDetail({ root: '/repo', remote, number: 8 })
    if (detail.available !== true) throw new Error('the REST fallback should be available')
    assert.equal(detail.checks?.[0].name, 'lint')
    assert.equal(detail.checks?.[0].state, 'failure')

    assert.ok(calls.some((call) => call.init.headers['private-token'] === 'secret-token'))
    assert.ok(calls.some((call) => call.url.startsWith('https://git.company.test/api/v4/projects/team%2Frepo/merge_requests')))
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('forcing gitlab treats a host whose name does not contain gitlab as GitLab', async () => {
  const remote = { name: 'origin', host: 'code.company.test', slug: 'team/repo', provider: 'other' }
  const runner = fakeRunner((_program, args) => {
    if (args[0] === '--version') return { code: 0, stdout: 'glab 1.0.0', stderr: '', truncated: false }
    if (args[0] === 'auth') return { code: 0, stdout: 'Logged in to code.company.test as ada', stderr: '', truncated: false }
    return { code: 0, stdout: '[]', stderr: '', truncated: false }
  })
  const forge = createForge({
    runner,
    config: gitConfig({ forge: 'gitlab', gitlabHosts: ['code.company.test'] }),
    logger,
    env: {},
  })
  const info = await forge.describe({ root: '/repo', remote })
  assert.equal(info.available, true)
  assert.equal(info.provider, 'gitlab')
})
