/**
 * Code-host access for the git panel.
 *
 * The provider CLI (`gh`, or `glab` for GitLab) is preferred: it carries the
 * user's own sign-in, reports check runs and review decisions in one call, and
 * needs no token of its own. When no CLI answers and the remote is GitHub, the
 * public REST API is used instead, so the panel still lists change requests and
 * issues.
 */
import { CommandError } from './git-run.ts'
import { resolveDefaultBase } from './worktree.ts'
import {
  describeChecks,
  describeGitLabPipeline,
  gitlabDiffStats,
  gitlabState,
  normalizeComment,
  normalizeGitLabIssue,
  normalizeGitLabPull,
  normalizeGitLabReview,
  normalizeIssue,
  normalizePull,
  normalizeReviewEntry,
  summarizeCheckDescriptions,
  summarizeChecks,
} from './forge-core.ts'
import type {
  CheckDescription,
  NormalizedComment,
  NormalizedIssue,
  NormalizedPull,
} from './forge-core.ts'
import type { GitConfig } from './config.ts'
import type { ForgeReview, ForgeState } from '../shared/protocol.ts'
import type { Logger } from '../host/dsh.ts'

/** One command's answer, as the runner reports it. */
export interface ForgeRunResult {
  code: number
  stdout: string
  stderr: string
  /** Whether the runner had to cut the output short; every runner reports it. */
  truncated: boolean
}

/** The options a code-host command needs from the runner. */
export interface ForgeRunOptions {
  cwd?: string
  signal?: AbortSignal
  maxBytes?: number
  env?: Record<string, string>
  stdin?: string
}

/** The command runner this module drives. */
export interface ForgeRunner {
  run(program: string, args: string[], options?: ForgeRunOptions): Promise<ForgeRunResult>
  backend: string
}

/** The remote facts a code host is addressed through. */
export interface ForgeRemote {
  name?: string | null
  provider?: string
  host?: string | null
  owner?: string | null
  slug?: string | null
  url?: string
}

/** One file a change request touched. */
export interface PullFile {
  path: string
  additions: number
  deletions: number
}

/** What a code host with a signed-in CLI offers the panel. */
export interface ForgeCliDescription extends ForgeState {
  available: true
  backend: 'cli'
  cli: string
  login: string | null
  slug: string | null
  host: string | null
}

/** What the GitHub REST fallback offers the panel. */
export interface ForgeRestDescription extends ForgeState {
  available: true
  backend: 'rest'
  cli: string
  login: null
  authenticated: boolean
  slug: string | null
  host: string | null
  note: string
}

/** A code host that cannot answer, and why. */
export interface ForgeUnavailable {
  provider: string
  available: false
  backend: null
  /** The CLI this provider would use, when it has one. */
  cli?: string | null
  reason: string
  note?: string
  slug?: string | null
  host?: string | null
}

/** A reachable code host. */
export type ForgeAvailable = ForgeCliDescription | ForgeRestDescription

/** One `describe` answer: either a reachable code host or the reason it is not. */
export type ForgeDescription = ForgeAvailable | ForgeUnavailable

/** An availability answer carrying a payload, narrowed by `available`. */
export type ForgeAnswer<T> = (ForgeUnavailable & T) | (ForgeCliDescription & T) | (ForgeRestDescription & T)

/** What `pullDetail` answers: availability, or a full change request. */
export type PullDetailAnswer = ForgeUnavailable | (ForgeAvailable & PullDetailPayload)

/** What `issueDetail` answers: availability, or a full issue. */
export type IssueDetailAnswer = ForgeUnavailable | (ForgeAvailable & IssueDetailPayload)

/**
 * What `pullForBranch` answers.
 *
 * An empty branch has nothing to look up, so it answers `{ pull: null }` without
 * any availability facts at all.
 */
export type BranchPullAnswer = { pull: NormalizedPull | null } | ForgeAnswer<{ pull: NormalizedPull | null }>

/** A full change request with its checks, reviews, and files. */
export interface PullDetailPayload {
  pull: NormalizedPull
  body: string
  checks: CheckDescription[]
  reviews: ForgeReview[]
  comments: NormalizedComment[]
  files: PullFile[]
  checksUnavailable?: boolean
}

/** A full issue with its comments. */
export interface IssueDetailPayload {
  issue: NormalizedIssue
  body: string
  comments: NormalizedComment[]
}

/** One change request's state, which merge tracking polls. */
export interface PulledState {
  number: number
  state: string
  url: string
  mergedAt: string | null
}

/** The change request `createPull` opened. */
export interface CreatedPull {
  number: number | null
  url: string
  provider: string
  backend: string
  head: string
  base: string
}

/** One CLI probe's answer: is it installed, and is it signed in? */
export interface ProbeResult {
  installed: boolean
  signedIn: boolean
  login: string | null
  reason: string | null
}

/** What one `describe` call needs. */
export interface ForgeDescribeOptions {
  root: string
  remote: ForgeRemote 
  signal?: AbortSignal
}

