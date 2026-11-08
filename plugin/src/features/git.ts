/**
 * Git panel: the Host half.
 *
 * Exact Fetch routes on the Connection service serve the right-sidebar Git tab:
 * the working tree, diffs, one commit, the branch list, the code host's change
 * requests and issues, and the Git actions the panel runs (commit, push, pull,
 * create a change request). Every answer is plain JSON, so the browser renders
 * the panel and this process owns the repository access.
 *
 * The routes live under the Connection shared channel (`/api/personal-hub-git/
 * <action>`) and are registered with `connection.fetch.register()`. That path
 * rides the browser-trust fence and the owner-Peer admission Connection already
 * applies to `/api`, so a loopback page is the only caller that can reach a
 * repository on this computer.
 *
 * Why not `connection.rpc.handle()`: on this Harness build that registrar
 * touches `ctx.webServer` from the Connection plugin's own context, which does
 * not inject `webServer`, so every channel registration throws
 * `cannot get property "webServer" without inject` and the panel reports a
 * transport failure with HTTP 405.
 */
import { randomUUID } from 'node:crypto'
import { stat } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'

import {
  CommandError,
  classifyGitFailure,
  commitChanges,
  createBranch,
  createCommandRunner,
  discardPaths,
  failureReasonMessage,
  locateRepository,
  pullCurrentBranch,
  pushBranch,
  pushCurrentBranch,
  readBranchRefs,
  readBranches,
  readChangeRequestFacts,
  readCommit,
  readCommitMessageFacts,
  readContext,
  readDefaultBranch,
  readDiffBundle,
  readFilePatch,
  readLog,
  readOverview,
  stagePaths,
  switchBranch,
  unstagePaths,
} from '../lib/git-run.ts'
import type { GitRunner, OutputStream, RunResult } from '../lib/git-run.ts'
import { createForge } from '../lib/forge.ts'
import type { ForgeRemote } from '../lib/forge.ts'
import { draftCommitMessage } from '../lib/commit-draft.ts'
import { draftChangeRequest as draftModelChangeRequest, offlineDraft } from '../lib/pr-draft.ts'
import type { ChangeRequestFacts } from '../lib/pr-draft.ts'
import { createMergeWatcher } from '../lib/merge-watch.ts'
import type { MergeStoreState } from '../lib/merge-watch.ts'
import { pluginDataDir } from '../lib/paths.ts'
import { JsonStateStore } from '../lib/state-store.ts'
import { createWorktreeCleanup } from '../lib/worktree-cleanup.ts'
import { suggestBranchName } from '../lib/worktree-name.ts'
import {
  createWorktree,
  generatedWorktreeName,
  isInside,
  poolDirectory,
  readBases,
  readCheckoutKind,
  readWorktrees,
  removeWorktree,
  remoteNames,
  renameWorktreeBranch,
  resolveDefaultBase,
  uniqueBranchName,
} from '../lib/worktree.ts'
import { resolveAutoFeatureBranchName, sanitizeBranchFragment, sanitizeFeatureBranchName } from '../lib/git-core.ts'
import type {
  ActionStateRequest,
  CleanupRunResult,
  CommitRequestPayload,
  CreateBranchRequest,
  CreatePullRequest,
  DiffAllRequest,
  DiffRequest,
  DraftedMessage,
  DraftMessageRequest,
  FailureInfo,
  ForgeSettings,
  GitActionPhase,
  GitActionProgress,
  GitActionToast,
  GitApi,
  GitEndpoint,
  GitOverview,
  GitRequest,
  GitResponse,
  GitRunStackedActionResult,
  GitStackedAction,
  GitTarget,
  PublishRequest,
  PullRequest,
  PushRequest,
  StackedActionRequest,
  SwitchBranchRequest,
  WorktreeRecord,
  WorktreeState,
} from '../shared/protocol.ts'
import type { DshContext, Logger, ConfigEditorEntry, ConfigEditorService, LlmService, SessionLike } from '../host/dsh.ts'
import type { GitConfig, HubConfig } from '../lib/config.ts'

/** The Connection shared-channel prefix the browser posts to. */
export const GIT_PATH_PREFIX = '/api/personal-hub-git'
/** Credential reference that may hold a GitHub token for the REST fallback. */
const GITHUB_CREDENTIAL_REF = 'DSH_GITHUB_TOKEN'
/** Credential reference that may hold a GitLab token for the REST fallback. */
const GITLAB_CREDENTIAL_REF = 'DSH_GITLAB_TOKEN'
/** Finished actions stay readable this long, so a slow poll still sees the result. */
const ACTION_RETENTION_MS = 5 * 60 * 1000
/** The tail of a running action's output the panel receives. */
const ACTION_OUTPUT_LINES = 40

/** The durable state this feature keeps between restarts. */
type GitState = MergeStoreState & {
  worktrees?: Record<string, WorktreeRecord>
  probe?: { at: number; sessionId: string; directory: string; root: string; supported: boolean }
  cleanup?: CleanupRunResult | null
  runtime?: { mountedAt: number; routes: number; backend: string }
}

/** One action the Host is running, mutable while it runs. */
interface MutableProgress extends GitActionProgress {
  controller: AbortController
}

/** The mapped handler type: every route answers its protocol type. */
type HandlerMap = {
  [K in GitEndpoint]: (payload: GitRequest<K>, signal: AbortSignal) => Promise<GitResponse<K>>
}

/**
 * Mount the git feature.
 *
 * @param ctx Harness plugin context.
 * @param config Normalized git configuration.
 * @param deps the bundle's logger.
 * @returns disposer that withdraws the routes
 */
export function mountGit(
  ctx: DshContext,
  config: GitConfig,
  deps: { logger: Logger },
): () => void {
  const logger = deps.logger
  const connection = ctx.get<{
    fetch?: { register(route: Record<string, unknown>): () => void }
  }>('connection')

  // The routes belong to the Connection service, so they are registered on a
  // context that owns that service. A profile whose Connection loads after this
  // row still gets the panel: `ctx.inject` runs the mount when it arrives.
  if (connection !== undefined && typeof connection.fetch?.register === 'function') {
    return mountRoutes(ctx, connection, config, deps)
  }
  if (typeof ctx.inject !== 'function') {
    logger.info('git: the connection service is absent, so the git panel has no bridge in this composition')
    return () => {}
  }

  let routeDisposer: (() => void) | undefined
  let fiber: { dispose?(): void } | undefined
  try {
    fiber = ctx.inject(['connection'], (scoped) => {
      const scopedConnection = scoped.get<{
        fetch?: { register(route: Record<string, unknown>): () => void }
      }>('connection')
      if (scopedConnection === undefined || typeof scopedConnection.fetch?.register !== 'function') {
        logger.warn('git: the connection service exposes no Fetch routes; the git panel has no bridge')
        return
      }
      routeDisposer = mountRoutes(scoped, scopedConnection, config, deps)
    })
  } catch (error) {
    logger.warn('git: cannot wait for the connection service: %s', messageOf(error))
    return () => {}
  }

  return () => {
    try {
      routeDisposer?.()
    } catch (error) {
      logger.warn('git: route disposal failed: %s', messageOf(error))
    }
    routeDisposer = undefined
    try {
      fiber?.dispose?.()
    } catch {
      // The owning fiber is already gone when its parent disposes it.
    }
  }
}

/**
 * Register one exact POST route per action on one live Connection service.
 *
 * @param ctx context that owns the route registrations.
 * @param connection the Connection service.
 * @param config normalized git configuration.
 * @param deps the bundle's logger.
 * @returns disposer that withdraws the routes
 */
