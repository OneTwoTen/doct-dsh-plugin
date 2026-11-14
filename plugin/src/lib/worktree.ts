/**
 * Git worktrees for a Session.
 *
 * One Session may work in its own checkout under the repository's
 * `.agents/worktrees/` directory instead of the project directory. A new
 * checkout starts from a local branch or from a remote branch the plugin
 * fetched first, so "start from remote" means the commits the code host has,
 * not whatever this computer last happened to fetch.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import { CommandError, type GitRunner } from './git-run.ts'

/**
 * The command runner these helpers call.
 *
 * `git-run.ts` owns the implementation; re-exporting the type lets the rest of
 * the module reuse it without reaching into the runner module.
 */
export type { GitRunner }

/** The part of the worktree configuration the pool helpers read. */
export interface WorktreePoolConfig {
  directory?: string
}

/** One entry of `git worktree list --porcelain`. */
export interface WorktreeListEntry {
  path: string
  head: string | null
  branch: string | null
  bare: boolean
  detached: boolean
  /** Git marks a checkout `locked` while another process owns it. */
  locked: boolean
  /** A registration whose directory disappeared; `git worktree prune` clears it. */
  prunable: boolean
}

/** One local branch a new checkout may start from. */
export interface LocalWorktreeBase {
  name: string
  short: string
  date: string
  subject: string
  current: boolean
  remote: null
}

/** One remote-tracking branch a new checkout may start from. */
export interface RemoteWorktreeBase {
  name: string
  remote: string
  branch: string
  short: string
  date: string
}

/** Everything the base picker of the New Session option needs. */
export interface WorktreeBasesResult {
  local: LocalWorktreeBase[]
  remote: RemoteWorktreeBase[]
  defaultBase: string | null
  current: string | null
}

/** The git directory and the common directory of one checkout. */
export interface CheckoutKind {
  gitDir: string | null
  commonDir: string | null
  linked: boolean
}

/** One checkout this module created. */
export interface CreatedWorktree {
  path: string
  name: string
  branch: string
  base: string
  source: 'local' | 'remote'
  start: string
  repositoryRoot: string
}

/** What removing one checkout did. */
export interface RemovedWorktree {
  removed: boolean
  branchDeleted: boolean
}

/** Name of the ignore file that keeps created checkouts out of the repository. */
const POOL_IGNORE = '.gitignore'
/** Branch names this plugin may create: no leading dash, no ref syntax Git refuses. */
const BRANCH_NAME = /^(?![-/.])(?!.*\.\.)(?!.*[/.]$)[A-Za-z0-9._/-]+$/

/**
 * The worktree name one Session gets: `dsh-<first eight UUID digits>-<four random digits>`.
 *
 * The suffix keeps a second attempt for the same Session from colliding with
 * the first, which matters after a failed creation leaves a branch behind.
 *
 * @param sessionId Session identity, ordinarily `session-<uuid>`.
 * @param prefix configured name prefix.
 * @returns a branch-safe worktree name.
 */
export function generatedWorktreeName(sessionId: string, prefix = 'dsh'): string {
  const text = String(sessionId ?? '')
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(text)?.[0]
  const head = uuid === undefined ? randomHex(8) : uuid.slice(0, 8).toLowerCase()
  const tail = randomHex(4)
  const cleaned = String(prefix ?? '').trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '')
  return cleaned.length > 0 ? `${cleaned}-${head}-${tail}` : `${head}-${tail}`
}

/** Four or eight random lowercase hexadecimal digits. */
function randomHex(length: number): string {
  let text = ''
  while (text.length < length) text += Math.floor(Math.random() * 16).toString(16)
  return text.slice(0, length)
}

/**
 * The directory that holds created checkouts.
 * @param repoRoot repository top-level directory.
 * @param config worktree configuration.
 * @returns absolute pool directory.
 */
export function poolDirectory(repoRoot: string, config?: WorktreePoolConfig): string {
  const configured = String(config?.directory ?? '.agents/worktrees').trim() || '.agents/worktrees'
  return isAbsolute(configured) ? configured : join(repoRoot, configured.split('/').join(sep))
}

