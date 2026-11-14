/**
 * Git access for the personal hub: one command runner over the Harness
 * `subprocess` capability (with a `child_process` fallback), the repository
 * inspection the panel header needs, and the file, commit, log, branch, and
 * action reads that back the views.
 */
import { execFile } from 'node:child_process'
import { open, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

import {
  mergeLineCounts,
  nulFields,
  parseAheadBehind,
  parseBranches,
  parseBranchRefs,
  parseDefaultBranch,
  parseLog,
  parseNumstatZ,
  parsePatch,
  parsePorcelainV2,
  pickRemote,
  parseRemoteUrl,
  summarizeChanges,
  untrackedPatch,
} from './git-core.ts'
import type { ParsedBranch } from './git-core.ts'
import type {
  DiffFile,
  FileDiff,
  GitBranch,
  GitBranchChanges,
  GitCommitDetail,
  GitCommitSummary,
  GitFileChange,
  GitOverview,
  GitRemoteInfo,
  GitRepoInfo,
  GitStats,
} from '../shared/protocol.ts'

/** Milliseconds a child gets to exit after termination starts. */
const TERMINATE_GRACE_MS = 2000
/** Retained stderr tail for diagnostics. */
const STDERR_BYTES = 16384
/** Bytes inspected when deciding whether a file is binary. */
const SNIFF_BYTES = 8000
/** How often a running command's collected output is drained into progress lines. */
const OUTPUT_POLL_MS = 150
/** Commands never wait for a pager or a credential prompt. */
const GIT_ENV: Record<string, string> = Object.freeze({
  GIT_TERMINAL_PROMPT: '0',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_PAGER: 'cat',
  LC_ALL: 'C',
})

/** One git or code-host failure with a stable code the panel can show. */
export class CommandError extends Error {
  /** Stable failure code, such as `git/not-a-repository`. */
  readonly code: string
  /** Machine-readable extras for the panel. */
  readonly details: Record<string, unknown>

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'CommandError'
    this.code = code
    this.details = details
  }
}

/** One stream a command writes to. */
export type OutputStream = 'stdout' | 'stderr'

/** What one command printed, and how it ended. */
export interface RunResult {
  code: number
  stdout: string
  stderr: string
  truncated: boolean
}

/** Options one command accepts. */
export interface RunOptions {
  cwd?: string
  env?: Record<string, string>
  signal?: AbortSignal
  maxBytes?: number
  stdin?: string
  timeoutMs?: number
  /** Called once per output line, for a progress panel. */
  onLine?: (stream: OutputStream, text: string) => void
}

/** The runner every git reader takes. */
export interface GitRunner {
  run(program: string, args: string[], options?: RunOptions): Promise<RunResult>
  backend: string
}

/** The slice of a logger the runner needs. */
interface RunnerLogger {
  warn(...args: unknown[]): void
}

/**
 * Build one command runner for this plugin.
 *
 * The Harness `subprocess` service is preferred, because it owns process
 * lifetime and the credential scrub; a composition without it falls back to
 * `node:child_process`, which still runs with an explicit working directory and
 * a bounded output buffer.
 *
 * @param options the Harness context, a logger, and the default timeout.
 */
export function createCommandRunner(options: {
  ctx: { get<T = unknown>(name: string): T | undefined }
  logger: RunnerLogger
  timeoutMs?: number
}): GitRunner {
  const { ctx, logger } = options
  const timeoutMs = options.timeoutMs ?? 15000
  const subprocess = ctx.get<{
    resolveExecutable?(program: string): Promise<string>
    spawn?(input: {
      argv: string[]
      cwd?: string
      stdio?: unknown
      graceMs?: number
      signal?: AbortSignal
      env?: Record<string, string>
    }): {
      done: Promise<{ exitCode?: number } | undefined>
      collected?: {
        stdout?: { readFrom(offset: number): { text?: string; lossy?: boolean } }
        stderr?: { readFrom(offset: number): { text?: string } }
      }
    }
  }>('subprocess')
  const resolved = new Map<string, string>()

  /** Resolve one executable, caching the provider's answer. */
  async function resolveExecutable(program: string): Promise<string> {
    const cached = resolved.get(program)
    if (cached !== undefined) return cached
    let executable = program
    if (subprocess !== undefined && typeof subprocess.resolveExecutable === 'function') {
      try {
        const found = await subprocess.resolveExecutable(program)
        if (typeof found === 'string' && found.length > 0) executable = found
      } catch (error) {
        throw new CommandError(
          'system/executable-missing',
          `${program} was not found on this computer: ${errorMessage(error)}`,
          { program },
        )
      }
    }
    resolved.set(program, executable)
    return executable
  }

  /**
   * Run one program to completion.
   * @param program executable name or path.
   * @param args arguments, never shell-interpreted.
   * @param runOptions working directory, limits, cancellation, and line reporting.
   */
  async function run(program: string, args: string[], runOptions: RunOptions = {}): Promise<RunResult> {
    const executable = await resolveExecutable(program)
    const cwd = runOptions.cwd ?? process.cwd()
    const maxBytes = runOptions.maxBytes ?? 4 * 1024 * 1024
    const env = { ...GIT_ENV, ...(runOptions.env ?? {}) }
    const limit = Math.max(1000, Number(runOptions.timeoutMs) || timeoutMs)
    const deadline = AbortSignal.timeout(limit)
    const signal = runOptions.signal === undefined ? deadline : AbortSignal.any([runOptions.signal, deadline])
    const onLine = runOptions.onLine

    if (subprocess !== undefined && typeof subprocess.spawn === 'function') {
      try {
        const handle = subprocess.spawn({
          argv: [executable, ...args],
          cwd,
          stdio: {
            stdin: runOptions.stdin === undefined ? 'ignore' : { data: runOptions.stdin },
            stdout: { maxBytes },
            stderr: { maxBytes: STDERR_BYTES },
          },
          graceMs: TERMINATE_GRACE_MS,
          signal,
          env,
        })

        // The subprocess service collects output while the child runs; draining
        // the collectors on a timer turns that into a live progress log.
        const offsets = { stdout: 0, stderr: 0 }
        const partial = { stdout: '', stderr: '' }
        const drain = (): void => {
          if (onLine === undefined) return
          for (const stream of ['stdout', 'stderr'] as const) {
            const collector = stream === 'stdout' ? handle.collected?.stdout : handle.collected?.stderr
            if (collector === undefined) continue
            const chunk = collector.readFrom(offsets[stream])
            offsets[stream] += (chunk.text ?? '').length
            if (chunk.text === undefined || chunk.text.length === 0) continue
            const joined = partial[stream] + chunk.text
            const lines = joined.split(/\r?\n/)
            partial[stream] = lines.pop() ?? ''
            for (const line of lines) {
              if (line.length > 0) onLine(stream, line)
            }
          }
        }
        const timer = onLine === undefined ? undefined : setInterval(drain, OUTPUT_POLL_MS)
        let outcome: { exitCode?: number } | undefined
        try {
          outcome = await handle.done
        } finally {
          if (timer !== undefined) clearInterval(timer)
          drain()
          if (onLine !== undefined) {
            for (const stream of ['stdout', 'stderr'] as const) {
              if (partial[stream].length > 0) onLine(stream, partial[stream])
              partial[stream] = ''
            }
          }
        }
        const stdout = handle.collected?.stdout?.readFrom(0) ?? { text: '', lossy: false }
        const stderr = handle.collected?.stderr?.readFrom(0)?.text ?? ''
        if (deadline.aborted && !runOptions.signal?.aborted) {
          throw new CommandError('system/timeout', `${program} did not answer within ${limit} ms`, { program })
        }
        return {
          code: typeof outcome?.exitCode === 'number' ? outcome.exitCode : 1,
          stdout: stdout.text ?? '',
          stderr,
          truncated: stdout.lossy === true,
        }
      } catch (error) {
        if (error instanceof CommandError) throw error
        logger.warn('git: %s %s failed: %s', program, args[0] ?? '', errorMessage(error))
        throw new CommandError('system/exec-failed', `${program} could not run: ${errorMessage(error)}`, { program })
      }
    }

    return await new Promise<RunResult>((settle, rejectPromise) => {
      const child = execFile(
        executable,
        args,
        {
          cwd,
          env: { ...process.env, ...env },
          encoding: 'utf8',
          maxBuffer: Math.max(64 * 1024, maxBytes),
          timeout: limit,
          windowsHide: true,
          ...(runOptions.signal === undefined ? {} : { signal: runOptions.signal }),
        },
        (error, stdout, stderr) => {
          const code = (error as { code?: string | number } | null)?.code
          if (code === 'ENOENT' || code === 'EACCES') {
            rejectPromise(new CommandError(
              'system/executable-missing',
              `${program} was not found on this computer`,
              { program },
            ))
            return
          }
          const truncated = code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
          const text = stdout ?? ''
          const err = stderr ?? ''
          if (onLine !== undefined) {
            for (const line of text.split(/\r?\n/)) if (line.length > 0) onLine('stdout', line)
            for (const line of err.split(/\r?\n/)) if (line.length > 0) onLine('stderr', line)
          }
          settle({
            code: truncated ? 0 : (typeof code === 'number' ? code : error ? 1 : 0),
            stdout: text,
            stderr: err,
            truncated,
          })
        },
      )
      if (runOptions.stdin !== undefined && child.stdin !== null) child.stdin.end(runOptions.stdin)
    })
  }

  return {
    run,
    backend: subprocess !== undefined && typeof subprocess.spawn === 'function' ? 'subprocess' : 'child_process',
  }
}

