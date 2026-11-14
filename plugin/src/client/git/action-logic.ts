/**
 * The pure decision table behind the Git actions control.
 *
 * Keeping it out of the component means every state the button can be in is
 * testable without a browser, which is how the reference implementation (t3code)
 * does it too.
 */
import type { GitStackedAction, GitStats, GitBranchChanges, GitOverview } from '../../shared/protocol.ts'

/** The status fields the action logic reads. */
export interface ActionStatus {
  branch: string | null
  hasWorkingTreeChanges: boolean
  hasUpstream: boolean
  ahead: number
  behind: number
  aheadOfDefault: number
  isDefaultRef: boolean
  hasPrimaryRemote: boolean
  prState: 'open' | 'closed' | 'merged' | null
}

/** How the primary button behaves. */
export type QuickActionKind = 'run_action' | 'run_pull' | 'open_publish' | 'show_hint'

/** One primary-button state. */
export interface QuickAction {
  /** The i18n key of the label. */
  labelKey: string
  disabled: boolean
  kind: QuickActionKind
  action?: GitStackedAction
  /** The i18n key of the reason a disabled button gives. */
  hintKey?: string
}

/** One dropdown entry. */
export interface ActionMenuItem {
  id: 'commit' | 'push' | 'pr'
  labelKey: string
  disabled: boolean
  /** The i18n key of the reason this entry is disabled. */
  disabledHintKey?: string
  /** Opening the commit dialog, rather than running at once. */
  opensCommitDialog?: boolean
}

/** The status the panel derives from an overview. */
export function actionStatusOf(overview: GitOverview | undefined): ActionStatus | null {
  if (overview === undefined) return null
  const repo = overview.repo
  return {
    branch: repo.branch,
    hasWorkingTreeChanges: overview.stats.files > 0,
    hasUpstream: repo.hasUpstream,
    ahead: repo.ahead,
    behind: repo.behind,
    aheadOfDefault: repo.aheadOfDefault,
    isDefaultRef: repo.isDefaultRef,
    hasPrimaryRemote: repo.remote !== null,
    prState: (overview.branchPull?.state as ActionStatus['prState'] | undefined) ?? null,
  }
}

/**
 * The next best action, in the same order the reference implementation uses.
 *
 * @param status the repository state, or null when it is unknown.
 * @param isRunning whether another action is already running.
 */
export function resolveQuickAction(status: ActionStatus | null, isRunning: boolean): QuickAction {
  if (isRunning) {
    return { labelKey: 'gitActionCommit', disabled: true, kind: 'show_hint', hintKey: 'gitHintBusy' }
  }
  if (status === null) {
    return { labelKey: 'gitActionCommit', disabled: true, kind: 'show_hint', hintKey: 'gitHintNoStatus' }
  }
  if (status.branch === null) {
    return { labelKey: 'gitActionCommit', disabled: true, kind: 'show_hint', hintKey: 'gitHintDetached' }
  }

  const hasChanges = status.hasWorkingTreeChanges
  const hasOpenPr = status.prState === 'open'
  const isBehind = status.behind > 0
  // Without an upstream there is nothing to compare against, so the commits
  // ahead of the base branch are what "ahead" means for this checkout.
  const isAhead = status.ahead > 0 || (!status.hasUpstream && status.aheadOfDefault > 0)
  const isDiverged = status.ahead > 0 && isBehind
  const hasDefaultDelta = (status.aheadOfDefault || status.ahead) > 0

  if (hasChanges) {
    if (isBehind || (!status.hasUpstream && !status.hasPrimaryRemote)) {
      return { labelKey: 'gitActionCommit', disabled: false, kind: 'run_action', action: 'commit' }
    }
    if (hasOpenPr) {
      return { labelKey: 'gitActionCommitPush', disabled: false, kind: 'run_action', action: 'commit_push' }
    }
    // The stacked action stays the default even on the default branch: the
    // confirmation offers a feature branch, which is what a request needs.
    return { labelKey: 'gitActionCommitPushPr', disabled: false, kind: 'run_action', action: 'commit_push_pr' }
  }

  if (!status.hasUpstream) {
    if (!status.hasPrimaryRemote) {
      return { labelKey: 'gitActionPublish', disabled: false, kind: 'open_publish' }
    }
    if (!isAhead) {
      return hasOpenPr
        ? { labelKey: 'gitActionCommit', disabled: true, kind: 'show_hint', hintKey: 'gitHintUpToDate' }
        : { labelKey: 'gitActionPush', disabled: true, kind: 'show_hint', hintKey: 'gitHintNoCommits' }
    }
    if (hasOpenPr) {
      return { labelKey: 'gitActionPush', disabled: false, kind: 'run_action', action: 'push' }
    }
    return { labelKey: 'gitActionPushPr', disabled: false, kind: 'run_action', action: 'create_pr' }
  }

  if (isDiverged) {
    return { labelKey: 'gitActionSync', disabled: true, kind: 'show_hint', hintKey: 'gitHintDiverged' }
  }
  if (isBehind) {
    return { labelKey: 'gitActionPull', disabled: false, kind: 'run_pull' }
  }
  if (isAhead) {
    if (hasOpenPr) {
      return { labelKey: 'gitActionPush', disabled: false, kind: 'run_action', action: 'push' }
    }
    return { labelKey: 'gitActionPushPr', disabled: false, kind: 'run_action', action: 'create_pr' }
  }
  if (hasOpenPr) {
    return { labelKey: 'gitActionCommit', disabled: true, kind: 'show_hint', hintKey: 'gitHintUpToDate' }
  }
  if (hasDefaultDelta && !status.isDefaultRef) {
    return { labelKey: 'gitActionCreatePr', disabled: false, kind: 'run_action', action: 'create_pr' }
  }
  return { labelKey: 'gitActionCommit', disabled: true, kind: 'show_hint', hintKey: 'gitHintUpToDate' }
}

