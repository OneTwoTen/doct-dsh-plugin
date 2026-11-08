/**
 * The browser half's only door to the Host.
 *
 * Every route is one POST on the Connection shared channel; the answer is a
 * JSON envelope whose failure carries a stable code. This module turns that
 * envelope into either a value or a `GitRequestError`, and exposes the routes as
 * typed methods so a component cannot call one with the wrong payload.
 */
import type {
  ActionStateRequest,
  CommitRequest,
  CommitRequestPayload,
  CreateBranchRequest,
  CreatePullRequest,
  DiffAllRequest,
  DiffRequest,
  DraftMessageRequest,
  FailureInfo,
  GitApi,
  GitEndpoint,
  GitRequest,
  GitResponse,
  GitTarget,
  PathsRequest,
  PublishRequest,
  PullRequest,
  PushRequest,
  StackedActionRequest,
  SwitchBranchRequest,
  WebRemoteActionResult,
  WebRemoteApi,
  WebRemoteCardState,
  WebRemoteSettingsView,
} from '../shared/protocol.ts'

export type { GitApi, GitRequest, GitResponse, WebRemoteApi } from '../shared/protocol.ts'

/** The Host route prefix, relative to the page. */
export const GIT_PATH = 'api/personal-hub-git'

/** The Web Remote card's Host route prefix, relative to the page. */
export const WEB_REMOTE_PATH = 'api/personal-hub-web-remote'

/** One raw route call, before the envelope is unwrapped. */
export type RawCall = (endpoint: string, payload?: unknown) => Promise<unknown>

/** A failure the Host reported, with its code preserved for the UI. */
export class GitRequestError extends Error {
  readonly code: string
  readonly details: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'GitRequestError'
    this.code = code
    this.details = details
  }
}

/** Build one error from a failure record. */
export function requestError(failure: FailureInfo): GitRequestError {
  return new GitRequestError(failure.code, failure.message, failure.details)
}

/**
 * One caller for the Host routes, folding every transport failure into a thrown
 * error with a code.
 *
 * The request rides the Connection shared channel, so the browser's session
 * cookie is the only credential it needs; a page that cannot reach the Host
 * half sees a transport failure and the panel says so.
 *
 * @param prefix route prefix, for example `api/personal-hub-git`.
 */