/* ------------------------------------------------------------------ */
/* Failure classification                                              */
/* ------------------------------------------------------------------ */

/** The fixed reasons a git command fails for, as t3code names them. */
export type GitFailureReason =
  | 'authentication_failed'
  | 'branch_already_exists'
  | 'branch_checked_out_in_worktree'
  | 'config_locked'
  | 'host_key_unverified'
  | 'not_a_repository'
  | 'path_already_exists'
  | 'push_rejected_by_remote'
  | 'push_rejected_non_fast_forward'
  | 'ref_not_found'
  | 'remote_unreachable'
  | 'tag_would_be_clobbered'

/**
 * Classify one git failure from its stderr.
 *
 * Only diagnostic lines are inspected, and the matched text never reaches the
 * user: stderr can echo credentials from argv and remote URLs.
 *
 * @param stderr what the command printed.
 */
export function classifyGitFailure(stderr: string): GitFailureReason | null {
  const diagnostic = String(stderr ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(?:fatal|error):|^!\s|^\s+!\s/.test(line)
      || /Permission denied \((?:publickey|password|keyboard-interactive)\)|Permission denied, please try again|Host key verification failed/.test(line))
    .filter((line) => !line.startsWith('remote:'))
    .join('\n')
    .toLowerCase()
  if (diagnostic.length === 0) return null
  if (diagnostic.includes('not a git repository')) return 'not_a_repository'

  const table: Array<[GitFailureReason, RegExp]> = [
    ['tag_would_be_clobbered', /would clobber existing tag/],
    ['branch_checked_out_in_worktree', /is already used by worktree at|is already checked out at/],
    ['branch_already_exists', /a branch named .+ already exists/],
    ['config_locked', /could not lock config file .+: file exists/],
    ['authentication_failed', /authentication failed|could not read username|could not read password|permission denied \((?:publickey|password|keyboard-interactive)\)|permission denied, please try again/],
    ['host_key_unverified', /host key verification failed/],
    ['remote_unreachable', /could not read from remote repository|does not appear to be a git repository|repository .+ not found/],
    ['path_already_exists', /fatal: '[^']+' already exists|destination path .+ already exists/],
    ['ref_not_found', /^fatal: (?:invalid reference: |not a valid object name|needed a single revision|bad revision |'.+' is not a commit)/m],
    ['push_rejected_by_remote', /^[ \t]*![ \t]+\[remote rejected\]/m],
    ['push_rejected_non_fast_forward', /\[rejected\].*\((?:non-fast-forward|fetch first)\)[\s\S]*error: failed to push some refs/],
  ]
  for (const [reason, pattern] of table) {
    if (pattern.test(diagnostic)) {
      if (reason === 'ref_not_found' && /^error: .+(?:, not a commit|expected commit type)/m.test(diagnostic)) continue
      return reason
    }
  }
  return null
}

