/**
 * Git panel: the Host half.
 *
 * Exact Fetch routes on the Connection service serve the right-sidebar Git tab:
 * the working tree, one file's diff, one commit, the branch list, and the code
 * host's change requests and issues. Every answer is plain JSON, so the browser
 * renders the panel and this process owns the repository access.
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
import { stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'

import {
  CommandError,
  createCommandRunner,
  locateRepository,
  pushBranch,
  readBranches,
  readChangeRequestFacts,
  readCommit,
  readContext,
  readFilePatch,
  readLog,
  readOverview,
} from '../lib/git-run.js'
import { createForge } from '../lib/forge.js'
import { draftChangeRequest as draftModelChangeRequest, offlineDraft } from '../lib/pr-draft.js'
import { createMergeWatcher } from '../lib/merge-watch.js'
import { pluginDataDir } from '../lib/paths.js'
import { JsonStateStore } from '../lib/state-store.js'
import { createWorktreeCleanup } from '../lib/worktree-cleanup.js'
import { suggestBranchName } from '../lib/worktree-name.js'
import {
  createWorktree,
  generatedWorktreeName,
  isInside,
  poolDirectory,
  readBases,
  readCheckoutKind,
  removeWorktree,
  remoteNames,
  renameWorktreeBranch,
  resolveDefaultBase,
  uniqueBranchName,
} from '../lib/worktree.js'

/** The Connection shared-channel prefix the browser posts to. */
export const GIT_PATH_PREFIX = '/api/personal-hub-git'
/** Credential reference that may hold a GitHub token for the REST fallback. */
const GITHUB_CREDENTIAL_REF = 'DSH_GITHUB_TOKEN'

/**
 * Mount the git feature.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx Harness plugin context.
 * @param {Record<string, unknown>} config Normalized git configuration.
 * @param {{ logger: { info: Function, warn: Function, error: Function } }} deps
 * @returns {() => void} disposer that withdraws the routes
 */
