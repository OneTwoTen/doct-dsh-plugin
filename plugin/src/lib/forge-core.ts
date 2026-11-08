/**
 * Pure normalization for the code-host answers the panel renders.
 *
 * `gh` prints GraphQL-shaped JSON while the REST fallback prints its own shape;
 * both are reduced here to one vocabulary so the browser never learns which
 * backend answered.
 */

import type { ForgeReview } from '../shared/protocol.ts'

/** Outcomes one check can report. */
export type CheckOutcome = 'success' | 'failure' | 'pending' | 'neutral' | 'cancelled'

/** A review decision in the panel's vocabulary. */
export type ReviewDecision = 'approved' | 'changes_requested' | 'review_required' | 'none'

/** Aggregated check counts, as the list row shows them. */
export interface CheckTotals {
  state: 'none' | CheckOutcome
  total: number
  success: number
  failure: number
  pending: number
  neutral: number
  cancelled: number
}

/** One check as the detail list shows it. */
export interface CheckDescription {
  name: string
  state: CheckOutcome
  url: string | null
  description: string
  workflow: string | null
  startedAt: string | null
  completedAt: string | null
}

/** One label on a change request or issue. */
export interface NormalizedLabel {
  name: string
  color: string | null
}

/** One change request, reduced from either backend shape. */
export interface NormalizedPull {
  number: number
  title: string
  state: string
  isDraft: boolean
  url: string
  author: string
  branch: string
  base: string
  createdAt: string | null
  updatedAt: string | null
  mergedAt: string | null
  closedAt: string | null
  additions: number
  deletions: number
  changedFiles: number
  mergeable: boolean | null
  mergeState: string | null
  review: ReviewDecision
  checks: CheckTotals
  commentCount: number
  labels: NormalizedLabel[]
}

/** One issue, reduced from either backend shape. */
export interface NormalizedIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  url: string
  author: string
  createdAt: string | null
  updatedAt: string | null
  closedAt: string | null
  commentCount: number
  labels: NormalizedLabel[]
}

/** One comment thread entry. */
export interface NormalizedComment {
  author: string
  body: string
  createdAt: string | null
  url: string | null
}

const CHECK_OUTCOMES = new Set<string>(['success', 'failure', 'pending', 'cancelled', 'neutral'])