/** The sentence a classified failure deserves, when one does. */
export function failureReasonMessage(reason: GitFailureReason | null): string | null {
  switch (reason) {
    case 'push_rejected_by_remote':
      return 'The remote rejected the push. Push this branch from a terminal to see the server message.'
    case 'push_rejected_non_fast_forward':
      return 'The remote has commits this branch does not have. Pull or rebase, then push again.'
    case 'config_locked':
      return 'Another Git process kept the repository config locked. Wait for it to finish, then retry.'
    case 'authentication_failed':
      return 'Git could not authenticate with the remote. Sign in to the code host and retry.'
    case 'host_key_unverified':
      return 'The remote host key is not verified. Add it to your known hosts and retry.'
    case 'remote_unreachable':
      return 'Git could not reach the remote repository. Check the network and the remote URL.'
    case 'branch_already_exists':
      return 'A branch with that name already exists.'
    case 'branch_checked_out_in_worktree':
      return 'That branch is already checked out in another worktree.'
    case 'not_a_repository':
      return 'This folder is not a Git repository.'
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** The branch and remote a change-request action addresses. */
export interface GitContext {
  branch: string | null
  remote: GitRemoteInfo | null
}

/** The default branch of a repository, as the code host sees it. */
export interface DefaultBranchInfo {
  name: string | null
  /** The ref the branch compares against: `<remote>/<name>` when it exists. */
  comparisonRef: string | null
}

/**
 * Read the repository's default branch, preferring the remote's HEAD.
 *
 * @param runner command runner.
 * @param options repository root, chosen remote, cancellation.
 */
export async function readDefaultBranch(
  runner: GitRunner,
  options: { root: string; remote?: string | null; signal?: AbortSignal },
): Promise<DefaultBranchInfo> {
  const { root, signal } = options
  const candidates: string[] = []
  if (options.remote !== undefined && options.remote !== null && options.remote.length > 0) {
    candidates.push(`refs/remotes/${options.remote}/HEAD`)
  }
  candidates.push('refs/remotes/origin/HEAD')
  for (const ref of candidates) {
    const result = await runner.run('git', ['symbolic-ref', '--quiet', ref], { cwd: root, signal })
    if (result.code !== 0) continue
    const remote = ref.split('/')[2] ?? 'origin'
    const name = parseDefaultBranch(result.stdout, remote)
    if (name !== null) return { name, comparisonRef: `${remote}/${name}` }
  }
  // No remote HEAD: accept a conventional local default branch.
  const local = await runner.run('git', ['branch', '--list', 'main', 'master', '--format=%(refname:short)'], {
    cwd: root,
    signal,
  })
  if (local.code === 0) {
    const name = String(local.stdout ?? '').split('\n').map((line) => line.trim()).find((line) => line.length > 0)
    if (name !== undefined) return { name, comparisonRef: name }
  }
  return { name: null, comparisonRef: null }
}

/**
 * Read the repository's relation to its default branch: how many commits it
 * adds, and how many lines it changes.
 *
 * @param runner command runner.
 * @param options repository root, branch, default branch info, cancellation.
 */
export async function readBranchChanges(
  runner: GitRunner,
  options: {
    root: string
    branch: string | null
    defaultBranch: DefaultBranchInfo
    signal?: AbortSignal
  },
): Promise<{ aheadOfDefault: number; branchChanges: GitBranchChanges | null }> {
  const { root, branch, defaultBranch, signal } = options
  if (branch === null || defaultBranch.name === null) return { aheadOfDefault: 0, branchChanges: null }
  if (branch === defaultBranch.name) return { aheadOfDefault: 0, branchChanges: null }

  const bases = [defaultBranch.comparisonRef, defaultBranch.name].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  )
  for (const base of bases) {
    const mergeBase = await runner.run('git', ['merge-base', base, 'HEAD'], { cwd: root, signal })
    const sha = mergeBase.code === 0 ? String(mergeBase.stdout ?? '').trim() : ''
    if (sha.length === 0) continue
    const [count, stats] = await Promise.all([
      runner.run('git', ['rev-list', '--count', `${sha}..HEAD`], { cwd: root, signal }),
      runner.run('git', ['diff', '--numstat', '-z', '-M', sha], { cwd: root, signal }),
    ])
    const ahead = count.code === 0 ? Number.parseInt(String(count.stdout ?? '').trim(), 10) || 0 : 0
    let insertions = 0
    let deletions = 0
    if (stats.code === 0) {
      for (const entry of parseNumstatZ(stats.stdout)) {
        insertions += entry.additions
        deletions += entry.deletions
      }
    }
    return {
      aheadOfDefault: ahead,
      branchChanges: { baseRef: defaultBranch.name, insertions, deletions },
    }
  }
  return { aheadOfDefault: 0, branchChanges: null }
}

/** Everything the panel's overview answers. */
export interface OverviewRead {
  repo: GitRepoInfo
  files: GitFileChange[]
  stats: GitStats
  commits: GitCommitSummary[]
  stash: number
  refreshMs: number
  branchChanges: GitBranchChanges | null
  aheadOfDefault: number
}

/** The subset of config a read needs. */
export interface ReadConfig {
  remote: string
  logLimit: number
  refreshMs: number
  maxDiffBytes: number
  maxUntrackedBytes: number
  maxUntrackedFiles: number
  commandTimeoutMs?: number
}

/**
 * Read everything the panel header and the changes view need.
 *
 * @param runner command runner.
 * @param options repository root, config, cancellation.
 */
export async function readOverview(
  runner: GitRunner,
  options: { root: string; config: ReadConfig; signal?: AbortSignal },
): Promise<OverviewRead> {
  const { root, config, signal } = options
  const limit = Number(config.logLimit) || 20
  const [status, remotes, stash, stagedStats, unstagedStats, log] = await Promise.all([
    runner.run('git', ['status', '--porcelain=v2', '--branch', '-z', '--untracked-files=all'], {
      cwd: root,
      signal,
      maxBytes: 8 * 1024 * 1024,
    }),
    runner.run('git', ['remote', '-v'], { cwd: root, signal }),
    runner.run('git', ['stash', 'list', '--format=%gd'], { cwd: root, signal }),
    runner.run('git', ['diff', '--cached', '--numstat', '-z', '-M'], { cwd: root, signal }),
    runner.run('git', ['diff', '--numstat', '-z', '-M'], { cwd: root, signal }),
    runner.run('git', [
      'log',
      '-n',
      String(limit),
      '--no-show-signature',
      '--date=iso-strict',
      '--format=%H%x1f%h%x1f%an%x1f%aI%x1f%D%x1f%s',
      '-z',
    ], { cwd: root, signal }),
  ])

  if (status.code !== 0) {
    throw new CommandError('git/failed', String(status.stderr ?? '').trim() || 'git status failed')
  }

  const parsed = parsePorcelainV2(status.stdout)
  const staged = parseNumstatZ(stagedStats.code === 0 ? stagedStats.stdout : '')
  const unstaged = parseNumstatZ(unstagedStats.code === 0 ? unstagedStats.stdout : '')
  const numbered = mergeLineCounts(parsed.files, [...staged, ...unstaged])
  const files = await attachUntrackedCounts(numbered, root, config)

  const remote = pickRemote(remotes.code === 0 ? remotes.stdout : '', {
    preferred: config.remote,
    upstream: parsed.branch.upstream,
  })
  const forge = remote === undefined ? undefined : parseRemoteUrl(remote.url)
  const commits = log.code === 0 ? parseLog(log.stdout) : []
  const defaultBranch = await readDefaultBranch(runner, {
    root,
    remote: remote?.name ?? null,
    signal,
  })
  const isDefaultRef = parsed.branch.head !== null
    && (defaultBranch.name === null
      ? parsed.branch.head === 'main' || parsed.branch.head === 'master'
      : parsed.branch.head === defaultBranch.name)
  const relation = isDefaultRef
    ? { aheadOfDefault: 0, branchChanges: null }
    : await readBranchChanges(runner, {
        root,
        branch: parsed.branch.head,
        defaultBranch,
        signal,
      })

  return {
    repo: {
      root,
      name: basename(root),
      branch: parsed.branch.head,
      detached: parsed.branch.detached,
      unborn: parsed.branch.unborn,
      oid: parsed.branch.oid,
      shortOid: typeof parsed.branch.oid === 'string' ? parsed.branch.oid.slice(0, 8) : null,
      upstream: parsed.branch.upstream,
      ahead: parsed.branch.ahead,
      behind: parsed.branch.behind,
      hasUpstream: parsed.branch.upstream !== null,
      isDefaultRef,
      aheadOfDefault: relation.aheadOfDefault,
      defaultBranch: defaultBranch.name,
      remote: remote === undefined
        ? null
        : {
            name: remote.name,
            url: remote.url,
            provider: forge?.provider ?? 'other',
            host: forge?.host ?? null,
            owner: forge?.owner ?? null,
            repository: forge?.repository ?? null,
            slug: forge?.slug ?? null,
          },
    },
    files,
    stats: summarizeChanges(files),
    commits,
    stash: stash.code === 0 ? parseLogLines(stash.stdout).length : 0,
    refreshMs: config.refreshMs,
    branchChanges: relation.branchChanges,
    aheadOfDefault: relation.aheadOfDefault,
  }
}

/**
 * Read just what the change-request views need: the tracked branch and the
 * remote the code host is addressed through.
 *
 * @param runner command runner.
 * @param options repository root, config, cancellation.
 */
export async function readContext(
  runner: GitRunner,
  options: { root: string; config: { remote: string }; signal?: AbortSignal },
): Promise<GitContext> {
  const { root, config, signal } = options
  const [remotes, head] = await Promise.all([
    runner.run('git', ['remote', '-v'], { cwd: root, signal }),
    runner.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, signal }),
  ])
  const name = head.code === 0 ? String(head.stdout ?? '').trim() : ''
  const chosen = pickRemote(remotes.code === 0 ? remotes.stdout : '', { preferred: config.remote })
  const parsed = chosen === undefined ? undefined : parseRemoteUrl(chosen.url)
  return {
    branch: name.length > 0 && name !== 'HEAD' ? name : null,
    remote: chosen === undefined
      ? null
      : {
          name: chosen.name,
          url: chosen.url,
          provider: parsed?.provider ?? 'other',
          host: parsed?.host ?? null,
          owner: parsed?.owner ?? null,
          repository: parsed?.repository ?? null,
          slug: parsed?.slug ?? null,
        },
  }
}

