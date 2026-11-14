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

test('merging a GitHub pull request uses gh, then reads the state and deletes the branch', async () => {
  const remote = { name: 'origin', host: 'github.com', slug: 'owner/repo', provider: 'github' }
  const calls: Call[] = []
  const runner = fakeRunner((_program, args, stdin) => {
    calls.push({ program: 'gh', args, stdin })
    if (args[0] === '--version') return { code: 0, stdout: 'gh version 2.60.0', stderr: '', truncated: false }
    if (args[0] === 'auth') return { code: 0, stdout: 'Logged in to github.com account ada', stderr: '', truncated: false }
    if (args[0] === 'pr' && args[1] === 'merge') return { code: 0, stdout: '✓ Squashed and merged pull request #12\n', stderr: '', truncated: false }
    if (args[0] === 'pr' && args[1] === 'view') {
      return {
        code: 0,
        stdout: JSON.stringify({
          state: 'MERGED',
          mergedAt: '2024-02-01T10:00:00Z',
          url: 'https://github.com/owner/repo/pull/12',
          mergeCommit: { oid: 'abc1234' },
          headRefName: 'feat/panel',
        }),
        stderr: '',
        truncated: false,
      }
    }
    return { code: 0, stdout: '', stderr: '', truncated: false }
  })
  const forge = createForge({ runner, config: gitConfig({}), logger, env: {} })

  const result = await forge.mergePull({
    root: '/repo',
    remote,
    number: 12,
    method: 'squash',
    deleteBranch: true,
  })
  assert.equal(result.merged, true)
  assert.equal(result.state, 'merged')
  assert.equal(result.sha, 'abc1234')
  assert.equal(result.branchDeleted, true)
  assert.equal(result.url, 'https://github.com/owner/repo/pull/12')

  const merge = calls.find((call) => call.args[0] === 'pr' && call.args[1] === 'merge')
  assert.deepEqual(merge?.args, ['pr', 'merge', '12', '--repo', 'owner/repo', '--squash'])
  const deleted = calls.find((call) => call.args[0] === 'api')
  assert.ok(deleted?.args.includes('repos/owner/repo/git/refs/heads/feat/panel'))
})

test('an auto-merge answer is reported as requested, not merged', async () => {
  const remote = { name: 'origin', host: 'github.com', slug: 'owner/repo', provider: 'github' }
  const runner = fakeRunner((_program, args) => {
    if (args[0] === '--version') return { code: 0, stdout: 'gh version 2.60.0', stderr: '', truncated: false }
    if (args[0] === 'auth') return { code: 0, stdout: 'Logged in to github.com account ada', stderr: '', truncated: false }
    if (args[0] === 'pr' && args[1] === 'merge') return { code: 0, stdout: '✓ Enabled auto-merge (squash)\n', stderr: '', truncated: false }
    if (args[0] === 'pr' && args[1] === 'view') {
      return {
        code: 0,
        stdout: JSON.stringify({ state: 'OPEN', mergedAt: null, url: 'https://github.com/owner/repo/pull/9' }),
        stderr: '',
        truncated: false,
      }
    }
    return { code: 0, stdout: '', stderr: '', truncated: false }
  })
  const forge = createForge({ runner, config: gitConfig({}), logger, env: {} })
  const result = await forge.mergePull({ root: '/repo', remote, number: 9, method: 'squash' })
  assert.equal(result.merged, false)
  assert.equal(result.state, 'open')
  assert.equal(result.branchDeleted, null)
})

