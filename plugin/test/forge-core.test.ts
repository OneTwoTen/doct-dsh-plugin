import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  checkOutcome,
  describeChecks,
  labelsOf,
  normalizeComment,
  normalizeIssue,
  normalizePull,
  normalizeReview,
  pullState,
  summarizeChecks,
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