/**
 * Read one file's patch.
 *
 * An untracked file has no diff against the index, so its content becomes a
 * whole-file insertion the panel can render like any other patch.
 *
 * @param runner command runner.
 * @param options repository root, path, sides, config, cancellation.
 */
export async function readFilePatch(
  runner: GitRunner,
  options: {
    root: string
    path: string
    staged?: boolean
    untracked?: boolean
    config: { maxDiffBytes: number; maxUntrackedBytes: number }
    signal?: AbortSignal
  },
): Promise<FileDiff> {
  const { root, config, signal } = options
  const staged = options.staged === true
  const untracked = options.untracked === true
  const relativePath = normalizeRelativePath(root, options.path)
  const maxBytes = Number(config.maxDiffBytes) || 393216

  if (untracked) {
    const preview = await readFilePreview(join(root, relativePath), Math.min(maxBytes, Number(config.maxUntrackedBytes) || 131072))
    return {
      path: relativePath,
      staged: false,
      untracked: true,
      binary: preview.binary,
      truncated: preview.truncated,
      tooLarge: preview.tooLarge === true,
      files: untrackedPatch(relativePath, preview.text, { binary: preview.binary, truncated: preview.truncated }),
    }
  }

  const args = ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '--submodule=short', '--unified=3', '-M']
  if (staged) args.push('--cached')
  args.push('--', relativePath)
  const result = await runner.run('git', args, {
    cwd: root,
    signal,
    env: { GIT_LITERAL_PATHSPECS: '1' },
    maxBytes,
  })
  if (result.code !== 0) {
    throw new CommandError('git/failed', String(result.stderr ?? '').trim() || 'git diff failed', { path: relativePath })
  }
  const files = parsePatch(result.stdout)
  return {
    path: relativePath,
    staged,
    untracked: false,
    binary: files.some((file) => file.binary === true),
    truncated: result.truncated === true,
    files,
  }
}

/**
 * Read every changed file's patch in one answer, for the stacked diff view.
 *
 * `working` compares the work tree and the index against HEAD, so staged and
 * unstaged edits arrive together; `branch` compares the branch range against
 * the merge base with the default branch. Untracked files are appended as
 * whole-file insertions when asked for, within the configured scan limits.
 *
 * @param runner command runner.
 * @param options repository root, scope, untracked switch, config, cancellation.
 */
export async function readDiffBundle(
  runner: GitRunner,
  options: {
    root: string
    scope: 'working' | 'branch'
    includeUntracked?: boolean
    config: {
      maxDiffBytes: number
      maxUntrackedBytes: number
      maxUntrackedFiles: number
      remote: string
    }
    signal?: AbortSignal
  },
): Promise<{
  scope: 'working' | 'branch'
  baseRef: string | null
  files: FileDiff[]
  truncated: boolean
  totalFiles: number
}> {
  const { root, config, signal } = options
  const maxBytes = Number(config.maxDiffBytes) || 393216
  let baseRef: string | null = null
  let patchResult: RunResult

  if (options.scope === 'branch') {
    const defaultBranch = await readDefaultBranch(runner, { root, remote: config.remote, signal })
    baseRef = defaultBranch.name
    const bases = [defaultBranch.comparisonRef, defaultBranch.name].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
    let mergeBase = ''
    for (const base of bases) {
      const result = await runner.run('git', ['merge-base', base, 'HEAD'], { cwd: root, signal })
      const sha = result.code === 0 ? String(result.stdout ?? '').trim() : ''
      if (sha.length > 0) {
        mergeBase = sha
        break
      }
    }
    if (mergeBase.length === 0) {
      throw new CommandError('diff/no-base', 'Cannot compare this branch with its default branch')
    }
    patchResult = await runner.run('git', [
      'diff',
      '--no-color',
      '--no-ext-diff',
      '--no-textconv',
      '--submodule=short',
      '--unified=3',
      '-M',
      mergeBase,
    ], { cwd: root, signal, maxBytes })
  } else {
    const head = await runner.run('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], { cwd: root, signal })
    const args = ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '--submodule=short', '--unified=3', '-M']
    if (head.code === 0) {
      args.push('HEAD')
    }
    patchResult = await runner.run('git', args, { cwd: root, signal, maxBytes })
    if (head.code !== 0) {
      // An unborn branch has nothing to diff HEAD against: show the index and
      // the work tree separately, which together describe everything new.
      const [cached, worktree] = await Promise.all([
        runner.run('git', ['diff', '--cached', '--no-color', '--no-ext-diff', '--no-textconv', '--unified=3', '-M'], {
          cwd: root,
          signal,
          maxBytes,
        }),
        runner.run('git', ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '--unified=3', '-M'], {
          cwd: root,
          signal,
          maxBytes,
        }),
      ])
      patchResult = {
        code: cached.code === 0 ? 0 : cached.code,
        stdout: `${cached.stdout ?? ''}${worktree.stdout ?? ''}`,
        stderr: `${cached.stderr ?? ''}${worktree.stderr ?? ''}`,
        truncated: cached.truncated === true || worktree.truncated === true,
      }
    }
  }

  if (patchResult.code !== 0) {
    throw new CommandError(
      'git/failed',
      String(patchResult.stderr ?? '').trim() || 'git diff failed',
    )
  }

  const files: FileDiff[] = parsePatch(patchResult.stdout)
    .filter((file) => file.path !== null)
    .map((file) => ({
      path: file.path ?? '',
      staged: false,
      untracked: false,
      binary: file.binary,
      truncated: patchResult.truncated === true,
      files: [file],
    }))

  let truncated = patchResult.truncated === true
  let totalFiles = files.length

  if (options.includeUntracked !== false) {
    const untracked = await runner.run('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
      cwd: root,
      signal,
    })
    const paths = untracked.code === 0
      ? nulFields(untracked.stdout).slice(0, Math.max(0, Number(config.maxUntrackedFiles) || 0))
      : []
    totalFiles += untracked.code === 0 ? nulFields(untracked.stdout).length : 0
    if (untracked.code === 0 && nulFields(untracked.stdout).length > paths.length) truncated = true
    for (const path of paths) {
      try {
        const preview = await readFilePreview(join(root, path), Math.min(maxBytes, Number(config.maxUntrackedBytes) || 131072))
        files.push({
          path,
          staged: false,
          untracked: true,
          binary: preview.binary,
          truncated: preview.truncated,
          tooLarge: preview.tooLarge === true,
          files: untrackedPatch(path, preview.text, { binary: preview.binary, truncated: preview.truncated }),
        })
      } catch {
        // A file removed between listing and reading simply disappears.
      }
    }
  }

  files.sort((left, right) => left.path.localeCompare(right.path))
  return { scope: options.scope, baseRef, files, truncated, totalFiles }
}

/**
 * Read one commit: its metadata, file statistics, and patch.
 * @param runner command runner.
 * @param options repository root, hash, config, cancellation.
 */