test('a GitLab merge request is squashed through the API and reports its merge commit', async () => {
  const remote = { name: 'origin', host: 'gitlab.com', slug: 'group/repo', provider: 'gitlab' }
  const calls: Call[] = []
  const runner = fakeRunner((_program, args, stdin) => {
    calls.push({ program: 'glab', args, stdin })
    if (args[0] === '--version') return { code: 0, stdout: 'glab 1.40.0', stderr: '', truncated: false }
    if (args[0] === 'auth') return { code: 0, stdout: 'Logged in to gitlab.com as ada', stderr: '', truncated: false }
    if (args[0] === 'api') {
      return {
        code: 0,
        stdout: JSON.stringify({
          iid: 7,
          state: 'merged',
          web_url: 'https://gitlab.com/group/repo/-/merge_requests/7',
          squash_commit_sha: 'def5678',
          source_branch: 'feat/panel',
        }),
        stderr: '',
        truncated: false,
      }
    }
    return { code: 0, stdout: '[]', stderr: '', truncated: false }
  })
  const forge = createForge({ runner, config: gitConfig({}), logger, env: {} })

  const result = await forge.mergePull({
    root: '/repo',
    remote,
    number: 7,
    method: 'squash',
    deleteBranch: true,
  })
  assert.equal(result.merged, true)
  assert.equal(result.state, 'merged')
  assert.equal(result.sha, 'def5678')
  assert.equal(result.branchDeleted, true)
  assert.equal(result.provider, 'gitlab')

  const merge = calls.find((call) => call.args[0] === 'api' && call.args.includes('PUT'))
  assert.ok(merge?.args.includes('projects/group%2Frepo/merge_requests/7/merge'))
  assert.deepEqual(JSON.parse(merge?.stdin ?? '{}'), { squash: true, should_remove_source_branch: true })
  const deleted = calls.find((call) => call.args[0] === 'api' && call.args.includes('DELETE'))
  assert.ok(deleted?.args.includes('projects/group%2Frepo/repository/branches/feat%2Fpanel'))
})

test('rebase is refused for GitLab before any request is made', async () => {
  const remote = { name: 'origin', host: 'gitlab.com', slug: 'group/repo', provider: 'gitlab' }
  const runner = fakeRunner((_program, args) => {
    if (args[0] === '--version') return { code: 0, stdout: 'glab 1.40.0', stderr: '', truncated: false }
    if (args[0] === 'auth') return { code: 0, stdout: 'Logged in to gitlab.com as ada', stderr: '', truncated: false }
    return { code: 0, stdout: '[]', stderr: '', truncated: false }
  })
  const forge = createForge({ runner, config: gitConfig({}), logger, env: {} })
  await assert.rejects(
    () => forge.mergePull({ root: '/repo', remote, number: 7, method: 'rebase' }),
    (error: { code?: string }) => error.code === 'merge/unsupported',
  )
})

test('the GitHub REST fallback merges with the chosen method', async () => {
  const remote = { name: 'origin', host: 'github.com', slug: 'owner/repo', provider: 'github' }
  const calls: Array<{ url: string; init: { method?: string; body?: string; headers: Record<string, string> } }> = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, init: { method?: string; body?: string; headers: Record<string, string> }) => {
    calls.push({ url, init })
    const payload = url.endsWith('/pulls/3/merge') ? { merged: true, sha: 'feed123', message: 'Pull Request successfully merged' } : {}
    return { ok: true, status: 200, text: async () => JSON.stringify(payload) }
  }) as unknown as typeof fetch
  try {
    const runner = fakeRunner(() => ({ code: 1, stdout: '', stderr: 'gh not found', truncated: false }))
    const forge = createForge({ runner, config: gitConfig({}), logger, env: { GITHUB_TOKEN: 'secret' } })
    const result = await forge.mergePull({ root: '/repo', remote, number: 3, method: 'merge' })
    assert.equal(result.merged, true)
    assert.equal(result.sha, 'feed123')
    assert.equal(result.backend, 'rest')
    const merge = calls.find((call) => call.url.endsWith('/pulls/3/merge'))
    assert.equal(merge?.init.method, 'PUT')
    assert.deepEqual(JSON.parse(merge?.init.body ?? '{}'), { merge_method: 'merge' })
  } finally {
    globalThis.fetch = previousFetch
  }
})