/** What one change-request list call needs. */
export interface ListPullsOptions {
  root: string
  remote: ForgeRemote 
  state?: string
  limit?: number
  signal?: AbortSignal
  refresh?: boolean
}

/** What one change-request detail call needs. */
export interface PullNumberOptions {
  root: string
  remote: ForgeRemote 
  number: number
  signal?: AbortSignal
  refresh?: boolean
}

/** What one branch lookup needs. */
export interface PullForBranchOptions {
  root: string
  remote: ForgeRemote 
  branch: string
  signal?: AbortSignal
  refresh?: boolean
}

/** What one issue list call needs. */
export interface ListIssuesOptions {
  root: string
  remote: ForgeRemote 
  state?: string
  limit?: number
  signal?: AbortSignal
  refresh?: boolean
}

/** What one issue detail call needs. */
export interface IssueNumberOptions {
  root: string
  remote: ForgeRemote 
  number: number
  signal?: AbortSignal
  refresh?: boolean
}

/** What one change-request creation needs. */
export interface CreatePullOptions {
  root: string
  remote: ForgeRemote 
  head: string
  base: string
  title: string
  body: string
  signal?: AbortSignal
}

/** What one state poll needs. */
export interface PullStateOptions {
  root: string
  remote: ForgeRemote 
  number: number
  signal?: AbortSignal
}

/** The code-host access this module exposes. */
export interface Forge {
  describe(options: ForgeDescribeOptions): Promise<ForgeDescription>
  listPulls(options: ListPullsOptions): Promise<ForgeAnswer<{ pulls: NormalizedPull[]; checksUnavailable?: boolean }>>
  pullDetail(options: PullNumberOptions): Promise<PullDetailAnswer>
  pullForBranch(options: PullForBranchOptions): Promise<BranchPullAnswer>
  listIssues(options: ListIssuesOptions): Promise<ForgeAnswer<{ issues: NormalizedIssue[] }>>
  issueDetail(options: IssueNumberOptions): Promise<IssueDetailAnswer>
  defaultBase(options: ForgeDescribeOptions): Promise<string | null>
  createPull(options: CreatePullOptions): Promise<CreatedPull>
  pullState(options: PullStateOptions): Promise<PulledState | null>
}

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

/** The options `createForge` accepts. */
export interface CreateForgeOptions {
  runner: ForgeRunner
  config: GitConfig
  logger: Logger
  resolveToken?: () => Promise<unknown>
  resolveGitLabToken?: () => Promise<unknown>
  env?: Record<string, string | undefined>
}