export async function readCommit(
  runner: GitRunner,
  options: { root: string; hash: string; config: { maxDiffBytes: number }; signal?: AbortSignal },
): Promise<GitCommitDetail> {
  const { root, config, signal } = options
  const revision = String(options.hash ?? '').trim()
  if (!/^[0-9a-fA-F]{4,64}$/.test(revision)) {
    throw new CommandError('input/invalid', 'Invalid commit hash', { hash: revision })
  }
  const maxBytes = Number(config.maxDiffBytes) || 393216
  const [meta, stats, patch] = await Promise.all([
    runner.run('git', ['show', '-s', '--no-show-signature', '--date=iso-strict', '--format=%H%x1f%h%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%b', revision], { cwd: root, signal }),
    runner.run('git', ['show', '--numstat', '-z', '-M', '--format=', revision], { cwd: root, signal }),
    runner.run('git', ['show', '--no-color', '--no-ext-diff', '--no-textconv', '--format=', '--unified=3', '-M', revision], {
      cwd: root,
      signal,
      maxBytes,
    }),
  ])
  if (meta.code !== 0) {
    throw new CommandError('git/unknown-commit', String(meta.stderr ?? '').trim() || `Cannot read commit ${revision}`)
  }
  const fields = String(meta.stdout ?? '').trim().split('\x1f')
  const files = parseNumstatZ(stats.code === 0 ? stats.stdout : '').map((entry) => ({
    path: entry.path,
    origPath: entry.origPath,
    additions: entry.additions,
    deletions: entry.deletions,
    binary: entry.binary,
  }))
  return {
    commit: {
      hash: fields[0] ?? revision,
      short: fields[1] ?? revision.slice(0, 8),
      author: fields[2] ?? '',
      email: fields[3] ?? '',
      date: fields[4] ?? '',
      subject: fields[5] ?? '',
      body: fields.slice(6).join('\x1f').trim(),
    },
    files,
    patches: parsePatch(patch.code === 0 ? patch.stdout : ''),
    truncated: patch.truncated === true,
  }
}

/**
 * Read the local branch list, as the older views expect it.
 * @param runner command runner.
 * @param options repository root, limit, cancellation.
 */
export async function readBranches(
  runner: GitRunner,
  options: { root: string; limit?: number; signal?: AbortSignal },
): Promise<ParsedBranch[]> {
  const { root, signal } = options
  const limit = options.limit ?? 30
  const result = await runner.run('git', [
    'for-each-ref',
    `--count=${limit}`,
    '--sort=-committerdate',
    '--format=%(refname:short)%1f%(objectname:short)%1f%(upstream:short)%1f%(committerdate:iso-strict)%1f%(contents:subject)%1f%(HEAD)',
    'refs/heads',
  ], { cwd: root, signal })
  if (result.code !== 0) {
    throw new CommandError('git/failed', String(result.stderr ?? '').trim() || 'git for-each-ref failed')
  }
  return parseBranches(result.stdout)
}

/**
 * Read every ref the branch picker offers: local branches first, then the
 * remote-tracking branches a checkout could start from.
 *
 * @param runner command runner.
 * @param options repository root, limit, default branch, refresh, cancellation.
 */
export async function readBranchRefs(
  runner: GitRunner,
  options: {
    root: string
    limit?: number
    defaultBranch?: string | null
    refresh?: boolean
    remote?: string | null
    signal?: AbortSignal
    timeoutMs?: number
  },
): Promise<{ branches: GitBranch[]; defaultBranch: string | null }> {
  const { root, signal } = options
  const limit = Math.min(200, Math.max(1, options.limit ?? 120))
  if (options.refresh === true) {
    const remote = options.remote !== undefined && options.remote !== null && options.remote.length > 0
      ? options.remote
      : undefined
    // A refresh is best effort: an offline machine still lists what it has.
    await runner.run('git', remote === undefined ? ['fetch', '--prune', '--no-tags'] : ['fetch', '--prune', '--no-tags', remote], {
      cwd: root,
      signal,
      timeoutMs: options.timeoutMs ?? 30000,
      maxBytes: 256 * 1024,
    }).catch(() => undefined)
  }
  const result = await runner.run('git', [
    'for-each-ref',
    `--count=${limit}`,
    '--sort=-committerdate',
    '--format=%(refname)%1f%(refname:short)%1f%(upstream:short)%1f%(committerdate:iso-strict)%1f%(contents:subject)%1f%(HEAD)%1f%(refname:strip=2)',
    'refs/heads',
    'refs/remotes',
  ], { cwd: root, signal })
  if (result.code !== 0) {
    throw new CommandError('git/failed', String(result.stderr ?? '').trim() || 'git for-each-ref failed')
  }
  const defaultBranch = options.defaultBranch !== undefined && options.defaultBranch !== null
    ? options.defaultBranch
    : (await readDefaultBranch(runner, { root, remote: options.remote ?? null, signal })).name
  const branches = parseBranchRefs(result.stdout, defaultBranch).filter(
    (branch) => !branch.isRemote || !branch.name.endsWith('/HEAD'),
  )
  return { branches, defaultBranch }
}

/**
 * Read the commit log.
 * @param runner command runner.
 * @param options repository root, limit, cancellation.
 */
export async function readLog(
  runner: GitRunner,
  options: { root: string; limit?: number; signal?: AbortSignal },
): Promise<GitCommitSummary[]> {
  const { root, signal } = options
  const limit = options.limit ?? 50
  const result = await runner.run('git', [
    'log',
    '-n',
    String(limit),
    '--no-show-signature',
    '--date=iso-strict',
    '--format=%H%x1f%h%x1f%an%x1f%aI%x1f%D%x1f%s',
    '-z',
  ], { cwd: root, signal })
  if (result.code !== 0) {
    if (/(does not have any commits yet|bad default revision)/i.test(String(result.stderr ?? ''))) return []
    throw new CommandError('git/failed', String(result.stderr ?? '').trim() || 'git log failed')
  }
  return parseLog(result.stdout)
}

/**
 * Count the lines of every untracked file the panel lists, within the scan
 * limits, so an untracked file shows a size like any other change.
 *
 * @param files changed-file records.
 * @param root repository root.
 * @param config feature configuration.
 */
async function attachUntrackedCounts(
  files: GitFileChange[],
  root: string,
  config: { maxUntrackedFiles: number; maxUntrackedBytes: number },
): Promise<GitFileChange[]> {
  const budget = Math.max(0, Number(config.maxUntrackedFiles) || 0)
  const maxBytes = Number(config.maxUntrackedBytes) || 131072
  const untracked = files.filter((file) => file.untracked === true).slice(0, budget)
  await Promise.all(untracked.map(async (file) => {
    try {
      const preview = await readFilePreview(join(root, file.path), maxBytes)
      file.additions = preview.binary ? 0 : countLines(preview.text)
      file.binary = preview.binary
      file.tooLarge = preview.tooLarge === true
    } catch {
      // A file removed between status and read keeps its zero counts.
    }
  }))
  return files
}

/** The start of a file, with truncation and binary content told apart. */
interface FilePreview {
  text: string
  truncated: boolean
  binary: boolean
  tooLarge: boolean
  size: number
}

/**
 * Read the start of a file, telling truncation and binary content apart.
 * @param file absolute path.
 * @param maxBytes inclusive reading cap.
 */
async function readFilePreview(file: string, maxBytes: number): Promise<FilePreview> {
  const info = await stat(file)
  if (!info.isFile()) return { text: '', truncated: false, binary: true, tooLarge: false, size: 0 }
  const tooLarge = info.size > maxBytes
  const length = Math.max(0, Math.min(info.size, maxBytes))
  const handle = await open(file, 'r')
  try {
    const buffer = Buffer.alloc(length)
    let read = 0
    while (read < length) {
      const chunk = await handle.read(buffer, read, length - read, read)
      if (chunk.bytesRead <= 0) break
      read += chunk.bytesRead
    }
    const bytes = buffer.subarray(0, read)
    const sniff = bytes.subarray(0, Math.min(SNIFF_BYTES, bytes.length))
    if (sniff.includes(0)) return { text: '', truncated: tooLarge, binary: true, tooLarge, size: info.size }
    return {
      text: bytes.toString('utf8'),
      truncated: tooLarge,
      binary: false,
      tooLarge,
      size: info.size,
    }
  } finally {
    await handle.close()
  }
}

