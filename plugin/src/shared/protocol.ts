/**
 * The wire protocol between the Host half and the browser half of this bundle.
 *
 * Every route answers one plain JSON envelope, so the shapes here are the only
 * contract the two halves share. Keeping them in one place means a change to a
 * payload is a type error on both sides instead of a runtime surprise.
 */

/** A repository-relative path, always written with `/` separators. */
export type GitPath = string

/** How one file changed, in the words the panel shows. */
export type ChangeKind =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'typechange'
  | 'conflicted'
  | 'untracked'

/** One changed file, with both index and work-tree state. */
export interface GitFileChange {
  path: GitPath
  /** The path the file had before a rename or copy. */
  origPath?: string
  /** Porcelain v2 index status code (`M`, `A`, `?`, …). */
  index: string
  /** Porcelain v2 work-tree status code. */
  worktree: string
  kind: ChangeKind
  staged: boolean
  unstaged: boolean
  untracked: boolean
  conflicted: boolean
  additions: number
  deletions: number
  binary: boolean
  /** Set when the file was too large to read for its own diff. */
  tooLarge?: boolean
}

/** A code host the repository's remote points at. */
export interface GitRemoteInfo {
  name: string
  url: string
  provider: 'github' | 'gitlab' | 'other'
  host: string | null
  owner: string | null
  repository: string | null
  /** `owner/repository`, when the remote names one. */
  slug: string | null
}

/** The checked-out branch and its relation to its upstream. */
export interface GitRepoInfo {
  root: string
  name: string
  branch: string | null
  detached: boolean
  unborn: boolean
  oid: string | null
  shortOid: string | null
  upstream: string | null
  ahead: number
  behind: number
  /** Whether the branch tracks a remote branch at all. */
  hasUpstream: boolean
  /** Whether the checked-out branch is the repository's default branch. */
  isDefaultRef: boolean
  /** Commits the branch adds over the merge base with the default branch. */
  aheadOfDefault: number
  /** The default branch the code host or `origin/HEAD` names. */
  defaultBranch: string | null
  remote: GitRemoteInfo | null
}

/** Totals over the working tree. */
export interface GitStats {
  files: number
  additions: number
  deletions: number
  staged: number
  unstaged: number
  untracked: number
  conflicted: number
}

/** Line totals of the branch against its base, for the "Changes" row. */
export interface GitBranchChanges {
  baseRef: string | null
  insertions: number
  deletions: number
}

/** One commit in a log listing. */
export interface GitCommitSummary {
  hash: string
  short: string
  author: string
  date: string
  refs: string
  subject: string
}

/** One commit in full, with its files and patches. */
export interface GitCommitDetail {
  commit: {
    hash: string
    short: string
    author: string
    email: string
    date: string
    subject: string
    body: string
  }
  files: Array<{
    path: string
    origPath?: string
    additions: number
    deletions: number
    binary: boolean
  }>
  patches: DiffFile[]
  truncated: boolean
}

/** One line of a unified diff. */
export interface DiffLine {
  type: 'add' | 'del' | 'context' | 'meta'
  text: string
  oldNumber: number | null
  newNumber: number | null
}

