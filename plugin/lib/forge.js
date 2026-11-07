/**
 * Code-host access for the git panel.
 *
 * The provider CLI (`gh`, or `glab` for GitLab) is preferred: it carries the
 * user's own sign-in, reports check runs and review decisions in one call, and
 * needs no token of its own. When no CLI answers and the remote is GitHub, the
 * public REST API is used instead, so the panel still lists change requests and
 * issues.
 */
import { CommandError } from './git-run.js'
import {
  describeChecks,
  normalizeComment,
  normalizeIssue,
  normalizePull,
  normalizeReviewEntry,
  summarizeChecks,
} from './forge-core.js'

/** Fields requested from `gh pr list` and `gh pr view`. */
const PULL_FIELDS = [
  'number',
  'title',
  'state',
  'isDraft',
  'url',
  'author',
  'createdAt',
  'updatedAt',
  'mergedAt',
  'closedAt',
  'headRefName',
  'baseRefName',
  'additions',
  'deletions',
  'changedFiles',
  'mergeable',
  'mergeStateStatus',
  'reviewDecision',
  'statusCheckRollup',
  'labels',
  'comments',
].join(',')

/** Fields requested from `gh pr view` on top of the list fields. */
const PULL_DETAIL_FIELDS = `${PULL_FIELDS},body,reviews,files`

/** Fields requested from `gh issue list` and `gh issue view`. */
const ISSUE_FIELDS = ['number', 'title', 'state', 'url', 'author', 'createdAt', 'updatedAt', 'closedAt', 'labels', 'comments'].join(',')

/** Fields requested from `gh issue view` on top of the list fields. */
const ISSUE_DETAIL_FIELDS = `${ISSUE_FIELDS},body`

