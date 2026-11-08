/**
 * Git access for the personal hub: one command runner over the Harness
 * `subprocess` capability (with a `child_process` fallback), the repository
 * inspection the panel header needs, and the file, commit, log, and branch
 * reads that back the views.
 */
import { execFile } from 'node:child_process'
import { open, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

import {
  mergeLineCounts,
  parseBranches,
  parseLog,
  parseNumstatZ,
  parsePatch,
  parsePorcelainV2,
  pickRemote,
  parseRemoteUrl,
  summarizeChanges,
  untrackedPatch,
} from './git-core.js'

/** Milliseconds a child gets to exit after termination starts. */
const TERMINATE_GRACE_MS = 2000
/** Retained stderr tail for diagnostics. */
const STDERR_BYTES = 16384
/** Bytes inspected when deciding whether a file is binary. */
const SNIFF_BYTES = 8000
/** Commands never wait for a pager or a credential prompt. */
const GIT_ENV = Object.freeze({
  GIT_TERMINAL_PROMPT: '0',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_PAGER: 'cat',
  LC_ALL: 'C',
})

/** One git or code-host failure with a stable code the panel can show. */
export class CommandError extends Error {
  /**
   * @param {string} code stable failure code, such as `git/not-a-repository`.
   * @param {string} message text for the user.
   * @param {Record<string, unknown>} [details] machine-readable extras.
   */
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'CommandError'
    this.code = code
    this.details = details
  }
}

/**
 * Build one command runner for this plugin.
 *
 * The Harness `subprocess` service is preferred, because it owns process
 * lifetime and the credential scrub; a composition without it falls back to
 * `node:child_process`, which still runs with an explicit working directory and
 * a bounded output buffer.
 *
 * @param {{ ctx: { get: (name: string) => unknown }, logger: { warn: Function }, timeoutMs?: number }} options
 * @returns {{ run: (program: string, args: string[], options?: Record<string, unknown>) => Promise<Record<string, unknown>>, backend: string }}
 */