export function mountGit(ctx, config, deps) {
  const logger = deps.logger
  const connection = ctx.get('connection')

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

  let routeDisposer
  let fiber
  try {
    fiber = ctx.inject(['connection'], (scoped) => {
      const scopedConnection = scoped.get('connection')
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
 * @param {Record<string, unknown>} ctx context that owns the route registrations.
 * @param {Record<string, unknown>} connection the Connection service.
 * @param {Record<string, unknown>} config normalized git configuration.
 * @param {{ logger: { info: Function, warn: Function, error: Function } }} deps
 * @returns {() => void} disposer that withdraws the routes
 */
function mountRoutes(ctx, connection, config, deps) {
  const logger = deps.logger
  const runner = createCommandRunner({ ctx, logger, timeoutMs: config.commandTimeoutMs })
  const forge = createForge({
    runner,
    config,
    logger,
    resolveToken: () => storedToken(ctx),
  })

  logger.info('git: mounted over %s, code host %s', runner.backend, config.forge)

  const store = new JsonStateStore(join(pluginDataDir('personal-hub'), 'git.json'), { worktrees: {}, pulls: {} })

  /** Read this plugin's durable git state, loading it once. */
  async function state() {
    await store.load()
    return store.state
  }

  /** The live Agent of one Session, when that Session is open. */
  function agentFor(sessionId) {
    if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
    const agents = ctx.get('agents')
    return typeof agents?.get === 'function' ? agents.get(sessionId) : undefined
  }

  /** The remote a worktree should fetch from: configured, else the panel's, else the first. */
  async function preferredRemote(root, signal) {
    const names = await remoteNames(runner, { root, signal })
    for (const candidate of [config.worktree.remote, config.remote, 'origin']) {
      const name = String(candidate ?? '').trim()
      if (name.length > 0 && names.includes(name)) return name
    }
    return names[0] ?? ''
  }

  const watcher = createMergeWatcher({
    config,
    logger,
    store,
    forge,
    runtime: {
      async removeSessionWorktree(record, sessionId) {
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
      async archiveSession(sessionId) {
        const registry = ctx.get('workspaceRegistry')
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
    store,
    runtime: {
      isSessionActive(sessionId, record) {
        const agent = agentFor(sessionId)
        if (agent === undefined) return false
        const session = agent.session
        const workingDirectory = ctx.get('workingDirectory')
        const directory = typeof workingDirectory?.get === 'function'
          ? workingDirectory.get(session)
          : session?.header?.cwd
        const target = typeof record?.path === 'string' ? record.path : ''
        return directory !== undefined && target.length > 0 && isInside(target, directory)
      },
    },
  })

  /** Sessions whose branch naming is already running, so one message names it once. */
  const naming = new Set()

  /**
   * Rename one checkout's branch from the task's first message.
   *
   * The checkout exists before any message does, so its branch starts as a
   * temporary `dsh-…` name. This reads the first message, asks the Session's
   * model for a `feat/…` name, and renames the branch in place; the directory
   * keeps its original name and a failure leaves the temporary name alone.
   *
   * @param {string} sessionId owning Session.
   * @param {unknown} message the user message that entered the inbox.
   */
  async function nameWorktreeFromMessage(sessionId, message) {
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
        llm: ctx.get('llm'),
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
   *
   * @param {{ sessionId: string, payload: Record<string, unknown>, facts: Record<string, unknown>, branch: string, base: string, signal?: AbortSignal }} options
   * @returns {Promise<{ title: string, body: string, source: string, model: string | null, error?: string }>}
   */
  async function draftChangeRequest({ sessionId, payload, facts, branch, base, signal }) {
    if (config.pull.enabled !== true) {
      return { ...offlineDraft({ branch, base, commits: facts.commits ?? [], files: facts.files ?? [] }), source: 'commits', model: null }
    }
    return await draftModelChangeRequest({
      llm: ctx.get('llm'),
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
   * @param {string} sessionId owning Session.
   * @returns {{ provider: string, model: string } | null}
   */
  function configuredRoute(sessionId) {
    if (config.pull.provider.length > 0 && config.pull.model.length > 0) {
      return { provider: config.pull.provider, model: config.pull.model }
    }
    const session = agentFor(sessionId)?.session
    const projections = ctx.get('sessionProjections')
    if (session !== undefined && typeof projections?.stateOf === 'function') {
      try {
        const value = projections.stateOf(session, 'modelSelection')
        const pick = value?.pending ?? value?.lastUsed ?? null
        if (typeof pick?.provider === 'string' && typeof pick?.model === 'string') {
          return { provider: pick.provider, model: pick.model }
        }
      } catch {
        // A composition without that projection falls back to the default route.
      }
    }
    const defaults = ctx.get('agentDefaultModel')
    if (typeof defaults?.currentSelection === 'function') {
      const pick = defaults.currentSelection()
      if (typeof pick?.provider === 'string' && typeof pick?.model === 'string') {
        return { provider: pick.provider, model: pick.model }
      }
    }
    return null
  }

  const handlers = {
    /**
     * Everything the header and the changes view need.
     * @param {Record<string, unknown>} payload call arguments.
     * @param {AbortSignal} signal call cancellation.
     */
    async overview(payload, signal) {
      const { root } = await repository(payload, signal)
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const value = await readOverview(runner, { cwd: root, root, config, signal })
      value.forge = await describeForge(value.repo.remote, root, signal)
      value.worktree = sessionId.length > 0 ? (await state()).worktrees?.[sessionId] ?? null : null
      if (value.forge.available === true && value.repo.branch !== null) {
        try {
          const found = await forge.pullForBranch({
            root,
            remote: value.repo.remote,
            branch: value.repo.branch,
            signal,
          })
          value.branchPull = found.pull ?? null
          if (sessionId.length > 0 && typeof found.pull?.number === 'number') {
            await watcher.track(sessionId, {
              root,
              remote: value.repo.remote,
              number: found.pull.number,
              url: found.pull.url,
              branch: value.repo.branch,
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

    /** The local branch list. */
    async branches(payload, signal) {
      const { root } = await repository(payload, signal)
      const limit = clampLimit(payload.limit, 30, 200)
      return { branches: await readBranches(runner, { root, limit, signal }) }
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
      const state = ['open', 'closed', 'merged', 'draft', 'all'].includes(payload.state) ? payload.state : 'open'
      const limit = clampLimit(payload.limit, config.pullLimit, 100)
      return await forge.listPulls({
        root,
        remote: context.remote,
        state,
        limit,
        signal,
        refresh: payload.refresh === true,
      })
    },

    /** One change request with checks, reviews, and comments. */
    async pull(payload, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      return await forge.pullDetail({
        root,
        remote: context.remote,
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
        remote: context.remote,
        branch: branch ?? '',
        signal,
        refresh: payload.refresh === true,
      })
    },

    /** Open or closed issues. */
    async issues(payload, signal) {
      const { root } = await repository(payload, signal)
      const context = await readContext(runner, { root, config, signal })
      const state = ['open', 'closed', 'all'].includes(payload.state) ? payload.state : 'open'
      const limit = clampLimit(payload.limit, config.issueLimit, 100)
      return await forge.listIssues({
        root,
        remote: context.remote,
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
        remote: context.remote,
        number: requiredNumber(payload.number, 'number'),
        signal,
        refresh: payload.refresh === true,
      })
    },

    /**
     * The New Session worktree option: the branches a checkout may start from,
     * and the checkout this Session already has.
     *
     * It answers "not supported" instead of failing, because the Hero renders
     * for every Session, including ones outside a repository.
     */
    async worktreeState(payload, signal) {
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const base = {
        enabled: config.worktree.enabled === true,
        supported: false,
        reason: null,
        sessionId,
        current: null,
        bases: null,
        project: null,
      }
      let directory
      try {
        directory = sessionDirectory(ctx, sessionId) ?? await directoryFromPayload(payload.cwd)
      } catch {
        return { ...base, reason: 'no-directory' }
      }
      const root = await locateRepository(runner, directory, signal)
      if (root === null) return { ...base, reason: 'not-a-repository' }

      const kind = await readCheckoutKind(runner, { path: root, signal })
      const remote = await preferredRemote(root, signal)
      const bases = await readBases(runner, { root, remote, signal })
      if (config.worktree.base.length > 0) bases.defaultBase = config.worktree.base
      const value = await state()
      if (payload.probe === true) {
        await store.update((current) => {
          current.probe = { at: Date.now(), sessionId, directory, root, supported: true }
        })
      }
      return {
        ...base,
        supported: config.worktree.enabled === true && kind.linked !== true,
        reason: config.worktree.enabled === true
          ? kind.linked === true ? 'linked-project' : null
          : 'disabled',
        repositoryRoot: root,
        remote,
        sourceDefault: config.worktree.source,
        project: { directory, linked: kind.linked === true },
        bases,
        current: sessionId.length > 0 ? value.worktrees?.[sessionId] ?? null : null,
      }
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
      if (config.worktree.enabled !== true) {
        throw new CommandError('worktree/disabled', 'Tính năng worktree đang tắt trong cấu hình')
      }
      const agent = agentFor(sessionId)
      if (agent === undefined) {
        throw new CommandError('worktree/no-agent', 'Phiên này chưa mở nên chưa đổi được thư mục làm việc')
      }
      const workingDirectory = ctx.get('workingDirectory')
      if (typeof workingDirectory?.set !== 'function') {
        throw new CommandError('worktree/no-working-directory', 'Bản cài này không cho đổi thư mục làm việc của phiên')
      }
      if (isInside(poolDirectory(root, config.worktree), directory)) {
        throw new CommandError('worktree/already', 'Phiên này đang ở trong một worktree của kho mã', { directory })
      }
      const value = await state()
      const previous = value.worktrees?.[sessionId]
      if (previous !== undefined) {
        throw new CommandError('worktree/already', `Phiên này đã có worktree ${String(previous.branch)}`, { path: previous.path })
      }
      const kind = await readCheckoutKind(runner, { path: root, signal })
      if (kind.linked) {
        throw new CommandError('worktree/linked-project', 'Kho mã đang mở chính là một worktree liên kết nên chưa tạo thêm được', { root })
      }

      const remote = await preferredRemote(root, signal)
      const requested = typeof payload.base === 'string' ? payload.base.trim() : ''
      const base = requested.length > 0
        ? requested
        : config.worktree.base.length > 0
          ? config.worktree.base
          : await resolveDefaultBase(runner, { root, remote, signal })
      if (base === null) throw new CommandError('worktree/no-base', 'Không xác định được nhánh nền cho worktree')
      const source = payload.source === 'remote' ? 'remote' : 'local'
      const name = generatedWorktreeName(sessionId, config.worktree.namePrefix)

      const created = await createWorktree(runner, {
        repoRoot: root,
        name,
        base,
        source,
        remote: source === 'remote' ? remote : '',
        config: config.worktree,
        timeoutMs: config.worktreeTimeoutMs,
        signal,
      })
      const record = { ...created, remote: source === 'remote' ? remote : null, sessionId, createdAt: Date.now() }
      try {
        await workingDirectory.set(agent, created.path, signal)
      } catch (error) {
        await removeWorktree(runner, {
          repoRoot: root,
          path: created.path,
          branch: created.branch,
          deleteBranch: true,
          timeoutMs: config.worktreeTimeoutMs,
        }).catch(() => undefined)
        throw error instanceof CommandError
          ? error
          : new CommandError('worktree/failed', `Không chuyển được phiên sang worktree: ${messageOf(error)}`)
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
        throw new CommandError('worktree/unknown', 'Phiên này chưa có worktree nào do plugin tạo')
      }
      const repoRoot = String(record.repositoryRoot ?? record.root ?? '')
      const result = await removeWorktree(runner, {
        repoRoot,
        path: String(record.path ?? ''),
        branch: record.branch,
        deleteBranch: payload.deleteBranch === true,
        timeoutMs: config.worktreeTimeoutMs,
        signal,
      })
      const agent = agentFor(sessionId)
      const workingDirectory = ctx.get('workingDirectory')
      if (agent !== undefined && repoRoot.length > 0 && typeof workingDirectory?.set === 'function') {
        await workingDirectory.set(agent, repoRoot, signal).catch(() => undefined)
      }
      await store.update((current) => {
        current.worktrees ??= {}
        delete current.worktrees[sessionId]
      })
      return { removed: result.removed, branchDeleted: result.branchDeleted, directory: repoRoot }
    },

    /**
     * Create a change request for the checked-out branch: push it, draft the
     * title and description with the Session's model, then open it on the code
     * host and bind it to the Session for merge tracking.
     */
    async createPull(payload, signal) {
      const { root } = await repository(payload, signal)
      const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
      const context = await readContext(runner, { root, config, signal })
      if (context.branch === null) {
        throw new CommandError('pr/detached', 'Đang ở HEAD rời nên không tạo được pull request')
      }
      if (context.remote === null) {
        throw new CommandError('pr/no-remote', 'Kho mã chưa có remote nên không tạo được pull request')
      }
      const forgeInfo = await forge.describe({ root, remote: context.remote, signal })
      if (forgeInfo.available !== true) {
        throw new CommandError('pr/forge-unavailable', forgeInfo.reason ?? 'Máy chủ mã nguồn chưa dùng được')
      }
      const requested = typeof payload.base === 'string' ? payload.base.trim() : ''
      const base = requested.length > 0
        ? requested
        : config.pull.base.length > 0
          ? config.pull.base
          : await forge.defaultBase({ root, remote: context.remote, signal })
      if (base === null || base.length === 0) {
        throw new CommandError('pr/no-base', 'Không xác định được nhánh nền cho pull request')
      }
      if (base === context.branch) {
        throw new CommandError('pr/same-branch', `Nhánh ${base} không thể là nhánh nền của chính nó`)
      }

      const facts = await readChangeRequestFacts(runner, { root, base, config, signal })
      if (facts.ahead === 0) {
        throw new CommandError('pr/no-commits', `Nhánh ${context.branch} chưa có commit nào mới so với ${base}`, { base })
      }
      if (config.pull.push === true) {
        await pushBranch(runner, {
          root,
          remote: context.remote.name,
          branch: context.branch,
          timeoutMs: config.worktreeTimeoutMs,
          signal,
        })
      }
      const draft = await draftChangeRequest({ sessionId, payload, facts, branch: context.branch, base, signal })
      const created = await forge.createPull({
        root,
        remote: context.remote,
        head: context.branch,
        base,
        title: draft.title,
        body: draft.body,
        signal,
      })
      if (sessionId.length > 0 && created.number !== null) {
        await watcher.track(sessionId, {
          root,
          remote: context.remote,
          number: created.number,
          url: created.url,
          branch: context.branch,
          base,
        })
      }
      return {
        pull: created,
        title: draft.title,
        body: draft.body,
        draft: { source: draft.source, model: draft.model, error: draft.error ?? null },
        watched: sessionId.length > 0 && created.number !== null,
      }
    },

    /** The merge-cleanup settings this composition runs with. */
    async mergeSettings() {
      const value = await state()
      return {
        ...config.merged,
        cleanup: config.worktree.cleanup,
        cleanupLast: value.cleanup ?? null,
        writable: typeof ctx.get('configEditor')?.edit === 'function',
      }
    },

    /**
     * Persist one merge-cleanup change into the profile's plugin row.
     *
     * The profile patch is written through the configuration editor, so the
     * change survives a restart and applies through the normal Loader path.
     */
    async mergeSettingsSet(payload) {
      const editor = ctx.get('configEditor')
      if (editor === undefined || typeof editor.edit !== 'function' || typeof editor.entries !== 'function') {
        throw new CommandError('config/unavailable', 'Bản cài này không cho sửa cấu hình từ giao diện')
      }
      const entry = editor.entries().find((item) => item?.options?.name === '@local/personal-hub')
      if (entry === undefined) {
        throw new CommandError('config/unknown-entry', 'Không tìm thấy dòng cấu hình của plugin trong hồ sơ này')
      }
      const next = {
        ...config.merged,
        ...(typeof payload.enabled === 'boolean' ? { enabled: payload.enabled } : {}),
        ...(typeof payload.removeWorktree === 'boolean' ? { removeWorktree: payload.removeWorktree } : {}),
        ...(typeof payload.deleteBranch === 'boolean' ? { deleteBranch: payload.deleteBranch } : {}),
        ...(typeof payload.archiveSession === 'boolean' ? { archiveSession: payload.archiveSession } : {}),
      }
      delete next.writable
      const requestedCleanup = payload.cleanup !== null && typeof payload.cleanup === 'object' ? payload.cleanup : {}
      const nextCleanup = {
        ...config.worktree.cleanup,
        ...(typeof requestedCleanup.enabled === 'boolean' ? { enabled: requestedCleanup.enabled } : {}),
        ...(typeof requestedCleanup.whenNoCommits === 'boolean' ? { whenNoCommits: requestedCleanup.whenNoCommits } : {}),
        ...(typeof requestedCleanup.deleteBranch === 'boolean' ? { deleteBranch: requestedCleanup.deleteBranch } : {}),
        ...(Number.isFinite(Number(requestedCleanup.inactiveDays)) ? { inactiveDays: Number(requestedCleanup.inactiveDays) } : {}),
        ...(['tracked', 'any', 'none'].includes(String(requestedCleanup.keepChanges))
          ? { keepChanges: String(requestedCleanup.keepChanges) }
          : {}),
      }
      await editor.edit(entry, (current) => {
        const row = current !== null && typeof current === 'object' ? current : {}
        const git = row.git !== null && typeof row.git === 'object' ? row.git : {}
        const worktree = git.worktree !== null && typeof git.worktree === 'object' ? git.worktree : {}
        return {
          ...row,
          git: {
            ...git,
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
      return { merged: next, cleanup: nextCleanup }
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
   * @param {string} endpoint action name.
   * @param {unknown} payload call arguments.
   * @param {AbortSignal} signal call cancellation.
   * @returns {Promise<Record<string, unknown>>}
   */
  async function dispatch(endpoint, payload, signal) {
    const handler = handlers[endpoint]
    if (typeof handler !== 'function') {
      return failure('input/unknown-endpoint', `Không rõ thao tác "${String(endpoint)}"`)
    }
    try {
      return { ok: true, value: await handler(payload !== null && typeof payload === 'object' ? payload : {}, signal) }
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
   * @param {Record<string, unknown>} payload call arguments.
   * @param {AbortSignal} [signal] call cancellation.
   */
  async function repository(payload, signal) {
    const directory = sessionDirectory(ctx, payload.sessionId) ?? await directoryFromPayload(payload.cwd)
    const root = await locateRepository(runner, directory, signal)
    if (root === null) {
      throw new CommandError('git/not-a-repository', `Thư mục ${directory} không nằm trong kho git nào`, { cwd: directory })
    }
    return { directory, root }
  }

  /**
   * Ask the code host what it can offer, never failing the whole overview.
   * @param {Record<string, unknown> | null} remote chosen remote.
   * @param {string} root repository root.
   * @param {AbortSignal} [signal] cancellation.
   */
  async function describeForge(remote, root, signal) {
    try {
      return await forge.describe({ root, remote, signal })
    } catch (error) {
      return { provider: remote?.provider ?? 'none', available: false, backend: null, reason: messageOf(error) }
    }
  }

  const disposers = []
  for (const endpoint of Object.keys(handlers)) {
    const route = {
      path: `${GIT_PATH_PREFIX}/${endpoint}`,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const payload = await readPayload(request)
        if (payload === undefined) {
          return jsonResponse({ ok: false, error: { code: 'input/invalid', message: 'Yêu cầu không phải JSON hợp lệ' } })
        }
        return jsonResponse(await dispatch(endpoint, payload, request.signal))
      },
    }
    try {
      disposers.push(connection.fetch.register(route))
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
  let stopNaming
  if (typeof ctx.on === 'function' && config.worktree.naming === 'semantic') {
    try {
      stopNaming = ctx.on('agent/inbox/inserted', (payload) => {
        const sessionId = payload?.agent?.session?.id
        if (typeof sessionId !== 'string' || sessionId.length === 0) return
        void nameWorktreeFromMessage(sessionId, payload.message).catch(() => undefined)
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

/**
 * Read one route's JSON request payload.
 * @param {Request} request the Fetch request the shared channel admitted.
 * @returns {Promise<Record<string, unknown> | undefined>} the payload, or undefined when the body is not JSON.
 */
async function readPayload(request) {
  let text
  try {
    text = await request.text()
  } catch {
    return undefined
  }
  if (text.trim().length === 0) return {}
  try {
    const parsed = JSON.parse(text)
    return parsed !== null && typeof parsed === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * Answer one route call as JSON the browser reads directly.
 * @param {Record<string, unknown>} body response envelope.
 * @returns {Response}
 */
function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/**
 * The working directory a Session reports, which is the repository the panel
 * inspects: an attached Agent's Session header first, then the Session store.
 * @param {Record<string, unknown>} ctx plugin context.
 * @param {unknown} sessionId session identity from the browser.
 * @returns {string | undefined}
 */
function sessionDirectory(ctx, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
  const agents = ctx.get('agents')
  const agent = typeof agents?.get === 'function' ? agents.get(sessionId) : undefined
  const sessions = ctx.get('sessions')
  const session = agent?.session ?? (typeof sessions?.get === 'function' ? sessions.get(sessionId) : undefined)

  // The header cwd is where the Session started; a worktree switch is a
  // `working-directory/change`, so the service is the only truthful source.
  const workingDirectory = ctx.get('workingDirectory')
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
 * @param {unknown} value absolute directory.
 * @returns {Promise<string>}
 */
async function directoryFromPayload(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CommandError('git/no-directory', 'Không xác định được thư mục làm việc của phiên này')
  }
  const directory = value.trim()
  if (!isAbsolute(directory)) {
    throw new CommandError('input/invalid', 'Thư mục phải là đường dẫn tuyệt đối', { cwd: directory })
  }
  try {
    const info = await stat(directory)
    if (!info.isDirectory()) throw new CommandError('git/no-directory', `${directory} không phải là thư mục`, { cwd: directory })
  } catch (error) {
    if (error instanceof CommandError) throw error
    throw new CommandError('git/no-directory', `Không mở được thư mục ${directory}`, { cwd: directory })
  }
  return directory
}

/**
 * Read a GitHub token a user stored in the credential store.
 * @param {Record<string, unknown>} ctx plugin context.
 * @returns {Promise<string | undefined>}
 */
async function storedToken(ctx) {
  const credentials = ctx.get('credentials')
  if (credentials === undefined || typeof credentials.resolve !== 'function') return undefined
  const hit = await credentials.resolve(GITHUB_CREDENTIAL_REF)
  return typeof hit?.value === 'string' ? hit.value : undefined
}

/** Require one string argument. */
function requiredString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CommandError('input/invalid', `Thiếu tham số ${name}`)
  }
  return value.trim()
}

/** Require one positive integer argument. */
function requiredNumber(value, name) {
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new CommandError('input/invalid', `Tham số ${name} không hợp lệ`)
  }
  return Math.round(numeric)
}

/** Clamp a caller-supplied limit against the configured and hard limits. */
function clampLimit(value, configured, hard) {
  const fallback = Number(configured) || 20
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.min(hard, Math.round(numeric))
}

/** The Remote failure envelope. */
function failure(code, message, details) {
  return { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } }
}

/** A failure record for a nested call whose own failure must not end the answer. */
function failureOf(error) {
  return error instanceof CommandError
    ? { code: error.code, message: error.message }
    : { code: 'system/failed', message: messageOf(error) }
}

/** Message of an unknown thrown value. */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Read the text of one user message, ignoring its images and references.
 * @param {unknown} message a Session user message.
 * @returns {string} the joined text, trimmed.
 */
function textOfUserMessage(message) {
  const content = message?.content
  if (!Array.isArray(content)) return ''
  return content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join(' ')
    .trim()
}