/** Read any JSON value as a plain record; anything else becomes an empty one. */
function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/** Keep a timestamp the code host reported as an ISO string, or nothing. */
function asTimestamp(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/**
 * Reduce one `statusCheckRollup` entry to an outcome.
 *
 * `gh` mixes CheckRun nodes (status + conclusion) with StatusContext nodes
 * (a single state), and either may be present while a rollup is still filling.
 *
 * @param entry one rollup node.
 * @returns success, failure, pending, cancelled, or neutral.
 */
export function checkOutcome(entry: unknown): CheckOutcome {
  if (entry === null || typeof entry !== 'object') return 'pending'
  const node = entry as Record<string, unknown>
  const type = String(node.__typename ?? node.type ?? '')

  if (type === 'StatusContext' || (node.state !== undefined && node.conclusion === undefined && node.status === undefined)) {
    switch (String(node.state ?? '').toUpperCase()) {
      case 'SUCCESS':
        return 'success'
      case 'FAILURE':
      case 'ERROR':
        return 'failure'
      case 'PENDING':
      case 'EXPECTED':
        return 'pending'
      default:
        return 'pending'
    }
  }

  const status = String(node.status ?? '').toUpperCase()
  if (status.length > 0 && status !== 'COMPLETED') return 'pending'
  switch (String(node.conclusion ?? '').toUpperCase()) {
    case 'SUCCESS':
      return 'success'
    case 'NEUTRAL':
    case 'SKIPPED':
      return 'neutral'
    case 'CANCELLED':
      return 'cancelled'
    case 'FAILURE':
    case 'TIMED_OUT':
    case 'ACTION_REQUIRED':
    case 'STARTUP_FAILURE':
    case 'STALE':
      return 'failure'
    case '':
      return status.length === 0 ? 'neutral' : 'pending'
    default:
      return 'failure'
  }
}

/**
 * Summarize one change request's checks.
 * @param rollup `statusCheckRollup` array, or nothing.
 */
export function summarizeChecks(rollup: unknown): CheckTotals {
  const totals: CheckTotals = { state: 'none', total: 0, success: 0, failure: 0, pending: 0, neutral: 0, cancelled: 0 }
  if (!Array.isArray(rollup)) return totals
  for (const entry of rollup) {
    const outcome = checkOutcome(entry)
    if (!CHECK_OUTCOMES.has(outcome)) continue
    totals.total += 1
    totals[outcome] += 1
  }
  if (totals.failure > 0) totals.state = 'failure'
  else if (totals.pending > 0) totals.state = 'pending'
  else if (totals.success > 0) totals.state = 'success'
  else if (totals.cancelled > 0) totals.state = 'cancelled'
  else if (totals.neutral > 0) totals.state = 'neutral'
  return totals
}

/**
 * Expand one change request's checks for the detail list.
 * @param rollup `statusCheckRollup` array, or nothing.
 */
export function describeChecks(rollup: unknown): CheckDescription[] {
  if (!Array.isArray(rollup)) return []
  return rollup.map((entry) => {
    const node = entry !== null && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
    const name = String(node.name ?? node.context ?? node.title ?? 'check')
    return {
      name,
      state: checkOutcome(node),
      url: typeof node.detailsUrl === 'string' ? node.detailsUrl : typeof node.targetUrl === 'string' ? node.targetUrl : null,
      description: typeof node.description === 'string' ? node.description : typeof node.workflowName === 'string' ? node.workflowName : '',
      workflow: typeof node.workflowName === 'string' ? node.workflowName : null,
      startedAt: typeof node.startedAt === 'string' ? node.startedAt : null,
      completedAt: typeof node.completedAt === 'string' ? node.completedAt : null,
    }
  })
}

/**
 * Read a review decision into the panel's vocabulary.
 * @param value `reviewDecision` from `gh`, or nothing.
 */
export function normalizeReview(value: unknown): ReviewDecision {
  switch (String(value ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'approved'
    case 'CHANGES_REQUESTED':
      return 'changes_requested'
    case 'REVIEW_REQUIRED':
      return 'review_required'
    default:
      return 'none'
  }
}

/**
 * Map a GitLab merge-request state onto the panel's vocabulary.
 * @param value GitLab `state` field.
 * @returns open, draft, merged, or closed.
 */
export function gitlabState(value: unknown): string {
  switch (String(value ?? '').toLowerCase()) {
    case 'merged':
      return 'merged'
    case 'closed':
      return 'closed'
    case 'locked':
      return 'open'
    default:
      return 'open'
  }
}

/**
 * Reduce a GitLab pipeline status to the panel's check vocabulary.
 * @param status GitLab pipeline or job status.
 */
export function gitlabCheckOutcome(status: unknown): CheckOutcome {
  switch (String(status ?? '').toLowerCase()) {
    case 'success':
      return 'success'
    case 'failed':
      return 'failure'
    case 'canceled':
    case 'cancelled':
    case 'cancelling':
      return 'cancelled'
    case 'skipped':
      return 'neutral'
    case 'manual':
      return 'neutral'
    case 'created':
    case 'pending':
    case 'running':
    case 'preparing':
    case 'waiting_for_resource':
    case 'scheduled':
      return 'pending'
    default:
      return 'pending'
  }
}

/**
 * Summarize one GitLab pipeline as a single check.
 * @param pipeline `head_pipeline` or `pipeline` from a merge request.
 */
export function summarizeGitLabPipeline(pipeline: unknown): CheckTotals {
  const totals: CheckTotals = { state: 'none', total: 0, success: 0, failure: 0, pending: 0, neutral: 0, cancelled: 0 }
  if (pipeline === null || typeof pipeline !== 'object') return totals
  const node = pipeline as Record<string, unknown>
  if (typeof node.status !== 'string') return totals
  const outcome = gitlabCheckOutcome(node.status)
  totals.total = 1
  totals[outcome] = 1
  totals.state = outcome
  return totals
}

/**
 * Expand one GitLab pipeline (and optional job list) into check rows.
 * @param pipeline `head_pipeline` or `pipeline` from a merge request.
 * @param jobs pipeline jobs, when the caller fetched them.
 */
export function describeGitLabPipeline(pipeline: unknown, jobs?: unknown): CheckDescription[] {
  const node = pipeline !== null && typeof pipeline === 'object' ? pipeline as Record<string, unknown> : {}
  if (Array.isArray(jobs) && jobs.length > 0) {
    return jobs.map((job) => {
      const entry = job !== null && typeof job === 'object' ? job as Record<string, unknown> : {}
      return {
        name: String(entry.name ?? 'job'),
        state: gitlabCheckOutcome(entry.status),
        url: typeof entry.web_url === 'string' ? entry.web_url : null,
        description: typeof entry.stage === 'string' ? entry.stage : '',
        workflow: typeof node.name === 'string' ? node.name : null,
        startedAt: typeof entry.started_at === 'string' ? entry.started_at : null,
        completedAt: typeof entry.finished_at === 'string' ? entry.finished_at : null,
      }
    })
  }
  if (typeof node.status !== 'string') return []
  return [{
    name: typeof node.name === 'string' && node.name.length > 0 ? node.name : 'Pipeline',
    state: gitlabCheckOutcome(node.status),
    url: typeof node.web_url === 'string' ? node.web_url : null,
    description: typeof node.ref === 'string' ? node.ref : '',
    workflow: typeof node.name === 'string' ? node.name : null,
    startedAt: typeof node.started_at === 'string' ? node.started_at : null,
    completedAt: typeof node.finished_at === 'string' ? node.finished_at : null,
  }]
}

/**
 * Normalize one GitLab merge request.
 * @param raw GitLab `merge_requests` node.
 */
export function normalizeGitLabPull(raw: unknown): NormalizedPull {
  const node = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const author = asRecord(node.author)
  const title = String(node.title ?? '')
  const state = gitlabState(node.state)
  const pipeline = node.head_pipeline ?? node.pipeline
  const conflicts = node.has_conflicts === true
  const mergeStatus = String(node.detailed_merge_status ?? node.merge_status ?? '')
  return {
    number: Number(node.iid ?? node.number) || 0,
    title,
    state: state === 'open' && (node.draft === true || node.work_in_progress === true || /^(draft|wip)\s*:/i.test(title))
      ? 'draft'
      : state,
    isDraft: node.draft === true || node.work_in_progress === true,
    url: String(node.web_url ?? ''),
    author: String(author.name ?? author.username ?? ''),
    branch: String(node.source_branch ?? ''),
    base: String(node.target_branch ?? ''),
    createdAt: asTimestamp(node.created_at),
    updatedAt: asTimestamp(node.updated_at),
    mergedAt: asTimestamp(node.merged_at),
    closedAt: asTimestamp(node.closed_at),
    additions: 0,
    deletions: 0,
    changedFiles: Number(node.changes_count) || 0,
    mergeable: conflicts
      ? false
      : mergeStatus === 'mergeable' || mergeStatus === 'can_be_merged'
        ? true
        : mergeStatus === 'cannot_be_merged' || mergeStatus === 'conflict' || mergeStatus === 'not_mergeable' || mergeStatus === 'broken'
          ? false
          : null,
    mergeState: mergeStatus.length > 0 ? mergeStatus : null,
    review: 'none',
    checks: summarizeGitLabPipeline(pipeline),
    commentCount: Number(node.user_notes_count) || 0,
    labels: labelsOf(node.labels),
  }
}

/**
 * Fold check rows into the list's totals.
 * @param checks check rows from a detail answer.
 */
export function summarizeCheckDescriptions(checks: CheckDescription[]): CheckTotals {
  const totals: CheckTotals = { state: 'none', total: 0, success: 0, failure: 0, pending: 0, neutral: 0, cancelled: 0 }
  for (const check of checks) {
    totals.total += 1
    totals[check.state] += 1
  }
  if (totals.failure > 0) totals.state = 'failure'
  else if (totals.pending > 0) totals.state = 'pending'
  else if (totals.success > 0) totals.state = 'success'
  else if (totals.cancelled > 0) totals.state = 'cancelled'
  else if (totals.neutral > 0) totals.state = 'neutral'
  return totals
}

/**
 * Turn one GitLab review/approval entry into a review row.
 * @param raw `approved_by` entry or approval rule entry.
 */
export function normalizeGitLabReview(raw: unknown): { author: string; state: string; body: string; submittedAt: string | null } {
  const node = raw !== null && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const user = asRecord(node.user ?? node)
  return {
    author: String(user.name ?? user.username ?? ''),
    state: 'approved',
    body: '',
    submittedAt: asTimestamp(node.created_at ?? node.updated_at),
  }
}

/** Split a GitLab unified diff into path/stat facts. */
export function gitlabDiffStats(node: unknown): { path: string; additions: number; deletions: number } {
  const entry = node !== null && typeof node === 'object' ? node as Record<string, unknown> : {}
  let additions = 0
  let deletions = 0
  const text = typeof entry.diff === 'string' ? entry.diff : ''
  for (const line of text.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions += 1
    else if (line.startsWith('-') && !line.startsWith('---')) deletions += 1
  }
  return {
    path: String(entry.new_path ?? entry.old_path ?? ''),
    additions,
    deletions,
  }
}

/**
 * Normalize one GitLab issue.
 * @param raw GitLab `issues` node.
 */
export function normalizeGitLabIssue(raw: unknown): NormalizedIssue {
  const node = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const author = asRecord(node.author)
  return {
    number: Number(node.iid ?? node.number) || 0,
    title: String(node.title ?? ''),
    state: String(node.state ?? 'opened').toLowerCase() === 'closed' ? 'closed' : 'open',
    url: String(node.web_url ?? ''),
    author: String(author.name ?? author.username ?? ''),
    createdAt: asTimestamp(node.created_at),
    updatedAt: asTimestamp(node.updated_at),
    closedAt: asTimestamp(node.closed_at),
    commentCount: Number(node.user_notes_count) || 0,
    labels: labelsOf(node.labels),
  }
}

/**
 * Read a change request's state, folding a draft into its own state.
 * @param state `OPEN` or `CLOSED` from `gh`, or REST's lowercase value.
 * @param isDraft draft flag.
 * @param mergedAt merge timestamp, when the host reports one.
 * @returns open, draft, merged, or closed.
 */
export function pullState(state: unknown, isDraft: unknown, mergedAt?: unknown): string {
  if (typeof mergedAt === 'string' && mergedAt.length > 0) return 'merged'
  switch (String(state ?? '').toUpperCase()) {
    case 'OPEN':
    case 'OPENED':
      return isDraft === true ? 'draft' : 'open'
    case 'DRAFT':
      return 'draft'
    case 'MERGED':
      return 'merged'
    case 'CLOSED':
      return 'closed'
    default:
      return String(state ?? 'open').toLowerCase()
  }
}

/**
 * Normalize one label list.
 * @param labels `gh` label nodes or REST label objects.
 */
export function labelsOf(labels: unknown): NormalizedLabel[] {
  if (!Array.isArray(labels)) return []
  const result: NormalizedLabel[] = []
  for (const entry of labels) {
    if (typeof entry === 'string') {
      result.push({ name: entry, color: null })
      continue
    }
    if (entry === null || typeof entry !== 'object') continue
    const node = entry as Record<string, unknown>
    const name = typeof node.name === 'string' ? node.name : ''
    if (name.length === 0) continue
    result.push({ name, color: typeof node.color === 'string' ? node.color : null })
  }
  return result
}

/**
 * Normalize one change request from `gh pr list` / `gh pr view`.
 * @param raw node from `gh`.
 */
export function normalizePull(raw: unknown): NormalizedPull {
  const node = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const author = asRecord(node.author)
  return {
    number: Number(node.number) || 0,
    title: String(node.title ?? ''),
    state: pullState(node.state, node.isDraft, node.mergedAt),
    isDraft: node.isDraft === true,
    url: String(node.url ?? ''),
    author: String(author.login ?? author.name ?? ''),
    branch: String(node.headRefName ?? ''),
    base: String(node.baseRefName ?? ''),
    createdAt: asTimestamp(node.createdAt),
    updatedAt: asTimestamp(node.updatedAt),
    mergedAt: asTimestamp(node.mergedAt),
    closedAt: asTimestamp(node.closedAt),
    additions: Number(node.additions) || 0,
    deletions: Number(node.deletions) || 0,
    changedFiles: Number(node.changedFiles) || 0,
    mergeable: node.mergeable === 'MERGEABLE' ? true : node.mergeable === 'CONFLICTING' ? false : null,
    mergeState: typeof node.mergeStateStatus === 'string' ? node.mergeStateStatus : null,
    review: normalizeReview(node.reviewDecision),
    checks: summarizeChecks(node.statusCheckRollup),
    commentCount: Array.isArray(node.comments) ? node.comments.length : Number(node.comments) || 0,
    labels: labelsOf(node.labels),
  }
}

/**
 * Normalize one issue from `gh issue list` / `gh issue view`.
 * @param raw node from `gh`.
 */
export function normalizeIssue(raw: unknown): NormalizedIssue {
  const node = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const author = asRecord(node.author)
  const state = String(node.state ?? 'OPEN').toUpperCase()
  return {
    number: Number(node.number) || 0,
    title: String(node.title ?? ''),
    state: state === 'CLOSED' ? 'closed' : 'open',
    url: String(node.url ?? ''),
    author: String(author.login ?? author.name ?? ''),
    createdAt: asTimestamp(node.createdAt),
    updatedAt: asTimestamp(node.updatedAt),
    closedAt: asTimestamp(node.closedAt),
    commentCount: Array.isArray(node.comments) ? node.comments.length : Number(node.comments) || 0,
    labels: labelsOf(node.labels),
  }
}

/**
 * Normalize one comment thread entry.
 * @param raw comment node.
 */
export function normalizeComment(raw: unknown): NormalizedComment {
  const node = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const author = asRecord(node.author)
  const user = asRecord(node.user)
  return {
    author: String(author.login ?? author.name ?? author.username ?? user.login ?? user.username ?? ''),
    body: String(node.body ?? ''),
    createdAt: asTimestamp(node.createdAt ?? node.created_at),
    url: typeof node.url === 'string' ? node.url : typeof node.html_url === 'string' ? node.html_url : null,
  }
}

/**
 * Normalize one review entry.
 * @param raw review node.
 */
export function normalizeReviewEntry(raw: unknown): ForgeReview {
  const node = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const author = asRecord(node.author)
  const user = asRecord(node.user)
  return {
    author: String(author.login ?? author.name ?? author.username ?? user.login ?? user.username ?? ''),
    state: String(node.state ?? '').toLowerCase(),
    body: String(node.body ?? ''),
    submittedAt: asTimestamp(node.submittedAt ?? node.submitted_at),
  }
}