export function createCaller(prefix: string): RawCall {
  return async function call(endpoint, payload) {
    let response: Response
    try {
      response = await fetch(`${prefix}/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
        credentials: 'same-origin',
        cache: 'no-store',
      })
    } catch (error) {
      throw new GitRequestError('connection/failed', messageOf(error))
    }
    if (!response.ok) {
      throw new GitRequestError('connection/failed', `transport failure for ${endpoint}: HTTP ${response.status}`)
    }
    let result: unknown
    try {
      result = await response.json()
    } catch {
      throw new GitRequestError('connection/empty', 'The Host sent no answer')
    }
    if (result === null || typeof result !== 'object') {
      throw new GitRequestError('connection/empty', 'The Host sent no answer')
    }
    const envelope = result as { ok?: boolean; value?: unknown; error?: FailureInfo }
    if (envelope.ok !== true) {
      const detail = envelope.error
      throw new GitRequestError(
        detail?.code ?? 'system/failed',
        detail?.message ?? 'The request failed',
        detail?.details,
      )
    }
    return envelope.value
  }
}

/**
 * The Git routes' caller.
 * @returns one raw route call bound to the Git prefix.
 */
export function createGitCaller(): RawCall {
  return createCaller(GIT_PATH)
}

/**
 * The Web Remote card's caller and typed API.
 * @param call one raw route call; defaults to its own prefix.
 */
export function createWebRemoteApi(call: RawCall = createCaller(WEB_REMOTE_PATH)): WebRemoteApi {
  return {
    state: (payload) => call('state', payload) as Promise<WebRemoteCardState>,
    settingsSet: (payload) => call('settingsSet', payload) as Promise<{ settings: WebRemoteSettingsView }>,
    pair: (payload) => call('pair', payload) as Promise<WebRemoteActionResult>,
    pairCancel: (payload) => call('pairCancel', payload) as Promise<WebRemoteActionResult>,
    unpair: (payload) => call('unpair', payload) as Promise<WebRemoteActionResult>,
  }
}

/**
 * Wrap the raw caller as the typed API the components use.
 * @param call one raw route call.
 */
export function createGitApi(call: RawCall): GitApi {
  const route = <K extends GitEndpoint>(name: K) =>
    (payload: GitRequest<K>): Promise<GitResponse<K>> =>
      call(name, payload) as Promise<GitResponse<K>>

  return {
    overview: route('overview') as (payload: GitTarget) => Promise<GitResponse<'overview'>>,
    diff: route('diff') as (payload: DiffRequest) => Promise<GitResponse<'diff'>>,
    diffAll: route('diffAll') as (payload: DiffAllRequest) => Promise<GitResponse<'diffAll'>>,
    commits: route('commits') as (payload: GitTarget & { limit?: number }) => Promise<GitResponse<'commits'>>,
    commit: route('commit') as (payload: CommitRequest) => Promise<GitResponse<'commit'>>,
    branches: route('branches') as (payload: GitTarget & { limit?: number; refresh?: boolean }) => Promise<GitResponse<'branches'>>,
    switchBranch: route('switchBranch') as (payload: SwitchBranchRequest) => Promise<GitResponse<'switchBranch'>>,
    createBranch: route('createBranch') as (payload: CreateBranchRequest) => Promise<GitResponse<'createBranch'>>,
    stage: route('stage') as (payload: PathsRequest) => Promise<GitResponse<'stage'>>,
    unstage: route('unstage') as (payload: PathsRequest) => Promise<GitResponse<'unstage'>>,
    discard: route('discard') as (payload: PathsRequest & { includeUntracked?: boolean }) => Promise<GitResponse<'discard'>>,
    commitChanges: route('commitChanges') as (payload: CommitRequestPayload) => Promise<GitResponse<'commitChanges'>>,
    push: route('push') as (payload: PushRequest) => Promise<GitResponse<'push'>>,
    pull: route('pull') as (payload: PullRequest) => Promise<GitResponse<'pull'>>,
    draftMessage: route('draftMessage') as (payload: DraftMessageRequest) => Promise<GitResponse<'draftMessage'>>,
    startAction: route('startAction') as (payload: StackedActionRequest) => Promise<GitResponse<'startAction'>>,
    actionState: route('actionState') as (payload: ActionStateRequest) => Promise<GitResponse<'actionState'>>,
    forge: route('forge') as (payload: GitTarget) => Promise<GitResponse<'forge'>>,
    pulls: route('pulls') as (payload: GitTarget & { state?: string; limit?: number; refresh?: boolean }) => Promise<GitResponse<'pulls'>>,
    pullRequest: route('pullRequest') as (payload: GitTarget & { number: number; refresh?: boolean }) => Promise<GitResponse<'pullRequest'>>,
    branchPull: route('branchPull') as (payload: GitTarget & { branch?: string; refresh?: boolean }) => Promise<GitResponse<'branchPull'>>,
    issues: route('issues') as (payload: GitTarget & { state?: string; limit?: number; refresh?: boolean }) => Promise<GitResponse<'issues'>>,
    issue: route('issue') as (payload: GitTarget & { number: number; refresh?: boolean }) => Promise<GitResponse<'issue'>>,
    createPull: route('createPull') as (payload: CreatePullRequest) => Promise<GitResponse<'createPull'>>,
    publish: route('publish') as (payload: PublishRequest) => Promise<GitResponse<'publish'>>,
    worktreeState: route('worktreeState') as (payload: GitTarget & { probe?: boolean }) => Promise<GitResponse<'worktreeState'>>,
    worktrees: route('worktrees') as (payload: GitTarget) => Promise<GitResponse<'worktrees'>>,
    worktreeAdd: route('worktreeAdd') as (payload: import('../shared/protocol.ts').WorktreeAddRequest) => Promise<GitResponse<'worktreeAdd'>>,
    worktreeSwitch: route('worktreeSwitch') as (payload: import('../shared/protocol.ts').WorktreeSwitchRequest) => Promise<GitResponse<'worktreeSwitch'>>,
    worktreeRemovePath: route('worktreeRemovePath') as (payload: import('../shared/protocol.ts').WorktreeRemovePathRequest) => Promise<GitResponse<'worktreeRemovePath'>>,
    worktreePrune: route('worktreePrune') as (payload: GitTarget) => Promise<GitResponse<'worktreePrune'>>,
    worktreeCreate: route('worktreeCreate') as (payload: GitTarget & { sessionId: string; base?: string; source?: 'local' | 'remote' }) => Promise<GitResponse<'worktreeCreate'>>,
    worktreeRemove: route('worktreeRemove') as (payload: { sessionId: string; deleteBranch?: boolean }) => Promise<GitResponse<'worktreeRemove'>>,
    mergeSettings: route('mergeSettings') as (payload?: Record<string, never>) => Promise<GitResponse<'mergeSettings'>>,
    mergeSettingsSet: route('mergeSettingsSet') as (payload: {
      enabled?: boolean
      removeWorktree?: boolean
      deleteBranch?: boolean
      archiveSession?: boolean
      cleanup?: Partial<import('../shared/protocol.ts').CleanupSettings>
      forge?: 'auto' | 'github' | 'gitlab' | 'none'
      gitlabHosts?: string[] | string
      cliPath?: string
    }) => Promise<GitResponse<'mergeSettingsSet'>>,
    cleanupState: route('cleanupState') as (payload?: Record<string, never>) => Promise<GitResponse<'cleanupState'>>,
    cleanupRun: route('cleanupRun') as (payload?: Record<string, never>) => Promise<GitResponse<'cleanupRun'>>,
  }
}

/** Message of an unknown thrown value. */
export function messageOf(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return String(error)
}

/** The failure code of a thrown value, when it has one. */
export function codeOf(error: unknown): string | undefined {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}