/**
 * Tell whether one directory is another or lies below it.
 * @param parent absolute parent directory.
 * @param child absolute candidate directory.
 */
export function isInside(parent: string, child: string): boolean {
  const from = resolve(parent)
  const to = resolve(child)
  if (from === to) return true
  const path = relative(from, to)
  return path.length > 0 && !path.startsWith('..') && !isAbsolute(path)
}

/**
 * Absolute path of one worktree in the pool.
 * @param repoRoot repository top-level directory.
 * @param config worktree configuration.
 * @param name worktree name.
 */
export function worktreePath(repoRoot: string, config: WorktreePoolConfig | undefined, name: string): string {
  if (!BRANCH_NAME.test(String(name ?? ''))) {
    throw new CommandError('worktree/invalid-name', `Tên worktree không hợp lệ: ${String(name)}`, { name })
  }
  const path = join(poolDirectory(repoRoot, config), name)
  if (!isInside(poolDirectory(repoRoot, config), path) || resolve(path) === resolve(poolDirectory(repoRoot, config))) {
    throw new CommandError('worktree/invalid-name', 'Đường dẫn worktree nằm ngoài thư mục worktree', { name })
  }
  return path
}

/**
 * Parse `git worktree list --porcelain`.
 * @param raw porcelain output.
 */
export function parseWorktreeList(raw: string): WorktreeListEntry[] {
  const entries: WorktreeListEntry[] = []
  let current: WorktreeListEntry | undefined
  for (const line of String(raw ?? '').split('\n')) {
    if (line.startsWith('worktree ')) {
      current = {
        path: line.slice('worktree '.length),
        head: null,
        branch: null,
        bare: false,
        detached: false,
        locked: false,
        prunable: false,
      }
      entries.push(current)
      continue
    }
    if (current === undefined) continue
    if (line.startsWith('HEAD ')) current.head = line.slice('HEAD '.length).trim() || null
    else if (line.startsWith('branch ')) current.branch = line.slice('branch '.length).trim().replace(/^refs\/heads\//, '') || null
    else if (line === 'bare') current.bare = true
    else if (line === 'detached') current.detached = true
    else if (line === 'locked' || line.startsWith('locked ')) current.locked = true
    else if (line === 'prunable' || line.startsWith('prunable ')) current.prunable = true
  }
  return entries
}

/**
 * Read the worktrees Git already knows for this repository.
 * @param runner command runner.
 * @param options repository and cancellation.
 */
export async function readWorktrees(runner: GitRunner, { root, signal }: { root: string, signal?: AbortSignal }): Promise<WorktreeListEntry[]> {
  const result = await runner.run('git', ['worktree', 'list', '--porcelain'], { cwd: root, signal })
  if (result.code !== 0) {
    throw new CommandError('git/failed', String(result.stderr ?? '').trim() || 'git worktree list thất bại')
  }
  return parseWorktreeList(result.stdout)
}

/**
 * Read the branches a new checkout may start from.
 *
 * Local branches are listed by recency; remote branches are grouped by remote
 * so the browser can offer "start from remote" without fetching on its own.
 *
 * @param runner command runner.
 * @param options the repository, the remote to keep, and cancellation.
 */
export async function readBases(
  runner: GitRunner,
  { root, remote = '', limit = 40, signal }: { root: string, remote?: string, limit?: number, signal?: AbortSignal },
): Promise<WorktreeBasesResult> {
  const [heads, remotes, head] = await Promise.all([
    runner.run('git', [
      'for-each-ref',
      `--count=${limit}`,
      '--sort=-committerdate',
      '--format=%(refname:short)%1f%(objectname:short)%1f%(committerdate:iso-strict)%1f%(contents:subject)%1f%(HEAD)',
      'refs/heads',
    ], { cwd: root, signal }),
    runner.run('git', [
      'for-each-ref',
      `--count=${limit * 2}`,
      '--sort=-committerdate',
      '--format=%(refname:short)%1f%(objectname:short)%1f%(committerdate:iso-strict)',
      'refs/remotes',
    ], { cwd: root, signal }),
    runner.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, signal }),
  ])

  const local = parseLocalBases(heads.code === 0 ? heads.stdout : '')
  const remoteBranches = parseRemoteBases(remotes.code === 0 ? remotes.stdout : '').filter((branch) => (
    remote.length === 0 || branch.remote === remote
  ))
  const current = head.code === 0 ? head.stdout.trim() : ''
  return {
    local,
    remote: remoteBranches,
    defaultBase: await resolveDefaultBase(runner, { root, remote, signal }),
    current: current.length > 0 && current !== 'HEAD' ? current : null,
  }
}

