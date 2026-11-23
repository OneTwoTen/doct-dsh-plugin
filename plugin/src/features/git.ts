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
import { realpathSync } from 'node:fs'
import { realpath, rm, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'

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
  resolveDraftBase,
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
import { createMergeWatcher, isPullSet, lostArchives, mayAdoptBranchPull, reconcileCheckouts } from '../lib/merge-watch.ts'
import type { MergeStoreState } from '../lib/merge-watch.ts'
import { pluginDataDir } from '../lib/paths.ts'
import { jsonResponse, readJsonPayload } from '../lib/host-http.ts'
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
  repairInheritedBaseUpstream,
  resolveDefaultBase,
  resolveSourceDefault,
  uniqueBranchName,
} from '../lib/worktree.ts'
import { resolveAutoFeatureBranchName, sanitizeBranchFragment, sanitizeFeatureBranchName } from '../lib/git-core.ts'
import type {
  ActionStateRequest,
  CheckoutStateResult,
  CleanupRunResult,
  CommitRequestPayload,
  CreateBranchRequest,
  CreatePullRequest,
  DiffAllRequest,
  DiffRequest,
  DraftedMessage,
  DraftMessageRequest,
  DraftPullRequest,
  FailureInfo,
  ForgeSettings,
  GitActionPhase,
  GitActionProgress,
  GitActionToast,
  GitApi,
  GitCounts,
  GitEndpoint,
  GitOverview,
  GitRequest,
  GitResponse,
  GitRunStackedActionResult,
  GitStackedAction,
  GitTarget,
  MergeMethod,
  MergePullRequest,
  PublishRequest,
  PullDraftResult,
  PullRequest,
  PushRequest,
  StackedActionRequest,
  SwitchBranchRequest,
  WorktreeRecord,
  WorktreeRequest,
  WorktreeCreation,
  WorktreeState,
  WorkspaceChangeRepo,
  WorkspaceChangesResult,
  WorkspaceRepo,
  WorkspaceReposResult,
  CheckoutRepoRequest,
  CheckoutRemoveRequest,
} from '../shared/protocol.ts'
import type { DshContext, Logger, ConfigEditorEntry, ConfigEditorService, LlmService, SessionLike, AgentLike, FileSystemService, SystemPromptService, ToolDefinitionLike, ToolsService } from '../host/dsh.ts'
import type { GitConfig, HubConfig } from '../lib/config.ts'
import { contextName, ensureContext, materializeRepo, readContext as readContextManifest, removeRepoCheckout, writeContextInstructions } from '../lib/context.ts'
import type { ContextRecord, RepoCheckout } from '../lib/context.ts'
import { WORKSPACE_MANIFEST, defaultRepo, isPathInside, repoOf, repoPathKey, resolveRepoSet } from '../lib/repo-set.ts'
import type { RepoSet, WorkspaceRepoEntry } from '../lib/repo-set.ts'

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
/** The page size the tab counters read from the code host. */
const COUNT_PAGE = 50
/**
 * How often recorded checkouts are compared with the code host again.
 *
 * A change request opened outside the panel — or one whose branch was renamed
 * after its checkout was recorded — leaves no binding, so the merge watcher
 * never polls it. This pass notices the merge and settles the chat anyway.
 */
const RECONCILE_INTERVAL_MS = 5 * 60 * 1000
/** Only a merge this recent is settled by reconciliation; older history is left to the cleanup policy. */
const RECONCILE_MERGE_AGE_MS = 7 * 24 * 60 * 60 * 1000
/** How many merged change requests one repository is asked for during reconciliation. */
const RECONCILE_PULL_LIMIT = 50

/** The durable state this feature keeps between restarts. */
type GitState = MergeStoreState & {
  worktrees?: Record<string, WorktreeRecord>
  /** What the next message of a Session should do about its own checkout. */
  worktreeRequests?: Record<string, WorktreeRequest>
  probe?: { at: number; sessionId: string; directory: string; root: string; supported: boolean }
  cleanup?: CleanupRunResult | null
  runtime?: { mountedAt: number; routes: number; backend: string }
}

/** One action the Host is running, mutable while it runs. */
interface MutableProgress extends GitActionProgress {
  controller: AbortController
}

/**
 * A live Agent, as the worktree hold needs it.
 *
 * `runMaintenance` claims the Agent's idle phase before the delivery wakes it,
 * which is what lets the checkout exist and the Session's folder change before
 * the message's first step is assembled.
 */