function mountRoutes(
  ctx: DshContext,
  connection: { fetch?: { register(route: Record<string, unknown>): () => void } },
  config: GitConfig,
  deps: { logger: Logger },
): () => void {
  const logger = deps.logger
  const runner: GitRunner = createCommandRunner({ ctx, logger, timeoutMs: config.commandTimeoutMs })
  const forge = createForge({
    runner,
    config,
    logger,
    resolveToken: () => storedToken(ctx, GITHUB_CREDENTIAL_REF),
    resolveGitLabToken: () => storedToken(ctx, GITLAB_CREDENTIAL_REF),
  })

  logger.info('git: mounted over %s, code host %s', runner.backend, config.forge)

  const store = new JsonStateStore<GitState>(
    join(pluginDataDir('personal-hub'), 'git.json'),
    { worktrees: {}, pulls: {} },
  )

  /** Read this plugin's durable git state, loading it once. */
  async function state(): Promise<GitState> {
    await store.load()
    return store.state
  }

  /** The live Agent of one Session, when that Session is open. */
  function agentFor(sessionId: string): { session?: SessionLike } | undefined {
    if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
    const agents = ctx.get<{ get(sessionId: string): { session?: SessionLike } | undefined }>('agents')
    return typeof agents?.get === 'function' ? agents.get(sessionId) : undefined
  }

  /** The remote a worktree should fetch from: configured, else the panel's, else the first. */
  async function preferredRemote(root: string, signal?: AbortSignal): Promise<string> {
    const names = await remoteNames(runner, { root, signal })
    for (const candidate of [config.worktree.remote, config.remote, 'origin']) {
      const name = String(candidate ?? '').trim()
      if (name.length > 0 && names.includes(name)) return name
    }
    return names[0] ?? ''
  }

  /** A comparison key for one filesystem path; Windows compares case-insensitively. */
  function pathKey(value: string): string {
    const normalized = resolve(String(value ?? ''))
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized
  }

  /**
   * The main checkout of a repository.
   *
   * `git rev-parse --show-toplevel` answers with the checkout the caller stands
   * in, which is a linked worktree once a Session moved; the worktree pool and
   * "back to the project" both belong to the main checkout, which Git lists
   * first.
   */
  async function mainWorktreeRoot(root: string, signal?: AbortSignal): Promise<string> {
    const entries = await readWorktrees(runner, { root, signal }).catch(() => [])
    // Git prints worktree paths with forward slashes even on Windows; every
    // comparison and `workingDirectory.set` call wants the native spelling.
    return resolve(entries[0]?.path ?? root)
  }

  /** Count the changed files of one checkout, or null when it cannot be read. */
  async function countChangedFiles(path: string, signal?: AbortSignal): Promise<number | null> {
    const result = await runner.run('git', ['status', '--porcelain', '-z', '--untracked-files=normal'], {
      cwd: path,
      signal,
      maxBytes: 2 * 1024 * 1024,
    }).catch(() => undefined)
    if (result === undefined || result.code !== 0) return null
    return String(result.stdout ?? '').split('\0').filter((field) => field.length > 0).length
  }

  /** Move one Session into a directory, refusing when the composition cannot. */
  async function setSessionDirectory(sessionId: string, directory: string, signal?: AbortSignal): Promise<void> {
    const agent = agentFor(sessionId)
    if (agent === undefined) {
      throw new CommandError('worktree/no-agent', 'This Session is not open, so its folder cannot change yet')
    }
    const workingDirectory = ctx.get<{
      set(agent: { session?: SessionLike }, directory: string, signal?: AbortSignal): Promise<unknown>
    }>('workingDirectory')
    if (typeof workingDirectory?.set !== 'function') {
      throw new CommandError('worktree/no-working-directory', 'This build cannot change a Session folder')
    }
    await workingDirectory.set(agent, directory, signal)
  }

  const watcher = createMergeWatcher({
    config,
    logger,
    store,
    forge,
    runtime: {
      async removeSessionWorktree(record: WorktreeRecord, sessionId: string) {
        const target = typeof record?.path === 'string' ? record.path : ''
        if (target.length === 0) return { removed: false, branchDeleted: false }
        const repoRoot = typeof record.repositoryRoot === 'string' ? record.repositoryRoot : ''
        const result = await removeWorktree(runner, {
          repoRoot,
          path: target,
          branch: record.branch,
          deleteBranch: config.merged.deleteBranch === true,
          timeoutMs: config.worktreeTimeoutMs,
        })
        await store.update((value) => {
          value.worktrees ??= {}
          delete value.worktrees[sessionId]
        })
        return result
      },
      async archiveSession(sessionId: string) {
        const registry = ctx.get<{ archiveSession?(sessionId: string): Promise<unknown> }>('workspaceRegistry')
        if (typeof registry?.archiveSession !== 'function') return false
        await registry.archiveSession(sessionId)
        return true
      },
    },
  })

  const cleanup = createWorktreeCleanup({
    runner,
    config,
    logger,
    // The JSON store holds this feature's whole state; the cleanup pass reads
    // and writes only the keys it owns.
    store: store as unknown as {
      load(): Promise<unknown>
      state: Record<string, unknown>
      update(mutate: (state: Record<string, unknown>) => unknown): Promise<unknown>
    },
    runtime: {
      isSessionActive(sessionId: string, record: WorktreeRecord) {
        const agent = agentFor(sessionId)
        if (agent === undefined) return false
        const session = agent.session
        const workingDirectory = ctx.get<{
          get(session: SessionLike): string | undefined
        }>('workingDirectory')
        const directory = session !== undefined && typeof workingDirectory?.get === 'function'
          ? workingDirectory.get(session)
          : session?.header?.cwd
        const target = typeof record?.path === 'string' ? record.path : ''
        return directory !== undefined && target.length > 0 && isInside(target, directory)
      },
    },
  })

  /** Sessions whose branch naming is already running, so one message names it once. */
  const naming = new Set<string>()

  /**
   * Rename one checkout's branch from the task's first message.
   *
   * The checkout exists before any message does, so its branch starts as a
   * temporary `dsh-â€¦` name. This reads the first message, asks the Session's
   * model for a `feat/â€¦` name, and renames the branch in place; the directory
   * keeps its original name and a failure leaves the temporary name alone.
   *
   * @param sessionId owning Session.
   * @param message the user message that entered the inbox.
   */
  async function nameWorktreeFromMessage(sessionId: string, message: unknown): Promise<void> {
    if (config.worktree.naming !== 'semantic') return
    if (naming.has(sessionId)) return
    const text = textOfUserMessage(message)
    if (text.length === 0) return
    const value = await state()
    const record = value.worktrees?.[sessionId]
    if (record === undefined || typeof record !== 'object') return
    // Only an unnamed checkout is renamed; a second message must not rename again.
    if (record.branch !== record.name) return

    naming.add(sessionId)
    try {
      const draft = await suggestBranchName({
        llm: ctx.get<LlmService>('llm'),
        route: configuredRoute(sessionId),
        text,
        sessionId,
        instructions: config.worktree.nameInstructions,
        fallbackPrefix: config.worktree.namePrefix,
        config: { timeoutMs: 30000, maxOutputTokens: 200 },
        logger,
      })
      if (draft === null) {
        logger.info('git: no branch name for %s; the temporary name stays', sessionId)
        await store.update((current) => {
          const entry = current.worktrees?.[sessionId]
          if (entry !== undefined) entry.namingError = 'model-unavailable'
        })
        return
      }
      const repoRoot = String(record.repositoryRoot ?? '')
      const branch = await uniqueBranchName(runner, { root: repoRoot, branch: draft.branch })
      await renameWorktreeBranch(runner, { path: String(record.path ?? ''), branch })
      await store.update((current) => {
        const entry = current.worktrees?.[sessionId]
        if (entry !== undefined) {
          entry.branch = branch
          entry.namedAt = Date.now()
        }
      })
      logger.info('git: renamed the worktree of %s to %s', sessionId, branch)
    } catch (error) {
      logger.warn('git: could not name the worktree of %s: %s', sessionId, messageOf(error))
      await store.update((current) => {
        const entry = current.worktrees?.[sessionId]
        if (entry !== undefined) entry.namingError = messageOf(error)
      }).catch(() => undefined)
    } finally {
      naming.delete(sessionId)
    }
  }

  /**
   * Ask the Session's current model for a title and description.
   *
   * The Session's own model is used with the lowest reasoning effort its route
   * supports, because drafting two short paragraphs needs no deliberation. A
   * configuration may pin another route; a missing LLM service, an unusable
   * answer, or a failed request falls back to a draft built from the commits.
   */
  async function draftChangeRequest(options: {
    sessionId: string
    payload: Record<string, unknown>
    facts: ChangeRequestFacts
    branch: string
    base: string
    signal?: AbortSignal
  }): Promise<{ title: string; body: string; source: string; model: string | null; error?: string }> {
    const { sessionId, payload, facts, branch, base, signal } = options
    if (config.pull.enabled !== true) {
      return {
        ...offlineDraft({
          branch,
          base,
          commits: facts.commits ?? [],
          files: facts.files ?? [],
        }),
        source: 'commits',
        model: null,
      }
    }
    return await draftModelChangeRequest({
      llm: ctx.get<LlmService>('llm'),
      route: configuredRoute(sessionId),
      sessionId,
      facts,
      branch,
      base,
      locale: typeof payload.locale === 'string' ? payload.locale : '',
      config: config.pull,
      signal,
      logger,
    })
  }

  /**
   * The route a draft uses: configured, else the Session's last or staged
   * selection, else the application default.
   * @param sessionId owning Session.
   */
  function configuredRoute(sessionId: string): { provider: string; model: string } | null {
    if (config.pull.provider.length > 0 && config.pull.model.length > 0) {
      return { provider: config.pull.provider, model: config.pull.model }
    }
    const session = agentFor(sessionId)?.session
    const projections = ctx.get<{
      stateOf(session: SessionLike, key: string): unknown
    }>('sessionProjections')
    if (session !== undefined && typeof projections?.stateOf === 'function') {
      try {
        const value = projections.stateOf(session, 'modelSelection') as {
          pending?: { provider?: string; model?: string }
          lastUsed?: { provider?: string; model?: string }
        } | null
        const pick = value?.pending ?? value?.lastUsed ?? null
        if (typeof pick?.provider === 'string' && typeof pick?.model === 'string') {
          return { provider: pick.provider, model: pick.model }
        }
      } catch {
        // A composition without that projection falls back to the default route.
      }
    }
    const defaults = ctx.get<{
      currentSelection(): { provider?: string; model?: string } | null | undefined
    }>('agentDefaultModel')
    if (typeof defaults?.currentSelection === 'function') {
      const pick = defaults.currentSelection()
      if (typeof pick?.provider === 'string' && typeof pick?.model === 'string') {
        return { provider: pick.provider, model: pick.model }
      }
    }
    return null
  }

  /* ---------------------------------------------------------------- */
  /* Running actions                                                   */
  /* ---------------------------------------------------------------- */

  const actions = new Map<string, MutableProgress>()

  /** Append one command output line to a running action's tail. */
  function pushOutput(progress: MutableProgress, _stream: OutputStream, text: string): void {
    const line = String(text ?? '').trim()
    if (line.length === 0) return
    progress.output.push(line.slice(0, 500))
    if (progress.output.length > ACTION_OUTPUT_LINES) progress.output.shift()
  }

  /** Move an action into its next phase. */
  function enterPhase(progress: MutableProgress, phase: GitActionPhase, label: string): void {
    progress.phase = phase
    progress.label = label
  }

  /** The toast a finished action shows, following the same precedence everywhere. */
  function buildToast(
    action: GitStackedAction,
    result: Omit<GitRunStackedActionResult, 'toast'>,
    isDefaultRef: boolean,
  ): GitActionToast {
    const sha = result.commit.sha?.slice(0, 7) ?? ''
    const subject = result.commit.subject ?? ''
    if (result.pr.status === 'created' || result.pr.status === 'opened_existing') {
      const verb = result.pr.status === 'created' ? 'Created' : 'Opened'
      return {
        title: `${verb} #${result.pr.number ?? '?'}`,
        ...(result.pr.title === undefined ? {} : { description: result.pr.title.slice(0, 72) }),
        cta: result.pr.url === undefined
          ? { kind: 'none' }
          : { kind: 'open_pr', label: 'View pull request', url: result.pr.url },
      }
    }
    if (result.push.status === 'pushed') {
      return {
        title: `Pushed ${sha} to ${result.push.branch ?? result.push.upstream ?? 'the remote'}`,
        ...(subject.length === 0 ? {} : { description: subject }),
        cta: isDefaultRef
          ? { kind: 'none' }
          : { kind: 'run_action', label: 'Create pull request', action: 'create_pr' },
      }
    }
    if (result.commit.status === 'created') {
      return {
        title: `Committed ${sha}`,
        ...(subject.length === 0 ? {} : { description: subject }),
        cta: action === 'commit' ? { kind: 'run_action', label: 'Push', action: 'push' } : { kind: 'none' },
      }
    }
    return { title: 'Done', cta: { kind: 'none' } }
  }

  /**
   * Run one stacked action: branch â†’ commit â†’ push â†’ change request.
   *
   * Every step reports its phase into the progress record, and a failure stops
   * the chain and records the error, so the panel can show what went wrong
   * without losing what already succeeded.
   */
  async function runStackedAction(progress: MutableProgress, payload: StackedActionRequest): Promise<void> {
    const signal = progress.controller.signal
    const action = payload.action
    const wantsCommit = action === 'commit' || action === 'commit_push' || action === 'commit_push_pr'
    const wantsPush = action === 'push' || action === 'commit_push' || action === 'commit_push_pr' || action === 'create_pr'
    const wantsPr = action === 'create_pr' || action === 'commit_push_pr'
    progress.phases = [
      ...(payload.featureBranch === true ? ['branch' as const] : []),
      ...(wantsCommit ? ['commit' as const] : []),
      ...(wantsPush ? ['push' as const] : []),
      ...(wantsPr ? ['pr' as const] : []),
    ]

    try {
      if (payload.featureBranch === true && !wantsCommit) {
        throw new CommandError(
          'action/feature-branch',
          'A feature branch is only supported for actions that commit.',
        )
      }
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      let branch = context.branch
      if (branch === null && (wantsPush || wantsPr) && payload.featureBranch !== true) {
        throw new CommandError(
          'action/detached',
          wantsPr
            ? 'Cannot create a pull request from a detached HEAD.'
            : 'Cannot push from a detached HEAD.',
        )
      }

      const overview = await readOverview(runner, { root, config, signal })
      let message = String(payload.commitMessage ?? '').trim()

      if (payload.featureBranch === true) {
        enterPhase(progress, 'branch', 'Preparing feature branchâ€¦')
        if (message.length === 0) {
          progress.label = 'Generating commit messageâ€¦'
          const facts = await readCommitMessageFacts(runner, {
            root,
            paths: payload.paths,
            config,
            signal,
          })
          const draft = await draftCommitMessage({
            llm: ctx.get<LlmService>('llm'),
            route: configuredRoute(String(payload.sessionId ?? '')),
            sessionId: String(payload.sessionId ?? ''),
            branch: facts.branch,
            files: facts.files,
            diff: facts.diff,
            truncated: facts.truncated,
            recentSubjects: facts.recentSubjects,
            locale: payload.locale,
            config: config.commit,
            signal,
            logger,
          })
          message = draft.message
        }
        const subject = message.split(/\r?\n/)[0] ?? ''
        const refs = await readBranchRefs(runner, { root, limit: 200, signal })
        const localNames = refs.branches.filter((item) => !item.isRemote).map((item) => item.name)
        const name = resolveAutoFeatureBranchName(localNames, sanitizeFeatureBranchName(subject))
        await createBranch(runner, { root, name, signal })
        branch = name
        progress.result = progress.result ?? null
      }

      let commit: GitRunStackedActionResult['commit'] = { status: 'skipped_not_requested' }
      if (wantsCommit) {
        enterPhase(progress, 'commit', 'Committingâ€¦')
        if (message.length === 0) {
          progress.label = 'Generating commit messageâ€¦'
          const facts = await readCommitMessageFacts(runner, {
            root,
            paths: payload.paths,
            config,
            signal,
          })
          const draft = await draftCommitMessage({
            llm: ctx.get<LlmService>('llm'),
            route: configuredRoute(String(payload.sessionId ?? '')),
            sessionId: String(payload.sessionId ?? ''),
            branch: facts.branch,
            files: facts.files,
            diff: facts.diff,
            truncated: facts.truncated,
            recentSubjects: facts.recentSubjects,
            locale: payload.locale,
            config: config.commit,
            signal,
            logger,
          })
          message = draft.message
          progress.label = 'Committingâ€¦'
        }
        const outcome = await commitChanges(runner, {
          root,
          message,
          paths: payload.paths,
          signal,
          timeoutMs: 600000,
          onLine: (stream, text) => pushOutput(progress, stream, text),
        })
        commit = outcome.status === 'created'
          ? { status: 'created', sha: outcome.sha, subject: outcome.subject }
          : { status: 'skipped_no_changes' }
        if (outcome.branch !== null) branch = outcome.branch
      }

      let push: GitRunStackedActionResult['push'] = { status: 'skipped_not_requested' }
      if (wantsPush && branch !== null) {
        enterPhase(progress, 'push', 'Pushingâ€¦')
        const outcome = await pushCurrentBranch(runner, {
          root,
          remote: context.remote?.name,
          branch,
          timeoutMs: config.worktreeTimeoutMs,
          signal,
          onLine: (stream, text) => pushOutput(progress, stream, text),
        })
        push = {
          status: outcome.status,
          branch: outcome.branch,
          ...(outcome.upstream === null ? {} : { upstream: outcome.upstream }),
          ...(outcome.setUpstream ? { setUpstream: true } : {}),
        }
      }

      let pr: GitRunStackedActionResult['pr'] = { status: 'skipped_not_requested' }
      if (wantsPr && branch !== null) {
        enterPhase(progress, 'pr', 'Creating pull requestâ€¦')
        const created = await createPullForBranch({
          root,
          sessionId: String(payload.sessionId ?? ''),
          payload: payload as unknown as Record<string, unknown>,
          branch,
          remote: context.remote,
          signal,
          onPhase: (label) => {
            progress.label = label
          },
        })
        pr = created
      }

      const partial: Omit<GitRunStackedActionResult, 'toast'> = {
        action,
        branch: branch !== null && payload.featureBranch === true
          ? { status: 'created', name: branch }
          : { status: 'skipped_not_requested' },
        commit,
        push,
        pr,
      }
      progress.result = {
        ...partial,
        // A branch created for this action is no longer the default branch, so
        // the toast can offer the change request it would otherwise hide.
        toast: buildToast(action, partial, payload.featureBranch === true ? false : overview.repo.isDefaultRef),
      }
      progress.status = 'done'
      progress.label = 'Done'
      progress.finishedAt = Date.now()
    } catch (error) {
      const failure = failureOf(error)
      progress.status = 'failed'
      progress.error = failure
      progress.label = failure.message
      progress.finishedAt = Date.now()
      logger.warn('git: action %s failed: %s', action, failure.message)
    }
  }

  /**
   * Create one change request for a branch, reusing an open one when the code
   * host already has it.
   */
  async function createPullForBranch(options: {
    root: string
    sessionId: string
    payload: Record<string, unknown>
    branch: string
    remote: GitOverview['repo']['remote']
    signal: AbortSignal
    onPhase?: (label: string) => void
  }): Promise<GitRunStackedActionResult['pr']> {
    const { root, sessionId, payload, branch, remote, signal, onPhase } = options
    if (remote === null) {
      throw new CommandError('pr/no-remote', 'The repository has no remote, so it cannot open a change request.')
    }
    const forgeInfo = await forge.describe({ root, remote, signal })
    if (forgeInfo.available !== true) {
      throw new CommandError('pr/forge-unavailable', forgeInfo.reason ?? 'The code host is not available.')
    }
    const existing = await forge.pullForBranch({ root, remote, branch, signal }).catch(() => null)
    if (existing !== null && typeof existing === 'object' && (existing as { pull?: { state?: string } }).pull?.state === 'open') {
      const pull = (existing as { pull: { number: number; url: string; base?: string; title?: string } }).pull
      return {
        status: 'opened_existing',
        number: pull.number,
        url: pull.url,
        base: pull.base,
        head: branch,
        title: pull.title,
      }
    }

    const requested = typeof payload.base === 'string' ? payload.base.trim() : ''
    const base = requested.length > 0
      ? requested
      : config.pull.base.length > 0
        ? config.pull.base
        : await forge.defaultBase({ root, remote, signal })
    if (base === null || base.length === 0) {
      throw new CommandError('pr/no-base', 'Cannot determine the base branch for the change request.')
    }
    if (base === branch) {
      throw new CommandError('pr/same-branch', `Branch ${base} cannot be its own base branch.`)
    }

    const facts = await readChangeRequestFacts(runner, { root, base, config, signal })
    if (facts.ahead === 0) {
      throw new CommandError('pr/no-commits', `Branch ${branch} has no commits over ${base}.`, { base })
    }
    onPhase?.('Generating pull request contentâ€¦')
    const draft = await draftChangeRequest({
      sessionId,
      payload,
      facts: { ...facts, branch, base },
      branch,
      base,
      signal,
    })
    onPhase?.('Creating pull requestâ€¦')
    const created = await forge.createPull({
      root,
      remote,
      head: branch,
      base,
      title: draft.title,
      body: draft.body,
      signal,
    })
    if (sessionId.length > 0 && created.number !== null) {
      await watcher.track(sessionId, {
        root,
        remote,
        number: created.number,
        url: created.url,
        branch,
        base,
      })
    }
    return {
      status: 'created',
      ...(created.number === null ? {} : { number: created.number }),
      url: created.url,
      base,
      head: branch,
      title: draft.title,
    }
  }

  /* ---------------------------------------------------------------- */
  /* Routes                                                            */
  /* ---------------------------------------------------------------- */

  const handlers: HandlerMap = {
    /**
     * Everything the header and the changes view need.
     */
    async overview(payload, signal) {
      const { root } = await repository(payload, signal)
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const read = await readOverview(runner, { root, config, signal })
      const value: GitOverview = {
        ...read,
        forge: await describeForge(read.repo.remote, root, signal),
        worktree: sessionId.length > 0 ? (await state()).worktrees?.[sessionId] ?? null : null,
        branchPull: null,
      }
      if (value.forge.available === true && read.repo.branch !== null) {
        try {
          const found = await forge.pullForBranch({
            root,
            remote: read.repo.remote as unknown as ForgeRemote,
            branch: read.repo.branch,
            signal,
          })
          value.branchPull = found.pull ?? null
          if (sessionId.length > 0 && typeof found.pull?.number === 'number') {
            await watcher.track(sessionId, {
              root,
              remote: read.repo.remote as unknown as ForgeRemote,
              number: found.pull.number,
              url: found.pull.url,
              branch: read.repo.branch,
              base: found.pull.base ?? '',
            })
          }
        } catch (error) {
          value.branchPullError = failureOf(error)
        }
      }
      return value
    },

    /** One tracked file's diff, or an untracked file's content as an insertion. */
    async diff(payload, signal) {
      const { root } = await repository(payload, signal)
      const path = requiredString(payload.path, 'path')
      return await readFilePatch(runner, {
        root,
        path,
        staged: payload.staged === true,
        untracked: payload.untracked === true,
        config,
        signal,
      })
    },

    /** Every changed file's diff, for the stacked diff view. */
    async diffAll(payload: DiffAllRequest, signal) {
      const { root } = await repository(payload, signal)
      return await readDiffBundle(runner, {
        root,
        scope: payload.scope === 'branch' ? 'branch' : 'working',
        includeUntracked: payload.includeUntracked !== false,
        config,
        signal,
      })
    },

    /** The commit log. */
    async commits(payload, signal) {
      const { root } = await repository(payload, signal)
      const limit = clampLimit(payload.limit, config.logLimit, 200)
      return { commits: await readLog(runner, { root, limit, signal }) }
    },

    /** One commit with its file statistics and patch. */
    async commit(payload, signal) {
      const { root } = await repository(payload, signal)
      return await readCommit(runner, { root, hash: requiredString(payload.hash, 'hash'), config, signal })
    },

    /** Every ref the branch picker offers. */
    async branches(payload, signal) {
      const { root } = await repository(payload, signal)
      const limit = clampLimit(payload.limit, 120, 200)
      const read = await readBranchRefs(runner, {
        root,
        limit,
        refresh: payload.refresh === true,
        remote: config.remote.length > 0 ? config.remote : null,
        timeoutMs: config.worktreeTimeoutMs,
        signal,
      })
      return {
        branches: read.branches,
        defaultBranch: read.defaultBranch,
        hasPrimaryRemote: read.branches.some((item) => item.isRemote),
      }
    },

    /** Check out an existing branch, or a remote ref as a new local branch. */
    async switchBranch(payload: SwitchBranchRequest, signal) {
      const { root } = await repository(payload, signal)
      return await switchBranch(runner, { root, name: requiredString(payload.name, 'name'), signal })
    },

    /** Create a branch and check it out. */
    async createBranch(payload: CreateBranchRequest, signal) {
      const { root } = await repository(payload, signal)
      return await createBranch(runner, {
        root,
        name: requiredString(payload.name, 'name'),
        from: typeof payload.from === 'string' ? payload.from : undefined,
        signal,
      })
    },

    /** Stage exactly these paths. */
    async stage(payload, signal) {
      const { root } = await repository(payload, signal)
      return { staged: await stagePaths(runner, { root, paths: stringList(payload.paths, 'paths'), signal }) }
    },

    /** Unstage exactly these paths. */
    async unstage(payload, signal) {
      const { root } = await repository(payload, signal)
      return { unstaged: await unstagePaths(runner, { root, paths: stringList(payload.paths, 'paths'), signal }) }
    },

    /** Discard work-tree edits. */
    async discard(payload, signal) {
      const { root } = await repository(payload, signal)
      return {
        discarded: await discardPaths(runner, {
          root,
          paths: stringList(payload.paths, 'paths'),
          includeUntracked: payload.includeUntracked === true,
          signal,
        }),
      }
    },

    /** Commit the selected paths with the message the dialog collected. */
    async commitChanges(payload: CommitRequestPayload, signal) {
      const { root } = await repository(payload, signal)
      const outcome = await commitChanges(runner, {
        root,
        message: requiredString(payload.message, 'message'),
        paths: Array.isArray(payload.paths) ? payload.paths : undefined,
        amend: payload.amend === true,
        signal,
      })
      if (outcome.status === 'skipped_no_changes') {
        throw new CommandError('commit/nothing', 'There is nothing to commit.')
      }
      return { sha: outcome.sha, subject: outcome.subject, branch: outcome.branch }
    },

    /** Push the checked-out branch. */
    async push(payload: PushRequest, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      const branch = typeof payload.branch === 'string' && payload.branch.length > 0 ? payload.branch : context.branch
      if (branch === null) throw new CommandError('push/detached', 'Cannot push from a detached HEAD.')
      const outcome = await pushCurrentBranch(runner, {
        root,
        remote: payload.remote ?? context.remote?.name,
        branch,
        timeoutMs: config.worktreeTimeoutMs,
        signal,
      })
      return { branch: outcome.branch, upstream: outcome.upstream }
    },

    /** Pull the checked-out branch. */
    async pull(payload: PullRequest, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      if (context.branch === null) throw new CommandError('pull/detached', 'Cannot pull while detached.')
      const outcome = await pullCurrentBranch(runner, {
        root,
        branch: context.branch,
        rebase: payload.rebase === true,
        signal,
      })
      return { status: outcome.status, branch: outcome.branch }
    },

    /** Draft a commit message for the dialog. */
    async draftMessage(payload: DraftMessageRequest, signal): Promise<DraftedMessage> {
      const { root } = await repository(payload, signal)
      const facts = await readCommitMessageFacts(runner, {
        root,
        paths: Array.isArray(payload.paths) ? payload.paths : undefined,
        config,
        signal,
      })
      const draft = await draftCommitMessage({
        llm: ctx.get<LlmService>('llm'),
        route: configuredRoute(String(payload.sessionId ?? '')),
        sessionId: String(payload.sessionId ?? ''),
        branch: facts.branch,
        files: facts.files,
        diff: facts.diff,
        truncated: facts.truncated,
        recentSubjects: facts.recentSubjects,
        locale: payload.locale,
        config: config.commit,
        signal,
        logger,
      })
      return {
        message: draft.message,
        source: draft.source,
        model: draft.model,
        ...(draft.error === undefined ? {} : { error: draft.error }),
      }
    },

    /** Start one stacked action and answer its id. */
    async startAction(payload: StackedActionRequest) {
      const action = payload.action
      if (!['commit', 'push', 'create_pr', 'commit_push', 'commit_push_pr'].includes(action)) {
        throw new CommandError('input/invalid', `Unknown action "${String(action)}"`)
      }
      // Finished actions are kept only long enough for a slow poll to read them.
      const now = Date.now()
      for (const [id, entry] of actions) {
        if (entry.finishedAt !== null && now - entry.finishedAt > ACTION_RETENTION_MS) actions.delete(id)
      }
      const actionId = randomUUID()
      const progress: MutableProgress = {
        actionId,
        action,
        status: 'running',
        phases: [],
        phase: null,
        label: 'Startingâ€¦',
        startedAt: Date.now(),
        finishedAt: null,
        output: [],
        result: null,
        error: null,
        controller: new AbortController(),
      }
      actions.set(actionId, progress)
      // The action outlives the request: it runs on its own controller so a
      // browser that navigates away does not abort a commit halfway through.
      void runStackedAction(progress, payload).catch((error) => {
        progress.status = 'failed'
        progress.error = failureOf(error)
        progress.finishedAt = Date.now()
      })
      return { actionId }
    },

    /** Where one action stands. */
    async actionState(payload: ActionStateRequest) {
      const actionId = requiredString(payload.actionId, 'actionId')
      const progress = actions.get(actionId)
      if (progress === undefined) {
        throw new CommandError('action/unknown', 'That Git action is no longer running.')
      }
      if (progress.finishedAt !== null && Date.now() - progress.finishedAt > ACTION_RETENTION_MS) {
        actions.delete(actionId)
        throw new CommandError('action/expired', 'That Git action finished a while ago.')
      }
      const { controller: _controller, ...view } = progress
      return view
    },

    /** What the code host can offer for this repository. */
    async forge(payload, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      return {
        branch: context.branch,
        remote: context.remote,
        forge: await describeForge(context.remote, root, signal),
      }
    },

    /** Open, closed, merged, or all change requests. */
    async pulls(payload, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      const state = ['open', 'closed', 'merged', 'draft', 'all'].includes(String(payload.state)) ? String(payload.state) : 'open'
      const limit = clampLimit(payload.limit, config.pullLimit, 100)
      return await forge.listPulls({
        root,
        remote: context.remote as unknown as ForgeRemote,
        state,
        limit,
        signal,
        refresh: payload.refresh === true,
      })
    },

    /** One change request with checks, reviews, and comments. */
    async pullRequest(payload, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      return await forge.pullDetail({
        root,
        remote: context.remote as unknown as ForgeRemote,
        number: requiredNumber(payload.number, 'number'),
        signal,
        refresh: payload.refresh === true,
      })
    },

    /** The change request whose head is the checked-out branch. */
    async branchPull(payload, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      const branch = typeof payload.branch === 'string' && payload.branch.length > 0 ? payload.branch : context.branch
      return await forge.pullForBranch({
        root,
        remote: context.remote as unknown as ForgeRemote,
        branch: branch ?? '',
        signal,
        refresh: payload.refresh === true,
      })
    },

    /** Open or closed issues. */
    async issues(payload, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      const state = ['open', 'closed', 'all'].includes(String(payload.state)) ? String(payload.state) : 'open'
      const limit = clampLimit(payload.limit, config.issueLimit, 100)
      return await forge.listIssues({
        root,
        remote: context.remote as unknown as ForgeRemote,
        state,
        limit,
        signal,
        refresh: payload.refresh === true,
      })
    },

    /** One issue with its comments. */
    async issue(payload, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      return await forge.issueDetail({
        root,
        remote: context.remote as unknown as ForgeRemote,
        number: requiredNumber(payload.number, 'number'),
        signal,
        refresh: payload.refresh === true,
      })
    },

    /**
     * Create a change request for the checked-out branch: push it, draft the
     * title and description with the Session's model, then open it on the code
     * host and bind it to the Session for merge tracking.
     */
    async createPull(payload: CreatePullRequest, signal) {
      const { root } = await repository(payload, signal)
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const context = await readContext(runner, { root, config, signal })
      if (context.branch === null) {
        throw new CommandError('pr/detached', 'A detached HEAD cannot open a pull request.')
      }
      if (context.remote === null) {
        throw new CommandError('pr/no-remote', 'The repository has no remote, so it cannot open a pull request.')
      }
      if (payload.push === true) {
        await pushCurrentBranch(runner, {
          root,
          remote: context.remote.name,
          branch: context.branch,
          timeoutMs: config.worktreeTimeoutMs,
          signal,
        })
      }
      const pr = await createPullForBranch({
        root,
        sessionId,
        payload: payload as unknown as Record<string, unknown>,
        branch: context.branch,
        remote: context.remote,
        signal,
      })
      return {
        pull: {
          number: pr.number ?? null,
          url: pr.url ?? '',
          title: pr.title ?? '',
          base: pr.base ?? '',
          head: pr.head ?? context.branch,
        },
        title: pr.title ?? '',
        body: '',
        draft: { source: 'model', model: null, error: null },
        watched: sessionId.length > 0 && typeof pr.number === 'number',
      }
    },

    /** Publish the repository to a code host, so it gains its first remote. */
    async publish(payload: PublishRequest, signal) {
      const { root } = await repository(payload, signal)
      const provider = payload.provider === 'gitlab' ? 'gitlab' : 'github'
      const repositoryName = requiredString(payload.repository, 'repository')
      const visibility = payload.visibility === 'public' ? '--public' : '--private'
      const program = config.cliPath.length > 0 ? config.cliPath : provider === 'github' ? 'gh' : 'glab'
      if (provider === 'github') {
        const result = await runner.run(program, [
          'repo',
          'create',
          repositoryName,
          '--source',
          root,
          '--remote',
          'origin',
          '--push',
          visibility,
        ], { cwd: root, signal, timeoutMs: config.worktreeTimeoutMs, maxBytes: 256 * 1024 })
        if (result.code !== 0) throwWriteFailure('publish', result)
        return { remote: 'origin', url: firstUrl(result.stdout), pushed: true }
      }
      const created = await runner.run(program, [
        'repo',
        'create',
        repositoryName,
        visibility,
        '--remoteName',
        'origin',
      ], {
        cwd: root,
        signal,
        timeoutMs: config.worktreeTimeoutMs,
        maxBytes: 256 * 1024,
        ...(config.gitlabHosts.length === 0 ? {} : { env: { GITLAB_HOST: hostOf(config.gitlabHosts[0]) } }),
      })
      if (created.code !== 0) throwWriteFailure('publish', created)
      const context = await readContext(runner, { root, config, signal })
      if (context.branch !== null) {
        await pushCurrentBranch(runner, {
          root,
          remote: 'origin',
          branch: context.branch,
          timeoutMs: config.worktreeTimeoutMs,
          signal,
        })
      }
      return { remote: 'origin', url: firstUrl(created.stdout), pushed: context.branch !== null }
    },

    /**
     * The New Session worktree option: the branches a checkout may start from,
     * and the checkout this Session already has.
     *
     * It answers "not supported" instead of failing, because the Hero renders
     * for every Session, including ones outside a repository.
     */
    async worktreeState(payload, signal): Promise<WorktreeState> {
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const base: WorktreeState = {
        enabled: config.worktree.enabled === true,
        supported: false,
        reason: null,
        sessionId,
        current: null,
        bases: null,
        project: null,
      }
      let directory: string
      try {
        directory = sessionDirectory(ctx, sessionId) ?? await directoryFromPayload(payload.cwd)
      } catch {
        return { ...base, reason: 'no-directory' }
      }
      const root = await locateRepository(runner, directory, signal)
      if (root === null) return { ...base, reason: 'not-a-repository' }
      const mainRoot = await mainWorktreeRoot(root, signal)

      const kind = await readCheckoutKind(runner, { path: mainRoot, signal })
      const remote = await preferredRemote(mainRoot, signal)
      const bases = await readBases(runner, { root: mainRoot, remote, signal })
      if (config.worktree.base.length > 0) bases.defaultBase = config.worktree.base
      const value = await state()
      if (payload.probe === true) {
        await store.update((current) => {
          current.probe = { at: Date.now(), sessionId, directory, root: mainRoot, supported: true }
        })
      }
      return {
        ...base,
        supported: config.worktree.enabled === true && kind.linked !== true,
        reason: config.worktree.enabled === true
          ? kind.linked === true ? 'linked-project' : null
          : 'disabled',
        repositoryRoot: mainRoot,
        remote,
        sourceDefault: config.worktree.source,
        project: { directory, linked: kind.linked === true },
        bases,
        current: sessionId.length > 0 ? value.worktrees?.[sessionId] ?? null : null,
      }
    },

    /**
     * Every checkout of this repository, with the facts the manager needs:
     * which one the Session is in, which the plugin created, and whether it
     * holds uncommitted work.
     */
    async worktrees(payload, signal) {
      const { root } = await repository(payload, signal)
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const currentPath = sessionDirectory(ctx, sessionId) ?? root
      const [entries, value] = await Promise.all([
        readWorktrees(runner, { root, signal }),
        state(),
      ])
      const mainRoot = resolve(entries[0]?.path ?? root)
      const records = new Map<string, WorktreeRecord>()
      for (const record of Object.values(value.worktrees ?? {})) {
        if (typeof record?.path === 'string') records.set(pathKey(record.path), record)
      }
      const pool = poolDirectory(mainRoot, config.worktree)
      const worktrees = await Promise.all(entries.map(async (entry) => {
        const record = records.get(pathKey(entry.path))
        const entryPath = resolve(entry.path)
        const changedFiles = entry.bare || entry.prunable ? null : await countChangedFiles(entryPath, signal)
        return {
          path: entryPath,
          branch: entry.branch,
          head: entry.head,
          bare: entry.bare,
          detached: entry.detached,
          locked: entry.locked,
          prunable: entry.prunable,
          current: pathKey(entryPath) === pathKey(currentPath),
          isPool: pathKey(entryPath) !== pathKey(pool) && isInside(pool, entryPath),
          sessionId: record?.sessionId ?? null,
          createdAt: record?.createdAt ?? null,
          changedFiles,
        }
      }))
      worktrees.sort((left, right) => {
        if (left.current !== right.current) return left.current ? -1 : 1
        if (left.isPool !== right.isPool) return left.isPool ? -1 : 1
        return left.path.localeCompare(right.path)
      })
      return { root: mainRoot, poolDirectory: pool, currentPath, worktrees }
    },

    /**
     * Create one checkout from the manager, optionally moving the Session into
     * it. Unlike the New Session option this accepts a name and a base branch,
     * so a checkout can be prepared before a chat exists.
     */
    async worktreeAdd(payload, signal) {
      const { root } = await repository(payload, signal)
      const mainRoot = await mainWorktreeRoot(root, signal)
      if (config.worktree.enabled !== true) {
        throw new CommandError('worktree/disabled', 'The worktree feature is disabled in the configuration')
      }
      const kind = await readCheckoutKind(runner, { path: mainRoot, signal })
      if (kind.linked) {
        throw new CommandError('worktree/linked-project', 'The open repository is itself a linked worktree', { root: mainRoot })
      }
      const remote = await preferredRemote(mainRoot, signal)
      const requestedBase = typeof payload.base === 'string' ? payload.base.trim() : ''
      const base = requestedBase.length > 0
        ? requestedBase
        : config.worktree.base.length > 0
          ? config.worktree.base
          : await resolveDefaultBase(runner, { root: mainRoot, remote, signal })
      if (base === null) throw new CommandError('worktree/no-base', 'Cannot determine the base branch for the worktree')
      const source = payload.source === 'remote' ? 'remote' : 'local'
      const requested = typeof payload.name === 'string' ? payload.name.trim() : ''
      // A manager name is one directory level, so a branch-style slash becomes a dash.
      const fragment = sanitizeBranchFragment(
        requested.length > 0 ? requested : generatedWorktreeName('', config.worktree.namePrefix),
      ).replace(/\//g, '-')
      if (fragment.length === 0) throw new CommandError('worktree/invalid-name', 'A worktree name is required')
      const name = await uniqueBranchName(runner, { root: mainRoot, branch: fragment, signal })
      const created = await createWorktree(runner, {
        repoRoot: mainRoot,
        name,
        base,
        source,
        remote: source === 'remote' ? remote : '',
        config: config.worktree,
        timeoutMs: config.worktreeTimeoutMs,
        signal,
      })
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const record: WorktreeRecord = {
        ...created,
        base,
        source,
        remote: source === 'remote' ? remote : null,
        sessionId,
        createdAt: Date.now(),
      }
      let switched = false
      if (sessionId.length > 0) {
        await store.update((current) => {
          current.worktrees ??= {}
          current.worktrees[sessionId] = record
        })
        if (payload.switch !== false) {
          try {
            await setSessionDirectory(sessionId, created.path, signal)
            switched = true
          } catch (error) {
            // The Session stayed in the project, so the fresh checkout is undone.
            await removeWorktree(runner, {
              repoRoot: mainRoot,
              path: created.path,
              branch: created.branch,
              deleteBranch: true,
              timeoutMs: config.worktreeTimeoutMs,
            }).catch(() => undefined)
            await store.update((current) => {
              if (current.worktrees !== undefined) delete current.worktrees[sessionId]
            }).catch(() => undefined)
            throw error
          }
        }
      }
      logger.info('git: created worktree %s for %s', created.branch, sessionId.length > 0 ? sessionId : 'no Session')
      return { worktree: record, switched }
    },

    /** Move one Session into an existing checkout, or back to the project. */
    async worktreeSwitch(payload, signal) {
      const sessionId = requiredString(payload.sessionId, 'sessionId')
      const target = requiredString(payload.path, 'path')
      const { root } = await repository(payload, signal)
      const mainRoot = await mainWorktreeRoot(root, signal)
      const entries = await readWorktrees(runner, { root, signal })
      const match = entries.find((entry) => pathKey(entry.path) === pathKey(target))
      if (match === undefined) {
        throw new CommandError('worktree/unknown-path', 'That folder is not a worktree of this repository', { path: target })
      }
      if (match.bare) throw new CommandError('worktree/bare', 'A bare repository cannot hold a Session')
      const matchPath = resolve(match.path)
      await setSessionDirectory(sessionId, matchPath, signal)
      await store.update((current) => {
        current.worktrees ??= {}
        const existing = Object.values(current.worktrees).find(
          (record) => typeof record?.path === 'string' && pathKey(record.path) === pathKey(matchPath),
        )
        if (existing !== undefined && pathKey(matchPath) !== pathKey(mainRoot)) {
          current.worktrees[sessionId] = { ...existing, sessionId }
        } else {
          delete current.worktrees[sessionId]
        }
      })
      return { directory: matchPath, branch: match.branch }
    },

    /** Remove one checkout by path, never the main one. */
    async worktreeRemovePath(payload, signal) {
      const target = requiredString(payload.path, 'path')
      const { root } = await repository(payload, signal)
      const mainRoot = await mainWorktreeRoot(root, signal)
      if (pathKey(target) === pathKey(mainRoot)) {
        throw new CommandError('worktree/main', 'The main checkout cannot be removed')
      }
      const entries = await readWorktrees(runner, { root, signal })
      const match = entries.find((entry) => pathKey(entry.path) === pathKey(target))
      if (match === undefined) {
        throw new CommandError('worktree/unknown-path', 'That folder is not a worktree of this repository', { path: target })
      }
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      if (sessionId.length > 0) {
        const current = sessionDirectory(ctx, sessionId)
        if (current !== undefined && isInside(match.path, current)) {
          await setSessionDirectory(sessionId, mainRoot, signal)
        }
      }
      const result = await removeWorktree(runner, {
        repoRoot: mainRoot,
        path: match.path,
        branch: match.branch,
        deleteBranch: payload.deleteBranch === true,
        force: payload.force === true,
        timeoutMs: config.worktreeTimeoutMs,
        signal,
      })
      await store.update((current) => {
        if (current.worktrees === undefined) return
        for (const [id, record] of Object.entries(current.worktrees)) {
          if (typeof record?.path === 'string' && pathKey(record.path) === pathKey(match.path)) delete current.worktrees[id]
        }
      })
      return { removed: result.removed, branchDeleted: result.branchDeleted, directory: resolve(match.path) }
    },

    /** Forget registrations whose checkout directory disappeared. */
    async worktreePrune(payload, signal) {
      const { root } = await repository(payload, signal)
      const result = await runner.run('git', ['worktree', 'prune', '-v'], {
        cwd: root,
        signal,
        timeoutMs: config.worktreeTimeoutMs,
      })
      if (result.code !== 0) {
        throw new CommandError('worktree/failed', String(result.stderr ?? '').trim() || 'git worktree prune failed')
      }
      // `prune -v` reports each removal on stderr, not stdout.
      const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
      const pruned = output.split('\n').filter((line) => /^\s*Removing\b/i.test(line)).length
      return { pruned }
    },

    /**
     * Create one checkout for a Session and move that Session into it.
     *
     * The checkout starts from a local branch, or from a remote branch after
     * fetching it, so "remote" means the code host's commit rather than
     * whatever this computer last fetched.
     */
    async worktreeCreate(payload, signal) {
      const sessionId = requiredString(payload.sessionId, 'sessionId')
      const { directory, root } = await repository(payload, signal)
      const mainRoot = await mainWorktreeRoot(root, signal)
      if (config.worktree.enabled !== true) {
        throw new CommandError('worktree/disabled', 'The worktree feature is disabled in the configuration')
      }
      const agent = agentFor(sessionId)
      if (agent === undefined) {
        throw new CommandError('worktree/no-agent', 'This Session is not open, so its folder cannot change yet')
      }
      const workingDirectory = ctx.get<{
        set(agent: { session?: SessionLike }, directory: string, signal?: AbortSignal): Promise<unknown>
      }>('workingDirectory')
      if (typeof workingDirectory?.set !== 'function') {
        throw new CommandError('worktree/no-working-directory', 'This build cannot change a Session folder')
      }
      if (isInside(poolDirectory(mainRoot, config.worktree), directory)) {
        throw new CommandError('worktree/already', 'This Session already works in a worktree of this repository', { directory })
      }
      const value = await state()
      const previous = value.worktrees?.[sessionId]
      if (previous !== undefined) {
        throw new CommandError('worktree/already', `This Session already has worktree ${String(previous.branch)}`, { path: previous.path })
      }
      const kind = await readCheckoutKind(runner, { path: mainRoot, signal })
      if (kind.linked) {
        throw new CommandError('worktree/linked-project', 'The open repository is itself a linked worktree, so no second one is created', { root: mainRoot })
      }

      const remote = await preferredRemote(mainRoot, signal)
      const requested = typeof payload.base === 'string' ? payload.base.trim() : ''
      const base = requested.length > 0
        ? requested
        : config.worktree.base.length > 0
          ? config.worktree.base
          : await resolveDefaultBase(runner, { root: mainRoot, remote, signal })
      if (base === null) throw new CommandError('worktree/no-base', 'Cannot determine the base branch for the worktree')
      const source = payload.source === 'remote' ? 'remote' : 'local'
      const name = generatedWorktreeName(sessionId, config.worktree.namePrefix)

      const created = await createWorktree(runner, {
        repoRoot: mainRoot,
        name,
        base,
        source,
        remote: source === 'remote' ? remote : '',
        config: config.worktree,
        timeoutMs: config.worktreeTimeoutMs,
        signal,
      })
      const record: WorktreeRecord = {
        ...created,
        base,
        source,
        remote: source === 'remote' ? remote : null,
        sessionId,
        createdAt: Date.now(),
      }
      try {
        await workingDirectory.set(agent, created.path, signal)
      } catch (error) {
        await removeWorktree(runner, {
          repoRoot: mainRoot,
          path: created.path,
          branch: created.branch,
          deleteBranch: true,
          timeoutMs: config.worktreeTimeoutMs,
        }).catch(() => undefined)
        throw error instanceof CommandError
          ? error
          : new CommandError('worktree/failed', `Cannot move the Session into the worktree: ${messageOf(error)}`)
      }
      await store.update((current) => {
        current.worktrees ??= {}
        current.worktrees[sessionId] = record
      })
      logger.info('git: %s now works in worktree %s', sessionId, created.branch)
      return { worktree: record }
    },

    /** Remove the checkout this plugin created for a Session and return it to the project. */
    async worktreeRemove(payload, signal) {
      const sessionId = requiredString(payload.sessionId, 'sessionId')
      const value = await state()
      const record = value.worktrees?.[sessionId]
      if (record === undefined) {
        throw new CommandError('worktree/unknown', 'This Session has no worktree created by the plugin')
      }
      const repoRoot = String(record.repositoryRoot ?? '')
      const result = await removeWorktree(runner, {
        repoRoot,
        path: String(record.path ?? ''),
        branch: record.branch,
        deleteBranch: payload.deleteBranch === true,
        timeoutMs: config.worktreeTimeoutMs,
        signal,
      })
      const agent = agentFor(sessionId)
      const workingDirectory = ctx.get<{
        set(agent: { session?: SessionLike }, directory: string, signal?: AbortSignal): Promise<unknown>
      }>('workingDirectory')
      if (agent !== undefined && repoRoot.length > 0 && typeof workingDirectory?.set === 'function') {
        await workingDirectory.set(agent, repoRoot, signal).catch(() => undefined)
      }
      await store.update((current) => {
        current.worktrees ??= {}
        delete current.worktrees[sessionId]
      })
      return { removed: result.removed, branchDeleted: result.branchDeleted, directory: repoRoot }
    },

    /** The merge-cleanup settings this composition runs with. */
    async mergeSettings() {
      const value = await state()
      return {
        ...config.merged,
        cleanup: config.worktree.cleanup,
        cleanupLast: value.cleanup ?? null,
        writable: typeof ctx.get<ConfigEditorService>('configEditor')?.edit === 'function',
        forge: config.forge,
        gitlabHosts: config.gitlabHosts,
        cliPath: config.cliPath,
      }
    },

    /**
     * Persist one merge-cleanup change into the profile's plugin row.
     *
     * The profile patch is written through the configuration editor, so the
     * change survives a restart and applies through the normal Loader path.
     */
    async mergeSettingsSet(payload) {
      const editor = ctx.get<ConfigEditorService>('configEditor')
      if (editor === undefined || typeof editor.edit !== 'function' || typeof editor.entries !== 'function') {
        throw new CommandError('config/unavailable', 'This build cannot edit configuration from the UI')
      }
      const entry = editor.entries().find((item: ConfigEditorEntry) => item?.options?.name === '@local/personal-hub')
      if (entry === undefined) {
        throw new CommandError('config/unknown-entry', 'The plugin row is missing from this profile configuration')
      }
      const next = {
        ...config.merged,
        ...(typeof payload.enabled === 'boolean' ? { enabled: payload.enabled } : {}),
        ...(typeof payload.removeWorktree === 'boolean' ? { removeWorktree: payload.removeWorktree } : {}),
        ...(typeof payload.deleteBranch === 'boolean' ? { deleteBranch: payload.deleteBranch } : {}),
        ...(typeof payload.archiveSession === 'boolean' ? { archiveSession: payload.archiveSession } : {}),
      }
      const requestedCleanup = payload.cleanup !== null && typeof payload.cleanup === 'object'
        ? payload.cleanup
        : {}
      const nextCleanup = {
        ...config.worktree.cleanup,
        ...(typeof requestedCleanup.enabled === 'boolean' ? { enabled: requestedCleanup.enabled } : {}),
        ...(typeof requestedCleanup.whenNoCommits === 'boolean' ? { whenNoCommits: requestedCleanup.whenNoCommits } : {}),
        ...(typeof requestedCleanup.deleteBranch === 'boolean' ? { deleteBranch: requestedCleanup.deleteBranch } : {}),
        ...(Number.isFinite(Number(requestedCleanup.inactiveDays)) ? { inactiveDays: Number(requestedCleanup.inactiveDays) } : {}),
        ...(['tracked', 'any', 'none'].includes(String(requestedCleanup.keepChanges))
          ? { keepChanges: String(requestedCleanup.keepChanges) as 'tracked' | 'any' | 'none' }
          : {}),
      }
      const nextForge: ForgeSettings = {
        forge: ['auto', 'github', 'gitlab', 'none'].includes(String(payload.forge))
          ? payload.forge as ForgeSettings['forge']
          : config.forge,
        gitlabHosts: payload.gitlabHosts === undefined ? config.gitlabHosts : readHostList(payload.gitlabHosts),
        cliPath: typeof payload.cliPath === 'string' ? payload.cliPath.trim() : config.cliPath,
      }
      await editor.edit(entry, (current) => {
        const row = current !== null && typeof current === 'object' ? current as Record<string, unknown> : {}
        const git = row.git !== null && typeof row.git === 'object' ? row.git as Record<string, unknown> : {}
        const worktree = git.worktree !== null && typeof git.worktree === 'object' ? git.worktree as Record<string, unknown> : {}
        return {
          ...row,
          git: {
            ...git,
            forge: nextForge.forge,
            gitlabHosts: nextForge.gitlabHosts,
            cliPath: nextForge.cliPath,
            merged: {
              ...(git.merged !== null && typeof git.merged === 'object' ? git.merged : {}),
              enabled: next.enabled === true,
              removeWorktree: next.removeWorktree !== false,
              deleteBranch: next.deleteBranch === true,
              archiveSession: next.archiveSession !== false,
            },
            worktree: {
              ...worktree,
              cleanup: {
                ...(worktree.cleanup !== null && typeof worktree.cleanup === 'object' ? worktree.cleanup : {}),
                enabled: nextCleanup.enabled === true,
                inactiveDays: nextCleanup.inactiveDays,
                whenNoCommits: nextCleanup.whenNoCommits === true,
                keepChanges: nextCleanup.keepChanges,
                deleteBranch: nextCleanup.deleteBranch === true,
              },
            },
          },
        }
      })
      return { merged: next, cleanup: nextCleanup, forge: nextForge }
    },

    /** The worktree cleanup rules and what the last pass did. */
    async cleanupState() {
      const value = await state()
      return { settings: config.worktree.cleanup, last: value.cleanup ?? null }
    },

    /** Run one cleanup pass now, whatever the schedule says. */
    async cleanupRun() {
      const before = (await state()).cleanup ?? null
      if (config.worktree.cleanup.enabled !== true) {
        return { ran: false, reason: 'disabled', last: before }
      }
      const last = await cleanup.runOnce()
      return { ran: true, last: last ?? before }
    },
  }

  /**
   * Run one action, folding every failure into the Remote result envelope.
   * @param endpoint action name.
   * @param payload call arguments.
   * @param signal call cancellation.
   */
  async function dispatch(
    endpoint: string,
    payload: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>> {
    // One cast at the boundary: the route table is untyped by nature, while the
    // handler map itself is checked route by route.
    const handler = (handlers as unknown as Record<string, (input: never, signal: AbortSignal) => Promise<unknown>>)[endpoint]
    if (typeof handler !== 'function') {
      return failure('input/unknown-endpoint', `Unknown Git action "${String(endpoint)}"`)
    }
    try {
      return { ok: true, value: await handler(payload as never, signal) }
    } catch (error) {
      if (error instanceof CommandError) {
        logger.warn('git: %s failed: %s', endpoint, error.message)
        return failure(error.code, error.message, error.details)
      }
      logger.error('git: %s crashed: %s', endpoint, messageOf(error))
      return failure('system/failed', messageOf(error))
    }
  }

  /**
   * Resolve the repository a call addresses.
   * @param payload call arguments.
   * @param signal call cancellation.
   */
  async function repository(payload: GitTarget, signal?: AbortSignal): Promise<{ directory: string; root: string }> {
    const directory = sessionDirectory(ctx, payload.sessionId) ?? await directoryFromPayload(payload.cwd)
    const root = await locateRepository(runner, directory, signal)
    if (root === null) {
      throw new CommandError('git/not-a-repository', `The folder ${directory} is not inside a Git repository`, { cwd: directory })
    }
    return { directory, root }
  }

  /**
   * Ask the code host what it can offer, never failing the whole overview.
   * @param remote chosen remote.
   * @param root repository root.
   * @param signal cancellation.
   */
  async function describeForge(
    remote: GitOverview['repo']['remote'],
    root: string,
    signal?: AbortSignal,
  ): Promise<GitOverview['forge']> {
    try {
      return await forge.describe({ root, remote: remote as unknown as ForgeRemote, signal })
    } catch (error) {
      return {
        provider: remote?.provider ?? 'none',
        available: false,
        backend: null,
        cli: null,
        reason: messageOf(error),
      }
    }
  }

  const disposers: Array<() => void> = []
  for (const endpoint of Object.keys(handlers)) {
    const route = {
      path: `${GIT_PATH_PREFIX}/${endpoint}`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request: Request) => {
        const payload = await readPayload(request)
        if (payload === undefined) {
          return jsonResponse({ ok: false, error: { code: 'input/invalid', message: 'The request body is not valid JSON' } })
        }
        return jsonResponse(await dispatch(endpoint, payload, request.signal))
      },
    }
    try {
      disposers.push(connection.fetch!.register(route))
    } catch (error) {
      logger.error('git: cannot register %s: %s', route.path, messageOf(error))
    }
  }

  if (disposers.length === 0) {
    logger.error('git: no route could be registered, so the git panel has no bridge')
  } else {
    logger.info('git: %d routes are open under %s for this browser', disposers.length, GIT_PATH_PREFIX)
  }

  watcher.start()
  cleanup.start()

  // Branch naming rides the first message: the checkout exists before the
  // prompt does, and this is the earliest point the plugin can read it.
  let stopNaming: (() => void) | undefined
  if (typeof ctx.on === 'function' && config.worktree.naming === 'semantic') {
    try {
      stopNaming = ctx.on('agent/inbox/inserted', (payload: never) => {
        const inserted = payload as { agent?: { session?: { id?: string } }; message?: unknown }
        const sessionId = inserted?.agent?.session?.id
        if (typeof sessionId !== 'string' || sessionId.length === 0) return
        void nameWorktreeFromMessage(sessionId, inserted.message).catch(() => undefined)
      })
    } catch (error) {
      logger.warn('git: cannot watch for the first message: %s', messageOf(error))
    }
  }
  // One durable record per mount, so a support report can tell which build is
  // actually running and when it last loaded.
  void store.update((value) => {
    value.runtime = { mountedAt: Date.now(), routes: disposers.length, backend: runner.backend }
  }).catch(() => undefined)

  return () => {
    watcher.stop()
    cleanup.stop()
    for (const progress of actions.values()) {
      try {
        progress.controller.abort()
      } catch {
        // The action already finished.
      }
    }
    actions.clear()
    if (typeof stopNaming === 'function') {
      try {
        stopNaming()
      } catch {
        // The listener already went away with its context.
      }
    }
    for (const dispose of disposers.splice(0)) {
      try {
        dispose()
      } catch (error) {
        logger.warn('git: route disposal failed: %s', messageOf(error))
      }
    }
  }
}

/** Throw one classified write failure, with the reason's sentence when there is one. */
function throwWriteFailure(operation: string, result: RunResult): never {
  const reason = classifyGitFailure(result.stderr)
  const friendly = failureReasonMessage(reason)
  throw new CommandError(`git/${operation}`, friendly ?? (firstLine(result.stderr) || `git exited with status ${result.code}`), {
    reason: reason ?? undefined,
    exitCode: result.code,
  })
}

/** First URL in a command's output, as `gh repo create` prints it. */
function firstUrl(text: string | null | undefined): string | null {
  const match = /https?:\/\/[^\s]+/.exec(String(text ?? ''))
  return match === null ? null : match[0]
}

/** First non-empty line of a command's stderr. */
function firstLine(text: string | null | undefined): string {
  return String(text ?? '').split('\n').map((line) => line.trim()).find((line) => line.length > 0) ?? ''
}

/**
 * Read one route's JSON request payload.
 * @param request the Fetch request the shared channel admitted.
 * @returns the payload, or undefined when the body is not JSON.
 */
async function readPayload(request: Request): Promise<Record<string, unknown> | undefined> {
  let text: string
  try {
    text = await request.text()
  } catch {
    return undefined
  }
  if (text.trim().length === 0) return {}
  try {
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object' ? parsed as Record<string, unknown> : undefined
  } catch {
    return undefined
  }
}

/**
 * Answer one route call as JSON the browser reads directly.
 * @param body response envelope.
 */
function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/**
 * The working directory a Session reports, which is the repository the panel
 * inspects: an attached Agent's Session header first, then the Session store.
 * @param ctx plugin context.
 * @param sessionId session identity from the browser.
 */
function sessionDirectory(ctx: DshContext, sessionId: unknown): string | undefined {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
  const agents = ctx.get<{ get(sessionId: string): { session?: SessionLike } | undefined }>('agents')
  const agent = typeof agents?.get === 'function' ? agents.get(sessionId) : undefined
  const sessions = ctx.get<{ get(sessionId: string): SessionLike | undefined }>('sessions')
  const session = agent?.session ?? (typeof sessions?.get === 'function' ? sessions.get(sessionId) : undefined)

  // The header cwd is where the Session started; a worktree switch is a
  // `working-directory/change`, so the service is the only truthful source.
  const workingDirectory = ctx.get<{ get(session: SessionLike): string | undefined }>('workingDirectory')
  if (session !== undefined && typeof workingDirectory?.get === 'function') {
    try {
      const effective = workingDirectory.get(session)
      if (typeof effective === 'string' && effective.length > 0) return effective
    } catch {
      // A service that cannot answer falls back to the recorded header.
    }
  }
  const fromAgent = agent?.session?.header?.cwd
  if (typeof fromAgent === 'string' && fromAgent.length > 0) return fromAgent
  const fromSession = session?.header?.cwd
  if (typeof fromSession === 'string' && fromSession.length > 0) return fromSession
  return undefined
}

/**
 * Validate the directory the browser sent as a fallback hint.
 * @param value absolute directory.
 */
async function directoryFromPayload(value: unknown): Promise<string> {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CommandError('git/no-directory', 'Cannot determine this Session working folder')
  }
  const directory = value.trim()
  if (!isAbsolute(directory)) {
    throw new CommandError('input/invalid', 'The folder must be an absolute path', { cwd: directory })
  }
  try {
    const info = await stat(directory)
    if (!info.isDirectory()) throw new CommandError('git/no-directory', `${directory} is not a folder`, { cwd: directory })
  } catch (error) {
    if (error instanceof CommandError) throw error
    throw new CommandError('git/no-directory', `Cannot open the folder ${directory}`, { cwd: directory })
  }
  return directory
}