/**
 * The source a base picker starts on.
 *
 * The configured source wins whenever it has branches; otherwise the other one
 * takes over, so a repository with no remote-tracking branches (a fresh local
 * project, or a clone that never fetched) still offers a working "new worktree"
 * action instead of a dead button.
 *
 * @param configured `git.worktree.source`.
 * @param bases the branches `readBases` found.
 */
export function resolveSourceDefault(
  configured: 'local' | 'remote',
  { local, remote }: { local: readonly unknown[], remote: readonly unknown[] },
): 'local' | 'remote' {
  if (configured === 'remote') {
    if (remote.length > 0 || local.length === 0) return 'remote'
    return 'local'
  }
  if (local.length > 0 || remote.length === 0) return 'local'
  return 'remote'
}

/** Local branches in the shape the client needs. */
function parseLocalBases(raw: string): LocalWorktreeBase[] {
  const branches: LocalWorktreeBase[] = []
  for (const line of String(raw ?? '').split('\n')) {
    if (line.length === 0) continue
    const fields = line.split('\x1f')
    if (fields.length < 4) continue
    branches.push({
      name: fields[0],
      short: fields[1],
      date: fields[2],
      subject: fields[3],
      current: fields[4] === '*',
      remote: null,
    })
  }
  return branches
}

/** Remote-tracking branches, excluding each remote's symbolic HEAD. */
function parseRemoteBases(raw: string): RemoteWorktreeBase[] {
  const branches: RemoteWorktreeBase[] = []
  for (const line of String(raw ?? '').split('\n')) {
    if (line.length === 0) continue
    const fields = line.split('\x1f')
    if (fields.length < 2) continue
    const name = fields[0]
    if (name.endsWith('/HEAD')) continue
    const slash = name.indexOf('/')
    if (slash <= 0) continue
    branches.push({
      name,
      remote: name.slice(0, slash),
      branch: name.slice(slash + 1),
      short: fields[1],
      date: fields[2] ?? '',
    })
  }
  return branches
}

/**
 * The branch a new checkout should start from by default: the code host's
 * default branch when a remote names one, else `main`/`master`, else the
 * checked-out branch.
 *
 * @param runner command runner.
 * @param options the repository, the remote to prefer, and cancellation.
 */
export async function resolveDefaultBase(
  runner: GitRunner,
  { root, remote = '', signal }: { root: string, remote?: string, signal?: AbortSignal },
): Promise<string | null> {
  const names = await remoteNames(runner, { root, signal })
  const preferred = remote.length > 0 ? [remote] : names
  for (const name of preferred) {
    const symbolic = await runner.run('git', ['symbolic-ref', '--quiet', `refs/remotes/${name}/HEAD`], { cwd: root, signal })
    const text = symbolic.code === 0 ? symbolic.stdout.trim().replace(`refs/remotes/${name}/`, '') : ''
    if (text.length > 0) return text
  }
  for (const name of preferred) {
    for (const candidate of ['main', 'master']) {
      const found = await runner.run('git', ['rev-parse', '--verify', '--quiet', `refs/remotes/${name}/${candidate}`], { cwd: root, signal })
      if (found.code === 0) return candidate
    }
  }
  for (const candidate of ['main', 'master']) {
    const found = await runner.run('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${candidate}`], { cwd: root, signal })
    if (found.code === 0) return candidate
  }
  const head = await runner.run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, signal })
  const branch = head.code === 0 ? head.stdout.trim() : ''
  return branch.length > 0 && branch !== 'HEAD' ? branch : null
}

/**
 * Remote names in `git remote` order.
 * @param runner command runner.
 * @param options the repository and cancellation.
 */
