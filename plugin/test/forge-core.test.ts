import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  checkOutcome,
  describeChecks,
  describeGitLabPipeline,
  gitlabCheckOutcome,
  gitlabDiffStats,
  gitlabState,
  labelsOf,
  normalizeComment,
  normalizeGitLabIssue,
  normalizeGitLabPull,
  normalizeGitLabReview,
  normalizeIssue,
  normalizePull,
  normalizeReview,
  pullState,
  summarizeChecks,
  summarizeGitLabPipeline,
} from '../src/lib/forge-core.ts'

test('checkOutcome reads CheckRun conclusions and StatusContext states', () => {
  assert.equal(checkOutcome({ __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'SUCCESS' }), 'success')
  assert.equal(checkOutcome({ __typename: 'CheckRun', status: 'IN_PROGRESS', conclusion: null }), 'pending')
  assert.equal(checkOutcome({ __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'FAILURE' }), 'failure')
  assert.equal(checkOutcome({ __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'SKIPPED' }), 'neutral')
  assert.equal(checkOutcome({ __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'CANCELLED' }), 'cancelled')
  assert.equal(checkOutcome({ __typename: 'StatusContext', state: 'SUCCESS' }), 'success')
  assert.equal(checkOutcome({ __typename: 'StatusContext', state: 'PENDING' }), 'pending')
  assert.equal(checkOutcome({ __typename: 'StatusContext', state: 'ERROR' }), 'failure')
})

