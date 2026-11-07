/**
 * Pure normalization for the code-host answers the panel renders.
 *
 * `gh` prints GraphQL-shaped JSON while the REST fallback prints its own shape;
 * both are reduced here to one vocabulary so the browser never learns which
 * backend answered.
 */

/** Outcomes one check can report. */
const CHECK_OUTCOMES = new Set(['success', 'failure', 'pending', 'cancelled', 'neutral'])

/**
 * Reduce one `statusCheckRollup` entry to an outcome.
 *
 * `gh` mixes CheckRun nodes (status + conclusion) with StatusContext nodes
 * (a single state), and either may be present while a rollup is still filling.
 *
 * @param {Record<string, unknown>} entry one rollup node.
 * @returns {string} success, failure, pending, cancelled, or neutral.
 */
export function checkOutcome(entry) {
  if (entry === null || typeof entry !== 'object') return 'pending'
  const type = String(entry.__typename ?? entry.type ?? '')

  if (type === 'StatusContext' || (entry.state !== undefined && entry.conclusion === undefined && entry.status === undefined)) {
    switch (String(entry.state ?? '').toUpperCase()) {
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

  const status = String(entry.status ?? '').toUpperCase()
  if (status.length > 0 && status !== 'COMPLETED') return 'pending'
  switch (String(entry.conclusion ?? '').toUpperCase()) {
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
 * @param {unknown} rollup `statusCheckRollup` array, or nothing.
 * @returns {{ state: string, total: number, success: number, failure: number, pending: number, neutral: number, cancelled: number }}
 */
export function summarizeChecks(rollup) {
  const totals = { state: 'none', total: 0, success: 0, failure: 0, pending: 0, neutral: 0, cancelled: 0 }
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
 * @param {unknown} rollup `statusCheckRollup` array, or nothing.
 * @returns {Array<{ name: string, state: string, url: string | null, description: string, workflow: string | null, startedAt: string | null, completedAt: string | null }>}
 */
export function describeChecks(rollup) {
  if (!Array.isArray(rollup)) return []
  return rollup.map((entry) => {
    const node = entry !== null && typeof entry === 'object' ? entry : {}
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
 * @param {unknown} value `reviewDecision` from `gh`, or nothing.
 * @returns {string} approved, changes_requested, review_required, or none.
 */
export function normalizeReview(value) {
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
 * Read a change request's state, folding a draft into its own state.
 * @param {unknown} state `OPEN` or `CLOSED` from `gh`, or REST's lowercase value.
 * @param {unknown} isDraft draft flag.
 * @param {unknown} mergedAt merge timestamp, when the host reports one.
 * @returns {string} open, draft, merged, or closed.
 */
export function pullState(state, isDraft, mergedAt) {
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
 * @param {unknown} labels `gh` label nodes or REST label objects.
 * @returns {Array<{ name: string, color: string | null }>}
 */
export function labelsOf(labels) {
  if (!Array.isArray(labels)) return []
  const result = []
  for (const entry of labels) {
    if (typeof entry === 'string') {
      result.push({ name: entry, color: null })
      continue
    }
    if (entry === null || typeof entry !== 'object') continue
    const name = typeof entry.name === 'string' ? entry.name : ''
    if (name.length === 0) continue
    result.push({ name, color: typeof entry.color === 'string' ? entry.color : null })
  }
  return result
}

/**
 * Normalize one change request from `gh pr list` / `gh pr view`.
 * @param {Record<string, unknown>} raw node from `gh`.
 * @returns {Record<string, unknown>}
 */
export function normalizePull(raw) {
  const node = raw !== null && typeof raw === 'object' ? raw : {}
  return {
    number: Number(node.number) || 0,
    title: String(node.title ?? ''),
    state: pullState(node.state, node.isDraft, node.mergedAt),
    isDraft: node.isDraft === true,
    url: String(node.url ?? ''),
    author: String(node.author?.login ?? node.author?.name ?? ''),
    branch: String(node.headRefName ?? ''),
    base: String(node.baseRefName ?? ''),
    createdAt: node.createdAt ?? null,
    updatedAt: node.updatedAt ?? null,
    mergedAt: node.mergedAt ?? null,
    closedAt: node.closedAt ?? null,
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
 * @param {Record<string, unknown>} raw node from `gh`.
 * @returns {Record<string, unknown>}
 */
export function normalizeIssue(raw) {
  const node = raw !== null && typeof raw === 'object' ? raw : {}
  const state = String(node.state ?? 'OPEN').toUpperCase()
  return {
    number: Number(node.number) || 0,
    title: String(node.title ?? ''),
    state: state === 'CLOSED' ? 'closed' : 'open',
    url: String(node.url ?? ''),
    author: String(node.author?.login ?? node.author?.name ?? ''),
    createdAt: node.createdAt ?? null,
    updatedAt: node.updatedAt ?? null,
    closedAt: node.closedAt ?? null,
    commentCount: Array.isArray(node.comments) ? node.comments.length : Number(node.comments) || 0,
    labels: labelsOf(node.labels),
  }
}

/**
 * Normalize one comment thread entry.
 * @param {Record<string, unknown>} raw comment node.
 * @returns {{ author: string, body: string, createdAt: string | null, url: string | null }}
 */
export function normalizeComment(raw) {
  const node = raw !== null && typeof raw === 'object' ? raw : {}
  return {
    author: String(node.author?.login ?? node.user?.login ?? ''),
    body: String(node.body ?? ''),
    createdAt: node.createdAt ?? null,
    url: typeof node.url === 'string' ? node.url : typeof node.html_url === 'string' ? node.html_url : null,
  }
}

/**
 * Normalize one review entry.
 * @param {Record<string, unknown>} raw review node.
 * @returns {{ author: string, state: string, body: string, submittedAt: string | null }}
 */
export function normalizeReviewEntry(raw) {
  const node = raw !== null && typeof raw === 'object' ? raw : {}
  return {
    author: String(node.author?.login ?? node.user?.login ?? ''),
    state: String(node.state ?? '').toLowerCase(),
    body: String(node.body ?? ''),
    submittedAt: node.submittedAt ?? node.submitted_at ?? null,
  }
}