export async function remoteNames(runner: GitRunner, { root, signal }: { root: string, signal?: AbortSignal }): Promise<string[]> {
  const result = await runner.run('git', ['remote'], { cwd: root, signal })
  if (result.code !== 0) return []
  return String(result.stdout ?? '').split('\n').map((line) => line.trim()).filter((line) => line.length > 0)
}

/**
 * Fetch one branch from a remote so a checkout can start from its commit.
 * @param runner command runner.
 * @param options the repository, the remote and branch, and cancellation.
 * @returns the remote-tracking ref the branch now has.
 */
export async function fetchRemoteBranch(
  runner: GitRunner,
  { root, remote, branch, timeoutMs, signal }: { root: string, remote: string, branch: string, timeoutMs?: number, signal?: AbortSignal },
): Promise<string> {
  if (!BRANCH_NAME.test(String(branch ?? ''))) {
    throw new CommandError('worktree/invalid-branch', `Tên nhánh không hợp lệ: ${String(branch)}`, { branch })
  }
  const result = await runner.run('git', ['fetch', '--prune', remote, `+refs/heads/${branch}:refs/remotes/${remote}/${branch}`], {
    cwd: root,
    signal,
    timeoutMs,
    maxBytes: 1024 * 1024,
  })
  if (result.code !== 0) {
    throw new CommandError(
      'worktree/fetch-failed',
      `Không lấy được nhánh ${branch} từ ${remote}: ${firstLine(result.stderr) || `mã ${result.code}`}`,
      { remote, branch, detail: String(result.stderr ?? '').slice(0, 2000) },
    )
  }
  return `refs/remotes/${remote}/${branch}`
}

/**
 * Tell whether a branch name is already taken in one repository.
 * @param runner command runner.
 * @param options the repository and the branch.
 */
export async function branchIsTaken(
  runner: GitRunner,
  { root, branch, signal }: { root: string, branch: string, signal?: AbortSignal },
): Promise<boolean> {
  const result = await runner.run('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: root, signal })
  return result.code === 0
}

/**
 * Rename the branch checked out in one worktree.
 *
 * Git renames the current branch when no old name is given, which is what this
 * uses: the checkout keeps its directory, and the recorded name changes.
 *
 * A checkout cut from a remote-tracking ref can inherit that ref as its
 * upstream; the old name then no longer describes the branch, so a mismatched
 * upstream is dropped instead of letting a later push publish over the base
 * branch.
 *
 * @param runner command runner.
 * @param options the checkout and its next branch name.
 * @returns the branch name the checkout now has.
 */
export async function renameWorktreeBranch(
  runner: GitRunner,
  { path, branch, signal }: { path: string, branch: string, signal?: AbortSignal },
): Promise<string> {
  if (!BRANCH_NAME.test(String(branch ?? ''))) {
    throw new CommandError('worktree/invalid-name', `Tên nhánh không hợp lệ: ${String(branch)}`, { branch })
  }
  const result = await runner.run('git', ['branch', '-m', branch], { cwd: path, signal })
  if (result.code !== 0) {
    throw new CommandError(
      'worktree/rename-failed',
      `Không đổi được tên nhánh: ${firstLine(result.stderr) || `mã ${result.code}`}`,
      { branch, detail: String(result.stderr ?? '').slice(0, 2000) },
    )
  }
  await dropMismatchedUpstream(runner, { path, branch, signal })
  return branch
}

/**
 * Drop a tracked branch whose name is not the branch's own.
 *
 * `git branch -m` keeps the old `branch.<name>.merge` key, which would still
 * point at the base branch this checkout started from.
 *
 * @param runner command runner.
 * @param options the checkout, its branch name, and cancellation.
 */
async function dropMismatchedUpstream(
  runner: GitRunner,
  { path, branch, signal }: { path: string, branch: string, signal?: AbortSignal },
): Promise<void> {
  const read = await runner.run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], {
    cwd: path,
    signal,
  })
  if (read.code !== 0) return
  const upstream = String(read.stdout ?? '').trim()
  const slash = upstream.indexOf('/')
  const tracked = slash > 0 && slash < upstream.length - 1 ? upstream.slice(slash + 1) : ''
  if (tracked === branch) return
  await runner.run('git', ['branch', '--unset-upstream'], { cwd: path, signal }).catch(() => undefined)
}