/**
 * Count the lines of a text, ignoring the empty tail after a final newline.
 * @param text file content.
 */
function countLines(text: string): number {
  if (text.length === 0) return 0
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines.length
}

/**
 * Reject a path that would leave the repository or reach outside it.
 * @param root repository root.
 * @param path repository-relative path.
 */
function normalizeRelativePath(root: string, path: string): string {
  const text = String(path ?? '').trim()
  if (text.length === 0 || text.includes('\0') || isAbsolute(text)) {
    throw new CommandError('input/invalid', 'Invalid file path', { path: text })
  }
  const normalized = text.split(sep).join('/').replace(/^\.\//, '')
  const target = resolve(root, normalized)
  const inside = relative(root, target)
  if (inside.startsWith('..') || isAbsolute(inside)) {
    throw new CommandError('input/invalid', 'File path is outside the repository', { path: text })
  }
  return normalized
}

/**
 * Split the stash list into one entry per line.
 * @param raw `git stash list` output.
 */
function parseLogLines(raw: string | null | undefined): string[] {
  return String(raw ?? '').split('\n').filter((line) => line.length > 0)
}

/** Last path segment, tolerant of both separator styles. */
function basename(path: string): string {
  const normalized = String(path).replace(/[\\/]+$/, '')
  const index = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  return index < 0 ? normalized : normalized.slice(index + 1)
}

/** Message of an unknown thrown value. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** First non-empty line of a command's stderr. */
function firstLine(text: string | null | undefined): string {
  return String(text ?? '').split('\n').map((line) => line.trim()).find((line) => line.length > 0) ?? ''
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/**
 * One path as a pathspec.
 *
 * Every write runs with `GIT_LITERAL_PATHSPECS=1`, so the path is literal and
 * cannot be read as glob or magic; the commands run at the repository root, so
 * a repository-relative path is already `top`-relative.
 */
function literal(path: string): string {
  return path
}

/** Throw one classified git failure for a write command. */
function throwWriteFailure(operation: string, result: RunResult, details: Record<string, unknown> = {}): never {
  const reason = classifyGitFailure(result.stderr)
  const friendly = failureReasonMessage(reason)
  const detail = friendly ?? (firstLine(result.stderr) || `git exited with status ${result.code}`)
  throw new CommandError(`git/${operation}`, detail, {
    ...details,
    reason: reason ?? undefined,
    exitCode: result.code,
  })
}

/**
 * Push the checked-out branch and set its upstream.
 *
 * @param runner command runner.
 * @param options repository root, remote, branch, cancellation.
 * @throws {CommandError} when Git refuses the push.
 */
export async function pushBranch(
  runner: GitRunner,
  options: { root: string; remote: string; branch: string; timeoutMs?: number; signal?: AbortSignal },
): Promise<{ remote: string; branch: string }> {
  const { root, remote, branch, timeoutMs, signal } = options
  if (typeof branch !== 'string' || branch.trim().length === 0) {
    throw new CommandError('pr/detached', 'The current branch has no name, so it cannot be pushed', { branch })
  }
  const result = await runner.run('git', ['push', '--set-upstream', remote, `HEAD:refs/heads/${branch}`], {
    cwd: root,
    signal,
    timeoutMs,
    maxBytes: 1024 * 1024,
  })
  if (result.code !== 0) {
    throwWriteFailure('push', result, { remote, branch })
  }
  return { remote, branch }
}

/** The outcome of a push. */
export interface PushOutcome {
  status: 'pushed' | 'skipped_up_to_date'
  branch: string
  upstream: string | null
  setUpstream: boolean
}

/**
 * Push the current branch, setting its upstream when it has none.
 *
 * Only an upstream of the same name is pushed over. A branch can otherwise track
 * a branch of another name — a worktree branch cut from `origin/main` inherits
 * that upstream, for instance — and publishing `HEAD` under the tracked name
 * would put the branch's commits straight onto that branch, which is how a
 * "create pull request" ended up writing to the default branch. Every such
 * branch is published under its own name instead.
 *
 * @param runner command runner.
 * @param options repository root, preferred remote, branch, cancellation.
 */
export async function pushCurrentBranch(
  runner: GitRunner,
  options: {
    root: string
    remote?: string | null
    branch: string
    setUpstream?: boolean
    timeoutMs?: number
    signal?: AbortSignal
    onLine?: (stream: OutputStream, text: string) => void
  },
): Promise<PushOutcome> {
  const { root, branch, signal, timeoutMs, onLine } = options
  const upstreamRead = await runner.run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], {
    cwd: root,
    signal,
  })
  const upstream = upstreamRead.code === 0 ? String(upstreamRead.stdout ?? '').trim() : ''
  const tracked = upstreamRef(upstream)
  if (tracked !== null && tracked.branch === branch) {
    const divergence = await runner.run('git', ['rev-list', '--left-right', '--count', `HEAD...@{upstream}`], {
      cwd: root,
      signal,
    })
    const counts = divergence.code === 0 ? parseAheadBehind(divergence.stdout) : { ahead: 1, behind: 0 }
    if (counts.ahead === 0 && counts.behind === 0) {
      return { status: 'skipped_up_to_date', branch, upstream, setUpstream: false }
    }
    const result = await runner.run('git', ['push', tracked.remote, `HEAD:refs/heads/${branch}`], {
      cwd: root,
      signal,
      timeoutMs,
      maxBytes: 1024 * 1024,
      onLine,
    })
    if (result.code !== 0) throwWriteFailure('push', result, { branch, upstream })
    return { status: 'pushed', branch, upstream, setUpstream: false }
  }

  const remote = tracked?.remote
    ?? (typeof options.remote === 'string' && options.remote.length > 0 ? options.remote : 'origin')
  const result = await runner.run('git', ['push', '--set-upstream', remote, `HEAD:refs/heads/${branch}`], {
    cwd: root,
    signal,
    timeoutMs,
    maxBytes: 1024 * 1024,
    onLine,
  })
  if (result.code !== 0) throwWriteFailure('push', result, { branch, remote })
  return { status: 'pushed', branch, upstream: `${remote}/${branch}`, setUpstream: true }
}

/**
 * Split one upstream ref name into its remote and branch parts.
 *
 * @param upstream `git rev-parse --abbrev-ref @{upstream}` output, such as `origin/main`.
 * @returns the two parts, or null when the name is not `<remote>/<branch>`.
 */
function upstreamRef(upstream: string): { remote: string; branch: string } | null {
  const name = String(upstream ?? '').trim()
  const slash = name.indexOf('/')
  if (slash <= 0 || slash === name.length - 1) return null
  return { remote: name.slice(0, slash), branch: name.slice(slash + 1) }
}

/** The outcome of a pull. */
export interface PullOutcome {
  status: 'pulled' | 'skipped_up_to_date'
  branch: string
}

/**
 * Pull the current branch, fast-forward only unless a rebase was asked for.
 *
 * @param runner command runner.
 * @param options repository root, branch, rebase, cancellation.
 */
export async function pullCurrentBranch(
  runner: GitRunner,
  options: {
    root: string
    branch: string
    rebase?: boolean
    timeoutMs?: number
    signal?: AbortSignal
    onLine?: (stream: OutputStream, text: string) => void
  },
): Promise<PullOutcome> {
  const { root, branch, signal, timeoutMs, onLine } = options
  const args = options.rebase === true ? ['pull', '--rebase'] : ['pull', '--ff-only']
  const result = await runner.run('git', args, {
    cwd: root,
    signal,
    timeoutMs: timeoutMs ?? 180000,
    maxBytes: 1024 * 1024,
    onLine,
  })
  if (result.code !== 0) throwWriteFailure('pull', result, { branch })
  const text = `${result.stdout}\n${result.stderr}`
  const upToDate = /Already up to date\./i.test(text)
  return { status: upToDate ? 'skipped_up_to_date' : 'pulled', branch }
}