type MaintenanceAgent = AgentLike & {
  session?: SessionLike
  runMaintenance?(job: (signal: AbortSignal) => Promise<unknown>): Promise<unknown>
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

  /**
   * What the next message of each Session should do about its own checkout.
   *
   * The inbox listener runs before the delivery wakes the Agent, so it must
   * claim the Agent synchronously and cannot wait for the disk. These mirrors
   * of the durable records are therefore what the listener reads.
   */
  const requests = new Map<string, WorktreeRequest>()
  /** The checkout creation one Session's message waits for, while it runs. */
  const creating = new Map<string, WorktreeCreation>()
  /** Sessions this plugin already gave a checkout, mirrored from the store. */
  const checkouts = new Set<string>()
  /** Whether the store has been read, so the mirrors above can be trusted. */
  let stateReady = false

  void store.load().then((value) => {
    for (const [sessionId, request] of Object.entries(value.worktreeRequests ?? {})) {
      if (request !== null && typeof request === 'object') requests.set(sessionId, request)
    }
    for (const sessionId of Object.keys(value.worktrees ?? {})) checkouts.add(sessionId)
    stateReady = true
  }).catch(() => {
    stateReady = true
  })

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
    let normalized = resolve(String(value ?? ''))
    try {
      normalized = realpathSync(normalized)
    } catch {
      // A path that no longer exists compares by its resolved spelling.
    }
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
        if (record?.kind === 'context') {
          // One PR per repository may now settle at a different time, but the
          // chat is archived only after all of them merged. At that point every
          // checkout can go; the context directory itself stays until the idle
          // cleanup pass reclaims it.
          const context = contextFromRecord(record)
          let removed = 0
          let branchDeleted = 0
          for (const repoId of Object.keys(context.repos)) {
            try {
              const result = await removeRepoCheckout({
                runner,
                context,
                repoId,
                deleteBranch: config.merged.deleteBranch === true,
                timeoutMs: config.worktreeTimeoutMs,
              })
              if (result.removed) removed += 1
              if (result.branchDeleted) branchDeleted += 1
            } catch (error) {
              logger.warn('git: cannot remove %s of %s: %s', repoId, sessionId, messageOf(error))
            }
          }
          await store.update((current) => {
            current.worktrees ??= {}
            current.worktrees[sessionId] = recordFromContext(context)
          })
          return { removed: removed > 0, branchDeleted: branchDeleted > 0 }
        }
        const target = typeof record?.path === 'string' ? record.path : ''
        if (target.length === 0) return { removed: false, branchDeleted: false }
        const repoRoot = typeof record.repositoryRoot === 'string' ? record.repositoryRoot : ''
        // A live Session must leave the checkout before the folder disappears:
        // an unarchived chat can resume in the project root instead of pointing
        // at a deleted directory.
        const live = liveSessionDirectory(ctx, sessionId)
        if (live !== undefined && isInside(target, live)) {
          const agent = agentFor(sessionId)
          const workingDirectory = ctx.get<{
            set(agent: { session?: SessionLike }, directory: string, signal?: AbortSignal): Promise<unknown>
          }>('workingDirectory')
          if (agent !== undefined && repoRoot.length > 0 && typeof workingDirectory?.set === 'function') {
            await workingDirectory.set(agent, repoRoot).catch(() => undefined)
          }
        }
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
        const registry = ctx.get<{
          archiveSession?(sessionId: string, options?: { stopActivity?: boolean }): Promise<unknown>
        }>('workspaceRegistry')
        if (typeof registry?.archiveSession !== 'function') return false
        // The change request merged, so the Session's work is finished: archive
        // it the way the UI's "stop and archive" action does. Without
        // `stopActivity` the registry refuses while a turn or a job runs, and the
        // merged chat stayed in the list forever.
        await registry.archiveSession(sessionId, { stopActivity: true })
        return true
      },
      /**
       * Whether the Session is standing inside the checkout right now.
       *
       * The live working directory is the only truthful source: a header cwd is
       * where the chat started, which for every worktree Session is the main
       * checkout. When no live directory answers, the Session is idle and
       * cleanup may proceed (the checkout match is checked separately).
       */
      isSessionActive(sessionId: string, record: unknown) {
        const live = liveSessionDirectory(ctx, sessionId)
        const target = typeof (record as { path?: unknown } | undefined)?.path === 'string'
          ? String((record as { path: string }).path)
          : ''
        return live !== undefined && target.length > 0 && isInside(target, live)
      },
    },
  })

  /**
   * The branch Git has checked out in one directory, or null when it cannot answer.
   *
   * A recorded checkout can be gone while a plain directory of the same name
   * sits inside the repository: Git then answers for the enclosing checkout.
   * Only a directory that is its own worktree root is read, so a stale record
   * is never "repaired" with the main checkout's branch.
   */
  async function checkedOutBranch(path: string): Promise<string | null> {
    const top = await runner.run('git', ['rev-parse', '--show-toplevel'], {
      cwd: path,
      maxBytes: 64 * 1024,
    }).catch(() => undefined)
    if (top === undefined || top.code !== 0) return null
    const root = String(top.stdout ?? '').trim()
    if (root.length === 0 || pathKey(root) !== pathKey(path)) return null
    const result = await runner.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: path,
      maxBytes: 64 * 1024,
    }).catch(() => undefined)
    if (result === undefined || result.code !== 0) return null
    const branch = String(result.stdout ?? '').trim()
    return branch.length === 0 || branch === 'HEAD' ? null : branch
  }

  /**
   * Recently merged change requests of one repository, with the remote that answers for it.
   * @param root repository root.
   */
  async function recentlyMergedPulls(root: string): Promise<Array<{
    number: number
    url: string
    branch: string
    base?: string
    remote?: unknown
  }>> {
    const read = await readOverview(runner, { root, config })
    const remote = read.repo.remote
    if (remote === null || remote === undefined) return []
    const answer = await forge.listPulls({
      root,
      remote: remote as unknown as ForgeRemote,
      state: 'merged',
      limit: RECONCILE_PULL_LIMIT,
      refresh: true,
    })
    const cutoff = Date.now() - RECONCILE_MERGE_AGE_MS
    return (answer.pulls ?? [])
      .filter((pull) => String(pull.state) === 'merged')
      .filter((pull) => pull.mergedAt !== null && Date.parse(String(pull.mergedAt)) >= cutoff)
      .map((pull) => ({ number: pull.number, url: pull.url, branch: pull.branch, base: pull.base, remote }))
  }

  /**
   * Settle merged work nobody is watching.
   *
   * Two things can leave a merged chat visible. A record can claim its Session
   * was archived while the registry's archive set lost it, which a settled
   * binding never notices; and a checkout can carry a merged change request
   * that was never bound because the panel never saw it or its branch was
   * renamed. Both are repaired from evidence the plugin already owns — the
   * durable archive set and the branch Git really has checked out.
   */
  async function reconcileMergedWork(): Promise<void> {
    if (config.merged.enabled !== true) return
    const registry = ctx.get<{
      archivedSessionIds?: readonly string[]
      archiveSession?(sessionId: string, options?: { stopActivity?: boolean }): Promise<unknown>
    }>('workspaceRegistry')
    const value = await state()
    // Only a composition that can both read the archive set and archive again
    // may repair it; an absent service must not look like an empty set.
    const archivedIds = registry?.archivedSessionIds
    if (archivedIds !== undefined && typeof registry?.archiveSession === 'function') {
      for (const sessionId of lostArchives(value.pulls, archivedIds, Date.now())) {
        try {
          await registry.archiveSession(sessionId, { stopActivity: true })
          logger.info('git: archived %s again: the archive set had lost it', sessionId)
        } catch (error) {
          logger.warn('git: cannot archive %s again: %s', sessionId, messageOf(error))
        }
      }
    }
    const bound = await reconcileCheckouts({
      store,
      logger,
      currentBranch: checkedOutBranch,
      mergedPulls: recentlyMergedPulls,
      track: (sessionId, record) => watcher.track(sessionId, record),
    })
    if (bound > 0) {
      logger.info('git: settling %d merged change request(s) found in recorded checkouts', bound)
      await watcher.runOnce()
    }
  }

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
   * Whether one Session already ran a turn.
   *
   * An automatic checkout belongs to a Session's first message: a chat that is
   * already under way must not be moved into a fresh checkout behind the
   * user's back. A Session that cannot answer the question counts as new,
   * which is what the New Session screen shows anyway.
   *
   * @param session the Session the message belongs to.
   */
  function hasStartedTurn(session: SessionLike | undefined): boolean {
    const reader = session?.snapshotEvents
    if (typeof reader !== 'function') return false
    try {
      return reader.call(session).some((event) => event?.type === 'turn/start')
    } catch {
      return false
    }
  }

  /**
   * Whether one Session is a subagent child rather than a chat the user opens.
   *
   * A child runs inside the checkout its parent already works in, so giving it
   * a checkout of its own would move it out from under the delegation.
   *
   * @param session the Session the message belongs to.
   */
  function isSubagentSession(session: SessionLike | undefined): boolean {
    const header = session?.header
    if (header?.origin === 'subagent') return true
    return typeof header?.delegationDepth === 'number' && header.delegationDepth > 0
  }

  /**
   * What the next message of one Session should do about its own checkout.
   *
   * Synchronous by contract: the caller must claim the Agent before the
   * delivery wakes it, so nothing here may wait for the disk or Git.
   *
   * @param sessionId owning Session.
   * @param session the Session, read to tell a new chat from one under way.
   * @returns `explicit` for a request the user made, `auto` for the configured
   *   default, or null when this message needs no checkout.
   */
  function worktreeIntent(sessionId: string, session: SessionLike | undefined): 'explicit' | 'auto' | null {
    if (config.worktree.enabled !== true) return null
    if (isSubagentSession(session)) return null
    if (creating.has(sessionId)) return null
    if (checkouts.has(sessionId)) return null
    const stored = stateReady ? store.state.worktrees?.[sessionId] : undefined
    if (stored !== undefined) {
      // A context record whose Session is not standing in it (an idle panel
      // click, or a resume that fell back to the workspace root) needs the
      // folder restored before the message runs.
      if (stored.kind === 'context') {
        const live = liveSessionDirectory(ctx, sessionId)
        if (live === undefined || !isPathInside(stored.path, live)) return 'auto'
      }
      return null
    }
    const request = requests.get(sessionId)
    // A recorded failure holds creation until the panel retries: a checkout
    // that cannot be made must not delay every message after it.
    if (request !== undefined && request.error !== null) return null
    if (request?.enabled === true) return 'explicit'
    if (request?.enabled === false) return null
    // A multi-repo workspace always begins with a context directory, even
    // when the single-repo auto-worktree default is off. The creation is a
    // mkdir, not a checkout, so it is cheap enough to do before the first step.
    const header = session?.header?.cwd
    const cached = typeof header === 'string' && header.length > 0
      ? repoSetCache.get(repoPathKey(header))
      : undefined
    const mode = cached?.set.manifest.checkout?.mode ?? config.checkout.mode
    if (mode !== 'off') {
      if (cached === undefined || cached.set.kind === 'multi') {
        return hasStartedTurn(session) ? null : 'auto'
      }
    }
    if (config.worktree.auto !== true) return null
    return hasStartedTurn(session) ? null : 'auto'
  }

  /**
   * Keep one Session's checkout request in memory and on disk.
   * @param sessionId owning Session.
   * @param request the request to keep, or null to forget it.
   */
  async function rememberRequest(sessionId: string, request: WorktreeRequest | null): Promise<void> {
    if (request === null) {
      requests.delete(sessionId)
      await store.update((current) => {
        if (current.worktreeRequests !== undefined) delete current.worktreeRequests[sessionId]
      }).catch(() => undefined)
      return
    }
    requests.set(sessionId, request)
    await store.update((current) => {
      current.worktreeRequests ??= {}
      current.worktreeRequests[sessionId] = request
    }).catch(() => undefined)
  }

  /**
   * Record why a checkout could not be made, so the panel can report it and the
   * next message is not delayed by the same attempt.
   * @param sessionId owning Session.
   * @param code the failure code.
   * @param reason the sentence to show.
   */
  async function failRequest(sessionId: string, code: string, reason: string): Promise<void> {
    const previous = requests.get(sessionId)
    const now = Date.now()
    await rememberRequest(sessionId, {
      enabled: previous?.enabled ?? true,
      base: previous?.base ?? '',
      source: previous?.source ?? config.worktree.source,
      explicit: previous?.explicit === true,
      error: `${code}: ${reason}`,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    })
  }

  /**
   * Whether one inserted message is a prompt the user sent, rather than a
   * notice another feature injected into the inbox.
   *
   * Only a prompt may bounce a Session into a new checkout: a notice that
   * arrives first is not a reason to move the chat.
   *
   * @param message the message that entered the inbox.
   */
  function isUserPrompt(message: unknown): boolean {
    const source = (message as { source?: { kind?: unknown } } | null | undefined)?.source
    // A producer that records no source is taken at face value.
    if (source === undefined || source === null) return true
    return source.kind === 'user'
  }

  /**
   * Hold one message's turn while its checkout is created, when this Session
   * wants one.
   *
   * The hold is maintenance of the Agent that starts while the message enters
   * the inbox, before the delivery wakes the Agent: the wake is latched and the
   * turn starts once the hold ends, so its first step already runs in the new
   * folder. A Session that already has a checkout, one with a recorded failure,
   * and a build without `runMaintenance` all simply get no hold.
   *
   * @param agent the live Agent.
   * @param sessionId owning Session.
   * @param message the user message that entered the inbox.
   * @returns whether the message's turn is held for a checkout.
   */
  function holdForWorktree(agent: MaintenanceAgent, sessionId: string, message: unknown): boolean {
    const intent = worktreeIntent(sessionId, agent.session)
    if (intent === null) return false
    // The configured default waits for the user's own prompt; a request the
    // user made explicitly is honored for whichever message arrives next.
    if (intent === 'auto' && !isUserPrompt(message)) return false
    if (typeof agent.runMaintenance !== 'function') return false
    let task: Promise<unknown>
    try {
      task = agent.runMaintenance(async (signal) => {
        // Leave the inbox mutation that announced the message before the hold
        // touches the Session.
        await Promise.resolve()
        await createCheckoutForMessage(agent, sessionId, message, signal)
      })
    } catch (error) {
      // A running turn or another maintenance task owns the Agent, so this
      // message takes its usual path.
      logger.info('git: no checkout is prepared for %s now: %s', sessionId, messageOf(error))
      return false
    }
    void task.catch((error: unknown) => {
      logger.warn('git: preparing the checkout for %s failed: %s', sessionId, messageOf(error))
    })
    return true
  }

  /**
   * Create the checkout one message waits for and move its Session into it.
   *
   * The checkout starts from the configured base after fetching it, so "the
   * latest main" means what the code host has rather than what this computer
   * last fetched. A failure is recorded instead of thrown: the message then
   * goes on in the project directory, and the panel offers a retry.
   *
   * @param agent the live Agent whose message waits.
   * @param sessionId owning Session.
   * @param message the user message that triggered the creation.
   * @param signal cancellation, which the Agent's own cancel also triggers.
   */
  async function createCheckoutForMessage(
    agent: MaintenanceAgent,
    sessionId: string,
    message: unknown,
    signal: AbortSignal,
  ): Promise<void> {
    const request = requests.get(sessionId)
    // An empty request base means "the configured base, else the default".
    const requestedBase = (request?.base ?? '').trim()
    const configuredBase = requestedBase.length > 0 ? requestedBase : config.worktree.base.trim()
    const configuredSource = request?.source ?? config.worktree.source

    const workingDirectory = ctx.get<{
      get(session: SessionLike): string | undefined
      set(agent: AgentLike, directory: string, signal?: AbortSignal): Promise<unknown>
    }>('workingDirectory')
    let directory: string | undefined
    try {
      directory = workingDirectory?.get(agent.session as SessionLike) ?? agent.session?.header?.cwd
    } catch {
      directory = agent.session?.header?.cwd
    }
    if (directory === undefined || directory.length === 0) {
      await rememberRequest(sessionId, null)
      return
    }

    // A chat that already has a context keeps it; a multi-repo workspace gets
    // an empty context now, and repositories appear only when they are edited.
    try {
      const existing = await contextFor(sessionId)
      if (existing !== undefined) {
        const folder = await stat(existing.context.path).catch(() => undefined)
        if (folder?.isDirectory() === true) {
          const live = liveSessionDirectory(ctx, sessionId)
          if (live === undefined || !isPathInside(existing.context.path, live)) {
            await setSessionDirectory(sessionId, existing.context.path, signal)
          }
          checkouts.add(sessionId)
          requests.delete(sessionId)
          return
        }
        // A recorded context whose folder disappeared is rebuilt from its
        // workspace; the chat resumes in a fresh empty context.
        const set = await repoSetFor(existing.context.workspaceRoot || directory, signal)
        const { context } = await ensureSessionContext(sessionId, set.workspaceRoot, signal)
        checkouts.add(sessionId)
        requests.delete(sessionId)
        logger.info('git: rebuilt the missing context %s for %s', context.path, sessionId)
        return
      }
      const set = await repoSetFor(directory, signal)
      const mode = request?.mode ?? checkoutModeFor(set)
      if (set.kind === 'multi' && mode !== 'off') {
        if (request?.enabled === false) {
          await rememberRequest(sessionId, null)
          return
        }
        const { context } = await ensureSessionContext(sessionId, set.workspaceRoot, signal)
        checkouts.add(sessionId)
        requests.delete(sessionId)
        logger.info('git: %s now works in context %s', sessionId, context.path)
        // `eager` is the opt-in shortcut for people who would rather pay for
        // every core checkout up front than on the first edit. A failed repo
        // is logged and skipped; the chat still starts.
        if (mode === 'eager') {
          for (const repo of set.repos.filter((entry) => entry.core)) {
            await materializeForSession(sessionId, repo, undefined, signal)
              .catch((error: unknown) => logger.warn('git: eager checkout of %s failed: %s', repo.id, messageOf(error)))
          }
        }
        return
      }
      if (set.kind === 'none') {
        await rememberRequest(sessionId, null)
        return
      }
    } catch (error) {
      if (signal.aborted) return
      logger.warn('git: cannot prepare a context for %s: %s', sessionId, messageOf(error))
      await failRequest(sessionId, error instanceof CommandError ? error.code : 'workspace/failed', messageOf(error))
      return
    }

    const root = await locateRepository(runner, directory, signal)
    if (root === null) {
      // Not a repository: this request did not belong to this plugin anyway.
      await rememberRequest(sessionId, null)
      return
    }
    const mainRoot = await mainWorktreeRoot(root, signal)
    if (isInside(poolDirectory(mainRoot, config.worktree), directory)) {
      // The Session already works in a checkout of this repository.
      await rememberRequest(sessionId, null)
      return
    }
    const kind = await readCheckoutKind(runner, { path: mainRoot, signal })
    if (kind.linked) {
      await failRequest(sessionId, 'worktree/linked-project', 'The project is itself a linked worktree')
      return
    }

    const remote = await preferredRemote(mainRoot, signal)
    const base = configuredBase.length > 0
      ? configuredBase
      : await resolveDefaultBase(runner, { root: mainRoot, remote, signal })
    if (base === null) {
      await failRequest(sessionId, 'worktree/no-base', 'Cannot determine the base branch for the worktree')
      return
    }
    // Without a remote there is nothing to fetch, and the base is local.
    const source = configuredSource === 'remote' && remote.length > 0 ? 'remote' : 'local'
    const name = generatedWorktreeName(sessionId, config.worktree.namePrefix)
    const startedAt = Date.now()
    const remoteLabel = source === 'remote' ? remote : null
    creating.set(sessionId, { phase: 'prepare', branch: name, base, remote: remoteLabel, source, startedAt })
    let created: Awaited<ReturnType<typeof createWorktree>> | undefined
    try {
      const checkout = await createWorktree(runner, {
        repoRoot: mainRoot,
        name,
        base,
        source,
        remote: source === 'remote' ? remote : '',
        config: config.worktree,
        timeoutMs: config.worktreeTimeoutMs,
        signal,
      })
      created = checkout
      creating.set(sessionId, { phase: 'enter', branch: name, base, remote: remoteLabel, source, startedAt })
      if (typeof workingDirectory?.set !== 'function') {
        throw new CommandError('worktree/no-working-directory', 'This build cannot change a Session folder')
      }
      await workingDirectory.set(agent, checkout.path, signal)
      if (signal.aborted) throw new CommandError('worktree/aborted', 'The checkout was abandoned')
      await store.update((current) => {
        current.worktrees ??= {}
        current.worktrees[sessionId] = {
          ...checkout,
          base,
          source,
          remote: source === 'remote' ? remote : null,
          sessionId,
          createdAt: Date.now(),
        }
        if (current.worktreeRequests !== undefined) delete current.worktreeRequests[sessionId]
      })
      checkouts.add(sessionId)
      requests.delete(sessionId)
      logger.info('git: %s now works in %s, created from %s', sessionId, created.branch, `${source}:${base}`)
    } catch (error) {
      // A checkout that never received the Session is not left behind.
      if (created !== undefined) {
        await removeWorktree(runner, {
          repoRoot: mainRoot,
          path: created.path,
          branch: created.branch,
          deleteBranch: true,
          timeoutMs: config.worktreeTimeoutMs,
        }).catch(() => undefined)
      }
      if (signal.aborted) return
      logger.warn('git: could not prepare a checkout for %s: %s', sessionId, messageOf(error))
      await failRequest(
        sessionId,
        error instanceof CommandError ? error.code : 'worktree/failed',
        messageOf(error),
      )
      return
    } finally {
      creating.delete(sessionId)
    }

    // The new branch may now be named after the task, exactly as a checkout
    // created from the option is.
    if (config.worktree.naming === 'semantic') {
      void nameWorktreeFromMessage(sessionId, message).catch(() => undefined)
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
      if (payload.featureBranch === true && !wantsCommit && !wantsPush) {
        throw new CommandError(
          'action/feature-branch',
          'A feature branch needs an action that commits or pushes.',
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
        let subject = message.split(/\r?\n/)[0] ?? ''
        if (wantsCommit && message.length === 0) {
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
          subject = message.split(/\r?\n/)[0] ?? ''
        } else if (!wantsCommit && subject.length === 0) {
          // A push-only action creates the branch so the commits already on the
          // base branch can be published for review; the newest subject names it.
          const head = await runner.run('git', ['log', '-1', '--format=%s'], { cwd: root, signal })
          subject = head.code === 0 ? String(head.stdout ?? '').trim() : ''
        }
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

    // The draft compares against the code host's base, so refresh that ref
    // first; a failed fetch keeps whatever this machine already has.
    await runner.run('git', ['fetch', '--quiet', remote.name, base], {
      cwd: root,
      signal,
      timeoutMs: config.commandTimeoutMs,
    }).catch(() => undefined)

    const facts = await readChangeRequestFacts(runner, {
      root,
      base,
      compareRef: await resolveDraftBase(runner, { root, base, remote: remote.name, signal }),
      config,
      signal,
    })
    if (facts.ahead === 0) {
      throw new CommandError('pr/no-commits', `Branch ${branch} has no commits over ${base}.`, { base })
    }
    // A title the caller already wrote wins: the dialog generated and let the
    // user edit it, and re-drafting would silently replace those edits.
    const providedTitle = typeof payload.title === 'string' ? payload.title.trim() : ''
    let title = providedTitle
    let body = typeof payload.body === 'string' ? payload.body : ''
    let draftInfo: { source: string; model: string | null; error: string | null }
    if (providedTitle.length > 0) {
      draftInfo = { source: 'manual', model: null, error: null }
    } else {
      onPhase?.('Generating pull request contentâ€¦')
      const draft = await draftChangeRequest({
        sessionId,
        payload,
        facts: { ...facts, branch, base },
        branch,
        base,
        signal,
      })
      title = draft.title
      body = draft.body
      draftInfo = { source: draft.source, model: draft.model, error: draft.error ?? null }
    }
    onPhase?.('Creating pull requestâ€¦')
    const created = await forge.createPull({
      root,
      remote,
      head: branch,
      base,
      title,
      body,
      signal,
    })
    // A multi-repo chat owns one binding per repository. The watcher archives
    // the chat only after every checked-out repository has merged, so tracking
    // all of them is safe; a PR whose repository cannot be identified is left
    // untracked rather than written into the single-repo slot.
    if (sessionId.length > 0 && created.number !== null) {
      const workspaceRoot = await workspaceRootFor(sessionId, undefined, signal).catch(() => '')
      const set = workspaceRoot.length > 0 ? await repoSetFor(workspaceRoot, signal).catch(() => undefined) : undefined
      const repoId = set?.kind === 'multi'
        ? set.repos.find((entry) => repoPathKey(entry.root) === repoPathKey(root))?.id
        : undefined
      if (set?.kind === 'multi' && repoId === undefined) {
        logger.warn('git: cannot bind change request %d: %s is not a repo of %s', created.number, root, workspaceRoot)
      } else {
        await watcher.track(sessionId, {
          root,
          remote,
          number: created.number,
          url: created.url,
          branch,
          base,
          ...(repoId === undefined ? {} : { repoId }),
        })
      }
    }
    return {
      status: 'created',
      ...(created.number === null ? {} : { number: created.number }),
      url: created.url,
      base,
      head: branch,
      title,
      body,
      draft: draftInfo,
    }
  }

  /* ---------------------------------------------------------------- */
  /* Routes                                                            */
  /* ---------------------------------------------------------------- */

  const handlers: HandlerMap = {
    /**
     * The workspace's repositories, their roles, and this chat's checkouts.
     *
     * This is the one route the panel calls before it picks a repository. It
     * never touches Git history: a repository that is not checked out costs
     * one directory probe, not a worktree.
     */
    async repos(payload, signal): Promise<WorkspaceReposResult> {
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const workspaceRoot = await workspaceRootFor(sessionId, payload.cwd, signal)
      const set = await repoSetFor(workspaceRoot, signal, payload.refresh === true)
      if (sessionId.length > 0 && set.kind === 'multi') sessionRepoSets.set(sessionId, set)
      const record = sessionId.length > 0 ? (await state()).worktrees?.[sessionId] : undefined
      const context = record?.kind === 'context' ? contextFromRecord(record) : undefined
      const repos = await buildRepoStates(set, context, false, sessionId)
      const folder = context === undefined ? undefined : await stat(context.path).catch(() => undefined)
      return {
        workspaceRoot,
        kind: set.kind,
        isolation: set.kind === 'multi' && config.worktree.enabled !== false && checkoutModeFor(set) !== 'off',
        context: context === undefined
          ? null
          : { path: context.path, name: context.name, createdAt: context.createdAt },
        contextMissing: context !== undefined && folder?.isDirectory() !== true,
        repos,
        warnings: set.warnings,
      }
    },

    /**
     * A cheap poll for repository states, including the ones an agent is
     * creating through `checkout_repo` while the panel is open.
     */
    async checkoutState(payload, signal): Promise<CheckoutStateResult> {
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const workspaceRoot = await workspaceRootFor(sessionId, payload.cwd, signal)
      const set = await repoSetFor(workspaceRoot, signal, payload.refresh === true)
      const context = (await contextFor(sessionId))?.context
      const states = await buildRepoStates(set, context, true, sessionId)
      const folder = context === undefined ? undefined : await stat(context.path).catch(() => undefined)
      return {
        workspaceRoot,
        contextMissing: context !== undefined && folder?.isDirectory() !== true,
        repos: states.map((repo) => ({
          repo: repo.id,
          state: repo.state === 'single' ? 'ready' : repo.state,
          error: repo.error ?? null,
        })),
      }
    },

    /** Recreate a context directory that disappeared from disk. */
    async contextRepair(payload, signal): Promise<WorkspaceReposResult> {
      const sessionId = requiredString(payload.sessionId, 'sessionId')
      const current = await contextFor(sessionId)
      if (current === undefined) throw new CommandError('context/none', 'This chat has no context directory to repair')
      const workspaceRoot = current.context.workspaceRoot || (await workspaceRootFor(sessionId, payload.cwd, signal))
      await ensureSessionContext(sessionId, workspaceRoot, signal)
      return await handlers.repos({ sessionId, cwd: workspaceRoot }, signal)
    },

    /**
     * The "All" tab's read-only change set: one group per repository.
     *
     * Only repositories with a live checkout are asked for Git facts; one
     * failing repository is reported in place and never hides the others.
     */
    async workspaceChanges(payload, signal): Promise<WorkspaceChangesResult> {
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const workspaceRoot = await workspaceRootFor(sessionId, payload.cwd, signal)
      const set = await repoSetFor(workspaceRoot, signal)
      const record = sessionId.length > 0 ? (await state()).worktrees?.[sessionId] : undefined
      const context = record?.kind === 'context' ? contextFromRecord(record) : undefined
      const states = await buildRepoStates(set, context, true, sessionId)
      // The cross-repo view reports uncommitted work today; a branch-scope
      // change set needs per-repo base refs and is deliberately not claimed.
      const scope: 'working' | 'branch' = 'working'
      const repos: WorkspaceChangeRepo[] = await Promise.all(set.repos.map(async (repo) => {
        const state = states.find((entry) => entry.id === repo.id)
        const root = state?.checkout?.path ?? repo.root
        const entry: WorkspaceChangeRepo = {
          id: repo.id,
          name: repo.name,
          role: repo.role,
          root,
          branch: state?.checkout?.branch ?? null,
          state: state?.state ?? 'not-checked-out',
          files: [],
          stats: { files: 0, additions: 0, deletions: 0 },
        }
        if (entry.state !== 'ready') return entry
        try {
          const read = await readOverview(runner, { root, config, signal })
          entry.files = read.files
          entry.branch = read.repo.branch
          entry.stats = {
            files: read.stats.files,
            additions: read.stats.additions,
            deletions: read.stats.deletions,
          }
        } catch (error) {
          entry.error = failureOf(error)
        }
        return entry
      }))
      return { workspaceRoot, scope, repos, warnings: set.warnings }
    },

    /**
     * Create one repository's checkout for this chat, on demand.
     *
     * The panel uses it when the user presses "create checkout"; the write
     * guard uses the same materializer so a model's first edit and a button
     * cannot produce two checkouts.
     */
    async checkoutRepo(payload, signal): Promise<{ repo: WorkspaceRepo }> {
      const sessionId = requiredString(payload.sessionId, 'sessionId')
      const workspaceRoot = await workspaceRootFor(sessionId, payload.cwd, signal)
      const set = await repoSetFor(workspaceRoot, signal)
      if (set.kind !== 'multi') {
        throw new CommandError('repo/not-multi', 'This workspace has only one repository, so it needs no context checkout')
      }
      if (config.worktree.enabled === false || checkoutModeFor(set) === 'off') {
        throw new CommandError('checkout/disabled', 'Lazy checkouts are disabled for this workspace')
      }
      const repo = repoOf(set, requiredString(payload.repo, 'repo'))
      if (repo === undefined) throw new CommandError('repo/unknown', `Unknown repository: ${payload.repo}`, { repo: payload.repo })
      await materializeForSession(sessionId, repo, typeof payload.base === 'string' ? payload.base : undefined, signal)
      const context = (await contextFor(sessionId))?.context
      const states = await buildRepoStates(set, context)
      const state = states.find((item) => item.id === repo.id)
      if (state === undefined) throw new CommandError('repo/unknown', `Unknown repository: ${repo.id}`, { repo: repo.id })
      return { repo: state }
    },

    /** Remove one repository's checkout, keeping the context directory. */
    async checkoutRemove(payload, signal): Promise<{ removed: boolean; branchDeleted: boolean }> {
      const sessionId = requiredString(payload.sessionId, 'sessionId')
      const context = (await contextFor(sessionId))?.context
      if (context === undefined) return { removed: false, branchDeleted: false }
      const set = await repoSetFor(context.workspaceRoot, signal)
      const repo = repoOf(set, requiredString(payload.repo, 'repo'))
      if (repo === undefined) throw new CommandError('repo/unknown', `Unknown repository: ${payload.repo}`, { repo: payload.repo })
      const result = await removeRepoCheckout({
        runner,
        context,
        repoId: repo.id,
        deleteBranch: payload.deleteBranch === true,
        force: payload.force === true,
        timeoutMs: config.worktreeTimeoutMs,
        signal,
      })
      await store.update((current) => {
        current.worktrees ??= {}
        current.worktrees[sessionId] = recordFromContext(context)
      })
      return result
    },

    /**
     * Remove every checkout this chat created and the context directory.
     *
     * A dirty repository refuses unless `force` is set, so a click cannot
     * discard uncommitted work. The Session is moved back to the workspace root
     * before its folder disappears.
     */
    async contextRemove(payload, signal): Promise<{ removed: number; branchDeleted: number }> {
      const sessionId = requiredString(payload.sessionId, 'sessionId')
      const current = await contextFor(sessionId)
      if (current === undefined) return { removed: 0, branchDeleted: 0 }
      const context = current.context
      let removed = 0
      let branchDeleted = 0
      for (const repoId of Object.keys(context.repos)) {
        const result = await removeRepoCheckout({
          runner,
          context,
          repoId,
          deleteBranch: payload.deleteBranch === true,
          force: payload.force === true,
          timeoutMs: config.worktreeTimeoutMs,
          signal,
        })
        if (result.removed) removed += 1
        if (result.branchDeleted) branchDeleted += 1
      }
      if (agentFor(sessionId) !== undefined) {
        await setSessionDirectory(sessionId, context.workspaceRoot, signal).catch(() => undefined)
      }
      await rm(context.path, { recursive: true, force: true }).catch(() => undefined)
      await store.update((value) => {
        if (value.worktrees !== undefined) delete value.worktrees[sessionId]
      })
      checkouts.delete(sessionId)
      clearCheckoutFailures(sessionId)
      sessionRepoSets.delete(sessionId)
      return { removed, branchDeleted }
    },

    /**
     * Everything the header and the changes view need.
     */
    async overview(payload, signal) {
      const { root, repo: selectedRepo } = await repository(payload, signal)
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const stored = sessionId.length > 0 ? (await state()).worktrees?.[sessionId] ?? null : null
      // A context record describes a directory of repositories, not one
      // checkout; the legacy repair and adoption rules below are for the latter.
      const legacy = stored?.kind === 'context' ? null : stored
      const repoCheckout = stored?.kind === 'context' && selectedRepo !== undefined
        ? stored.repos?.[selectedRepo.id]
        : undefined
      // For a multi-repo chat the ownership proof is the checkout of the
      // selected repo, not the context directory itself.
      const adoptionCheckout = legacy ?? (repoCheckout !== undefined
        ? { path: repoCheckout.path, repositoryRoot: repoCheckout.repositoryRoot, branch: repoCheckout.branch }
        : null)
      // A checkout from an older build may still track the base branch it
      // started from; repairing it here keeps "behind/diverged" honest without
      // a migration step.
      if (legacy !== null && typeof legacy.path === 'string' && pathKey(legacy.path) === pathKey(root)) {
        await repairInheritedBaseUpstream(runner, {
          path: root,
          branch: String(legacy.branch ?? ''),
          base: String(legacy.base ?? ''),
          source: legacy.source,
          signal,
        }).catch(() => null)
      }
      const read = await readOverview(runner, { root, config, signal })
      // A checkout whose branch was renamed in place keeps a stale record; the
      // panel must show and adopt by the branch Git really has.
      if (
        legacy !== null
        && typeof legacy.path === 'string'
        && pathKey(legacy.path) === pathKey(root)
        && read.repo.branch !== null
        && String(legacy.branch ?? '') !== read.repo.branch
      ) {
        const branch = read.repo.branch
        await store.update((current) => {
          const entry = current.worktrees?.[sessionId]
          if (entry !== undefined) entry.branch = branch
        })
        legacy.branch = branch
      }
      const value: GitOverview = {
        ...read,
        forge: await describeForge(read.repo.remote, root, signal),
        worktree: legacy,
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
          // Adopt a change request only when it is still open and belongs to the
          // Session's own checkout. A merged request found for the branch of the
          // main checkout must never mark this Session done and delete its work.
          if (
            sessionId.length > 0
            && typeof found.pull?.number === 'number'
            && mayAdoptBranchPull({
              pull: found.pull,
              root,
              branch: read.repo.branch,
              checkout: adoptionCheckout,
            })
          ) {
            await watcher.track(sessionId, {
              root,
              remote: read.repo.remote as unknown as ForgeRemote,
              number: found.pull.number,
              url: found.pull.url,
              branch: read.repo.branch,
              base: found.pull.base ?? '',
              ...(selectedRepo === undefined ? {} : { repoId: selectedRepo.id }),
            })
          }
        } catch (error) {
          value.branchPullError = failureOf(error)
        }
      }
      return value
    },

    /**
     * The counters the tab strip shows.
     *
     * Commits and checkouts are local and cheap; change requests and issues come
     * from one page of the code host, so an answer larger than the page says so
     * instead of pretending to be exact.
     */
    async counts(payload, signal): Promise<GitCounts> {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      const [revisionCount, worktrees] = await Promise.all([
        runner.run('git', ['rev-list', '--count', 'HEAD'], { cwd: root, signal }),
        readWorktrees(runner, { root, signal }).catch(() => []),
      ])
      const commits = revisionCount.code === 0 ? Number.parseInt(String(revisionCount.stdout ?? '').trim(), 10) || 0 : 0
      const value: GitCounts = {
        commits,
        worktrees: worktrees.length,
        pulls: null,
        issues: null,
        pullsCapped: false,
        issuesCapped: false,
      }
      if (context.remote === null) return value
      try {
        const [pulls, issues] = await Promise.all([
          forge.listPulls({
            root,
            remote: context.remote,
            state: 'open',
            limit: COUNT_PAGE,
            signal,
            refresh: payload.refresh === true,
          }),
          forge.listIssues({
            root,
            remote: context.remote,
            state: 'open',
            limit: COUNT_PAGE,
            signal,
            refresh: payload.refresh === true,
          }),
        ])
        value.pulls = pulls.pulls?.length ?? 0
        value.pullsCapped = value.pulls >= COUNT_PAGE
        value.issues = issues.issues?.length ?? 0
        value.issuesCapped = value.issues >= COUNT_PAGE
      } catch (error) {
        // A code host that cannot answer leaves the counters out; the tabs
        // themselves still work and show the reason.
        logger.info('git: the tab counters could not read the code host: %s', messageOf(error))
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
     * Draft a pull request's title and description without pushing or opening.
     *
     * The create dialog shows this draft for review; a title or body the caller
     * already wrote is returned untouched so regenerating never replaces edits.
     */
    async draftPull(payload: DraftPullRequest, signal): Promise<PullDraftResult> {
      const { root } = await repository(payload, signal)
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const context = await readContext(runner, { root, config, signal })
      if (context.branch === null) {
        throw new CommandError('pr/detached', 'A detached HEAD cannot draft a pull request.')
      }
      if (context.remote === null) {
        throw new CommandError('pr/no-remote', 'The repository has no remote, so it cannot draft a pull request.')
      }
      const requested = typeof payload.base === 'string' ? payload.base.trim() : ''
      const base = requested.length > 0
        ? requested
        : config.pull.base.length > 0
          ? config.pull.base
          : await forge.defaultBase({ root, remote: context.remote, signal })
      if (base === null || base.length === 0) {
        throw new CommandError('pr/no-base', 'Cannot determine the base branch for the change request.')
      }
      if (base === context.branch) {
        throw new CommandError('pr/same-branch', `Branch ${base} cannot be its own base branch.`)
      }
      const facts = await readChangeRequestFacts(runner, {
        root,
        base,
        compareRef: await resolveDraftBase(runner, { root, base, remote: context.remote.name, signal }),
        config,
        signal,
      })
      if (facts.ahead === 0) {
        throw new CommandError('pr/no-commits', `Branch ${context.branch} has no commits over ${base}.`, { base })
      }
      const providedTitle = typeof payload.title === 'string' ? payload.title.trim() : ''
      if (providedTitle.length > 0) {
        return {
          title: providedTitle,
          body: typeof payload.body === 'string' ? payload.body : '',
          source: 'manual' as const,
          model: null,
          error: null,
          base,
          head: context.branch,
          ahead: facts.ahead,
          commits: facts.commits.length,
          files: facts.files.length,
        }
      }
      const draft = await draftChangeRequest({
        sessionId,
        payload: payload as unknown as Record<string, unknown>,
        facts: { ...facts, branch: context.branch, base },
        branch: context.branch,
        base,
        signal,
      })
      return {
        title: draft.title,
        body: draft.body,
        source: draft.source === 'model' ? 'model' : 'commits',
        model: draft.model,
        error: draft.error ?? null,
        base,
        head: context.branch,
        ahead: facts.ahead,
        commits: facts.commits.length,
        files: facts.files.length,
      }
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
        body: pr.body ?? '',
        draft: pr.draft
          ?? (pr.status === 'opened_existing'
            ? { source: 'existing', model: null, error: null }
            : { source: 'model', model: null, error: null }),
        watched: sessionId.length > 0 && typeof pr.number === 'number',
      }
    },

    /**
     * Merge one change request with the strategy the detail pane asked for.
     *
     * The code host enforces its own rules; this route never forces a merge, so
     * a refusal surfaces as a `merge/*` code the pane can explain.
     */
    async mergePull(payload: MergePullRequest, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      if (context.remote === null) {
        throw new CommandError('pr/no-remote', 'The repository has no remote, so it cannot merge a pull request.')
      }
      const method: MergeMethod = payload.method === 'squash' || payload.method === 'rebase'
        ? payload.method
        : 'merge'
      return await forge.mergePull({
        root,
        remote: context.remote,
        number: requiredNumber(payload.number, 'number'),
        method,
        deleteBranch: payload.deleteBranch === true,
        signal,
      })
    },

    /** Publish the repository to a code host, so it gains its first remote. */
    async publish(payload: PublishRequest, signal) {      const { root } = await repository(payload, signal)
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
      const session = agentFor(sessionId)?.session
        ?? ctx.get<{ get(sessionId: string): SessionLike | undefined }>('sessions')?.get(sessionId)
      const base: WorktreeState = {
        enabled: config.worktree.enabled === true,
        supported: false,
        reason: null,
        sessionId,
        current: null,
        bases: null,
        project: null,
        auto: config.worktree.auto === true,
        request: sessionId.length > 0 ? requests.get(sessionId) ?? null : null,
        creating: sessionId.length > 0 ? creating.get(sessionId) ?? null : null,
        started: hasStartedTurn(session),
      }
      // A multi-repo workspace answers with the context state instead of a
      // single repository's base branches. Nothing is created here.
      try {
        const workspaceRoot = await workspaceRootFor(sessionId, payload.cwd, signal)
        const set = await repoSetFor(workspaceRoot, signal)
        if (set.kind === 'none') return { ...base, reason: 'not-a-repository' }
        if (set.kind === 'multi') {
          const record = sessionId.length > 0 ? (await state()).worktrees?.[sessionId] : undefined
          const context = record?.kind === 'context' ? contextFromRecord(record) : undefined
          const repos = await buildRepoStates(set, context, payload.lite === true)
          const effectiveMode = requests.get(sessionId)?.mode ?? checkoutModeFor(set)
          const enabled = config.worktree.enabled !== false && effectiveMode !== 'off'
          if (sessionId.length > 0) sessionRepoSets.set(sessionId, set)
          return {
            ...base,
            enabled,
            supported: enabled,
            checkoutMode: effectiveMode,
            reason: enabled ? null : 'disabled',
            kind: 'context',
            workspaceRoot,
            context: context === undefined
              ? null
              : { path: context.path, name: context.name, createdAt: context.createdAt },
            repos,
            project: { directory: workspaceRoot, linked: false },
            current: record ?? null,
            auto: enabled,
            bases: null,
          }
        }
      } catch {
        // Fall through to the single-repository path, whose error is precise.
      }
      let directory: string
      try {
        directory = await sessionCheckout(ctx, sessionId, payload.cwd)
      } catch {
        return { ...base, reason: 'no-directory' }
      }
      const root = await locateRepository(runner, directory, signal)
      if (root === null) return { ...base, reason: 'not-a-repository' }
      const mainRoot = await mainWorktreeRoot(root, signal)
      const value = await state()
      const current = sessionId.length > 0 ? value.worktrees?.[sessionId] ?? null : null

      // The status card polls this answer while a first message waits, so the
      // branch listing and the checkout kind are only read when they are asked
      // for: they cost several Git calls this caller has no use for.
      if (payload.lite === true) {
        return {
          ...base,
          supported: config.worktree.enabled === true,
          reason: config.worktree.enabled === true ? null : 'disabled',
          repositoryRoot: mainRoot,
          project: { directory, linked: false },
          current,
        }
      }

      const kind = await readCheckoutKind(runner, { path: mainRoot, signal })
      const remote = await preferredRemote(mainRoot, signal)
      const bases = await readBases(runner, { root: mainRoot, remote, signal })
      if (config.worktree.base.length > 0) bases.defaultBase = config.worktree.base
      if (payload.probe === true) {
        await store.update((stored) => {
          stored.probe = { at: Date.now(), sessionId, directory, root: mainRoot, supported: true }
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
        sourceDefault: resolveSourceDefault(config.worktree.source, bases),
        project: { directory, linked: kind.linked === true },
        bases,
        current,
      }
    },

    /**
     * Record what the next message of a Session should do about its own
     * checkout. Nothing is created here: the checkout is made when that message
     * arrives, so a chat that is never sent leaves nothing behind, and the
     * first step already runs in the new folder.
     */
    async worktreeRequest(payload) {
      const sessionId = requiredString(payload.sessionId, 'sessionId')
      const previous = requests.get(sessionId)
      const now = Date.now()
      const enabled = payload.enabled === true
      const base = typeof payload.base === 'string' ? payload.base.trim() : previous?.base ?? ''
      const source = payload.source === 'local' || payload.source === 'remote'
        ? payload.source
        : previous?.source ?? config.worktree.source
      const mode = payload.mode === 'lazy' || payload.mode === 'eager'
        ? payload.mode
        : previous?.mode
      if (creating.has(sessionId)) {
        throw new CommandError('worktree/busy', 'A checkout is already being created for this chat')
      }
      // The record is kept even for `enabled: false`: without one the next
      // message would simply take the configured default again.
      const request: WorktreeRequest = {
        enabled,
        base,
        source,
        mode,
        explicit: true,
        error: payload.retry === true ? null : previous?.error ?? null,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      }
      await rememberRequest(sessionId, request)
      return { request, auto: config.worktree.auto === true || config.checkout.mode !== 'off' }
    },

    /**
     * Every checkout of this repository, with the facts the manager needs:
     * which one the Session is in, which the plugin created, and whether it
     * holds uncommitted work.
     */
    async worktrees(payload, signal) {
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const { directory, root } = await repository(payload, signal)
      const currentPath = directory
      const [entries, value] = await Promise.all([
        readWorktrees(runner, { root, signal }),
        state(),
      ])
      const mainRoot = resolve(entries[0]?.path ?? root)
      // The Session header keeps the repository spelling the user opened; the
      // live folder is a worktree whose own root is not the main checkout.
      const headerRoot = sessionOf(sessionId)?.header?.cwd
      const projectRoot = typeof headerRoot === 'string' && headerRoot.length > 0
        && pathKey(headerRoot) === pathKey(mainRoot) ? headerRoot : mainRoot
      const records = new Map<string, WorktreeRecord>()
      for (const record of Object.values(value.worktrees ?? {})) {
        if (typeof record?.path === 'string') records.set(pathKey(record.path), record)
      }
      const pool = poolDirectory(mainRoot, config.worktree)
      const worktrees = await Promise.all(entries.map(async (entry) => {
        const record = records.get(pathKey(entry.path))
          ?? [...records.values()].find((candidate) => candidate.branch === entry.branch)
        // Keep the path the user opened for the main checkout; git reports its
        // canonical twin on macOS, which would make the row unmatchable.
        const entryPath = pathKey(entry.path) === pathKey(mainRoot) ? projectRoot : resolve(entry.path)
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
      return { root: projectRoot, poolDirectory: pool, currentPath, worktrees }
    },

    /**
     * Create one checkout from the manager, optionally moving the Session into
     * it. Unlike the New Session option this accepts a name and a base branch,
     * so a checkout can be prepared before a chat exists.
     */
    async worktreeAdd(payload, signal) {
      await rejectContextManagement(typeof payload.sessionId === 'string' ? payload.sessionId.trim() : '', 'This action')
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
      await rejectContextManagement(sessionId, 'Moving a chat to one checkout')
      const target = requiredString(payload.path, 'path')
      const { root } = await repository(payload, signal)
      const mainRoot = await mainWorktreeRoot(root, signal)
      const entries = await readWorktrees(runner, { root, signal })
      const match = entries.find((entry) => pathKey(entry.path) === pathKey(target))
      if (match === undefined) {
        throw new CommandError('worktree/unknown-path', 'That folder is not a worktree of this repository', { path: target })
      }
      if (match.bare) throw new CommandError('worktree/bare', 'A bare repository cannot hold a Session')
      const matchPath = pathKey(match.path) === pathKey(mainRoot) ? target : resolve(match.path)
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
      await rejectContextManagement(typeof payload.sessionId === 'string' ? payload.sessionId.trim() : '', 'Removing a checkout by path')
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
          // `repository()` follows the live cwd, so when the Session stands in
          // the checkout it answers with that checkout — not with the project.
          // Return to the Session's original folder (the spelling the caller
          // used), or to the main checkout when no recorded folder exists.
          const project = sessionOf(sessionId)?.header?.cwd
          const destination = project !== undefined && project.length > 0 && !isInside(match.path, project)
            ? project
            : mainRoot
          await setSessionDirectory(sessionId, destination, signal)
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
      await rejectContextManagement(sessionId, 'Creating a single checkout')
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
      if (record.kind === 'context') {
        throw new CommandError('worktree/context', 'This chat has several repository checkouts; remove one with checkoutRemove')
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
        const project = sessionOf(sessionId)?.header?.cwd
        await workingDirectory.set(agent, project !== undefined && project.length > 0 ? project : repoRoot, signal)
          .catch(() => undefined)
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
   * The checkout a Session's Git panel should read.
   *
   * A live Session answers through the working-directory service. An idle one
   * has no live service, and its header cwd is where the chat started — for a
   * moved Session that is the main checkout, not the worktree it works in. The
   * plugin's own record of the checkout is the next source, but only while the
   * directory is still a checkout; otherwise the caller's folder wins, so a
   * removed worktree never masquerades as the main repository.
   *
   * @param ctx plugin context.
   * @param sessionId owning Session, when the call names one.
   * @param fallbackCwd the folder the browser reported.
   */
  async function sessionCheckout(ctx: DshContext, sessionId: unknown, fallbackCwd: unknown): Promise<string> {
    const live = liveSessionDirectory(ctx, sessionId)
    if (live !== undefined) return live
    const id = typeof sessionId === 'string' ? sessionId.trim() : ''
    if (id.length > 0) {
      const value = await state()
      const record = value.worktrees?.[id]
      const path = typeof record?.path === 'string' ? record.path : ''
      if (path.length > 0) {
        if (record?.kind === 'context') {
          const directory = await stat(path).catch(() => undefined)
          if (directory?.isDirectory() === true) return path
        } else {
          const marker = await stat(join(path, '.git')).catch(() => undefined)
          if (marker !== undefined) return path
        }
      }
    }
    let payloadError: unknown
    try {
      return await directoryFromPayload(fallbackCwd)
    } catch (error) {
      payloadError = error
    }
    // The browser may not have sent a folder (a route called without one); the
    // Session's own start folder is the last answer this build has.
    const header = sessionDirectory(ctx, sessionId)
    if (header !== undefined) return header
    throw payloadError
  }

  /* ---------------------------------------------------------------- */
  /* Workspaces with more than one repository                          */
  /* ---------------------------------------------------------------- */

  /** Repositories per workspace, cached briefly so a panel poll is cheap. */
  const repoSetCache = new Map<string, { at: number; set: RepoSet }>()
  /** The workspace each live Session belongs to, for the prompt and the tool. */
  const sessionRepoSets = new Map<string, RepoSet>()
  /** One materialization per Session and repo, so two writes cannot race. */
  const materializing = new Map<string, Promise<RepoCheckout>>()
  /** The last failed materialization per Session and repo, for the panel. */
  const checkoutFailures = new Map<string, string>()
  const REPO_SET_TTL_MS = 30_000

  /** The shared key of the in-flight and failure maps. */
  function checkoutKey(sessionId: string, repoId: string): string {
    return `${sessionId}\u0000${repoId}`
  }

  /** Forget past checkout errors, for example after the context was rebuilt. */
  function clearCheckoutFailures(sessionId: string): void {
    const prefix = `${sessionId}\u0000`
    for (const key of checkoutFailures.keys()) {
      if (key.startsWith(prefix)) checkoutFailures.delete(key)
    }
  }

  /** The Session behind an id, live or persisted. */
  function sessionOf(sessionId: string): SessionLike | undefined {
    const agent = agentFor(sessionId)
    return agent?.session ?? ctx.get<{ get(sessionId: string): SessionLike | undefined }>('sessions')?.get(sessionId)
  }

  /** The workspace directory a Session belongs to. */
  async function workspaceRootFor(
    sessionId: string,
    cwd: unknown,
    signal?: AbortSignal,
  ): Promise<string> {
    if (sessionId.length > 0) {
      const session = sessionOf(sessionId)
      const header = session?.header?.cwd
      if (typeof header === 'string' && header.length > 0) {
        const context = await readContextManifest(header).catch(() => undefined)
        if (context !== undefined) return context.workspaceRoot
        return header
      }
      const live = liveSessionDirectory(ctx, sessionId)
      if (live !== undefined) {
        const context = await readContextManifest(live).catch(() => undefined)
        if (context !== undefined) return context.workspaceRoot
        return live
      }
      const record = (await state()).worktrees?.[sessionId]
      if (typeof record?.workspaceRoot === 'string' && record.workspaceRoot.length > 0) return record.workspaceRoot
    }
    if (typeof cwd === 'string' && cwd.trim().length > 0) {
      return await directoryFromPayload(cwd)
    }
    throw new CommandError('git/no-directory', 'Cannot determine the workspace folder for this Session')
  }

  /** Discover one workspace's repositories, reusing a short-lived answer. */
  async function repoSetFor(workspaceRoot: string, signal?: AbortSignal, refresh = false): Promise<RepoSet> {
    const directory = resolve(workspaceRoot)
    // Editing the manifest changes the repo set before the 30 s TTL ends, so
    // the manifest's own stamp is part of the key. "Quét lại" skips the cache.
    const manifest = await stat(join(directory, WORKSPACE_MANIFEST)).catch(() => undefined)
    const key = `${repoPathKey(directory)}\u0000${manifest?.mtimeMs ?? 0}\u0000${manifest?.size ?? 0}`
    const cached = repoSetCache.get(key)
    if (refresh !== true && cached !== undefined && Date.now() - cached.at < REPO_SET_TTL_MS) return cached.set
    const set = await resolveRepoSet(runner, directory, {
      scanDepth: config.workspace.scanDepth,
      signal,
    })
    repoSetCache.set(key, { at: Date.now(), set })
    return set
  }

  /** The effective checkout mode: a workspace manifest wins over the profile. */
  function checkoutModeFor(set: RepoSet): 'lazy' | 'eager' | 'off' {
    return set.manifest.checkout?.mode ?? config.checkout.mode
  }

  /** Turn the durable record of a context into the module's working shape. */
  function contextFromRecord(record: WorktreeRecord): ContextRecord {
    const repos: Record<string, RepoCheckout> = {}
    for (const [id, checkout] of Object.entries(record.repos ?? {})) {
      repos[id] = {
        id,
        path: checkout.path,
        repositoryRoot: checkout.repositoryRoot,
        branch: checkout.branch,
        base: checkout.base,
        source: checkout.source,
        remote: checkout.remote,
        start: checkout.start,
        materializedAt: checkout.materializedAt,
        warning: checkout.warning ?? null,
      }
    }
    return {
      kind: 'context',
      sessionId: record.sessionId,
      workspaceRoot: record.workspaceRoot ?? record.repositoryRoot,
      path: record.path,
      name: record.name,
      createdAt: record.createdAt,
      repos,
    }
  }

  /** Turn a working context into the durable record. */
  function recordFromContext(context: ContextRecord): WorktreeRecord {
    return {
      kind: 'context',
      path: context.path,
      branch: '',
      name: context.name,
      repositoryRoot: context.workspaceRoot,
      sessionId: context.sessionId,
      createdAt: context.createdAt,
      workspaceRoot: context.workspaceRoot,
      repos: { ...context.repos },
    }
  }

  /** This Session's context, from the store or from the directory manifest. */
  async function contextFor(sessionId: string): Promise<{ record: WorktreeRecord; context: ContextRecord } | undefined> {
    if (sessionId.length === 0) return undefined
    const record = (await state()).worktrees?.[sessionId]
    if (record?.kind === 'context' && typeof record.path === 'string') {
      return { record, context: contextFromRecord(record) }
    }
    const live = liveSessionDirectory(ctx, sessionId)
    if (live !== undefined) {
      const context = await readContextManifest(live).catch(() => undefined)
      if (context !== undefined) return { record: recordFromContext(context), context }
    }
    return undefined
  }

  /** Refuse the single-checkout manager routes for a chat that has a context. */
  async function rejectContextManagement(sessionId: string, action: string): Promise<void> {
    if (sessionId.length === 0) return
    const context = await contextFor(sessionId)
    if (context === undefined) return
    throw new CommandError(
      'worktree/context',
      `${action} is not available for a chat with several repository checkouts; use the repository chip instead`,
    )
  }

  /** Create this chat's empty context and make it the Session's folder. */
  async function ensureSessionContext(
    sessionId: string,
    workspaceRoot: string,
    signal?: AbortSignal,
  ): Promise<{ record: WorktreeRecord; context: ContextRecord }> {
    const existing = await contextFor(sessionId)
    const set = await repoSetFor(workspaceRoot, signal)
    if (existing !== undefined) {
      const folder = await stat(existing.context.path).catch(() => undefined)
      if (folder?.isDirectory() === true) {
        await writeContextInstructions(existing.context, set.repos).catch((error: unknown) => {
          logger.warn('git: cannot refresh the context instructions of %s: %s', sessionId, messageOf(error))
        })
        return existing
      }
      // The directory was deleted but the durable record survived. Recreate
      // the context from its recorded workspace instead of moving the Session
      // into a folder that no longer exists. Its old checkouts are gone too.
      logger.warn('git: context %s is gone; recreating it for %s', existing.context.path, sessionId)
      await store.update((current) => {
        if (current.worktrees !== undefined) delete current.worktrees[sessionId]
      }).catch(() => undefined)
      checkouts.delete(sessionId)
      clearCheckoutFailures(sessionId)
      const workspace = existing.context.workspaceRoot || workspaceRoot
      if (agentFor(sessionId) !== undefined) {
        await setSessionDirectory(sessionId, workspace, signal).catch(() => undefined)
      }
      return await ensureSessionContext(sessionId, workspace, signal)
    }
    const name = contextName(sessionId, config.worktree.namePrefix)
    const context = await ensureContext({
      workspaceRoot,
      sessionId,
      name,
      directory: config.worktree.directory,
    })
    const record = recordFromContext(context)
    // DSH loads AGENTS.md from the chat's cwd; the generated file tells the
    // model where each repository's own instructions live.
    await writeContextInstructions(context, set.repos).catch((error: unknown) => {
      logger.warn('git: cannot write the context instructions of %s: %s', sessionId, messageOf(error))
    })
    try {
      // A panel click can create the context while the chat is idle; no live
      // Agent means there is no folder to change yet, which is not a failure.
      if (agentFor(sessionId) !== undefined) await setSessionDirectory(sessionId, context.path, signal)
    } catch (error) {
      await rm(context.path, { recursive: true, force: true }).catch(() => undefined)
      throw error
    }
    await store.update((current) => {
      current.worktrees ??= {}
      current.worktrees[sessionId] = record
    })
    checkouts.add(sessionId)
    sessionRepoSets.set(sessionId, set)
    return { record, context }
  }

  /** The panel's per-repository view of one workspace. */
  async function buildRepoStates(
    set: RepoSet,
    context: ContextRecord | undefined,
    light = false,
    sessionId = '',
  ): Promise<WorkspaceRepo[]> {
    const isolated = set.kind === 'multi' && config.worktree.enabled !== false && checkoutModeFor(set) !== 'off'
    return await Promise.all(set.repos.map(async (repo) => {
      const checkout = context?.repos[repo.id]
      let state: WorkspaceRepo['state'] = 'not-checked-out'
      let error: string | null = null
      let info: WorkspaceRepo['checkout'] = null
      let changedFiles: number | null = null
      if (sessionId.length > 0 && materializing.has(checkoutKey(sessionId, repo.id))) {
        state = 'materializing'
      } else if (sessionId.length > 0 && checkoutFailures.has(checkoutKey(sessionId, repo.id))) {
        state = 'error'
        error = checkoutFailures.get(checkoutKey(sessionId, repo.id)) ?? null
      } else if (checkout !== undefined) {
        const exists = await stat(checkout.path).catch(() => undefined)
        if (exists?.isDirectory() === true) {
          state = 'ready'
          changedFiles = light ? null : await countChangedFiles(checkout.path)
          info = {
            path: checkout.path,
            branch: checkout.branch,
            base: checkout.base,
            source: checkout.source,
            remote: checkout.remote,
            start: checkout.start,
            changedFiles,
            warning: checkout.warning ?? null,
          }
        } else {
          state = 'missing'
        }
      } else if (set.kind === 'single' || !isolated) {
        // No isolation: the panel works on the repository's main checkout.
        state = 'ready'
        changedFiles = light ? null : await countChangedFiles(repo.root)
      }
      return {
        id: repo.id,
        name: repo.name,
        relativePath: repo.relativePath,
        role: repo.role,
        description: repo.description,
        root: repo.root,
        core: repo.core,
        available: repo.available,
        state,
        checkout: info,
        changedFiles,
        error,
      }
    }))
  }

  /** Materialize one repository for a Session, coalescing concurrent calls. */
  async function materializeForSession(
    sessionId: string,
    repo: WorkspaceRepoEntry,
    base: string | undefined,
    signal?: AbortSignal,
    ownerId: string = sessionId,
  ): Promise<RepoCheckout> {
    const key = checkoutKey(ownerId, repo.id)
    const running = materializing.get(key)
    if (running !== undefined) return await running
    const task = (async (): Promise<RepoCheckout> => {
      const workspaceRoot = await workspaceRootFor(ownerId, undefined, signal)
      const { context } = await ensureSessionContext(ownerId, workspaceRoot, signal)
      const set = await repoSetFor(context.workspaceRoot, signal)
      const result = await materializeRepo({
        runner,
        context,
        repo,
        set,
        config: {
          directory: config.worktree.directory,
          base: config.worktree.base,
          source: config.worktree.source,
          remote: config.worktree.remote,
          dirtyMain: config.checkout.dirtyMain,
          fetchOnCheckout: config.checkout.fetchOnCheckout,
        },
        timeoutMs: config.worktreeTimeoutMs,
        signal,
        base,
      })
      await store.update((current) => {
        current.worktrees ??= {}
        current.worktrees[ownerId] = recordFromContext(context)
      })
      sessionRepoSets.set(ownerId, set)
      checkoutFailures.delete(key)
      return result.checkout
    })()
    materializing.set(key, task)
    try {
      return await task
    } catch (error) {
      checkoutFailures.set(key, messageOf(error))
      throw error
    } finally {
      materializing.delete(key)
    }
  }

  /**
   * Resolve the repository a call addresses.
   *
   * A single-repo workspace keeps the original path: the folder resolved from
   * the Session, as it always was. A multi-repo workspace resolves the `repo`
   * id against the workspace's set, then answers with that repository's
   * checkout when the chat has one, its main checkout in direct mode, or a
   * `repo/not-checked-out` error the panel turns into a "create checkout" card.
   *
   * @param payload call arguments.
   * @param signal call cancellation.
   */
  async function repository(payload: GitTarget, signal?: AbortSignal): Promise<{ directory: string; root: string; repo?: WorkspaceRepoEntry }> {
    const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
    const workspaceRoot = await workspaceRootFor(sessionId, payload.cwd, signal)
    const set = await repoSetFor(workspaceRoot, signal)
    if (set.kind === 'single') {
      const directory = await sessionCheckout(ctx, sessionId, payload.cwd)
      const root = await locateRepository(runner, directory, signal)
      if (root === null) {
        throw new CommandError('git/not-a-repository', `The folder ${directory} is not inside a Git repository`, { cwd: directory })
      }
      return { directory, root }
    }
    if (set.kind === 'none') {
      throw new CommandError('git/not-a-repository', `The folder ${workspaceRoot} contains no Git repository`, { cwd: workspaceRoot })
    }
    const wanted = typeof payload.repo === 'string' ? payload.repo.trim() : ''
    const context = (await contextFor(sessionId))?.context
    const repo = wanted.length > 0
      ? repoOf(set, wanted)
      : (context !== undefined && Object.keys(context.repos).length === 1
          ? repoOf(set, Object.keys(context.repos)[0])
          : defaultRepo(set))
    if (repo === undefined) {
      throw new CommandError('repo/unknown', `Unknown repository: ${wanted || '(none)'}`, { repo: wanted })
    }
    if (context !== undefined) {
      const checkout = context.repos[repo.id]
      if (checkout === undefined) {
        throw new CommandError(
          'repo/not-checked-out',
          `${repo.name} is not checked out for this chat yet. Create its checkout first.`,
          { repo: repo.id },
        )
      }
      const exists = await stat(checkout.path).catch(() => undefined)
      if (exists?.isDirectory() !== true) {
        throw new CommandError('repo/missing', `The checkout of ${repo.name} is missing`, { repo: repo.id, path: checkout.path })
      }
      return { directory: checkout.path, root: checkout.path, repo }
    }
    return { directory: repo.root, root: repo.root, repo }
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

  /* ---------------------------------------------------------------- */
  /* Model surface: prompt, checkout tool, and the write guard         */
  /* ---------------------------------------------------------------- */

  /** The Session behind an opaque `fs/*-intent` actor. */
  function actorSession(actor: unknown): SessionLike | undefined {
    return (actor as { agent?: { session?: SessionLike } } | undefined)?.agent?.session
  }

  /** A model-readable denial that looks like a filesystem refusal. */
  function checkoutRedirect(message: string): Error {
    const error = new Error(message)
    ;(error as { code?: string }).code = 'FS_PERMISSION_DENIED'
    ;(error as { name?: string }).name = 'FsError'
    return error
  }

  /**
   * Refuse a write to a repository's main checkout while the chat is isolated.
   *
   * The first write to a repository creates its checkout and tells the model to
   * repeat the write inside it; later writes point at the existing checkout.
   * This is the only way to satisfy "only a repository that changes gets a
   * worktree": the change itself is the trigger.
   */
  async function guardMainCheckout(target: unknown, actor: unknown): Promise<void> {
    if (config.checkout.enforceIsolation !== true) return
    const fileSystem = ctx.get<FileSystemService>('fs')
    if (typeof fileSystem?.processPath !== 'function') return
    const session = actorSession(actor)
    const sessionId = typeof session?.id === 'string' ? session.id : ''
    if (sessionId.length === 0) return
    const current = await contextFor(sessionId)
    if (current === undefined) return
    const set = await repoSetFor(current.context.workspaceRoot)
    if (set.kind !== 'multi' || checkoutModeFor(set) === 'off') return
    let path: string
    try {
      path = fileSystem.processPath(target)
    } catch {
      return
    }
    path = await realpath(path).catch(() => path)
    // Writing the context manifest or a checkout is exactly what is allowed.
    if (isPathInside(current.context.path, path)) return
    for (const repo of set.repos) {
      if (!isPathInside(repo.root, path)) continue
      const suffix = relative(repo.root, path)
      const existing = current.context.repos[repo.id]
      if (existing !== undefined) {
        const targetPath = join(existing.path, suffix)
        throw checkoutRedirect(
          `${repo.name} is isolated at ${targetPath}. Write there instead of the repository's main checkout.`,
        )
      }
      const made = await materializeForSession(sessionId, repo, undefined, undefined, current.context.sessionId || sessionId)
      const warning = made.warning === null || made.warning === undefined ? '' : ` ${made.warning}`
      throw checkoutRedirect(
        `Created an isolated checkout for ${repo.name} at ${join(made.path, suffix)} (branch ${made.branch}). `
        + `Re-run this write at that path and re-read the file there; the main checkout is untouched.${warning}`,
      )
    }
  }

  // `fs/write-intent`, `fs/edit-intent`, and `fs/delete-intent` are the file
  // tools' pre-mutation waterfalls. A listener that rejects vetoes the call;
  // returning `next()` lets the filesystem's own guards decide.
  if (typeof ctx.on === 'function') {
    const listen = ctx.on as unknown as (
      event: string,
      listener: (target: unknown, actor: unknown, next: () => unknown) => unknown,
    ) => () => void
    for (const event of ['fs/write-intent', 'fs/edit-intent', 'fs/delete-intent']) {
      try {
        disposers.push(listen(event, (target, actor, next) => (
          guardMainCheckout(target, actor).then(() => next())
        )))
      } catch (error) {
        logger.warn('git: cannot install the %s guard: %s', event, messageOf(error))
      }
    }
  }

  /** The context record a Session or its inherited working directory names. */
  function contextRecordFor(session: SessionLike | undefined): WorktreeRecord | undefined {
    const sessionId = typeof session?.id === 'string' ? session.id : ''
    if (sessionId.length > 0) {
      const direct = store.state.worktrees?.[sessionId]
      if (direct?.kind === 'context') return direct
    }
    const cwd = session?.header?.cwd
    if (typeof cwd !== 'string' || cwd.length === 0) return undefined
    return Object.values(store.state.worktrees ?? {}).find(
      (record) => record?.kind === 'context' && pathKey(record.path) === pathKey(cwd),
    )
  }

  /** The workspace paragraph the model sees for an isolated chat. */
  function workspacePrompt(session: SessionLike | undefined): string {
    const record = contextRecordFor(session)
    if (record?.kind !== 'context') return ''
    const sessionId = record.sessionId
    const set = sessionRepoSets.get(sessionId)
      ?? (record.workspaceRoot !== undefined ? repoSetCache.get(repoPathKey(record.workspaceRoot))?.set : undefined)
    const context = contextFromRecord(record)
    const lines = [
      'This chat works in a multi-repository workspace.',
      `Workspace root: ${context.workspaceRoot}`,
      `Working directory: ${context.path} (an empty context directory; repositories appear here after checkout).`,
      'Repositories:',
    ]
    const repos = set?.repos ?? []
    if (repos.length === 0) {
      for (const [id, checkout] of Object.entries(context.repos)) {
        lines.push(`- ${id}: checked out at ${checkout.path} (branch ${checkout.branch})`)
      }
    } else {
      for (const repo of repos) {
        const checkout = context.repos[repo.id]
        lines.push(checkout === undefined
          ? `- ${repo.id} — ${repo.role} — ${repo.root} — not checked out`
          : `- ${repo.id} — ${repo.role} — ${repo.root} — checked out at ${checkout.path} (branch ${checkout.branch})`)
      }
    }
    lines.push(
      'To modify a repository, call checkout_repo({ repo }) first, then edit inside the returned checkout and',
      're-read files there; a checkout starts from the fetched base, not from uncommitted main-tree changes.',
      'Never edit a repository main checkout: the harness will redirect the write. Reading any repository is allowed.',
    )
    return lines.join('\n')
  }

  const promptService = ctx.get<SystemPromptService>('systemPrompt')
  if (typeof promptService?.context === 'function') {
    try {
      disposers.push(promptService.context({
        name: 'personal-hub:workspace',
        order: 1200,
        text: (context) => workspacePrompt(context.agent?.session),
      }))
    } catch (error) {
      logger.warn('git: cannot add the workspace prompt: %s', messageOf(error))
    }
  }

  const toolsService = ctx.get<ToolsService>('tools')
  if (typeof toolsService?.register === 'function') {
    const definition: ToolDefinitionLike = {
      name: 'checkout_repo',
      description: 'Create an isolated Git checkout for one repository of this multi-repository workspace so you can modify it. Call this before editing that repository; it returns the path to use. Reading does not require a checkout.',
      parameters: {
        repo: { type: 'string', required: true, description: 'Repository id from the workspace context.' },
        base: { type: 'string', description: 'Optional branch to start from; defaults to the repository default branch.' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['repo', 'path', 'relative', 'branch', 'base'],
          properties: {
            repo: { type: 'string' },
            path: { type: 'string' },
            relative: { type: 'string' },
            branch: { type: 'string' },
            base: { type: 'string' },
            dirty: { type: 'boolean' },
            warning: { type: 'string' },
          },
        },
        render: (_args, value) => [{
          type: 'text',
          text: `${String(value.repo ?? '')}: ${String(value.path ?? '')} (branch ${String(value.branch ?? '')} from ${String(value.base ?? '')})${value.warning === undefined ? '' : `
${String(value.warning)}`}\nThe checkout starts from the fetched base; re-read files from the path above before editing.`,
        }],
      },
      async execute(args, exec) {
        const repoId = typeof args.repo === 'string' ? args.repo.trim() : ''
        const session = exec.agent?.session
        const sessionId = typeof session?.id === 'string' ? session.id : ''
        if (sessionId.length === 0) throw new Error('checkout_repo requires an open Session')
        const owner = (await contextFor(sessionId))?.context.sessionId || sessionId
        const workspaceRoot = await workspaceRootFor(owner, undefined, exec.signal)
        const set = await repoSetFor(workspaceRoot, exec.signal)
        if (set.kind !== 'multi') throw new Error('This workspace has only one repository; it needs no context checkout')
        if (checkoutModeFor(set) === 'off') throw new Error('Lazy checkouts are disabled for this workspace')
        const repo = repoOf(set, repoId)
        if (repo === undefined) throw new Error(`Unknown repository: ${repoId}`)
        const checkout = await materializeForSession(
          owner,
          repo,
          typeof args.base === 'string' ? args.base : undefined,
          exec.signal,
        )
        const context = (await contextFor(owner))?.context
        const dirty = await runner.run('git', ['status', '--porcelain', '--untracked-files=no'], {
          cwd: repo.root,
          signal: exec.signal,
        }).then((result) => result.code === 0 && String(result.stdout ?? '').trim().length > 0).catch(() => false)
        return {
          repo: repo.id,
          path: checkout.path,
          relative: relative(context?.path ?? workspaceRoot, checkout.path).split('\\').join('/'),
          branch: checkout.branch,
          base: checkout.base,
          dirty,
          ...(checkout.warning === null || checkout.warning === undefined ? {} : { warning: checkout.warning }),
        }
      },
    }
    const multiSession = ({ agent }: { agent?: AgentLike }): boolean => {
      const sessionId = typeof agent?.session?.id === 'string' ? agent.session.id : ''
      if (sessionId.length === 0) return false
      if (store.state.worktrees?.[sessionId]?.kind === 'context') return true
      return sessionRepoSets.get(sessionId)?.kind === 'multi'
    }
    try {
      disposers.push(toolsService.register(definition, { when: multiSession }))
    } catch (error) {
      logger.warn('git: cannot register checkout_repo: %s', messageOf(error))
    }

    const listDefinition: ToolDefinitionLike = {
      name: 'workspace_repos',
      description: 'List the repositories in this multi-repository workspace, their roles and which ones this chat has checked out. Read-only; use checkout_repo before editing a repository.',
      parameters: {},
      output: {
        schema: {
          type: 'object',
          required: ['workspaceRoot', 'kind', 'repos'],
          properties: {
            workspaceRoot: { type: 'string' },
            kind: { type: 'string' },
            contextMissing: { type: 'boolean' },
            repos: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'name', 'state'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                  state: { type: 'string' },
                  root: { type: 'string' },
                  checkout: { type: 'object' },
                },
              },
            },
          },
        },
        render: (_args, value) => {
          const repos = Array.isArray(value.repos) ? value.repos : []
          return [{
            type: 'text',
            text: [
              `Workspace: ${String(value.workspaceRoot ?? '')} (${String(value.kind ?? '')})`,
              ...repos.map((item) => {
                const repo = item as Record<string, unknown>
                const checkout = repo.checkout as Record<string, unknown> | null | undefined
                return `- ${String(repo.id ?? '')} — ${String(repo.role ?? repo.name ?? '')} — ${String(repo.state ?? '')} — ${String(repo.root ?? '')}${checkout === null || checkout === undefined ? '' : ` [checkout: ${String(checkout.path ?? '')} (${String(checkout.branch ?? '')})]`}`
              }),
            ].join('\n'),
          }]
        },
      },
      async execute(_args, exec) {
        const sessionId = typeof exec.agent?.session?.id === 'string' ? exec.agent.session.id : ''
        if (sessionId.length === 0) throw new Error('workspace_repos requires an open Session')
        const owner = (await contextFor(sessionId))?.context.sessionId || sessionId
        const value = await handlers.repos({ sessionId: owner, cwd: sessionOf(owner)?.header?.cwd }, exec.signal)
        return { ...value }
      },
    }
    try {
      disposers.push(toolsService.register(listDefinition, { when: multiSession }))
    } catch (error) {
      logger.warn('git: cannot register workspace_repos: %s', messageOf(error))
    }
  }

  for (const endpoint of Object.keys(handlers)) {
    const route = {
      path: `${GIT_PATH_PREFIX}/${endpoint}`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request: Request) => {
        const payload = await readJsonPayload(request)
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

  // Settle what happened while nobody watched — a merged request that was never
  // bound, or an archive the registry's set lost — then keep checking, because a
  // request merged outside the panel writes no binding for the watcher to poll.
  const reconciling = (): void => {
    void reconcileMergedWork().catch((error) => {
      logger.warn('git: checkout reconciliation failed: %s', messageOf(error))
    })
  }
  reconciling()
  const reconcileTimer = setInterval(reconciling, RECONCILE_INTERVAL_MS)
  reconcileTimer.unref?.()

  // A user who unarchives a merged chat means it: clearing the record's flag
  // stops the next reconciliation from archiving the chat again.
  let stopUnarchive: (() => void) | undefined
  if (typeof ctx.on === 'function') {
    try {
      stopUnarchive = ctx.on('workspace/session-unarchiving' as never, ((request: { sessionId?: string }) => {
        const sessionId = String(request?.sessionId ?? '')
        if (sessionId.length === 0) return
        void store.update((current) => {
          const binding = current.pulls?.[sessionId]
          if (binding === undefined) return
          binding.archived = undefined
          binding.archiveError = undefined
          if (isPullSet(binding)) {
            // A multi-repo settlement lives at set level; leaving it set would
            // make `lostArchives` re-archive a chat the user just restored.
            binding.attempts = undefined
            binding.cleanedAt = undefined
            binding.deferred = undefined
            binding.checkedAt = Date.now()
            for (const repo of Object.values(binding.repos)) {
              repo.archived = undefined
              repo.archiveError = undefined
            }
          }
        }).catch(() => undefined)
      }) as never)
    } catch (error) {
      logger.warn('git: cannot watch session unarchive: %s', messageOf(error))
    }
  }

  // The first message both prepares the Session's checkout and lets its branch
  // be named after the task. The hold has to be claimed synchronously, so this
  // listener starts no work of its own before `holdForWorktree` decides.
  let stopWorktrees: (() => void) | undefined
  if (typeof ctx.on === 'function' && (config.worktree.enabled === true || config.worktree.naming === 'semantic')) {
    try {
      stopWorktrees = ctx.on('agent/inbox/inserted', (payload: never) => {
        const inserted = payload as { agent?: MaintenanceAgent; message?: unknown }
        const agent = inserted?.agent
        const sessionId = agent?.session?.id
        if (agent === undefined || typeof sessionId !== 'string' || sessionId.length === 0) return
        if (holdForWorktree(agent, sessionId, inserted.message)) return
        if (config.worktree.naming === 'semantic') {
          void nameWorktreeFromMessage(sessionId, inserted.message).catch(() => undefined)
        }
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
    clearInterval(reconcileTimer)
    if (typeof stopUnarchive === 'function') {
      try {
        stopUnarchive()
      } catch {
        // The event already detached.
      }
    }
    for (const progress of actions.values()) {
      try {
        progress.controller.abort()
      } catch {
        // The action already finished.
      }
    }
    actions.clear()
    if (typeof stopWorktrees === 'function') {
      try {
        stopWorktrees()
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
 * The effective directory a live Session answers with, if any.
 *
 * The header cwd is where the Session started; a worktree switch is a
 * `working-directory/change`, so the service is the only truthful source. An
 * idle Session has no live answer, and callers must not mistake its header for
 * the folder it is working in.
 *
 * @param ctx plugin context.
 * @param sessionId session identity from the browser.
 */
function liveSessionDirectory(ctx: DshContext, sessionId: unknown): string | undefined {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
  const agents = ctx.get<{ get(sessionId: string): { session?: SessionLike } | undefined }>('agents')
  const agent = typeof agents?.get === 'function' ? agents.get(sessionId) : undefined
  const sessions = ctx.get<{ get(sessionId: string): SessionLike | undefined }>('sessions')
  const session = agent?.session ?? (typeof sessions?.get === 'function' ? sessions.get(sessionId) : undefined)
  if (session === undefined) return undefined
  const workingDirectory = ctx.get<{ get(session: SessionLike): string | undefined }>('workingDirectory')
  if (typeof workingDirectory?.get !== 'function') return undefined
  try {
    const effective = workingDirectory.get(session)
    return typeof effective === 'string' && effective.length > 0 ? effective : undefined
  } catch {
    // A service that cannot answer is not a live answer.
    return undefined
  }
}

/**
 * The working directory a Session reports, which is the repository the panel
 * inspects: the live working directory first, then the recorded Session header.
 * @param ctx plugin context.
 * @param sessionId session identity from the browser.
 */
function sessionDirectory(ctx: DshContext, sessionId: unknown): string | undefined {
  const live = liveSessionDirectory(ctx, sessionId)
  if (live !== undefined) return live
  if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
  const agents = ctx.get<{ get(sessionId: string): { session?: SessionLike } | undefined }>('agents')
  const agent = typeof agents?.get === 'function' ? agents.get(sessionId) : undefined
  const sessions = ctx.get<{ get(sessionId: string): SessionLike | undefined }>('sessions')
  const session = agent?.session ?? (typeof sessions?.get === 'function' ? sessions.get(sessionId) : undefined)
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

