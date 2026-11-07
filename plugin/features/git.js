/**
 * Git panel: the Host half.
 *
 * One JSON channel on the Connection service serves the right-sidebar Git tab:
 * the working tree, one file's diff, one commit, the branch list, and the code
 * host's change requests and issues. Every answer is plain JSON, so the browser
 * renders the panel and this process owns the repository access.
 *
 * The channel is registered with `connection.rpc.handle()`, which enforces the
 * browser-trust fence and admits only the owner Peer, so a loopback page is the
 * only caller that can reach a repository on this computer.
 */
import { stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'

import { CommandError, createCommandRunner, locateRepository, readBranches, readCommit, readContext, readFilePatch, readLog, readOverview } from '../lib/git-run.js'
import { createForge } from '../lib/forge.js'

/** The Connection channel the browser calls: `/personal-hub-git/<action>`. */
export const GIT_CHANNEL = '/personal-hub-git'
/** Credential reference that may hold a GitHub token for the REST fallback. */
const GITHUB_CREDENTIAL_REF = 'DSH_GITHUB_TOKEN'

/**
 * Mount the git feature.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx Harness plugin context.
 * @param {Record<string, unknown>} config Normalized git configuration.
 * @param {{ logger: { info: Function, warn: Function, error: Function } }} deps
 * @returns {() => void} disposer that withdraws the channel
 */
export function mountGit(ctx, config, deps) {
  const logger = deps.logger
  const connection = ctx.get('connection')

  // The channel belongs to the Connection service, so it is registered on a
  // context that owns that service. A profile whose Connection loads after this
  // row still gets the panel: `ctx.inject` runs the mount when it arrives.
  if (connection !== undefined && typeof connection.rpc?.handle === 'function') {
    return mountChannel(ctx, connection, config, deps)
  }
  if (typeof ctx.inject !== 'function') {
    logger.info('git: the connection service is absent, so the git panel has no bridge in this composition')
    return () => {}
  }

  let channelDisposer
  let fiber
  try {
    fiber = ctx.inject(['connection'], (scoped) => {
      const scopedConnection = scoped.get('connection')
      if (scopedConnection === undefined || typeof scopedConnection.rpc?.handle !== 'function') return
      channelDisposer = mountChannel(scoped, scopedConnection, config, deps)
    })
  } catch (error) {
    logger.warn('git: cannot wait for the connection service: %s', messageOf(error))
    return () => {}
  }

  return () => {
    try {
      channelDisposer?.()
    } catch (error) {
      logger.warn('git: channel disposal failed: %s', messageOf(error))
    }
    channelDisposer = undefined
    try {
      fiber?.dispose?.()
    } catch {
      // The owning fiber is already gone when its parent disposes it.
    }
  }
}

/**
 * Register the RPC channel on one live Connection service.
 *
 * @param {Record<string, unknown>} ctx context that owns the channel registration.
 * @param {Record<string, unknown>} connection the Connection service.
 * @param {Record<string, unknown>} config normalized git configuration.
 * @param {{ logger: { info: Function, warn: Function, error: Function } }} deps
 * @returns {() => void} disposer that withdraws the channel
 */
function mountChannel(ctx, connection, config, deps) {
  const logger = deps.logger
  const runner = createCommandRunner({ ctx, logger, timeoutMs: config.commandTimeoutMs })
  const forge = createForge({
    runner,
    config,
    logger,
    resolveToken: () => storedToken(ctx),
  })

  logger.info('git: mounted over %s, code host %s', runner.backend, config.forge)

  const handlers = {
    /**
     * Everything the header and the changes view need.
     * @param {Record<string, unknown>} payload call arguments.
     * @param {AbortSignal} signal call cancellation.
     */
    async overview(payload, signal) {
      const { root } = await repository(payload, signal)
      const value = await readOverview(runner, { cwd: root, root, config, signal })
      value.forge = await describeForge(value.repo.remote, root, signal)
      if (value.forge.available === true && value.repo.branch !== null) {
        try {
          value.branchPull = (await forge.pullForBranch({
            root,
            remote: value.repo.remote,
            branch: value.repo.branch,
            signal,
          })).pull ?? null
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

  const dispose = connection.rpc.handle(GIT_CHANNEL, (endpoint, payload, signal) => dispatch(endpoint, payload, signal))
  logger.info('git: channel %s is open for this browser', GIT_CHANNEL)

  return () => {
    try {
      dispose()
    } catch (error) {
      logger.warn('git: channel disposal failed: %s', messageOf(error))
    }
  }
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
  const fromAgent = agent?.session?.header?.cwd
  if (typeof fromAgent === 'string' && fromAgent.length > 0) return fromAgent
  const sessions = ctx.get('sessions')
  const session = typeof sessions?.get === 'function' ? sessions.get(sessionId) : undefined
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