/**
 * Stage exactly these paths.
 * @param runner command runner.
 * @param options repository root, paths, cancellation.
 */
export async function stagePaths(
  runner: GitRunner,
  options: { root: string; paths: string[]; signal?: AbortSignal },
): Promise<string[]> {
  const { root, paths, signal } = options
  if (paths.length === 0) return []
  const result = await runner.run('git', ['add', '-A', '--', ...paths.map(literal)], {
    cwd: root,
    signal,
    env: { GIT_LITERAL_PATHSPECS: '1' },
    maxBytes: 256 * 1024,
  })
  if (result.code !== 0) throwWriteFailure('stage', result, { paths })
  return paths
}

/**
 * Unstage exactly these paths, leaving the work tree untouched.
 * @param runner command runner.
 * @param options repository root, paths, cancellation.
 */
export async function unstagePaths(
  runner: GitRunner,
  options: { root: string; paths: string[]; signal?: AbortSignal },
): Promise<string[]> {
  const { root, paths, signal } = options
  if (paths.length === 0) return []
  const result = await runner.run('git', ['restore', '--staged', '--', ...paths.map(literal)], {
    cwd: root,
    signal,
    env: { GIT_LITERAL_PATHSPECS: '1' },
    maxBytes: 256 * 1024,
  })
  if (result.code === 0) return paths
  // An unborn branch has no HEAD to restore from, so the index entry is dropped instead.
  const fallback = await runner.run('git', ['rm', '--cached', '-r', '-q', '--', ...paths.map(literal)], {
    cwd: root,
    signal,
    env: { GIT_LITERAL_PATHSPECS: '1' },
    maxBytes: 256 * 1024,
  })
  if (fallback.code !== 0) throwWriteFailure('unstage', fallback, { paths })
  return paths
}

/**
 * Discard the work-tree edits of these paths.
 *
 * Untracked files are only deleted when the caller says so, because deleting
 * them cannot be undone.
 *
 * @param runner command runner.
 * @param options repository root, paths, untracked switch, cancellation.
 */
export async function discardPaths(
  runner: GitRunner,
  options: { root: string; paths: string[]; includeUntracked?: boolean; signal?: AbortSignal },
): Promise<string[]> {
  const { root, paths, signal } = options
  if (paths.length === 0) return []
  const tracked = await runner.run('git', ['restore', '--worktree', '--', ...paths.map(literal)], {
    cwd: root,
    signal,
    env: { GIT_LITERAL_PATHSPECS: '1' },
    maxBytes: 256 * 1024,
  })
  if (tracked.code !== 0) {
    // A file that is not in HEAD (a newly added file) cannot be restored, so its
    // index entry is dropped instead; the clean below removes the work tree copy
    // when the caller asked for untracked files too.
    const dropped = await runner.run('git', ['rm', '--cached', '-r', '-q', '--', ...paths.map(literal)], {
      cwd: root,
      signal,
      env: { GIT_LITERAL_PATHSPECS: '1' },
      maxBytes: 256 * 1024,
    })
    if (dropped.code !== 0 && options.includeUntracked !== true) throwWriteFailure('discard', tracked, { paths })
  }
  if (options.includeUntracked === true) {
    const cleaned = await runner.run('git', ['clean', '-f', '-d', '--', ...paths.map(literal)], {
      cwd: root,
      signal,
      env: { GIT_LITERAL_PATHSPECS: '1' },
      maxBytes: 256 * 1024,
    })
    if (cleaned.code !== 0) throwWriteFailure('discard', cleaned, { paths })
  }
  return paths
}

/** What one commit did. */
export interface CommitOutcome {
  status: 'created' | 'skipped_no_changes'
  sha: string
  subject: string
  branch: string | null
}

/**
 * Stage the selected paths (or everything) and commit them.
 *
 * When `paths` is given the index is reset first, so exactly those files are in
 * the commit; a merge in progress cannot be split, because Git needs every
 * resolved file.
 *
 * @param runner command runner.
 * @param options repository root, message, paths, amend, cancellation.
 */
export async function commitChanges(
  runner: GitRunner,
  options: {
    root: string
    message: string
    paths?: string[]
    amend?: boolean
    signal?: AbortSignal
    timeoutMs?: number
    onLine?: (stream: OutputStream, text: string) => void
  },
): Promise<CommitOutcome> {
  const { root, signal, onLine } = options
  const message = String(options.message ?? '').trim()
  if (message.length === 0) throw new CommandError('commit/empty-message', 'A commit message is required')
  const paths = (options.paths ?? []).filter((path) => typeof path === 'string' && path.length > 0)

  if (paths.length > 0) {
    const mergeHead = await runner.run('git', ['rev-parse', '--verify', '--quiet', 'MERGE_HEAD'], { cwd: root, signal })
    if (mergeHead.code === 0) {
      throw new CommandError(
        'commit/merge-in-progress',
        'A merge is in progress. Commit every file to finish the merge.',
      )
    }
    await runner.run('git', ['reset', '-q'], { cwd: root, signal }).catch(() => undefined)
    const added = await runner.run('git', ['add', '-A', '--', ...paths.map(literal)], {
      cwd: root,
      signal,
      env: { GIT_LITERAL_PATHSPECS: '1' },
    })
    if (added.code !== 0) throwWriteFailure('stage', added, { paths })
  } else {
    const added = await runner.run('git', ['add', '-A'], { cwd: root, signal })
    if (added.code !== 0) throwWriteFailure('stage', added)
  }

  const [subjectLine, ...rest] = message.split(/\r?\n/)
  const body = rest.join('\n').trim()
  const args = ['commit', '-m', subjectLine]
  if (body.length > 0) args.push('-m', body)
  if (options.amend === true) args.push('--amend')
  const result = await runner.run('git', args, {
    cwd: root,
    signal,
    timeoutMs: options.timeoutMs ?? 600000,
    maxBytes: 16 * 1024 * 1024,
    env: { GIT_EDITOR: 'true' },
    onLine,
  })
  const combined = `${result.stdout}\n${result.stderr}`
  if (/nothing to commit|no changes added to commit|nothing added to commit/i.test(combined)) {
    return { status: 'skipped_no_changes', sha: '', subject: subjectLine, branch: null }
  }
  if (result.code !== 0) throwWriteFailure('commit', result, { message })

  const head = await runner.run('git', ['rev-parse', 'HEAD'], { cwd: root, signal })
  const branchRead = await runner.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, signal })
  const branch = branchRead.code === 0 ? String(branchRead.stdout ?? '').trim() : null
  return {
    status: 'created',
    sha: head.code === 0 ? String(head.stdout ?? '').trim() : '',
    subject: subjectLine,
    branch: branch !== null && branch !== 'HEAD' ? branch : null,
  }
}

/**
 * Check out an existing branch, creating a local tracking branch for a remote
 * ref when no local branch of that name exists.
 *
 * @param runner command runner.
 * @param options repository root, ref name, cancellation.
 */
