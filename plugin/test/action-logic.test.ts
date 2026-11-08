import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  actionIncludesCommit,
  actionIncludesPr,
  actionIncludesPush,
  actionLabelKey,
  actionStatusOf,
  buildActionMenuItems,
  defaultBranchCopy,
  needsDefaultBranchConfirmation,
  resolveChangesTotals,
  resolveQuickAction,
} from '../src/client/git/action-logic.ts'
import type { ActionStatus } from '../src/client/git/action-logic.ts'

/** A clean, published branch on a repository with a remote. */
function status(patch: Partial<ActionStatus> = {}): ActionStatus {
  return {
    branch: 'feature/x',
    hasWorkingTreeChanges: false,
    hasUpstream: true,
    ahead: 0,
    behind: 0,
    aheadOfDefault: 0,
    isDefaultRef: false,
    hasPrimaryRemote: true,
    prState: null,
    ...patch,
  }
}

test('the quick action names the next useful step, in the reference order', () => {
  assert.equal(resolveQuickAction(status(), true).hintKey, 'gitHintBusy')
  assert.equal(resolveQuickAction(null, false).hintKey, 'gitHintNoStatus')
  assert.equal(resolveQuickAction(status({ branch: null }), false).hintKey, 'gitHintDetached')

  // Uncommitted work: commit, commit & push, or the full stacked action.
  assert.equal(resolveQuickAction(status({ hasWorkingTreeChanges: true, behind: 1 }), false).action, 'commit')
  assert.equal(
    resolveQuickAction(status({ hasWorkingTreeChanges: true, hasUpstream: false, hasPrimaryRemote: false }), false).action,
    'commit',
  )
  assert.equal(resolveQuickAction(status({ hasWorkingTreeChanges: true, prState: 'open' }), false).action, 'commit_push')
  assert.equal(resolveQuickAction(status({ hasWorkingTreeChanges: true, isDefaultRef: true }), false).action, 'commit_push')
  assert.equal(resolveQuickAction(status({ hasWorkingTreeChanges: true }), false).action, 'commit_push_pr')

  // A clean tree: publish, push, pull, or open the change request.
  assert.equal(resolveQuickAction(status({ hasUpstream: false, hasPrimaryRemote: false }), false).labelKey, 'gitActionPublish')
  assert.equal(
    resolveQuickAction(status({ hasUpstream: false, prState: 'open' }), false).hintKey,
    'gitHintUpToDate',
  )
  assert.equal(resolveQuickAction(status({ hasUpstream: false }), false).hintKey, 'gitHintNoCommits')
  assert.equal(resolveQuickAction(status({ hasUpstream: false, ahead: 1, prState: 'open' }), false).action, 'push')
  assert.equal(resolveQuickAction(status({ hasUpstream: false, ahead: 1, isDefaultRef: true }), false).action, 'commit_push')
  assert.equal(resolveQuickAction(status({ hasUpstream: false, ahead: 1 }), false).action, 'create_pr')

  assert.equal(resolveQuickAction(status({ ahead: 2, behind: 1 }), false).hintKey, 'gitHintDiverged')
  assert.equal(resolveQuickAction(status({ behind: 1 }), false).kind, 'run_pull')
  assert.equal(resolveQuickAction(status({ ahead: 1, prState: 'open' }), false).action, 'push')
  assert.equal(resolveQuickAction(status({ ahead: 1 }), false).action, 'create_pr')
  assert.equal(resolveQuickAction(status({ prState: 'open' }), false).hintKey, 'gitHintUpToDate')
  assert.equal(resolveQuickAction(status({ aheadOfDefault: 2 }), false).action, 'create_pr')
  assert.equal(resolveQuickAction(status(), false).hintKey, 'gitHintUpToDate')
})