/** GraphQL-flavoured JSON from `gh` is parsed here; REST answers are mapped into the same shape. */
export function createForge({ runner, config, logger, resolveToken, env = process.env }) {
  const cache = new Map()
  const inflight = new Map()
  const probes = new Map()

  const ttl = Math.max(0, Number(config.cacheMs) || 0)
  const providerChoice = String(config.forge ?? 'auto')
  let tokenCache

  /**
   * Run one provider CLI command.
   * @param {string} program executable name.
   * @param {string[]} args arguments.
   * @param {{ cwd: string, signal?: AbortSignal, maxBytes?: number }} options run options.
   * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
   */
  async function exec(program, args, options) {
    return await runner.run(program, args, {
      cwd: options.cwd,
      signal: options.signal,
      maxBytes: options.maxBytes ?? 4 * 1024 * 1024,
    })
  }

  /**
   * The CLI this provider should use, or nothing when the provider has none.
   * @param {string} provider github, gitlab, or other.
   * @returns {string | undefined}
   */
  function cliFor(provider) {
    const configured = String(config.cliPath ?? '').trim()
    if (configured.length > 0) return configured
    if (provider === 'github') return 'gh'
    if (provider === 'gitlab') return 'glab'
    return undefined
  }

  /**
   * Probe one CLI once every few seconds: is it installed, and is it signed in?
   * @param {string} program CLI to probe.
   * @param {string} cwd repository root.
   * @param {AbortSignal} [signal] cancellation.
   * @returns {Promise<{ installed: boolean, signedIn: boolean, login: string | null, reason: string | null }>}
   */
  async function probe(program, cwd, signal) {
    const key = program
    const cached = probes.get(key)
    if (cached !== undefined && Date.now() - cached.at < 30000) return cached.value

    const value = await (async () => {
      let version
      try {
        version = await exec(program, ['--version'], { cwd, signal, maxBytes: 8192 })
      } catch (error) {
        if (signal?.aborted === true) throw error
        return { installed: false, signedIn: false, login: null, reason: messageOf(error) }
      }
      if (version.code !== 0) {
        return { installed: false, signedIn: false, login: null, reason: 'CLI không chạy được' }
      }
      let status
      try {
        status = await exec(program, ['auth', 'status'], { cwd, signal, maxBytes: 16384 })
      } catch (error) {
        if (signal?.aborted === true) throw error
        return { installed: true, signedIn: false, login: null, reason: messageOf(error) }
      }
      const text = `${status.stdout}\n${status.stderr}`
      const login = /account\s+(\S+)|as\s+(\S+)/i.exec(text)
      return {
        installed: true,
        signedIn: status.code === 0,
        login: login?.[1] ?? login?.[2] ?? null,
        reason: status.code === 0 ? null : text.trim().split('\n').slice(-1)[0] ?? 'Chưa đăng nhập',
      }
    })()

    probes.set(key, { at: Date.now(), value })
    return value
  }

  /**
   * The GitHub token used by the REST fallback, if any.
   * @returns {Promise<string>}
   */
  async function token() {
    if (tokenCache !== undefined && Date.now() - tokenCache.at < 60000) return tokenCache.value
    const names = [String(config.tokenEnv ?? '').trim(), 'GITHUB_TOKEN', 'GH_TOKEN'].filter((name) => name.length > 0)
    let value = ''
    for (const name of names) {
      const candidate = env[name]
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        value = candidate.trim()
        break
      }
    }
    if (value.length === 0 && typeof resolveToken === 'function') {
      try {
        const stored = await resolveToken()
        if (typeof stored === 'string') value = stored.trim()
      } catch {
        // A missing credential store is not a failure of the panel.
      }
    }
    tokenCache = { at: Date.now(), value }
    return value
  }

  /**
   * Describe what this repository's code host can offer the panel.
   * @param {{ root: string, remote: Record<string, unknown> | null, signal?: AbortSignal }} options
   * @returns {Promise<Record<string, unknown>>}
   */
  async function describe({ root, remote, signal }) {
    const provider = remote?.provider ?? 'other'
    if (providerChoice === 'none') {
      return { provider: 'none', available: false, backend: null, reason: 'Đã tắt trong cấu hình' }
    }
    if (remote === null || remote === undefined) {
      return { provider: 'none', available: false, backend: null, reason: 'Kho mã không có remote' }
    }
    if (provider !== 'github' && provider !== 'gitlab') {
      return { provider, available: false, backend: null, reason: `Chưa hỗ trợ máy chủ ${remote.host ?? ''}`.trim() }
    }
    if (providerChoice !== 'auto' && providerChoice !== provider) {
      return { provider: providerChoice, available: false, backend: null, reason: `Cấu hình chỉ dùng ${providerChoice}` }
    }

    const program = cliFor(provider)
    if (program !== undefined) {
      const probeResult = await probe(program, root, signal)
      if (probeResult.installed && probeResult.signedIn) {
        return {
          provider,
          available: true,
          backend: 'cli',
          cli: program,
          login: probeResult.login,
          slug: remote.slug ?? null,
          host: remote.host ?? null,
        }
      }
      if (provider === 'github') {
        const restToken = await token()
        return {
          provider,
          available: true,
          backend: 'rest',
          cli: program,
          login: null,
          authenticated: restToken.length > 0,
          slug: remote.slug ?? null,
          host: remote.host ?? null,
          note: probeResult.installed
            ? `${program} chưa đăng nhập (${probeResult.reason ?? 'gh auth login'})`
            : `${program} không có trên máy`,
        }
      }
      return {
        provider,
        available: false,
        backend: null,
        reason: probeResult.installed
          ? `${program} chưa đăng nhập`
          : `${program} không có trên máy`,
      }
    }

    return { provider, available: false, backend: null, reason: `Chưa hỗ trợ ${provider}` }
  }

  /**
   * Read one cached value, or compute it once.
   * @param {string} key cache identity.
   * @param {boolean} refresh bypass the cache.
   * @param {() => Promise<unknown>} produce value factory.
   * @returns {Promise<unknown>}
   */
  async function remember(key, refresh, produce) {
    if (!refresh) {
      const hit = cache.get(key)
      if (hit !== undefined && Date.now() - hit.at < ttl) return hit.value
      const pending = inflight.get(key)
      if (pending !== undefined) return await pending
    }
    const promise = produce().then((value) => {
      cache.set(key, { at: Date.now(), value })
      return value
    }).finally(() => {
      inflight.delete(key)
    })
    inflight.set(key, promise)
    return await promise
  }

  /**
   * Run one `gh` command and read its JSON answer.
   * @param {string} program CLI to run.
   * @param {string[]} args arguments.
   * @param {{ cwd: string, signal?: AbortSignal }} options run options.
   * @returns {Promise<unknown>} parsed JSON.
   */
  async function ghJson(program, args, options) {
    const result = await exec(program, args, { cwd: options.cwd, signal: options.signal })
    if (result.code !== 0) throw ghFailure(result.stderr, program)
    const text = result.stdout.trim()
    if (text.length === 0) return []
    try {
      return JSON.parse(text)
    } catch {
      throw new CommandError('forge/failed', `${program} trả về dữ liệu không đọc được`)
    }
  }

  /**
   * Turn one CLI failure into a code the panel can act on.
   * @param {string} stderr CLI diagnostics.
   * @param {string} program CLI name.
   * @returns {CommandError}
   */
  function ghFailure(stderr, program) {
    const text = String(stderr ?? '').trim()
    if (/gh auth login|not logged in|authentication|authenticate|HTTP 401/i.test(text)) {
      return new CommandError('forge/not-signed-in', `Chưa đăng nhập ${program}. Chạy: ${program} auth login`, { detail: text })
    }
    if (/Could not resolve to a Repository|not found|HTTP 404/i.test(text)) {
      return new CommandError('forge/unknown-repository', 'Không thấy kho mã trên máy chủ', { detail: text })
    }
    if (/no git remotes|not a git repository/i.test(text)) {
      return new CommandError('forge/no-remote', 'Kho mã chưa có remote', { detail: text })
    }
    if (/rate limit|API rate limit exceeded/i.test(text)) {
      return new CommandError('forge/rate-limited', 'Máy chủ tạm giới hạn lượt gọi, thử lại sau ít phút', { detail: text })
    }
    return new CommandError('forge/failed', text.length > 0 ? text.split('\n')[0] : `${program} thất bại`, { detail: text })
  }

  /**
   * Read a GitHub REST resource.
   * @param {string} path API path beginning with `/`.
   * @param {{ signal?: AbortSignal, allow404?: boolean }} options request options.
   * @returns {Promise<unknown>}
   */
  async function rest(path, options = {}) {
    const headers = {
      accept: 'application/vnd.github+json',
      'user-agent': 'dsh-personal-hub',
      'x-github-api-version': '2022-11-28',
    }
    const value = await token()
    if (value.length > 0) headers.authorization = `Bearer ${value}`
    let response
    try {
      response = await fetch(`https://api.github.com${path}`, { headers, ...(options.signal === undefined ? {} : { signal: options.signal }) })
    } catch (error) {
      throw new CommandError('forge/offline', `Không gọi được GitHub: ${messageOf(error)}`)
    }
    if (response.status === 404) {
      if (options.allow404 === true) return undefined
      throw new CommandError('forge/unknown-repository', 'Không thấy kho mã trên GitHub')
    }
    if (response.status === 401) throw new CommandError('forge/not-signed-in', 'Token GitHub không hợp lệ')
    if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
      throw new CommandError('forge/rate-limited', 'GitHub tạm giới hạn lượt gọi, thử lại sau ít phút')
    }
    if (!response.ok) throw new CommandError('forge/failed', `GitHub trả về HTTP ${response.status}`)
    return await response.json()
  }

  /**
   * List change requests.
   * @param {{ root: string, remote: Record<string, unknown>, state?: string, limit?: number, signal?: AbortSignal, refresh?: boolean }} options
   * @returns {Promise<Record<string, unknown>>}
   */
  async function listPulls({ root, remote, state = 'open', limit = 20, signal, refresh = false }) {
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return { ...info, pulls: [] }
    const key = `pulls|${remote.slug}|${state}|${limit}`
    return await remember(key, refresh, async () => {
      if (info.backend === 'cli') {
        const raw = await ghJson(info.cli, [
          'pr',
          'list',
          '--repo',
          String(remote.slug),
          '--state',
          state,
          '--limit',
          String(limit),
          '--json',
          PULL_FIELDS,
        ], { cwd: root, signal })
        return { ...info, pulls: asArray(raw).map(normalizePull) }
      }
      const query = state === 'merged' ? 'closed' : state === 'all' ? 'all' : state
      const raw = await rest(`/repos/${remote.slug}/pulls?state=${query}&per_page=${limit}&sort=updated&direction=desc`, { signal })
      let pulls = asArray(raw).map(restPull).map(normalizePull)
      if (state === 'merged') pulls = pulls.filter((pull) => pull.state === 'merged')
      return { ...info, checksUnavailable: true, pulls }
    })
  }

  /**
   * Read one change request with its checks, reviews, and comments.
   * @param {{ root: string, remote: Record<string, unknown>, number: number, signal?: AbortSignal, refresh?: boolean }} options
   * @returns {Promise<Record<string, unknown>>}
   */
  async function pullDetail({ root, remote, number, signal, refresh = false }) {
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return { ...info }
    const key = `pull|${remote.slug}|${number}`
    return await remember(key, refresh, async () => {
      if (info.backend === 'cli') {
        const raw = await ghJson(info.cli, [
          'pr',
          'view',
          String(number),
          '--repo',
          String(remote.slug),
          '--json',
          PULL_DETAIL_FIELDS,
        ], { cwd: root, signal })
        const node = raw !== null && typeof raw === 'object' ? raw : {}
        return {
          ...info,
          pull: normalizePull(node),
          body: String(node.body ?? ''),
          checks: describeChecks(node.statusCheckRollup),
          reviews: asArray(node.reviews).map(normalizeReviewEntry),
          comments: asArray(node.comments).map(normalizeComment),
          files: asArray(node.files).map((file) => ({
            path: String(file?.path ?? ''),
            additions: Number(file?.additions) || 0,
            deletions: Number(file?.deletions) || 0,
          })),
        }
      }
      const node = await rest(`/repos/${remote.slug}/pulls/${number}`, { signal })
      const [reviews, comments] = await Promise.all([
        rest(`/repos/${remote.slug}/pulls/${number}/reviews?per_page=30`, { signal, allow404: true }).catch(() => []),
        rest(`/repos/${remote.slug}/issues/${number}/comments?per_page=50`, { signal, allow404: true }).catch(() => []),
      ])
      const pull = normalizePull(restPull(node))
      return {
        ...info,
        pull,
        body: String(node?.body ?? ''),
        checks: [],
        reviews: asArray(reviews).map(normalizeReviewEntry),
        comments: asArray(comments).map(normalizeComment),
        files: [],
        checksUnavailable: true,
      }
    })
  }

  /**
   * Find the open change request whose head is one branch.
   * @param {{ root: string, remote: Record<string, unknown>, branch: string, signal?: AbortSignal, refresh?: boolean }} options
   * @returns {Promise<Record<string, unknown>>}
   */
  async function pullForBranch({ root, remote, branch, signal, refresh = false }) {
    if (typeof branch !== 'string' || branch.length === 0) return { pull: null }
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return { ...info, pull: null }
    const key = `branch|${remote.slug}|${branch}`
    return await remember(key, refresh, async () => {
      if (info.backend === 'cli') {
        const raw = await ghJson(info.cli, [
          'pr',
          'list',
          '--repo',
          String(remote.slug),
          '--head',
          branch,
          '--state',
          'all',
          '--limit',
          '5',
          '--json',
          PULL_FIELDS,
        ], { cwd: root, signal })
        const pulls = asArray(raw).map(normalizePull)
        const preferred = pulls.find((pull) => pull.state === 'open') ?? pulls.find((pull) => pull.state === 'draft') ?? pulls[0]
        return { ...info, pull: preferred ?? null }
      }
      const raw = await rest(`/repos/${remote.slug}/pulls?state=all&head=${encodeURIComponent(`${remote.owner}:${branch}`)}&per_page=5`, { signal })
      const pulls = asArray(raw).map(restPull).map(normalizePull)
      const preferred = pulls.find((pull) => pull.state === 'open') ?? pulls[0]
      return { ...info, pull: preferred ?? null }
    })
  }

  /**
   * List issues, ignoring change requests GitHub returns from the same endpoint.
   * @param {{ root: string, remote: Record<string, unknown>, state?: string, limit?: number, signal?: AbortSignal, refresh?: boolean }} options
   * @returns {Promise<Record<string, unknown>>}
   */
  async function listIssues({ root, remote, state = 'open', limit = 20, signal, refresh = false }) {
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return { ...info, issues: [] }
    const key = `issues|${remote.slug}|${state}|${limit}`
    return await remember(key, refresh, async () => {
      if (info.backend === 'cli') {
        const raw = await ghJson(info.cli, [
          'issue',
          'list',
          '--repo',
          String(remote.slug),
          '--state',
          state,
          '--limit',
          String(limit),
          '--json',
          ISSUE_FIELDS,
        ], { cwd: root, signal })
        return { ...info, issues: asArray(raw).map(normalizeIssue) }
      }
      const raw = await rest(`/repos/${remote.slug}/issues?state=${state}&per_page=${limit}&sort=updated&direction=desc`, { signal })
      return { ...info, issues: asArray(raw).filter((item) => item?.pull_request === undefined).map(restIssue).map(normalizeIssue) }
    })
  }

  /**
   * Read one issue with its comments.
   * @param {{ root: string, remote: Record<string, unknown>, number: number, signal?: AbortSignal, refresh?: boolean }} options
   * @returns {Promise<Record<string, unknown>>}
   */
  async function issueDetail({ root, remote, number, signal, refresh = false }) {
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return { ...info }
    const key = `issue|${remote.slug}|${number}`
    return await remember(key, refresh, async () => {
      if (info.backend === 'cli') {
        const raw = await ghJson(info.cli, [
          'issue',
          'view',
          String(number),
          '--repo',
          String(remote.slug),
          '--json',
          ISSUE_DETAIL_FIELDS,
        ], { cwd: root, signal })
        const node = raw !== null && typeof raw === 'object' ? raw : {}
        return {
          ...info,
          issue: normalizeIssue(node),
          body: String(node.body ?? ''),
          comments: asArray(node.comments).map(normalizeComment),
        }
      }
      const node = await rest(`/repos/${remote.slug}/issues/${number}`, { signal })
      const comments = await rest(`/repos/${remote.slug}/issues/${number}/comments?per_page=50`, { signal, allow404: true }).catch(() => [])
      return {
        ...info,
        issue: normalizeIssue(restIssue(node)),
        body: String(node?.body ?? ''),
        comments: asArray(comments).map(normalizeComment),
      }
    })
  }

  return { describe, listPulls, pullDetail, pullForBranch, listIssues, issueDetail }
}