export async function switchBranch(
  runner: GitRunner,
  options: { root: string; name: string; signal?: AbortSignal },
): Promise<{ branch: string | null }> {
  const { root, signal } = options
  const name = String(options.name ?? '').trim()
  if (name.length === 0) throw new CommandError('input/invalid', 'A branch name is required')
  const local = await runner.run('git', ['show-ref', '--verify', '--quiet', `refs/heads/${name}`], { cwd: root, signal })
  let args: string[]
  if (local.code === 0) {
    args = ['switch', name]
  } else {
    const remoteRef = await runner.run('git', ['show-ref', '--verify', '--quiet', `refs/remotes/${name}`], { cwd: root, signal })
    if (remoteRef.code !== 0) throw new CommandError('branch/unknown', `There is no branch named ${name}`, { name })
    const localName = name.includes('/') ? name.slice(name.indexOf('/') + 1) : name
    args = ['switch', '-c', localName, '--track', name]
  }
  const result = await runner.run('git', args, { cwd: root, signal, maxBytes: 256 * 1024 })
  if (result.code !== 0) throwWriteFailure('switch', result, { name })
  const head = await runner.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, signal })
  const branch = head.code === 0 ? String(head.stdout ?? '').trim() : null
  return { branch: branch !== null && branch !== 'HEAD' ? branch : null }
}

/**
 * Create a branch and check it out.
 * @param runner command runner.
 * @param options repository root, new name, start point, cancellation.
 */
export async function createBranch(
  runner: GitRunner,
  options: { root: string; name: string; from?: string; signal?: AbortSignal },
): Promise<{ branch: string }> {
  const { root, signal } = options
  const name = String(options.name ?? '').trim()
  if (name.length === 0) throw new CommandError('input/invalid', 'A branch name is required')
  const args = ['switch', '-c', name]
  if (typeof options.from === 'string' && options.from.trim().length > 0) args.push(options.from.trim())
  const result = await runner.run('git', args, { cwd: root, signal, maxBytes: 256 * 1024 })
  if (result.code !== 0) throwWriteFailure('branch-create', result, { name })
  return { branch: name }
}

/** The facts a commit-message draft needs. */
export interface CommitMessageFacts {
  branch: string
  files: Array<{ path: string; additions: number; deletions: number }>
  recentSubjects: string[]
  diff: string
  truncated: boolean
}

/**
 * Read what a commit would contain: the selected paths when the dialog names
 * some, otherwise whatever is staged.
 *
 * @param runner command runner.
 * @param options repository root, selected paths, config, cancellation.
 */
export async function readCommitMessageFacts(
  runner: GitRunner,
  options: {
    root: string
    paths?: string[]
    config: { maxDiffBytes: number; commit: { styleLimit: number } }
    signal?: AbortSignal
  },
): Promise<CommitMessageFacts> {
  const { root, config, signal } = options
  const paths = (options.paths ?? []).filter((path) => typeof path === 'string' && path.length > 0)
  const scoped = paths.length > 0
  const maxBytes = Math.min(Number(config.maxDiffBytes) || 393216, 200000)
  const pathspecs = scoped ? ['--', ...paths.map(literal)] : []
  const diffArgs = scoped ? ['diff', 'HEAD'] : ['diff', '--cached']
  const [branchRead, stats, patch, style] = await Promise.all([
    runner.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, signal }),
    runner.run('git', [...diffArgs, '--numstat', '-z', '-M', ...pathspecs], {
      cwd: root,
      signal,
      env: { GIT_LITERAL_PATHSPECS: '1' },
    }),
    runner.run('git', [...diffArgs, '--no-color', '--no-ext-diff', '--no-textconv', '--submodule=short', '--unified=3', '-M', ...pathspecs], {
      cwd: root,
      signal,
      env: { GIT_LITERAL_PATHSPECS: '1' },
      maxBytes,
    }),
    runner.run('git', ['log', '-n', String(Math.max(0, config.commit.styleLimit) || 0), '--format=%s'], {
      cwd: root,
      signal,
    }),
  ])
  const branch = branchRead.code === 0 ? String(branchRead.stdout ?? '').trim() : ''
  return {
    branch: branch.length > 0 && branch !== 'HEAD' ? branch : '',
    files: parseNumstatZ(stats.code === 0 ? stats.stdout : '').map((entry) => ({
      path: entry.path,
      additions: entry.additions,
      deletions: entry.deletions,
    })),
    recentSubjects: style.code === 0
      ? String(style.stdout ?? '').split('\n').map((line) => line.trim()).filter((line) => line.length > 0)
      : [],
    diff: String(patch.stdout ?? ''),
    truncated: patch.truncated === true,
  }
}

/**
 * Read the facts a change-request draft needs: the commits this branch adds,
 * its changed files, and a bounded diff excerpt.
 *
 * @param runner command runner.
 * @param options repository root, base, config, cancellation.
 */
export async function readChangeRequestFacts(
  runner: GitRunner,
  options: {
    root: string
    base: string
    config: { pull: { commitLimit: number; contextBytes: number } }
    signal?: AbortSignal
  },
): Promise<{
  base: string
  ahead: number
  commits: Array<{ author: string; date: string; subject: string }>
  files: Array<{ path: string; additions: number; deletions: number }>
  diff: string
  truncated: boolean
}> {
  const { root, base, config, signal } = options
  const range = `${base}...HEAD`
  const limit = Number(config.pull?.commitLimit) || 40
  const maxBytes = Number(config.pull?.contextBytes) || 60000
  const [count, log, stats, patch] = await Promise.all([
    runner.run('git', ['rev-list', '--count', range], { cwd: root, signal }),
    runner.run('git', [
      'log',
      '-n',
      String(limit),
      '--no-show-signature',
      '--format=%an%x1f%aI%x1f%s',
      range,
    ], { cwd: root, signal }),
    runner.run('git', ['diff', '--numstat', '-z', '-M', range], { cwd: root, signal }),
    runner.run('git', ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '--submodule=short', '-M', range], {
      cwd: root,
      signal,
      maxBytes,
    }),
  ])
  if (count.code !== 0) {
    throw new CommandError('pr/unknown-base', String(count.stderr ?? '').trim() || `Cannot compare with ${base}`, { base })
  }
  const commits: Array<{ author: string; date: string; subject: string }> = []
  for (const entry of String(log.stdout ?? '').split('\n')) {
    if (entry.length === 0) continue
    const fields = entry.split('\x1f')
    if (fields.length < 3) continue
    commits.push({ author: fields[0], date: fields[1], subject: fields.slice(2).join('\x1f') })
  }
  return {
    base,
    ahead: Number.parseInt(String(count.stdout ?? '').trim(), 10) || 0,
    commits,
    files: parseNumstatZ(stats.code === 0 ? stats.stdout : '').map((entry) => ({
      path: entry.path,
      additions: entry.additions,
      deletions: entry.deletions,
    })),
    diff: String(patch.stdout ?? ''),
    truncated: patch.truncated === true,
  }
}

/**
 * Locate the repository enclosing a directory.
 * @param runner command runner.
 * @param cwd absolute directory to start from.
 * @param signal cancellation.
 * @returns repository root, or null outside a repository.
 * @throws {CommandError} when git fails for another reason, or the directory is gone.
 */
export async function locateRepository(
  runner: GitRunner,
  cwd: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const result = await runner.run('git', ['rev-parse', '--show-toplevel'], { cwd, signal })
  if (result.code !== 0) {
    const stderr = String(result.stderr ?? '')
    if (/not a git repository/i.test(stderr)) return null
    if (/cannot change to|does not exist|not a directory|No such file/i.test(stderr)) {
      throw new CommandError('git/no-directory', `Cannot open the folder ${cwd}`, { cwd })
    }
    throw new CommandError('git/failed', stderr.trim() || `git rev-parse failed (status ${result.code})`)
  }
  const root = String(result.stdout ?? '').trim().split('\n')[0]
  if (root.length === 0) return null
  return resolve(cwd, root)
}

/** One parsed patch, exported for tests that build patches by hand. */
export type { DiffFile }