/**
 * Make one branch name unique by appending a short suffix when it is taken.
 * @param runner command runner.
 * @param options the repository and the wanted branch.
 */
export async function uniqueBranchName(
  runner: GitRunner,
  { root, branch, signal }: { root: string, branch: string, signal?: AbortSignal },
): Promise<string> {
  if (!(await branchIsTaken(runner, { root, branch, signal }))) return branch
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${branch}-${randomHex(4)}`
    if (!(await branchIsTaken(runner, { root, branch: candidate, signal }))) return candidate
  }
  throw new CommandError('worktree/branch-taken', `Nhánh ${branch} đã tồn tại`, { branch })
}

/**
 * Create one checkout and its branch.
 *
 * The pool directory is created lazily and ignored from the repository so the
 * new checkout never appears as an untracked directory of the project.
 *
 * The new branch is added with `--no-track`: when the start point is a
 * remote-tracking ref, Git would otherwise make the checkout track the base
 * branch, and the first push would publish this branch's commits over that base
 * branch instead of over a branch of its own.
 *
 * @param runner command runner.
 * @param options the repository, the new checkout, where it starts, and cancellation.
 */
export async function createWorktree(
  runner: GitRunner,
  { repoRoot, name, base, source = 'local', remote = '', config, timeoutMs, signal }: {
    repoRoot: string
    name: string
    base: string
    source?: 'local' | 'remote'
    remote?: string
    config: WorktreePoolConfig
    timeoutMs?: number
    signal?: AbortSignal
  },
): Promise<CreatedWorktree> {
  const path = worktreePath(repoRoot, config, name)
  const branch = name
  if (!BRANCH_NAME.test(branch)) {
    throw new CommandError('worktree/invalid-name', `Tên nhánh worktree không hợp lệ: ${branch}`, { name })
  }

  const existing = await stat(path).catch(() => undefined)
  if (existing !== undefined) {
    throw new CommandError('worktree/exists', `Thư mục ${path} đã tồn tại`, { path })
  }

  let start: string
  if (source === 'remote') {
    if (remote.length === 0) {
      throw new CommandError('worktree/no-remote', 'Kho mã chưa có remote để tạo worktree từ nhánh từ xa')
    }
    start = await fetchRemoteBranch(runner, { root: repoRoot, remote, branch: base, timeoutMs, signal })
  } else {
    const verified = await runner.run('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${base}^{commit}`], { cwd: repoRoot, signal })
    if (verified.code !== 0) {
      throw new CommandError('worktree/unknown-base', `Không thấy nhánh ${base} trong kho mã`, { base })
    }
    start = `refs/heads/${base}`
  }

  await ensurePool(repoRoot, config)
  const result = await runner.run('git', ['worktree', 'add', '--no-track', '-b', branch, path, start], {
    cwd: repoRoot,
    signal,
    timeoutMs,
    maxBytes: 1024 * 1024,
  })
  if (result.code !== 0) {
    throw new CommandError(
      'worktree/failed',
      `Không tạo được worktree: ${firstLine(result.stderr) || `mã ${result.code}`}`,
      { path, branch, detail: String(result.stderr ?? '').slice(0, 4000) },
    )
  }
  return { path, name, branch, base, source, start, repositoryRoot: repoRoot }
}

/**
 * Create the checkout pool and its ignore file when this call made the pool.
 * @param repoRoot repository top-level directory.
 * @param config worktree configuration.
 */
export async function ensurePool(repoRoot: string, config: WorktreePoolConfig | undefined): Promise<void> {
  const pool = poolDirectory(repoRoot, config)
  const before = await stat(pool).catch(() => undefined)
  await mkdir(pool, { recursive: true })
  if (before !== undefined) return
  const ignore = join(pool, POOL_IGNORE)
  const present = await readFile(ignore, 'utf8').catch(() => undefined)
  if (present !== undefined) return
  try {
    await writeFile(ignore, '*\n', 'utf8')
  } catch {
    // A pool the caller cannot annotate is still usable; the repository may already ignore it.
  }
}