/** GraphQL-flavoured JSON from `gh` is parsed here; REST answers are mapped into the same shape. */
export function createForge({ runner, config, logger, resolveToken, resolveGitLabToken, env = process.env }: CreateForgeOptions): Forge {
  const cache = new Map<string, { at: number; value: unknown }>()
  const inflight = new Map<string, Promise<unknown>>()
  const probes = new Map<string, { at: number; value: ProbeResult }>()

  const ttl = Math.max(0, Number(config.cacheMs) || 0)
  const providerChoice = String(config.forge ?? 'auto')
  let tokenCache: { at: number; value: string } | undefined
  let gitlabTokenCache: { at: number; value: string } | undefined

  /**
   * Run one provider CLI command.
   * @param program executable name.
   * @param args arguments.
   * @param options run options.
   */
  async function exec(
    program: string,
    args: string[],
    options: { cwd: string; signal?: AbortSignal; maxBytes?: number; env?: Record<string, string>; stdin?: string },
  ): Promise<ForgeRunResult> {
    return await runner.run(program, args, {
      cwd: options.cwd,
      signal: options.signal,
      maxBytes: options.maxBytes ?? 4 * 1024 * 1024,
      ...(options.env === undefined ? {} : { env: options.env }),
      ...(options.stdin === undefined ? {} : { stdin: options.stdin }),
    })
  }

  /** Normalize a configured or remote host to the form the APIs compare. */
  function normalizedHost(value: unknown): string {
    const raw = String(value ?? '').trim()
    if (raw.length === 0) return ''
    const withScheme = raw.includes('://') ? raw : `https://${raw}`
    try {
      return new URL(withScheme).host.toLowerCase()
    } catch {
      return raw.toLowerCase().replace(/\/+$/, '')
    }
  }

  /** Whether a host was named explicitly as a self-hosted GitLab instance. */
  function isConfiguredGitLabHost(host: string): boolean {
    if (host.length === 0) return false
    return config.gitlabHosts.some((item) => normalizedHost(item) === host)
  }

  /**
   * The code host this remote points at.
   *
   * An explicit `forge` setting wins; otherwise GitHub and GitLab public hosts
   * are recognized by name, and a configured `gitlabHosts` entry marks a
   * self-hosted GitLab instance.
   */
  function providerFor(remote: ForgeRemote | null | undefined): string {
    if (providerChoice === 'github' || providerChoice === 'gitlab' || providerChoice === 'none') return providerChoice
    const host = normalizedHost(remote?.host)
    const hostname = host.replace(/:\d+$/, '')
    if (hostname === 'github.com' || hostname.endsWith('.github.com')) return 'github'
    if (hostname === 'gitlab.com' || hostname.endsWith('.gitlab.com')) return 'gitlab'
    if (hostname.includes('gitlab')) return 'gitlab'
    if (isConfiguredGitLabHost(host)) return 'gitlab'
    return 'other'
  }

  /** The API base URL for one GitLab host, honoring a configured base URL. */
  function gitlabApiBase(host: string): string {
    const key = normalizedHost(host)
    for (const item of config.gitlabHosts) {
      const raw = String(item ?? '').trim()
      if (raw.length === 0) continue
      const withScheme = raw.includes('://') ? raw : `https://${raw}`
      try {
        const url = new URL(withScheme)
        if (url.host.toLowerCase() !== key) continue
        const prefix = url.pathname.replace(/\/+$/, '')
        return `${url.origin}${prefix}/api/v4`
      } catch {
        // A malformed entry is ignored; the default below still points at the host.
      }
    }
    return `https://${key}/api/v4`
  }

  /** The CLI this provider should use, or nothing when the provider has none. */
  function cliFor(provider: string): string | undefined {
    const configured = String(config.cliPath ?? '').trim()
    if (configured.length > 0) return configured
    if (provider === 'github') return 'gh'
    if (provider === 'gitlab') return 'glab'
    return undefined
  }

  /**
   * Probe one CLI once every few seconds: is it installed, and is it signed in?
   * @param program CLI to probe.
   * @param cwd repository root.
   * @param provider github or gitlab, so a self-hosted GitLab gets `--hostname`.
   * @param host remote host, for GitLab.
   * @param signal cancellation.
   */
  async function probe(program: string, cwd: string, provider: string, host: string | null | undefined, signal?: AbortSignal): Promise<ProbeResult> {
    const key = `${program}|${provider === 'gitlab' ? normalizedHost(host) : ''}`
    const cached = probes.get(key)
    if (cached !== undefined && Date.now() - cached.at < 30000) return cached.value

    const value = await (async (): Promise<ProbeResult> => {
      let version: ForgeRunResult
      try {
        version = await exec(program, ['--version'], { cwd, signal, maxBytes: 8192 })
      } catch (error) {
        if (signal?.aborted === true) throw error
        return { installed: false, signedIn: false, login: null, reason: messageOf(error) }
      }
      if (version.code !== 0) {
        return { installed: false, signedIn: false, login: null, reason: 'CLI không chạy được' }
      }
      const hostName = normalizedHost(host)
      const authArgs = provider === 'gitlab' && hostName.length > 0
        ? ['auth', 'status', '--hostname', hostName]
        : ['auth', 'status']
      let status: ForgeRunResult
      try {
        status = await exec(program, authArgs, { cwd, signal, maxBytes: 16384 })
      } catch (error) {
        if (signal?.aborted === true) throw error
        return { installed: true, signedIn: false, login: null, reason: messageOf(error) }
      }
      const text = `${status.stdout}\n${status.stderr}`
      const login = /account\s+(\S+)|as\s+([^\s(]+)|Logged in to .*?\bas\s+(\S+)/i.exec(text)
      return {
        installed: true,
        signedIn: status.code === 0,
        login: login?.[1] ?? login?.[2] ?? login?.[3] ?? null,
        reason: status.code === 0 ? null : text.trim().split('\n').slice(-1)[0] ?? 'Chưa đăng nhập',
      }
    })()

    probes.set(key, { at: Date.now(), value })
    return value
  }

  /**
   * The GitHub token used by the REST fallback, if any.
   */
  async function token(): Promise<string> {
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
   * The GitLab token used by the REST fallback, if any.
   *
   * `glab` carries its own sign-in, so this is only needed when the CLI is not
   * installed or its host is not configured.
   */
  async function gitlabToken(): Promise<string> {
    if (gitlabTokenCache !== undefined && Date.now() - gitlabTokenCache.at < 60000) return gitlabTokenCache.value
    const names = [String(config.gitlabTokenEnv ?? '').trim(), 'GITLAB_TOKEN', 'GLAB_TOKEN'].filter((name) => name.length > 0)
    let value = ''
    for (const name of names) {
      const candidate = env[name]
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        value = candidate.trim()
        break
      }
    }
    if (value.length === 0 && typeof resolveGitLabToken === 'function') {
      try {
        const stored = await resolveGitLabToken()
        if (typeof stored === 'string') value = stored.trim()
      } catch {
        // A missing credential store is not a failure of the panel.
      }
    }
    gitlabTokenCache = { at: Date.now(), value }
    return value
  }

  /**
   * Describe what this repository's code host can offer the panel.
   */
  async function describe({ root, remote, signal }: ForgeDescribeOptions): Promise<ForgeDescription> {
    if (providerChoice === 'none') {
      return { provider: 'none', available: false, backend: null, reason: 'Đã tắt trong cấu hình' }
    }
    if (remote === null || remote === undefined) {
      return { provider: 'none', available: false, backend: null, reason: 'Kho mã không có remote' }
    }
    const provider = providerFor(remote)
    const host = normalizedHost(remote.host)
    if (provider !== 'github' && provider !== 'gitlab') {
      return {
        provider,
        available: false,
        backend: null,
        reason: host.length > 0
          ? `Chưa nhận ra máy chủ ${remote.host ?? host}. Thêm host vào git.gitlabHosts nếu đó là GitLab tự host.`
          : 'Remote này chưa trỏ tới GitHub hoặc GitLab',
        host: remote.host ?? null,
        slug: remote.slug ?? null,
      }
    }

    const program = cliFor(provider) ?? (provider === 'gitlab' ? 'glab' : 'gh')
    const probeResult = await probe(program, root, provider, remote.host, signal)
    if (probeResult.installed && probeResult.signedIn) {
      return {
        provider,
        available: true,
        backend: 'cli',
        cli: program,
        login: probeResult.login,
        slug: remote.slug ?? null,
        host: remote.host ?? null,
        terminology: provider === 'gitlab'
          ? { short: 'MR', singular: 'merge request', plural: 'merge requests' }
          : { short: 'PR', singular: 'pull request', plural: 'pull requests' },
      }
    }

    const fallback = provider === 'github' ? await token() : await gitlabToken()
    if (fallback.length === 0 && provider === 'gitlab') {
      return {
        provider,
        available: false,
        backend: null,
        cli: program,
        reason: probeResult.installed
          ? `${program} chưa đăng nhập cho ${remote.host ?? 'GitLab'} (${probeResult.reason ?? `${program} auth login --hostname ${remote.host ?? ''}`})`
          : `${program} không có trên máy và chưa có GITLAB_TOKEN`,
        host: remote.host ?? null,
        slug: remote.slug ?? null,
      }
    }
    return {
      provider,
      available: true,
      backend: 'rest',
      cli: program,
      login: null,
      authenticated: fallback.length > 0,
      slug: remote.slug ?? null,
      host: remote.host ?? null,
      note: probeResult.installed
        ? `${program} chưa đăng nhập (${probeResult.reason ?? `${program} auth login`})`
        : `${program} không có trên máy; dùng ${provider === 'github' ? 'GITHUB_TOKEN' : 'GITLAB_TOKEN'}`,
      terminology: provider === 'gitlab'
        ? { short: 'MR', singular: 'merge request', plural: 'merge requests' }
        : { short: 'PR', singular: 'pull request', plural: 'pull requests' },
    }
  }

  /**
   * Read one cached value, or compute it once.
   * @param key cache identity.
   * @param refresh bypass the cache.
   * @param produce value factory.
   */
  async function remember<T>(key: string, refresh: boolean, produce: () => Promise<T>): Promise<T> {
    if (!refresh) {
      const hit = cache.get(key)
      if (hit !== undefined && Date.now() - hit.at < ttl) return hit.value as T
      const pending = inflight.get(key)
      if (pending !== undefined) return await (pending as Promise<T>)
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
   * @param program CLI to run.
   * @param args arguments.
   * @param options run options.
   */
  async function ghJson(program: string, args: string[], options: { cwd: string; signal?: AbortSignal }): Promise<unknown> {
    const result = await exec(program, args, { cwd: options.cwd, signal: options.signal })
    if (result.code !== 0) throw ghFailure(result.stderr, program)
    const text = result.stdout.trim()
    if (text.length === 0) return []
    try {
      const parsed: unknown = JSON.parse(text)
      return parsed
    } catch {
      throw new CommandError('forge/failed', `${program} trả về dữ liệu không đọc được`)
    }
  }

  /**
   * Turn one CLI failure into a code the panel can act on.
   * @param stderr CLI diagnostics.
   * @param program CLI name.
   */
  function ghFailure(stderr: string | null | undefined, program: string): CommandError {
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
   * Turn one `glab` failure into a code the panel can act on.
   * @param stderr CLI diagnostics.
   * @param program CLI name.
   */
  function glabFailure(stderr: string | null | undefined, program: string): CommandError {
    const text = String(stderr ?? '').trim()
    if (/not logged in|authentication|authenticate|HTTP 401|invalid token/i.test(text)) {
      return new CommandError('forge/not-signed-in', `Chưa đăng nhập ${program}. Chạy: ${program} auth login`, { detail: text })
    }
    if (/404|not found|Project Not Found/i.test(text)) {
      return new CommandError('forge/unknown-repository', 'Không thấy kho mã trên GitLab', { detail: text })
    }
    if (/no git remotes|not a git repository/i.test(text)) {
      return new CommandError('forge/no-remote', 'Kho mã chưa có remote', { detail: text })
    }
    if (/rate limit|429/i.test(text)) {
      return new CommandError('forge/rate-limited', 'GitLab tạm giới hạn lượt gọi, thử lại sau ít phút', { detail: text })
    }
    return new CommandError('forge/failed', text.length > 0 ? text.split('\n')[0] : `${program} thất bại`, { detail: text })
  }

  /** The URL-encoded project path GitLab's API expects. */
  function gitlabProject(remote: ForgeRemote): string {
    const slug = String(remote.slug ?? '').trim()
    if (slug.length === 0) throw new CommandError('forge/no-remote', 'Remote này không có đường dẫn kho mã GitLab')
    return encodeURIComponent(slug)
  }

  /** Encode one GitLab query string value. */
  function queryValue(value: string): string {
    return encodeURIComponent(value)
  }

  /** The GitLab API base URL for a remote. */
  function gitlabRestBase(remote: ForgeRemote): string {
    return gitlabApiBase(String(remote.host ?? ''))
  }

  /**
   * Read one GitLab API resource, through `glab api` or the REST fallback.
   * @param info code-host availability.
   * @param remote the remote being queried.
   * @param endpoint API path below `/api/v4`.
   * @param options request method, body, cancellation.
   */
  async function gitlabRequest(
    info: ForgeAvailable,
    remote: ForgeRemote,
    endpoint: string,
    options: { method?: 'GET' | 'POST'; body?: Record<string, string>; signal?: AbortSignal } = {},
  ): Promise<unknown> {
    const method = options.method ?? 'GET'
    if (info.backend === 'cli') {
      const host = normalizedHost(remote.host)
      const args = ['api', ...(host.length > 0 ? ['--hostname', host] : []), '--output', 'json']
      if (method !== 'GET') args.push('--method', method)
      if (options.body !== undefined) {
        args.push('--input', '-')
      }
      args.push(endpoint)
      const result = await exec(info.cli, args, {
        cwd: process.cwd(),
        signal: options.signal,
        stdin: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
      if (result.code !== 0) throw glabFailure(result.stderr, info.cli)
      return parseJson(result.stdout, info.cli)
    }

    const headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'dsh-personal-hub',
    }
    const value = await gitlabToken()
    if (value.length > 0) headers['private-token'] = value
    let response: Response
    try {
      response = await fetch(`${gitlabRestBase(remote)}/${endpoint}`, {
        method,
        headers,
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      })
    } catch (error) {
      throw new CommandError('forge/offline', `Không gọi được GitLab: ${messageOf(error)}`)
    }
    if (response.status === 401) throw new CommandError('forge/not-signed-in', 'GitLab token không hợp lệ hoặc đã hết hạn')
    if (response.status === 403) {
      throw new CommandError('forge/not-signed-in', 'GitLab từ chối token này (thiếu quyền api)')
    }
    if (response.status === 404) {
      throw new CommandError('forge/unknown-repository', 'Không thấy kho mã trên GitLab')
    }
    if (response.status === 429) {
      throw new CommandError('forge/rate-limited', 'GitLab tạm giới hạn lượt gọi, thử lại sau ít phút')
    }
    if (!response.ok) throw new CommandError('forge/failed', `GitLab trả về HTTP ${response.status}`)
    if (response.status === 204) return undefined
    try {
      return await response.json()
    } catch {
      throw new CommandError('forge/failed', 'GitLab trả về dữ liệu không đọc được')
    }
  }

  /** Read one GitLab list endpoint without letting a section failure break the page. */
  async function gitlabOptional(
    info: ForgeAvailable,
    remote: ForgeRemote,
    endpoint: string,
    signal?: AbortSignal,
  ): Promise<unknown> {
    try {
      return await gitlabRequest(info, remote, endpoint, { signal })
    } catch (error) {
      if (error instanceof CommandError && error.code === 'forge/not-signed-in') throw error
      logger.warn('git: GitLab sub-resource %s failed: %s', endpoint, messageOf(error))
      return undefined
    }
  }

  /** Read and parse one `glab` JSON answer. */
  function parseJson(text: string, program: string): unknown {
    const trimmed = text.trim()
    if (trimmed.length === 0) return []
    try {
      const parsed: unknown = JSON.parse(trimmed)
      return parsed
    } catch {
      throw new CommandError('forge/failed', `${program} trả về dữ liệu không đọc được`)
    }
  }

  /**
   * Read a GitHub REST resource.
   * @param path API path beginning with `/`.
   * @param options request options.
   */
  async function rest(path: string, options: { signal?: AbortSignal; allow404?: boolean } = {}): Promise<unknown> {
    const headers: Record<string, string> = {
      accept: 'application/vnd.github+json',
      'user-agent': 'dsh-personal-hub',
      'x-github-api-version': '2022-11-28',
    }
    const value = await token()
    if (value.length > 0) headers.authorization = `Bearer ${value}`
    let response: Response
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
    const payload: unknown = await response.json()
    return payload
  }

  /**
   * List change requests.
   */
  async function listPulls({ root, remote, state = 'open', limit = 20, signal, refresh = false }: ListPullsOptions): Promise<ForgeAnswer<{ pulls: NormalizedPull[]; checksUnavailable?: boolean }>> {
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return { ...info, pulls: [] }
    const key = `pulls|${info.provider}|${remote.slug}|${state}|${limit}`
    return await remember(key, refresh, async () => {
      if (info.provider === 'gitlab') {
        const queryState = state === 'draft' ? 'opened' : state === 'open' ? 'opened' : state
        const endpoint = `projects/${gitlabProject(remote)}/merge_requests?state=${queryValue(queryState)}&per_page=${limit}&order_by=updated_at&sort=desc`
        const raw = await gitlabRequest(info, remote, endpoint, { signal })
        let pulls = asArray(raw).map(normalizeGitLabPull)
        if (state === 'draft') pulls = pulls.filter((pull) => pull.state === 'draft' || pull.isDraft)
        return { ...info, pulls }
      }
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
   * Fetch the jobs of one merge-request pipeline, when the pipeline has an id.
   * @param info code-host availability.
   * @param remote the repository.
   * @param pipeline `head_pipeline` node.
   * @param signal cancellation.
   */
  async function gitlabPipelineJobs(
    info: ForgeAvailable,
    remote: ForgeRemote,
    pipeline: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const id = Number(asRecord(pipeline).id)
    if (!Number.isFinite(id) || id <= 0) return []
    const project = gitlabProject(remote)
    return await gitlabOptional(info, remote, `projects/${project}/pipelines/${id}/jobs?per_page=100`, signal)
  }

  /**
   * Read one change request with its checks, reviews, and comments.
   */
  async function pullDetail({ root, remote, number, signal, refresh = false }: PullNumberOptions): Promise<PullDetailAnswer> {
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return { ...info }
    const key = `pull|${info.provider}|${remote.slug}|${number}`
    return await remember(key, refresh, async () => {
      if (info.provider === 'gitlab') {
        const project = gitlabProject(remote)
        const endpoint = `projects/${project}/merge_requests/${number}`
        const node = asRecord(await gitlabRequest(info, remote, endpoint, { signal }))
        const [notes, changes, approvals] = await Promise.all([
          gitlabOptional(info, remote, `${endpoint}/notes?per_page=50&sort=asc`, signal),
          gitlabOptional(info, remote, `${endpoint}/changes`, signal),
          gitlabOptional(info, remote, `${endpoint}/approvals`, signal),
        ])
        const pull = normalizeGitLabPull(node)
        const files = asArray(asRecord(changes).changes).map(gitlabDiffStats)
        if (files.length > 0) {
          pull.changedFiles = files.length
          pull.additions = files.reduce((sum, file) => sum + file.additions, 0)
          pull.deletions = files.reduce((sum, file) => sum + file.deletions, 0)
        }
        const pipeline = node.head_pipeline ?? node.pipeline
        const jobs = await gitlabPipelineJobs(info, remote, pipeline, signal)
        const checks = describeGitLabPipeline(pipeline, jobs)
        pull.checks = summarizeCheckDescriptions(checks)
        const approval = asRecord(approvals)
        const reviews = asArray(approval.approved_by).map(normalizeGitLabReview)
        if (reviews.length > 0) pull.review = 'approved'
        else if (Number(approval.approvals_required) > 0 && Number(approval.approvals_left) > 0) pull.review = 'review_required'
        return {
          ...info,
          pull,
          body: String(node.description ?? ''),
          checks,
          reviews,
          comments: asArray(notes).filter((note) => asRecord(note).system !== true).map(normalizeComment),
          files,
        }
      }
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
        const node = asRecord(raw)
        return {
          ...info,
          pull: normalizePull(node),
          body: String(node.body ?? ''),
          checks: describeChecks(node.statusCheckRollup),
          reviews: asArray(node.reviews).map(normalizeReviewEntry),
          comments: asArray(node.comments).map(normalizeComment),
          files: asArray(node.files).map((file) => {
            const item = asRecord(file)
            return {
              path: String(item.path ?? ''),
              additions: Number(item.additions) || 0,
              deletions: Number(item.deletions) || 0,
            }
          }),
        }
      }
      const node = asRecord(await rest(`/repos/${remote.slug}/pulls/${number}`, { signal }))
      const [reviews, comments] = await Promise.all([
        rest(`/repos/${remote.slug}/pulls/${number}/reviews?per_page=30`, { signal, allow404: true }).catch(() => []),
        rest(`/repos/${remote.slug}/issues/${number}/comments?per_page=50`, { signal, allow404: true }).catch(() => []),
      ])
      const pull = normalizePull(restPull(node))
      return {
        ...info,
        pull,
        body: String(node.body ?? ''),
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
   */
  async function pullForBranch({ root, remote, branch, signal, refresh = false }: PullForBranchOptions): Promise<BranchPullAnswer> {
    if (typeof branch !== 'string' || branch.length === 0) return { pull: null }
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return { ...info, pull: null }
    const key = `branch|${info.provider}|${remote.slug}|${branch}`
    return await remember(key, refresh, async () => {
      if (info.provider === 'gitlab') {
        const project = gitlabProject(remote)
        const endpoint = `projects/${project}/merge_requests?state=all&source_branch=${queryValue(branch)}&per_page=5&order_by=updated_at&sort=desc`
        const raw = await gitlabRequest(info, remote, endpoint, { signal })
        const pulls = asArray(raw).map(normalizeGitLabPull)
        const preferred = pulls.find((pull) => pull.state === 'open')
          ?? pulls.find((pull) => pull.state === 'draft')
          ?? pulls[0]
        return { ...info, pull: preferred ?? null }
      }
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
   */
  async function listIssues({ root, remote, state = 'open', limit = 20, signal, refresh = false }: ListIssuesOptions): Promise<ForgeAnswer<{ issues: NormalizedIssue[] }>> {
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return { ...info, issues: [] }
    const key = `issues|${info.provider}|${remote.slug}|${state}|${limit}`
    return await remember(key, refresh, async () => {
      if (info.provider === 'gitlab') {
        const queryState = state === 'open' ? 'opened' : state
        const project = gitlabProject(remote)
        const raw = await gitlabRequest(
          info,
          remote,
          `projects/${project}/issues?state=${queryValue(queryState)}&per_page=${limit}&order_by=updated_at&sort=desc`,
          { signal },
        )
        return { ...info, issues: asArray(raw).map(normalizeGitLabIssue) }
      }
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
      return { ...info, issues: asArray(raw).filter((item) => (item as Record<string, unknown> | null)?.pull_request === undefined).map(restIssue).map(normalizeIssue) }
    })
  }

  /**
   * Read one issue with its comments.
   */
  async function issueDetail({ root, remote, number, signal, refresh = false }: IssueNumberOptions): Promise<IssueDetailAnswer> {
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return { ...info }
    const key = `issue|${info.provider}|${remote.slug}|${number}`
    return await remember(key, refresh, async () => {
      if (info.provider === 'gitlab') {
        const project = gitlabProject(remote)
        const endpoint = `projects/${project}/issues/${number}`
        const node = asRecord(await gitlabRequest(info, remote, endpoint, { signal }))
        const notes = await gitlabOptional(info, remote, `${endpoint}/notes?per_page=50&sort=asc`, signal)
        return {
          ...info,
          issue: normalizeGitLabIssue(node),
          body: String(node.description ?? ''),
          comments: asArray(notes).filter((note) => asRecord(note).system !== true).map(normalizeComment),
        }
      }
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
        const node = asRecord(raw)
        return {
          ...info,
          issue: normalizeIssue(node),
          body: String(node.body ?? ''),
          comments: asArray(node.comments).map(normalizeComment),
        }
      }
      const node = asRecord(await rest(`/repos/${remote.slug}/issues/${number}`, { signal }))
      const comments = await rest(`/repos/${remote.slug}/issues/${number}/comments?per_page=50`, { signal, allow404: true }).catch(() => [])
      return {
        ...info,
        issue: normalizeIssue(restIssue(node)),
        body: String(node.body ?? ''),
        comments: asArray(comments).map(normalizeComment),
      }
    })
  }

  /**
   * Write one GitHub REST resource.
   * @param path API path beginning with `/`.
   * @param body JSON request body.
   * @param options request options.
   */
  async function restWrite(path: string, body: Record<string, unknown>, options: { signal?: AbortSignal } = {}): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'dsh-personal-hub',
      'x-github-api-version': '2022-11-28',
    }
    const value = await token()
    if (value.length > 0) headers.authorization = `Bearer ${value}`
    let response: Response
    try {
      response = await fetch(`https://api.github.com${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      })
    } catch (error) {
      throw new CommandError('forge/offline', `Không gọi được GitHub: ${messageOf(error)}`)
    }
    if (response.status === 401) throw new CommandError('forge/not-signed-in', 'Token GitHub không hợp lệ')
    if (response.status === 422) {
      const detail = await response.text().catch(() => '')
      throw new CommandError('pr/rejected', 'GitHub từ chối yêu cầu tạo pull request', { detail: detail.slice(0, 2000) })
    }
    if (!response.ok) throw new CommandError('forge/failed', `GitHub trả về HTTP ${response.status}`)
    const payload: unknown = await response.json()
    return payload !== null && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  }

  /**
   * The default base branch of the code host, when the repository names one.
   */
  async function defaultBase({ root, remote, signal }: ForgeDescribeOptions): Promise<string | null> {
    return await resolveDefaultBase(runner, { root, remote: String(remote?.name ?? ''), signal })
  }

  /**
   * Open one change request from an already pushed branch.
   *
   * The provider CLI is preferred because it carries the user's own sign-in;
   * the GitHub REST API is the fallback when no signed-in CLI answers.
   */
  async function createPull({ root, remote, head, base, title, body, signal }: CreatePullOptions): Promise<CreatedPull> {
    const info = await describe({ root, remote, signal })
    if (info.available !== true) {
      throw new CommandError('pr/forge-unavailable', info.reason ?? 'Máy chủ mã nguồn chưa dùng được')
    }
    if (info.provider === 'gitlab') {
      const project = gitlabProject(remote)
      const node = asRecord(await gitlabRequest(info, remote, `projects/${project}/merge_requests`, {
        method: 'POST',
        body: {
          source_branch: head,
          target_branch: base,
          title,
          description: body,
        },
        signal,
      }))
      return {
        number: Number(node.iid) || numberFromUrl(String(node.web_url ?? '')),
        url: String(node.web_url ?? ''),
        provider: 'gitlab',
        backend: info.backend,
        head,
        base,
      }
    }
    if (info.backend === 'cli') {
      const program = info.cli
      const result = await exec(program, [
        'pr', 'create',
        '--repo', String(remote.slug),
        '--head', head,
        '--base', base,
        '--title', title,
        '--body', body,
      ], { cwd: root, signal })
      if (result.code !== 0) throw ghFailure(result.stderr, program)
      const url = firstUrl(result.stdout) ?? firstUrl(result.stderr) ?? ''
      return {
        number: numberFromUrl(url),
        url,
        provider: info.provider,
        backend: 'cli',
        head,
        base,
      }
    }
    const node = await restWrite(`/repos/${remote.slug}/pulls`, { title, head, base, body }, { signal })
    return {
      number: typeof node.number === 'number' ? node.number : numberFromUrl(String(node.html_url ?? '')),
      url: String(node.html_url ?? ''),
      provider: info.provider,
      backend: 'rest',
      head,
      base,
    }
  }

  /**
   * Read one change request's current state, which merge tracking polls.
   */
  async function pullState({ root, remote, number, signal }: PullStateOptions): Promise<PulledState | null> {
    const info = await describe({ root, remote, signal })
    if (info.available !== true) return null
    if (info.provider === 'gitlab') {
      const project = gitlabProject(remote)
      const node = asRecord(await gitlabRequest(info, remote, `projects/${project}/merge_requests/${number}`, { signal }))
      return {
        number: Number(node.iid) || number,
        state: gitlabState(node.state),
        url: String(node.web_url ?? ''),
        mergedAt: typeof node.merged_at === 'string' ? node.merged_at : null,
      }
    }
    if (info.backend === 'cli') {
      const raw = await ghJson(info.cli, [
        'pr',
        'view',
        String(number),
        '--repo',
        String(remote.slug),
        '--json',
        STATE_FIELDS,
      ], { cwd: root, signal })
      const node = asRecord(raw)
      const pull = normalizePull(node)
      return {
        number: pull.number,
        state: pull.state,
        url: pull.url,
        mergedAt: typeof node.mergedAt === 'string' ? node.mergedAt : null,
      }
    }
    const node = asRecord(await rest(`/repos/${remote.slug}/pulls/${number}`, { signal }))
    const pull = normalizePull(restPull(node))
    return {
      number: pull.number,
      state: pull.state,
      url: pull.url,
      mergedAt: typeof node.merged_at === 'string' ? node.merged_at : null,
    }
  }

  return { describe, listPulls, pullDetail, pullForBranch, listIssues, issueDetail, defaultBase, createPull, pullState }
}

/** Fields `pullState` asks `gh` for. */
const STATE_FIELDS = ['number', 'url', 'state', 'isDraft', 'mergedAt', 'headRefName', 'baseRefName', 'mergeable'].join(',')

/** First HTTP(S) URL in command output. */
function firstUrl(text: string | null | undefined): string | null {
  const match = /https?:\/\/[^\s'"]+/.exec(String(text ?? ''))
  return match?.[0] ?? null
}

/** Pull or merge-request number from one change-request URL. */
function numberFromUrl(url: string | null | undefined): number | null {
  const match = /\/(?:pull|pulls|merge_requests)\/(\d+)/.exec(String(url ?? ''))
  return match === null ? null : Number.parseInt(match[1], 10)
}

/**
 * Map one REST pull request into the shape `gh --json` prints.
 * @param item REST pull object.
 */
function restPull(item: unknown): Record<string, unknown> {
  const node = asRecord(item)
  const user = asRecord(node.user)
  const head = asRecord(node.head)
  const base = asRecord(node.base)
  return {
    number: node.number,
    title: node.title,
    state: node.state,
    isDraft: node.draft === true,
    url: node.html_url,
    author: { login: user.login },
    headRefName: head.ref,
    baseRefName: base.ref,
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
 * @param item REST issue object.
 */
function restIssue(item: unknown): Record<string, unknown> {
  const node = asRecord(item)
  const user = asRecord(node.user)
  return {
    number: node.number,
    title: node.title,
    state: node.state,
    url: node.html_url,
    author: { login: user.login },
    createdAt: node.created_at,
    updatedAt: node.updated_at,
    closedAt: node.closed_at,
    comments: node.comments,
    labels: node.labels,
  }
}

/** Read any JSON answer as an array of objects. */
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** Read any JSON value as a plain record; anything else becomes an empty one. */
function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/** Message of an unknown thrown value. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export { summarizeChecks }