test('the menu lists the actions the repository can actually run', () => {
  assert.deepEqual(buildActionMenuItems(null, false), [])

  const noRemote = buildActionMenuItems(status({ hasPrimaryRemote: false, hasWorkingTreeChanges: true }), false)
  assert.deepEqual(noRemote.map((item) => item.id), ['commit'])
  assert.equal(noRemote[0].disabled, false)
  assert.equal(noRemote[0].opensCommitDialog, true)

  const withOpenPr = buildActionMenuItems(status({ prState: 'open', ahead: 1 }), false)
  assert.deepEqual(withOpenPr.map((item) => item.id), ['commit', 'push'])
  assert.equal(withOpenPr[0].disabled, true, 'a clean tree cannot commit')
  assert.equal(withOpenPr[0].disabledHintKey, 'gitHintClean')
  assert.equal(withOpenPr[1].disabled, false)

  const full = buildActionMenuItems(status({ hasWorkingTreeChanges: true, ahead: 2, aheadOfDefault: 2 }), false)
  assert.deepEqual(full.map((item) => item.id), ['commit', 'push', 'pr'])
  assert.equal(full.every((item) => item.disabled === false), true)

  const busy = buildActionMenuItems(status({ hasWorkingTreeChanges: true, ahead: 2 }), true)
  assert.equal(busy.every((item) => item.disabled), true)
  assert.equal(busy[0].disabledHintKey, 'gitHintBusy')

  const behind = buildActionMenuItems(status({ hasWorkingTreeChanges: true, ahead: 1, behind: 1 }), false)
  assert.equal(behind[1].disabled, true)
  assert.equal(behind[1].disabledHintKey, 'gitHintBehind')
  assert.equal(behind[2].disabled, true)
  assert.equal(behind[2].disabledHintKey, 'gitHintBehindPr')

  const detached = buildActionMenuItems(status({ branch: null, hasWorkingTreeChanges: true }), false)
  assert.equal(detached[0].disabledHintKey, 'gitHintDetached')
})

test('changes totals prefer a non-zero branch range over the working tree', () => {
  assert.deepEqual(
    resolveChangesTotals({ baseRef: 'main', insertions: 5, deletions: 2 }, { files: 1, additions: 9, deletions: 9, staged: 0, unstaged: 1, untracked: 0, conflicted: 0 }),
    { insertions: 5, deletions: 2, baseRef: 'main' },
  )
  assert.deepEqual(
    resolveChangesTotals({ baseRef: 'main', insertions: 0, deletions: 0 }, { files: 1, additions: 9, deletions: 3, staged: 0, unstaged: 1, untracked: 0, conflicted: 0 }),
    { insertions: 9, deletions: 3, baseRef: null },
  )
  assert.deepEqual(resolveChangesTotals(null, null), { insertions: 0, deletions: 0, baseRef: null })
})

test('the default branch confirmation is only asked for actions that publish', () => {
  assert.equal(needsDefaultBranchConfirmation('commit', true), false)
  assert.equal(needsDefaultBranchConfirmation('push', true), true)
  assert.equal(needsDefaultBranchConfirmation('create_pr', true), true)
  assert.equal(needsDefaultBranchConfirmation('push', false), false)
  assert.equal(defaultBranchCopy('push').titleKey, 'gitDefaultPushTitle')
  assert.equal(defaultBranchCopy('create_pr').titleKey, 'gitDefaultPrTitle')
})

test('an action says which steps it runs', () => {
  assert.equal(actionIncludesCommit('commit_push_pr'), true)
  assert.equal(actionIncludesCommit('push'), false)
  assert.equal(actionIncludesPush('create_pr'), true)
  assert.equal(actionIncludesPush('commit'), false)
  assert.equal(actionIncludesPr('commit_push_pr'), true)
  assert.equal(actionIncludesPr('push'), false)
  assert.equal(actionLabelKey('commit_push'), 'gitActionCommitPush')
})

test('an overview becomes the action status', () => {
  const overview = {
    repo: {
      root: '/repo',
      name: 'repo',
      branch: 'main',
      detached: false,
      unborn: false,
      oid: 'abc',
      shortOid: 'abc',
      upstream: 'origin/main',
      ahead: 1,
      behind: 2,
      hasUpstream: true,
      isDefaultRef: true,
      aheadOfDefault: 0,
      defaultBranch: 'main',
      remote: { name: 'origin', url: 'https://github.com/o/r', provider: 'github' as const, host: 'github.com', owner: 'o', repository: 'r', slug: 'o/r' },
    },
    files: [],
    stats: { files: 0, additions: 0, deletions: 0, staged: 0, unstaged: 0, untracked: 0, conflicted: 0 },
    commits: [],
    stash: 0,
    refreshMs: 30000,
    forge: { provider: 'github', available: true, backend: 'cli' as const },
    branchPull: { number: 4, state: 'open' },
    worktree: null,
    branchChanges: null,
    aheadOfDefault: 0,
  }
  const result = actionStatusOf(overview as never)
  assert.ok(result)
  assert.equal(result.branch, 'main')
  assert.equal(result.hasPrimaryRemote, true)
  assert.equal(result.isDefaultRef, true)
  assert.equal(result.prState, 'open')
  assert.equal(actionStatusOf(undefined), null)
})