/**
 * Read a token a user stored in the credential store.
 * @param ctx plugin context.
 * @param ref credential reference, such as `DSH_GITHUB_TOKEN`.
 */
async function storedToken(ctx: DshContext, ref: string): Promise<string | undefined> {
  const credentials = ctx.get<{ resolve(ref: string): Promise<{ value?: string } | undefined> }>('credentials')
  if (credentials === undefined || typeof credentials.resolve !== 'function') return undefined
  const hit = await credentials.resolve(ref)
  return typeof hit?.value === 'string' ? hit.value : undefined
}

/** Require one string argument. */
function requiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CommandError('input/invalid', `Missing the ${name} argument`)
  }
  return value.trim()
}

/** Require one non-empty string list. */
function stringList(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CommandError('input/invalid', `The ${name} argument must be a non-empty list`)
  }
  return value.map((item) => String(item)).filter((item) => item.length > 0)
}

/** Read a host list, accepting an array or one comma/newline-separated string. */
function readHostList(value: unknown): string[] {
  const items = typeof value === 'string'
    ? value.split(/[\s,]+/)
    : Array.isArray(value)
      ? value.map((item) => String(item))
      : []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const host = item.trim().replace(/\/+$/, '')
    if (host.length === 0) continue
    const key = host.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(host)
  }
  return result
}