/**
 * Map one REST pull request into the shape `gh --json` prints.
 * @param {Record<string, unknown>} item REST pull object.
 * @returns {Record<string, unknown>}
 */
function restPull(item) {
  const node = item !== null && typeof item === 'object' ? item : {}
  return {
    number: node.number,
    title: node.title,
    state: node.state,
    isDraft: node.draft === true,
    url: node.html_url,
    author: { login: node.user?.login },
    headRefName: node.head?.ref,
    baseRefName: node.base?.ref,
    createdAt: node.created_at,
    updatedAt: node.updated_at,
    mergedAt: node.merged_at,
    closedAt: node.closed_at,
    additions: node.additions,
    deletions: node.deletions,
    changedFiles: node.changed_files,
    mergeable: node.mergeable === true ? 'MERGEABLE' : node.mergeable === false ? 'CONFLICTING' : undefined,
    reviewDecision: node.reviewDecision,
    comments: node.comments,
    labels: node.labels,
  }
}

/**
 * Map one REST issue into the shape `gh --json` prints.
 * @param {Record<string, unknown>} item REST issue object.
 * @returns {Record<string, unknown>}
 */
function restIssue(item) {
  const node = item !== null && typeof item === 'object' ? item : {}
  return {
    number: node.number,
    title: node.title,
    state: node.state,
    url: node.html_url,
    author: { login: node.user?.login },
    createdAt: node.created_at,
    updatedAt: node.updated_at,
    closedAt: node.closed_at,
    comments: node.comments,
    labels: node.labels,
  }
}

/** Read any JSON answer as an array of objects. */
function asArray(value) {
  return Array.isArray(value) ? value : []
}

/** Message of an unknown thrown value. */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

export { summarizeChecks }