/** What the always-visible change-request control can do. */
export interface PrAction {
  /** Whether the button opens the change request dialog. */
  enabled: boolean
  /** The i18n key of the reason the button is disabled. */
  hintKey?: string
}

/**
 * Whether a change request can be opened for this branch, and if not, why.
 *
 * The control is rendered even when the answer is no, so a user looking for
 * "create pull request" always finds it with the reason it cannot run yet
 * instead of an action that silently disappears.
 *
 * @param status the repository state, or null when it is unknown.
 * @param isRunning whether another action is already running.
 */
export function resolvePrAction(status: ActionStatus | null, isRunning: boolean): PrAction {
  if (isRunning) return { enabled: false, hintKey: 'gitHintBusy' }
  if (status === null) return { enabled: false, hintKey: 'gitHintNoStatus' }
  if (status.branch === null) return { enabled: false, hintKey: 'gitHintNoBranch' }
  if (!status.hasPrimaryRemote) return { enabled: false, hintKey: 'gitHintNoRemote' }
  if (status.prState === 'open') return { enabled: false, hintKey: 'gitHintOpenPr' }
  if (status.behind > 0) {
    return { enabled: false, hintKey: status.ahead > 0 ? 'gitHintDiverged' : 'gitHintBehindPr' }
  }
  if ((status.aheadOfDefault || status.ahead) === 0) return { enabled: false, hintKey: 'gitHintNoPrCommits' }
  return { enabled: true }
}

/**
 * The dropdown entries, with the reason each disabled one is disabled.
 *
 * @param status the repository state.
 * @param isRunning whether another action is already running.
 */
export function buildActionMenuItems(status: ActionStatus | null, isRunning: boolean): ActionMenuItem[] {
  if (status === null) return []
  const busy = isRunning
  const hasBranch = status.branch !== null
  const canCommit = !busy && status.hasWorkingTreeChanges
  // A branch that was never pushed has no upstream to compare against, so its
  // commits ahead of the base branch are the ones a push would publish.
  const canPush = !busy
    && hasBranch
    && status.behind === 0
    && (status.ahead > 0 || (!status.hasUpstream && status.aheadOfDefault > 0))
    && (status.hasUpstream || status.hasPrimaryRemote)

  const commit: ActionMenuItem = {
    id: 'commit',
    labelKey: 'gitActionCommit',
    disabled: !canCommit,
    disabledHintKey: busy
      ? 'gitHintBusy'
      : !hasBranch
        ? 'gitHintDetached'
        : 'gitHintClean',
    opensCommitDialog: true,
  }
  if (!status.hasPrimaryRemote) return [commit]

  const push: ActionMenuItem = {
    id: 'push',
    labelKey: 'gitActionPush',
    disabled: !canPush,
    disabledHintKey: busy
      ? 'gitHintBusy'
      : !hasBranch
        ? 'gitHintNoBranch'
        : status.behind > 0
          ? 'gitHintBehind'
          : !status.hasUpstream && !status.hasPrimaryRemote
            ? 'gitHintNoRemote'
            : 'gitHintNoCommits',
  }

  // The change request stays in the list even when it cannot run, so the entry
  // never disappears just because a pull request is already open or the branch
  // is the default one; the disabled entry carries the reason.
  const prAction = resolvePrAction(status, isRunning)
  const pr: ActionMenuItem = {
    id: 'pr',
    labelKey: 'gitActionCreatePr',
    disabled: !prAction.enabled,
    disabledHintKey: prAction.hintKey,
  }
  return [commit, push, pr]
}