/**
 * Remove one checkout, and optionally its branch.
 *
 * Git refuses to remove a checkout holding modified or untracked files; that
 * refusal is reported as `worktree/dirty` so the caller can ask the user to
 * decide instead of discarding work.
 *
 * @param runner command runner.
 * @param options the repository, the checkout to remove, and cancellation.
 */
export async function removeWorktree(
  runner: GitRunner,
  { repoRoot, path, branch, deleteBranch = false, force = false, timeoutMs, signal }: {
    repoRoot: string
    path: string
    branch?: string | null
    deleteBranch?: boolean
    /** Remove even a checkout holding uncommitted work. */
    force?: boolean
    timeoutMs?: number
    signal?: AbortSignal
  },
): Promise<RemovedWorktree> {
  const target = resolve(String(path ?? ''))
  if (target.length === 0) {
    throw new CommandError('input/invalid', 'Thiếu đường dẫn worktree')
  }
  const present = await stat(target).catch(() => undefined)
  if (present !== undefined) {
    const result = await runner.run(
      'git',
      force ? ['worktree', 'remove', '--force', target] : ['worktree', 'remove', target],
      { cwd: repoRoot, signal, timeoutMs },
    )
    if (result.code !== 0) {
      const detail = String(result.stderr ?? '')
      if (/modified or untracked|contains modified/i.test(detail)) {
        throw new CommandError('worktree/dirty', 'Worktree còn thay đổi chưa commit nên chưa xoá', { path: target })
      }
      throw new CommandError('worktree/failed', `Không xoá được worktree: ${firstLine(detail) || `mã ${result.code}`}`, {
        path: target,
        detail: detail.slice(0, 2000),
      })
    }
  }
  await runner.run('git', ['worktree', 'prune'], { cwd: repoRoot, signal, timeoutMs })

  let branchDeleted = false
  const name = String(branch ?? '').trim()
  if (deleteBranch && BRANCH_NAME.test(name)) {
    const deleted = await runner.run('git', ['branch', '-D', name], { cwd: repoRoot, signal, timeoutMs })
    branchDeleted = deleted.code === 0
  }
  return { removed: true, branchDeleted }
}

/**
 * Make sure a directory is a checkout directory the plugin created, and return
 * its repository root.
 *
 * @param runner command runner.
 * @param options the checkout and cancellation.
 * @returns the repository root of that checkout.
 */
export async function worktreeRepository(
  runner: GitRunner,
  { path, signal }: { path: string, signal?: AbortSignal },
): Promise<string> {
  const result = await runner.run('git', ['rev-parse', '--show-toplevel'], { cwd: path, signal })
  if (result.code !== 0) {
    throw new CommandError('worktree/missing', `Không đọc được worktree tại ${path}`, { path })
  }
  return resolve(result.stdout.trim().split('\n')[0])
}

/**
 * Read the git directory and the shared common directory of a checkout, which
 * together tell a linked worktree from the project directory.
 *
 * @param runner command runner.
 * @param options the checkout and cancellation.
 */
export async function readCheckoutKind(
  runner: GitRunner,
  { path, signal }: { path: string, signal?: AbortSignal },
): Promise<CheckoutKind> {
  const [gitDir, commonDir] = await Promise.all([
    runner.run('git', ['rev-parse', '--path-format=absolute', '--git-dir'], { cwd: path, signal }),
    runner.run('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: path, signal }),
  ])
  const gitValue = gitDir.code === 0 ? resolve(gitDir.stdout.trim()) : null
  const commonValue = commonDir.code === 0 ? resolve(commonDir.stdout.trim()) : null
  return {
    gitDir: gitValue,
    commonDir: commonValue,
    linked: gitValue !== null && commonValue !== null && resolve(gitValue) !== resolve(commonValue),
  }
}

/** First non-empty line of a command's stderr, for a one-line message. */
function firstLine(text: unknown): string {
  return String(text ?? '').split('\n').map((line) => line.trim()).find((line) => line.length > 0) ?? ''
}

/** Directory a worktree path lives in, exposed for callers that must create it. */
export function poolParent(path: string): string {
  return dirname(path)
}