export function createCommandRunner({ ctx, logger, timeoutMs = 15000 }) {
  const subprocess = ctx.get('subprocess')
  const resolved = new Map()

  /** Resolve one executable, caching the provider's answer. */
  async function resolveExecutable(program) {
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
   * @param {string} program executable name or path.
   * @param {string[]} args arguments, never shell-interpreted.
   * @param {{ cwd?: string, env?: Record<string, string>, signal?: AbortSignal, maxBytes?: number, stdin?: string, timeoutMs?: number }} [options]
   * @returns {Promise<{ code: number, stdout: string, stderr: string, truncated: boolean }>}
   */
  async function run(program, args, options = {}) {
    const executable = await resolveExecutable(program)
    const cwd = options.cwd ?? process.cwd()
    const maxBytes = options.maxBytes ?? 4 * 1024 * 1024
    const env = { ...GIT_ENV, ...(options.env ?? {}) }
    const limit = Math.max(1000, Number(options.timeoutMs) || timeoutMs)
    const deadline = AbortSignal.timeout(limit)
    const signal = options.signal === undefined ? deadline : AbortSignal.any([options.signal, deadline])

    if (subprocess !== undefined && typeof subprocess.spawn === 'function') {
      try {
        const handle = subprocess.spawn({
          argv: [executable, ...args],
          cwd,
          stdio: {
            stdin: options.stdin === undefined ? 'ignore' : { data: options.stdin },
            stdout: { maxBytes },
            stderr: { maxBytes: STDERR_BYTES },
          },
          graceMs: TERMINATE_GRACE_MS,
          signal,
          env,
        })
        const outcome = await handle.done
        const stdout = handle.collected?.stdout?.readFrom(0) ?? { text: '', lossy: false }
        const stderr = handle.collected?.stderr?.readFrom(0)?.text ?? ''
        if (deadline.aborted && !options.signal?.aborted) {
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

    return await new Promise((settle, rejectPromise) => {
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
          ...(options.signal === undefined ? {} : { signal: options.signal }),
        },
        (error, stdout, stderr) => {
          const code = error?.code
          if (code === 'ENOENT' || code === 'EACCES') {
            rejectPromise(new CommandError(
              'system/executable-missing',
              `${program} was not found on this computer`,
              { program },
            ))
            return
          }
          const truncated = code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
          settle({
            code: truncated ? 0 : (typeof code === 'number' ? code : error ? 1 : 0),
            stdout: stdout ?? '',
            stderr: stderr ?? '',
            truncated,
          })
        },
      )
      if (options.stdin !== undefined && child.stdin !== null) child.stdin.end(options.stdin)
    })
  }

  return {
    run,
    backend: subprocess !== undefined && typeof subprocess.spawn === 'function' ? 'subprocess' : 'child_process',
  }
}

/**
 * Push the checked-out branch and set its upstream.
 *
 * @param {{ run: Function }} runner command runner.
 * @param {{ root: string, remote: string, branch: string, timeoutMs?: number, signal?: AbortSignal }} options
 * @returns {Promise<{ remote: string, branch: string }>}
 * @throws {CommandError} when Git refuses the push.
 */
export async function pushBranch(runner, { root, remote, branch, timeoutMs, signal }) {
  if (typeof branch !== 'string' || branch.trim().length === 0) {
    throw new CommandError('pr/detached', 'Nhánh hiện tại không có tên nên không đẩy lên được', { branch })
  }
  const result = await runner.run('git', ['push', '--set-upstream', remote, `HEAD:refs/heads/${branch}`], {
    cwd: root,
    signal,
    timeoutMs,
    maxBytes: 1024 * 1024,
  })
  if (result.code !== 0) {
    const detail = String(result.stderr ?? '')
    throw new CommandError('pr/push-failed', `Không đẩy được nhánh ${branch} lên ${remote}: ${firstLine(detail) || `mã ${result.code}`}`, {
      remote,
      branch,
      detail: detail.slice(0, 4000),
    })
  }
  return { remote, branch }
}

/**
 * Read the facts a change-request draft needs: the commits this branch adds,
 * its changed files, and a bounded diff excerpt.
 *
 * @param {{ run: Function }} runner command runner.
 * @param {{ root: string, base: string, config: Record<string, unknown>, signal?: AbortSignal }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readChangeRequestFacts(runner, { root, base, config, signal }) {
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
    throw new CommandError('pr/unknown-base', String(count.stderr ?? '').trim() || `Không so được với nhánh ${base}`, { base })
  }
  const commits = []
  for (const entry of String(log.stdout ?? '').split('\n')) {
    if (entry.length === 0) continue
    const fields = entry.split('\x1f')
    if (fields.length < 3) continue
    commits.push({ author: fields[0], date: fields[1], subject: fields.slice(2).join('\x1f') })
  }
  const files = parseNumstatZ(stats.code === 0 ? stats.stdout : '').map((entry) => ({
    path: entry.path,
    additions: entry.additions,
    deletions: entry.deletions,
  }))
  return {
    base,
    ahead: Number.parseInt(String(count.stdout ?? '').trim(), 10) || 0,
    commits,
    files,
    diff: String(patch.stdout ?? ''),
    truncated: patch.truncated === true,
  }
}

/** First non-empty line of a command's stderr. */
function firstLine(text) {
  return String(text ?? '').split('\n').map((line) => line.trim()).find((line) => line.length > 0) ?? ''
}

/**
 * Locate the repository enclosing a directory.
 * @param {{ run: Function }} runner command runner.
 * @param {string} cwd absolute directory to start from.
 * @param {AbortSignal} [signal] cancellation.
 * @returns {Promise<string | null>} repository root, or null outside a repository.
 * @throws {CommandError} when git fails for another reason, or the directory is gone.
 */
export async function locateRepository(runner, cwd, signal) {
  const result = await runner.run('git', ['rev-parse', '--show-toplevel'], { cwd, signal })
  if (result.code !== 0) {
    const stderr = String(result.stderr ?? '')
    if (/not a git repository/i.test(stderr)) return null
    if (/cannot change to|does not exist|not a directory|No such file/i.test(stderr)) {
      throw new CommandError('git/no-directory', `Không mở được thư mục ${cwd}`, { cwd })
    }
    throw new CommandError('git/failed', stderr.trim() || `git rev-parse thất bại (mã ${result.code})`)
  }
  const root = result.stdout.trim().split('\n')[0]
  if (root.length === 0) return null
  return resolve(cwd, root)
}

/**
 * Read everything the panel header and the changes view need.
 *
 * @param {{ run: Function }} runner command runner.
 * @param {{ cwd: string, root: string, config: Record<string, unknown>, signal?: AbortSignal }} options
 * @returns {Promise<Record<string, unknown>>} the overview payload.
 */
export async function readOverview(runner, { cwd, root, config, signal }) {
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
    throw new CommandError('git/failed', String(status.stderr ?? '').trim() || 'git status thất bại')
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
      remote: remote === undefined
        ? null
        : {
            name: remote.name,
            url: remote.url,
            provider: forge?.provider ?? 'other',
            host: forge?.host ?? null,
            owner: forge?.owner ?? null,
            repository: forge?.name ?? null,
            slug: forge?.slug ?? null,
          },
    },
    files,
    stats: summarizeChanges(files),
    commits,
    stash: stash.code === 0 ? parseLogLines(stash.stdout).length : 0,
    refreshMs: config.refreshMs,
  }
}

/**
 * Read just what the change-request views need: the tracked branch and the
 * remote the code host is addressed through.
 *
 * @param {{ run: Function }} runner command runner.
 * @param {{ root: string, config: Record<string, unknown>, signal?: AbortSignal }} options
 * @returns {Promise<{ branch: string | null, remote: Record<string, unknown> | null }>}
 */