/** The line totals the "Changes" row shows, and what they compare against. */
export interface ChangesTotals {
  insertions: number
  deletions: number
  /** The ref the branch totals compare against; null means uncommitted work. */
  baseRef: string | null
}

/**
 * Pick the totals the "Changes" row shows.
 *
 * A zero branch total means the branch adds no lines, not that the working tree
 * is clean, so the working tree wins in that case.
 *
 * @param branchChanges the branch range totals.
 * @param stats the working tree totals.
 */
export function resolveChangesTotals(
  branchChanges: GitBranchChanges | null | undefined,
  stats: GitStats | null | undefined,
): ChangesTotals {
  const branch = branchChanges ?? null
  if (branch !== null && (branch.insertions > 0 || branch.deletions > 0)) {
    return { insertions: branch.insertions, deletions: branch.deletions, baseRef: branch.baseRef }
  }
  if (stats !== null && stats !== undefined && (stats.additions > 0 || stats.deletions > 0)) {
    return { insertions: stats.additions, deletions: stats.deletions, baseRef: null }
  }
  if (branch !== null) return { insertions: branch.insertions, deletions: branch.deletions, baseRef: branch.baseRef }
  return { insertions: 0, deletions: 0, baseRef: null }
}

/** Whether an action needs the default-branch confirmation. */
export function needsDefaultBranchConfirmation(action: GitStackedAction, isDefaultRef: boolean): boolean {
  return isDefaultRef && action !== 'commit'
}

/** The copy a default-branch confirmation shows. */
export interface DefaultBranchCopy {
  titleKey: string
  /** The i18n key of the description; `{branch}` is interpolated. */
  bodyKey: string
  continueKey: string
}

/**
 * The confirmation copy for one action on the default branch.
 * @param action the action about to run.
 */
export function defaultBranchCopy(action: GitStackedAction): DefaultBranchCopy {
  if (action === 'push' || action === 'commit_push') {
    return {
      titleKey: action === 'push' ? 'gitDefaultPushTitle' : 'gitDefaultTitle',
      bodyKey: 'gitDefaultBody',
      continueKey: 'gitDefaultContinue',
    }
  }
  return {
    titleKey: action === 'create_pr' ? 'gitDefaultPrTitle' : 'gitDefaultPrTitle',
    bodyKey: 'gitDefaultBody',
    continueKey: 'gitDefaultContinue',
  }
}

/** The i18n key of the label one action carries. */
export function actionLabelKey(action: GitStackedAction): string {
  switch (action) {
    case 'commit':
      return 'gitActionCommit'
    case 'push':
      return 'gitActionPush'
    case 'create_pr':
      return 'gitActionCreatePr'
    case 'commit_push':
      return 'gitActionCommitPush'
    case 'commit_push_pr':
      return 'gitActionCommitPushPr'
    default:
      return 'gitActionCommit'
  }
}

/** Whether an action includes a commit step. */
export function actionIncludesCommit(action: GitStackedAction): boolean {
  return action === 'commit' || action === 'commit_push' || action === 'commit_push_pr'
}

/** Whether an action includes a push step. */
export function actionIncludesPush(action: GitStackedAction): boolean {
  return action === 'push' || action === 'commit_push' || action === 'commit_push_pr' || action === 'create_pr'
}

/** Whether an action includes a change-request step. */
export function actionIncludesPr(action: GitStackedAction): boolean {
  return action === 'create_pr' || action === 'commit_push_pr'
}