/** The hostname of a configured GitLab host or base URL. */
function hostOf(value: string): string {
  const raw = String(value ?? '').trim()
  if (raw.length === 0) return ''
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).host
  } catch {
    return raw
  }
}

/** Require one positive integer argument. */
function requiredNumber(value: unknown, name: string): number {
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new CommandError('input/invalid', `The ${name} argument is not a positive number`)
  }
  return Math.round(numeric)
}

/** Clamp a caller-supplied limit against the configured and hard limits. */
function clampLimit(value: unknown, configured: number, hard: number): number {
  const fallback = Number(configured) || 20
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.min(hard, Math.round(numeric))
}

/** The Remote failure envelope. */
function failure(code: string, message: string, details?: unknown): { ok: false; error: FailureInfo } {
  return { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } }
}

/** A failure record for a nested call whose own failure must not end the answer. */
function failureOf(error: unknown): FailureInfo {
  return error instanceof CommandError
    ? { code: error.code, message: error.message }
    : { code: 'system/failed', message: messageOf(error) }
}

/** Message of an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Read the text of one user message, ignoring its images and references.
 * @param message a Session user message.
 * @returns the joined text, trimmed.
 */
function textOfUserMessage(message: unknown): string {
  const content = (message as { content?: unknown } | null | undefined)?.content
  if (!Array.isArray(content)) return ''
  return content
    .filter((block: { type?: string; text?: string }) => block?.type === 'text' && typeof block.text === 'string')
    .map((block: { text: string }) => block.text)
    .join(' ')
    .trim()
}