test('summarizeChecks folds a rollup into one state and its counts', () => {
  const summary = summarizeChecks([
    { __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { __typename: 'CheckRun', status: 'IN_PROGRESS' },
    { __typename: 'StatusContext', state: 'FAILURE' },
  ])
  assert.equal(summary.total, 3)
  assert.equal(summary.success, 1)
  assert.equal(summary.pending, 1)
  assert.equal(summary.failure, 1)
  assert.equal(summary.state, 'failure')

  assert.deepEqual(summarizeChecks(undefined), {
    state: 'none',
    total: 0,
    success: 0,
    failure: 0,
    pending: 0,
    neutral: 0,
    cancelled: 0,
  })

  const pending = summarizeChecks([{ __typename: 'CheckRun', status: 'QUEUED' }])
  assert.equal(pending.state, 'pending')
  const neutral = summarizeChecks([{ __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'SKIPPED' }])
  assert.equal(neutral.state, 'neutral')
})

test('describeChecks names each check and its timings', () => {
  const checks = describeChecks([
    { __typename: 'CheckRun', name: 'build', status: 'COMPLETED', conclusion: 'SUCCESS', detailsUrl: 'https://x/1', workflowName: 'ci', startedAt: '2024-01-01T00:00:00Z', completedAt: '2024-01-01T00:01:10Z' },
    { __typename: 'StatusContext', context: 'lint', state: 'PENDING', targetUrl: 'https://x/2' },
  ])
  assert.equal(checks.length, 2)
  assert.equal(checks[0].name, 'build')
  assert.equal(checks[0].state, 'success')
  assert.equal(checks[0].url, 'https://x/1')
  assert.equal(checks[0].workflow, 'ci')
  assert.equal(checks[1].name, 'lint')
  assert.equal(checks[1].state, 'pending')
  assert.equal(checks[1].url, 'https://x/2')
})

test('normalizeReview and pullState map the code host vocabulary', () => {
  assert.equal(normalizeReview('APPROVED'), 'approved')
  assert.equal(normalizeReview('CHANGES_REQUESTED'), 'changes_requested')
  assert.equal(normalizeReview('REVIEW_REQUIRED'), 'review_required')
  assert.equal(normalizeReview(undefined), 'none')

  assert.equal(pullState('OPEN', false, undefined), 'open')
  assert.equal(pullState('OPEN', true, undefined), 'draft')
  assert.equal(pullState('MERGED', false, undefined), 'merged')
  assert.equal(pullState('CLOSED', true, '2024-01-01T00:00:00Z'), 'merged')
  assert.equal(pullState('closed', false, undefined), 'closed')
})

test('normalizePull reduces a gh node into the panel shape', () => {
  const pull = normalizePull({
    number: 12,
    title: 'Add the Git panel',
    state: 'OPEN',
    isDraft: false,
    url: 'https://github.com/o/r/pull/12',
    author: { login: 'octocat' },
    headRefName: 'feature/git',
    baseRefName: 'main',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    additions: 120,
    deletions: 8,
    changedFiles: 4,
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'CLEAN',
    reviewDecision: 'APPROVED',
    statusCheckRollup: [{ __typename: 'CheckRun', status: 'COMPLETED', conclusion: 'SUCCESS' }],
    labels: [{ name: 'feature', color: 'ff0000' }],
    comments: [{ body: 'hi' }],
  })
  assert.equal(pull.number, 12)
  assert.equal(pull.state, 'open')
  assert.equal(pull.author, 'octocat')
  assert.equal(pull.mergeable, true)
  assert.equal(pull.review, 'approved')
  assert.equal(pull.checks.state, 'success')
  assert.equal(pull.commentCount, 1)
  assert.deepEqual(pull.labels, [{ name: 'feature', color: 'ff0000' }])

  const draft = normalizePull({ number: 1, state: 'OPEN', isDraft: true, mergeable: 'CONFLICTING' })
  assert.equal(draft.state, 'draft')
  assert.equal(draft.mergeable, false)
})

test('normalizeIssue, labelsOf, and normalizeComment read plain values', () => {
  const issue = normalizeIssue({ number: 3, title: 'Crash', state: 'CLOSED', author: { login: 'ada' }, comments: [{}, {}], labels: ['bug'] })
  assert.equal(issue.state, 'closed')
  assert.equal(issue.commentCount, 2)
  assert.deepEqual(issue.labels, [{ name: 'bug', color: null }])

  assert.deepEqual(labelsOf(['bug', { name: 'ui' }, { color: 'fff' }, null]), [
    { name: 'bug', color: null },
    { name: 'ui', color: null },
  ])

  assert.deepEqual(normalizeComment({ author: { login: 'ada' }, body: 'ok', createdAt: '2024-01-01T00:00:00Z' }), {
    author: 'ada',
    body: 'ok',
    createdAt: '2024-01-01T00:00:00Z',
    url: null,
  })
})

test('GitLab merge requests use iid, source branches, and pipeline checks', () => {
  const pull = normalizeGitLabPull({
    iid: 42,
    title: 'Draft: Add self-hosted GitLab',
    state: 'opened',
    draft: false,
    web_url: 'https://gitlab.example.com/group/repo/-/merge_requests/42',
    author: { name: 'Ada Lovelace', username: 'ada' },
    source_branch: 'feat/gitlab',
    target_branch: 'main',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    changes_count: '3',
    detailed_merge_status: 'mergeable',
    user_notes_count: 4,
    labels: ['git', 'ui'],
    head_pipeline: { id: 7, status: 'success', name: 'CI', web_url: 'https://gitlab.example.com/p/7' },
  })
  assert.equal(pull.number, 42)
  assert.equal(pull.state, 'draft')
  assert.equal(pull.title, 'Draft: Add self-hosted GitLab')
  assert.equal(pull.url, 'https://gitlab.example.com/group/repo/-/merge_requests/42')
  assert.equal(pull.author, 'Ada Lovelace')
  assert.equal(pull.branch, 'feat/gitlab')
  assert.equal(pull.base, 'main')
  assert.equal(pull.changedFiles, 3)
  assert.equal(pull.mergeable, true)
  assert.equal(pull.commentCount, 4)
  assert.equal(pull.checks.state, 'success')
  assert.equal(pull.checks.total, 1)
  assert.deepEqual(pull.labels, [{ name: 'git', color: null }, { name: 'ui', color: null }])
})

test('GitLab states, issues, comments, reviews, and pipeline rows are normalized', () => {
  assert.equal(gitlabState('merged'), 'merged')
  assert.equal(gitlabState('closed'), 'closed')
  assert.equal(gitlabState('locked'), 'open')
  assert.equal(gitlabCheckOutcome('success'), 'success')
  assert.equal(gitlabCheckOutcome('failed'), 'failure')
  assert.equal(gitlabCheckOutcome('running'), 'pending')
  assert.equal(gitlabCheckOutcome('canceled'), 'cancelled')
  assert.equal(gitlabCheckOutcome('skipped'), 'neutral')

  const issue = normalizeGitLabIssue({
    iid: 9,
    title: 'Crash on open',
    state: 'closed',
    web_url: 'https://gitlab.example.com/group/repo/-/issues/9',
    author: { name: 'Grace', username: 'grace' },
    user_notes_count: 2,
    labels: ['bug'],
  })
  assert.equal(issue.number, 9)
  assert.equal(issue.state, 'closed')
  assert.equal(issue.author, 'Grace')
  assert.equal(issue.commentCount, 2)

  assert.deepEqual(normalizeComment({ author: { name: 'Grace', username: 'grace' }, body: 'fixed', created_at: '2024-01-01T00:00:00Z' }), {
    author: 'Grace',
    body: 'fixed',
    createdAt: '2024-01-01T00:00:00Z',
    url: null,
  })
  assert.deepEqual(normalizeGitLabReview({ user: { name: 'Ada', username: 'ada' }, created_at: '2024-01-02T00:00:00Z' }), {
    author: 'Ada',
    state: 'approved',
    body: '',
    submittedAt: '2024-01-02T00:00:00Z',
  })
  assert.deepEqual(gitlabDiffStats({ new_path: 'src/a.ts', diff: '@@ -1 +1 @@\n-old\n+new\n+more' }), {
    path: 'src/a.ts',
    additions: 2,
    deletions: 1,
  })

  assert.equal(summarizeGitLabPipeline({ status: 'failed' }).state, 'failure')
  const checks = describeGitLabPipeline({ id: 7, status: 'success' }, [
    { name: 'build', status: 'success', web_url: 'https://x/1', stage: 'test', started_at: '2024-01-01T00:00:00Z', finished_at: '2024-01-01T00:01:00Z' },
    { name: 'lint', status: 'failed', web_url: 'https://x/2', stage: 'test' },
  ])
  assert.equal(checks.length, 2)
  assert.equal(checks[0].name, 'build')
  assert.equal(checks[0].state, 'success')
  assert.equal(checks[1].state, 'failure')
  assert.equal(checks[1].url, 'https://x/2')
})