export async function readContext(runner, { root, config, signal }) {
  const [remotes, head] = await Promise.all([
    runner.run('git', ['remote', '-v'], { cwd: root, signal }),
    runner.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, signal }),
  ])
  const name = head.code === 0 ? head.stdout.trim() : ''
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
          repository: parsed?.name ?? null,
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
 * @param {{ run: Function }} runner command runner.
 * @param {{ root: string, path: string, staged?: boolean, untracked?: boolean, config: Record<string, unknown>, signal?: AbortSignal }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readFilePatch(runner, { root, path, staged = false, untracked = false, config, signal }) {
  const relativePath = normalizeRelativePath(root, path)
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
    throw new CommandError('git/failed', String(result.stderr ?? '').trim() || 'git diff thất bại', { path: relativePath })
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
 * Read one commit: its metadata, file statistics, and patch.
 * @param {{ run: Function }} runner command runner.
 * @param {{ root: string, hash: string, config: Record<string, unknown>, signal?: AbortSignal }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readCommit(runner, { root, hash, config, signal }) {
  const revision = String(hash ?? '').trim()
  if (!/^[0-9a-fA-F]{4,64}$/.test(revision)) {
    throw new CommandError('input/invalid', 'Mã commit không hợp lệ', { hash: revision })
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
    throw new CommandError('git/unknown-commit', String(meta.stderr ?? '').trim() || `Không đọc được commit ${revision}`)
  }
  const fields = meta.stdout.trim().split('\x1f')
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
 * Read the branch list.
 * @param {{ run: Function }} runner command runner.
 * @param {{ root: string, limit?: number, signal?: AbortSignal }} options
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function readBranches(runner, { root, limit = 30, signal }) {
  const result = await runner.run('git', [
    'for-each-ref',
    `--count=${limit}`,
    '--sort=-committerdate',
    '--format=%(refname:short)%1f%(objectname:short)%1f%(upstream:short)%1f%(committerdate:iso-strict)%1f%(contents:subject)%1f%(HEAD)',
    'refs/heads',
  ], { cwd: root, signal })
  if (result.code !== 0) {
    throw new CommandError('git/failed', String(result.stderr ?? '').trim() || 'git for-each-ref thất bại')
  }
  return parseBranches(result.stdout)
}

/**
 * Read the commit log.
 * @param {{ run: Function }} runner command runner.
 * @param {{ root: string, limit?: number, signal?: AbortSignal }} options
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function readLog(runner, { root, limit = 50, signal }) {
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
    throw new CommandError('git/failed', String(result.stderr ?? '').trim() || 'git log thất bại')
  }
  return parseLog(result.stdout)
}

/**
 * Count the lines of every untracked file the panel lists, within the scan
 * limits, so an untracked file shows a size like any other change.
 *
 * @param {Array<Record<string, unknown>>} files changed-file records.
 * @param {string} root repository root.
 * @param {Record<string, unknown>} config feature configuration.
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function attachUntrackedCounts(files, root, config) {
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

/**
 * Read the start of a file, telling truncation and binary content apart.
 * @param {string} file absolute path.
 * @param {number} maxBytes inclusive reading cap.
 * @returns {Promise<{ text: string, truncated: boolean, binary: boolean, tooLarge: boolean, size: number }>}
 */
async function readFilePreview(file, maxBytes) {
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
 * @param {string} text file content.
 * @returns {number} line count.
 */
function countLines(text) {
  if (text.length === 0) return 0
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines.length
}

/**
 * Reject a path that would leave the repository or reach outside it.
 * @param {string} root repository root.
 * @param {string} path repository-relative path.
 * @returns {string} the path with separators normalized to `/`.
 */
function normalizeRelativePath(root, path) {
  const text = String(path ?? '').trim()
  if (text.length === 0 || text.includes('\0') || isAbsolute(text)) {
    throw new CommandError('input/invalid', 'Đường dẫn tệp không hợp lệ', { path: text })
  }
  const normalized = text.split(sep).join('/').replace(/^\.\//, '')
  const target = resolve(root, normalized)
  const inside = relative(root, target)
  if (inside.startsWith('..') || isAbsolute(inside)) {
    throw new CommandError('input/invalid', 'Đường dẫn tệp nằm ngoài kho mã', { path: text })
  }
  return normalized
}

/**
 * Split the stash list into one entry per line.
 * @param {string} raw `git stash list` output.
 * @returns {string[]}
 */
function parseLogLines(raw) {
  return String(raw ?? '').split('\n').filter((line) => line.length > 0)
}

/** Last path segment, tolerant of both separator styles. */
function basename(path) {
  const normalized = String(path).replace(/[\\/]+$/, '')
  const index = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  return index < 0 ? normalized : normalized.slice(index + 1)
}

/** Message of an unknown thrown value. */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}