/** One hunk of a unified diff. */
export interface DiffHunk {
  header: string
  section: string
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

/** One file's parsed patch. */
export interface DiffFile {
  path: string | null
  oldPath: string | null
  hunks: DiffHunk[]
  additions: number
  deletions: number
  binary: boolean
  meta: string[]
  truncated?: boolean
}

/** Every changed file's diff in one answer, for the stacked diff view. */
export interface DiffBundle {
  scope: 'working' | 'branch'
  /** The ref the branch scope compares against; null for uncommitted work. */
  baseRef: string | null
  files: FileDiff[]
  truncated: boolean
  /** How many files the repository has, so the panel can say what it left out. */
  totalFiles: number
}

/** One file's diff as the panel reads it. */
export interface FileDiff {
  path: GitPath
  staged: boolean
  untracked: boolean
  binary: boolean
  truncated: boolean
  tooLarge?: boolean
  files: DiffFile[]
}

/** A local or remote branch the picker offers. */
export interface GitBranch {
  name: string
  short: string
  upstream: string | null
  date: string
  subject: string
  current: boolean
  isRemote: boolean
  remoteName: string | null
  isDefault: boolean
}

/** One CI check on a change request. */
export interface ForgeCheck {
  name: string
  description: string
  state: 'success' | 'failure' | 'pending' | 'neutral' | 'cancelled'
  url: string | null
  workflow?: string | null
  startedAt: string | null
  completedAt: string | null
}

/** Aggregated check counts, as the list row shows them. */
export interface ForgeCheckSummary {
  state: 'none' | 'success' | 'failure' | 'pending' | 'neutral' | 'cancelled'
  total: number
  success: number
  failure: number
  pending: number
  neutral: number
  cancelled: number
}

/** A review on a change request. */
export interface ForgeReview {
  author: string
  state: string
  body: string
  submittedAt: string | null
}

/** A comment on a change request or issue. */
export interface ForgeComment {
  author: string
  body: string
  createdAt: string | null
  url?: string | null
}

/** A label a code host attached to a change request or issue. */
export interface ForgeLabel {
  name: string
  color: string | null
}

/** The review verdict a change request carries. */
export type ReviewState = 'approved' | 'changes_requested' | 'review_required' | 'none'

/** One change request in a list. */
export interface PullSummary {
  number: number
  title: string
  url: string
  /** `open`, `draft`, `closed`, or `merged`, as the code host spells it. */
  state: string
  isDraft: boolean
  branch: string
  base: string
  author: string
  createdAt: string | null
  updatedAt: string | null
  mergedAt: string | null
  closedAt: string | null
  additions: number
  deletions: number
  changedFiles: number
  mergeable: boolean | null
  mergeState: string | null
  review: ReviewState
  checks: ForgeCheckSummary
  commentCount: number
  labels: ForgeLabel[]
}

/** One change request in full. */
export interface PullDetail extends PullSummary {
  body: string
}

/** One issue in a list. */
export interface IssueSummary {
  number: number
  title: string
  url: string
  state: 'open' | 'closed'
  author: string
  labels: ForgeLabel[]
  commentCount: number
  createdAt: string | null
  updatedAt: string | null
  closedAt: string | null
}

/** One issue in full. */
export interface IssueDetail extends IssueSummary {
  body: string
}

/** What the code host can offer this repository. */
export interface ForgeState {
  provider: string
  available: boolean
  backend: 'cli' | 'rest' | null
  /** The CLI this provider uses, when it has one. */
  cli?: string | null
  /** The signed-in account, when the CLI reports one. */
  login?: string | null
  /** Whether the REST fallback has a token. */
  authenticated?: boolean
  slug?: string | null
  host?: string | null
  reason?: string
  note?: string
  /** What the code host calls a change request, so the UI can say "merge request". */
  terminology?: ForgeTerminology
}

/** The words one code host uses for its change requests. */
export interface ForgeTerminology {
  /** `PR`, `MR`, or the generic short label. */
  short: string
  /** `pull request`, `merge request`. */
  singular: string
  /** `Pull requests`, `Merge requests`. */
  plural: string
}

/** A list answer for change requests. */
export interface PullListResult extends ForgeState {
  pulls?: PullSummary[]
}

/** A list answer for issues. */
export interface IssueListResult extends ForgeState {
  issues?: IssueSummary[]
}

/** A detail answer for a change request. */
export interface PullDetailResult extends ForgeState {
  pull?: PullSummary
  checks?: ForgeCheck[]
  checksUnavailable?: boolean
  files?: Array<{ path: string; additions: number; deletions: number }>
  reviews?: ForgeReview[]
  comments?: ForgeComment[]
  body?: string
}

/** A detail answer for an issue. */
export interface IssueDetailResult extends ForgeState {
  issue?: IssueSummary
  body?: string
  comments?: ForgeComment[]
}

/** The change request whose head is the checked-out branch. */
export interface BranchPullResult extends Partial<ForgeState> {
  available?: boolean
  reason?: string
  pull: PullSummary | null
}

/** What the New Session worktree option may start from. */
export interface WorktreeBases {
  local: Array<{
    name: string
    short: string
    date: string
    subject: string
    current: boolean
    remote: null
  }>
  remote: Array<{
    name: string
    remote: string
    branch: string
    short: string
    date: string
  }>
  defaultBase: string | null
  current: string | null
}

/** One worktree this plugin created for a Session. */
export interface WorktreeRecord {
  path: string
  branch: string
  name: string
  repositoryRoot: string
  sessionId: string
  createdAt: number
  remote?: string | null
  /** The branch the checkout started from, when the manager created it. */
  base?: string
  /** Whether it started from a local or a fetched remote branch. */
  source?: 'local' | 'remote'
  namedAt?: number
  namingError?: string
}

/** One checkout of the repository, as the worktree manager lists it. */
export interface WorktreeInfo {
  path: string
  branch: string | null
  head: string | null
  bare: boolean
  detached: boolean
  /** Git marks a checkout locked while another process owns it. */
  locked: boolean
  /** A registration whose directory disappeared; `git worktree prune` clears it. */
  prunable: boolean
  /** Whether this is the folder the current Session works in. */
  current: boolean
  /** Whether the checkout lives in the plugin's worktree pool. */
  isPool: boolean
  /** The Session this plugin created the checkout for, when it did. */
  sessionId: string | null
  createdAt: number | null
  /** Changed files, or null when the checkout could not be inspected. */
  changedFiles: number | null
}

/** The worktree manager's list answer. */
export interface WorktreeListResult {
  root: string
  poolDirectory: string
  /** The folder the current Session works in. */
  currentPath: string | null
  worktrees: WorktreeInfo[]
}

/** The New Session worktree option's answer. */
export interface WorktreeState {
  enabled: boolean
  supported: boolean
  reason: string | null
  sessionId: string
  current: WorktreeRecord | null
  bases: WorktreeBases | null
  project: { directory: string; linked: boolean } | null
  repositoryRoot?: string
  remote?: string
  sourceDefault?: 'local' | 'remote'
}

/** The overview the header and the changes view read. */
export interface GitOverview {
  repo: GitRepoInfo
  files: GitFileChange[]
  stats: GitStats
  commits: GitCommitSummary[]
  stash: number
  refreshMs: number
  forge: ForgeState
  branchPull: PullSummary | null
  branchPullError?: FailureInfo
  worktree: WorktreeRecord | null
  branchChanges: GitBranchChanges | null
  aheadOfDefault: number
}

/** A failure the panel can show, with a stable code. */
export interface FailureInfo {
  code: string
  message: string
  details?: unknown
}

/** The envelope every route answers. */
export type Envelope<T> = { ok: true; value: T } | { ok: false; error: FailureInfo }

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/** The stacked actions the quick-action button can run. */
export type GitStackedAction = 'commit' | 'push' | 'create_pr' | 'commit_push' | 'commit_push_pr'

/** One phase of a stacked action. */
export type GitActionPhase = 'branch' | 'commit' | 'push' | 'pr'

/** Where a stacked action stands, as the panel polls it. */
export interface GitActionProgress {
  actionId: string
  action: GitStackedAction
  status: 'running' | 'done' | 'failed'
  /** The phases this action will run, in order. */
  phases: GitActionPhase[]
  /** The phase running now, or the one that failed. */
  phase: GitActionPhase | null
  /** A short human label for the current phase. */
  label: string
  startedAt: number
  finishedAt: number | null
  /** The tail of what the commands printed, newest last. */
  output: string[]
  result: GitRunStackedActionResult | null
  error: FailureInfo | null
}

/** The commit-message source the dialog reports. */
export interface DraftedMessage {
  message: string
  source: 'model' | 'fallback'
  model: string | null
  error?: string
}

/** The toast a finished action asks the panel to show. */
export interface GitActionToast {
  title: string
  description?: string
  cta:
    | { kind: 'none' }
    | { kind: 'open_pr'; label: string; url: string }
    | { kind: 'run_action'; label: string; action: GitStackedAction }
}

/** What one stacked action did, step by step. */
export interface GitRunStackedActionResult {
  action: GitStackedAction
  branch: { status: 'created' | 'skipped_not_requested'; name?: string }
  commit: {
    status: 'created' | 'skipped_no_changes' | 'skipped_not_requested'
    sha?: string
    subject?: string
  }
  push: {
    status: 'pushed' | 'skipped_up_to_date' | 'skipped_not_requested'
    branch?: string
    upstream?: string
    setUpstream?: boolean
  }
  pr: {
    status: 'created' | 'opened_existing' | 'skipped_not_requested'
    number?: number
    url?: string
    base?: string
    head?: string
    title?: string
  }
  toast: GitActionToast
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

/** Worktree cleanup rules as the settings card edits them. */
export interface CleanupSettings {
  enabled: boolean
  inactiveDays: number
  whenNoCommits: boolean
  noCommitsAfterHours: number
  keepChanges: 'tracked' | 'any' | 'none'
  deleteBranch: boolean
}

/** Merge cleanup rules as the settings card edits them. */
export interface MergeSettings {
  enabled: boolean
  removeWorktree: boolean
  deleteBranch: boolean
  archiveSession: boolean
}

/** The code-host options the settings card edits. */
export interface ForgeSettings {
  /** `auto` detects from the remote; `github`/`gitlab` force one provider. */
  forge: 'auto' | 'github' | 'gitlab' | 'none'
  /** Self-hosted GitLab hosts or base URLs beyond gitlab.com. */
  gitlabHosts: string[]
  /** A specific `gh`/`glab` executable, or empty to resolve it from PATH. */
  cliPath: string
}

/** What the settings card reads: the merge rules flat, plus the cleanup rules. */
export interface MergeSettingsState extends MergeSettings, ForgeSettings {
  cleanup: CleanupSettings
  cleanupLast: CleanupRunResult | null
  writable: boolean
}

/** What one cleanup pass did. */
export interface CleanupRunResult {
  at: number
  removed: Array<{ sessionId: string; branch?: string | null; reason: string }>
  kept: Array<{ sessionId: string; branch?: string | null; reason: string; error?: string }>
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/** Every route takes these two locators: a Session, or a directory. */
export interface GitTarget {
  sessionId?: string
  cwd?: string
}

/** One file's diff request. */
export interface DiffRequest extends GitTarget {
  path: GitPath
  staged?: boolean
  untracked?: boolean
}

/** The stacked diff view's request. */
export interface DiffAllRequest extends GitTarget {
  /** `working` is uncommitted work against HEAD; `branch` is the branch range. */
  scope?: 'working' | 'branch'
  /** Append untracked files as whole-file insertions. */
  includeUntracked?: boolean
}

/** One commit's request. */
export interface CommitRequest extends GitTarget {
  hash: string
}

/** One branch switch. */
export interface SwitchBranchRequest extends GitTarget {
  name: string
}

/** One branch creation. */
export interface CreateBranchRequest extends GitTarget {
  name: string
  from?: string
}

/** A staging or unstaging request. */
export interface PathsRequest extends GitTarget {
  paths: GitPath[]
}

/** A discard request. */
export interface DiscardRequest extends GitTarget {
  paths: GitPath[]
  /** Also delete untracked files; otherwise only tracked edits are restored. */
  includeUntracked?: boolean
}

/** The commit dialog's submission. */
export interface CommitRequestPayload extends GitTarget {
  message: string
  /** Limit the commit to these paths; empty means everything staged. */
  paths?: GitPath[]
  amend?: boolean
}

/** A push request. */
export interface PushRequest extends GitTarget {
  remote?: string
  branch?: string
  setUpstream?: boolean
}

/** A pull request. */
export interface PullRequest extends GitTarget {
  rebase?: boolean
}

/** A stacked action request. */
export interface StackedActionRequest extends GitTarget {
  action: GitStackedAction
  commitMessage?: string
  /** Draft the message with the Session's model when none is given. */
  generateMessage?: boolean
  /** Limit the commit to these paths. */
  paths?: GitPath[]
  /** Create a feature branch from the default branch first. */
  featureBranch?: boolean
  /** The change request's base branch. */
  base?: string
  /** The UI language the generated text should use. */
  locale?: string
}

/** The action-progress poll. */
export interface ActionStateRequest {
  actionId: string
}

/** The commit-message draft request. */
export interface DraftMessageRequest extends GitTarget {
  paths?: GitPath[]
  locale?: string
}

/** A pull-request creation from the create dialog. */
export interface CreatePullRequest extends GitTarget {
  base?: string
  title?: string
  body?: string
  draft?: boolean
  push?: boolean
  locale?: string
}

/** The publish-repository request. */
export interface PublishRequest extends GitTarget {
  provider: 'github' | 'gitlab'
  repository: string
  visibility: 'private' | 'public'
}

/** A request to create one checkout from the worktree manager. */
export interface WorktreeAddRequest extends GitTarget {
  /** The branch (and directory) name; generated when absent. */
  name?: string
  /** The branch the checkout starts from; the default branch when absent. */
  base?: string
  source?: 'local' | 'remote'
  /** Move this Session into the new checkout. */
  sessionId?: string
  /** Whether to move the Session at all; defaults to true when a Session is named. */
  switch?: boolean
}

/** A request to move a Session into an existing checkout, or back to the project. */
export interface WorktreeSwitchRequest extends GitTarget {
  sessionId: string
  path: string
}

/** A request to remove one checkout by path. */
export interface WorktreeRemovePathRequest extends GitTarget {
  path: string
  deleteBranch?: boolean
  /** Remove even a checkout holding uncommitted work. */
  force?: boolean
  /** Move this Session back to the project first. */
  sessionId?: string
}

/** One route the browser may call. */
export interface GitApi {
  overview(payload: GitTarget): Promise<GitOverview>
  diff(payload: DiffRequest): Promise<FileDiff>
  diffAll(payload: DiffAllRequest): Promise<DiffBundle>
  commits(payload: GitTarget & { limit?: number }): Promise<{ commits: GitCommitSummary[] }>
  commit(payload: CommitRequest): Promise<GitCommitDetail>
  branches(payload: GitTarget & { limit?: number; refresh?: boolean }): Promise<{
    branches: GitBranch[]
    defaultBranch: string | null
    hasPrimaryRemote: boolean
  }>
  switchBranch(payload: SwitchBranchRequest): Promise<{ branch: string | null }>
  createBranch(payload: CreateBranchRequest): Promise<{ branch: string }>
  stage(payload: PathsRequest): Promise<{ staged: GitPath[] }>
  unstage(payload: PathsRequest): Promise<{ unstaged: GitPath[] }>
  discard(payload: DiscardRequest): Promise<{ discarded: GitPath[] }>
  commitChanges(payload: CommitRequestPayload): Promise<{
    sha: string
    subject: string
    branch: string | null
  }>
  push(payload: PushRequest): Promise<{ branch: string; upstream: string | null }>
  pull(payload: PullRequest): Promise<{ status: 'pulled' | 'skipped_up_to_date'; branch: string }>
  draftMessage(payload: DraftMessageRequest): Promise<DraftedMessage>
  startAction(payload: StackedActionRequest): Promise<{ actionId: string }>
  actionState(payload: ActionStateRequest): Promise<GitActionProgress>
  forge(payload: GitTarget): Promise<{
    branch: string | null
    remote: GitRemoteInfo | null
    forge: ForgeState
  }>
  pulls(payload: GitTarget & {
    state?: string
    limit?: number
    refresh?: boolean
  }): Promise<PullListResult>
  pullRequest(payload: GitTarget & { number: number; refresh?: boolean }): Promise<PullDetailResult>
  branchPull(payload: GitTarget & {
    branch?: string
    refresh?: boolean
  }): Promise<BranchPullResult>
  issues(payload: GitTarget & {
    state?: string
    limit?: number
    refresh?: boolean
  }): Promise<IssueListResult>
  issue(payload: GitTarget & { number: number; refresh?: boolean }): Promise<IssueDetailResult>
  createPull(payload: CreatePullRequest): Promise<{
    pull: {
      number: number | null
      url: string
      title: string
      base: string
      head: string
    }
    title: string
    body: string
    draft: { source: string; model: string | null; error: string | null }
    watched: boolean
  }>
  publish(payload: PublishRequest): Promise<{ remote: string; url: string | null; pushed: boolean }>
  worktreeState(payload: GitTarget & { probe?: boolean }): Promise<WorktreeState>
  worktrees(payload: GitTarget): Promise<WorktreeListResult>
  worktreeAdd(payload: WorktreeAddRequest): Promise<{ worktree: WorktreeRecord; switched: boolean }>
  worktreeSwitch(payload: WorktreeSwitchRequest): Promise<{ directory: string; branch: string | null }>
  worktreeRemovePath(payload: WorktreeRemovePathRequest): Promise<{
    removed: boolean
    branchDeleted: boolean
    directory: string
  }>
  worktreePrune(payload: GitTarget): Promise<{ pruned: number }>
  worktreeCreate(payload: GitTarget & {
    sessionId: string
    base?: string
    source?: 'local' | 'remote'
  }): Promise<{ worktree: WorktreeRecord }>
  worktreeRemove(payload: {
    sessionId: string
    deleteBranch?: boolean
  }): Promise<{ removed: boolean; branchDeleted: boolean; directory: string }>
  mergeSettings(payload?: Record<string, never>): Promise<MergeSettingsState>
  mergeSettingsSet(payload: {
    enabled?: boolean
    removeWorktree?: boolean
    deleteBranch?: boolean
    archiveSession?: boolean
    cleanup?: Partial<CleanupSettings>
    forge?: ForgeSettings['forge']
    gitlabHosts?: string[] | string
    cliPath?: string
  }): Promise<{ merged: MergeSettings; cleanup: CleanupSettings; forge: ForgeSettings }>
  cleanupState(payload?: Record<string, never>): Promise<{
    settings: CleanupSettings
    last: CleanupRunResult | null
  }>
  cleanupRun(payload?: Record<string, never>): Promise<{
    ran: boolean
    reason?: string
    last: CleanupRunResult | null
  }>
}

/** The name of one callable route. */
export type GitEndpoint = keyof GitApi

/** The payload of one route. */
export type GitRequest<K extends GitEndpoint> = Parameters<GitApi[K]>[0]

/** What one route answers when it succeeds. */
export type GitResponse<K extends GitEndpoint> = Awaited<ReturnType<GitApi[K]>>

/** The caller the browser half holds: one method per route. */
export type GitClient = GitApi

/* ------------------------------------------------------------------ */
/* Web Remote card                                                     */
/* ------------------------------------------------------------------ */

/** The pairing code the card shows while the relay waits for approval. */
export interface WebRemotePairingView {
  code: string
  /** The page the approver opens; the relay's `/pair` screen by default. */
  uri: string
  /** ISO instant the code stops being valid. */
  expiresAt: string
}

/** One runtime status snapshot, shaped for the card. */
export interface WebRemoteRuntimeStatus {
  /** `waiting-relay`, `pairing`, `connected`, `error`, … */
  state: string
  deviceId: string
  /** The name this device reports, after the hostname fallback. */
  deviceName: string
  fingerprint: string
  relayUrl: string
  /** True once a refresh token is stored, so the device is paired. */
  paired: boolean
  pairedAt: string | null
  connectedAt: string | null
  pairing: WebRemotePairingView | null
  /** The last pairing issue the relay reported, `cancelled`, or `unpaired`. */
  pairingStatus: string | null
  /** Sessions a web client is following right now. */
  watching: string[]
  lastError: string | null
  updatedAt: string | null
}

/** The relay settings the card edits. */
export interface WebRemoteSettingsView {
  /** Whether the bridge may open a socket at all. */
  enabled: boolean
  relayUrl: string
  deviceName: string
  /** The name actually sent to the relay: `deviceName`, or the hostname when empty. */
  effectiveDeviceName: string
  autoPair: boolean
}

/** One settings edit from the card. */
export interface WebRemoteSettingsPatch {
  enabled?: boolean
  relayUrl?: string
  deviceName?: string
  autoPair?: boolean
}

/** What the card reads: settings, runtime status, and whether it may edit. */
export interface WebRemoteCardState {
  writable: boolean
  settings: WebRemoteSettingsView
  status: WebRemoteRuntimeStatus
}

/** What a pairing control answers. */
export interface WebRemoteActionResult {
  /** The state the Host published after the action. */
  state: string
}

/** Every route the Web Remote card may call. */
export interface WebRemoteApi {
  state(payload?: Record<string, never>): Promise<WebRemoteCardState>
  settingsSet(payload: WebRemoteSettingsPatch): Promise<{ settings: WebRemoteSettingsView }>
  pair(payload?: Record<string, never>): Promise<WebRemoteActionResult>
  pairCancel(payload?: Record<string, never>): Promise<WebRemoteActionResult>
  unpair(payload?: Record<string, never>): Promise<WebRemoteActionResult>
}

/** The name of one callable Web Remote route. */
export type WebRemoteEndpoint = keyof WebRemoteApi

/** The payload of one Web Remote route. */
export type WebRemoteRequest<K extends WebRemoteEndpoint> = Parameters<WebRemoteApi[K]>[0]

/** What one Web Remote route answers when it succeeds. */
export type WebRemoteResponse<K extends WebRemoteEndpoint> = Awaited<ReturnType<WebRemoteApi[K]>>
