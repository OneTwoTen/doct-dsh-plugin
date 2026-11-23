/**
 * The per-chat context directory and its lazily created checkouts.
 *
 * A multi-repo chat does not begin with worktrees. It begins with one small
 * directory (this module's "context") that becomes the Session's working
 * directory. Repositories are added to it only when the chat will modify them:
 * `materializeRepo` creates one worktree inside the context and records it in
 * `.dsh/checkout.json`, so a chat that only reads leaves no checkout behind.
 *
 * The directory itself is not a Git repository. That is deliberate: the agent
 * sees each checked-out repo as a subdirectory, and a plain folder is the one
 * shape DSH accepts without pretending the workspace is a superproject.
 */
import { mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import { CommandError, type GitRunner } from './git-run.ts'
import {
  createWorktree,
  generatedWorktreeName,
  isInside,
  removeWorktree,
  remoteNames,
  resolveDefaultBase,
  uniqueBranchName,
} from './worktree.ts'
import type { RepoSet, WorkspaceRepoEntry } from './repo-set.ts'

/** Where context directories live inside a workspace. */
export const DEFAULT_CONTEXT_DIRECTORY = '.agents/worktrees'

/** One repository checkout inside a context directory. */
export interface RepoCheckout {
  id: string
  /** Absolute checkout path inside the context directory. */
  path: string
  /** The repository's main checkout. */
  repositoryRoot: string
  branch: string
  base: string
  source: 'local' | 'remote'
  remote: string | null
  /** The commit the checkout started from. */
  start: string
  materializedAt: number
  /** A warning worth showing the user, such as a dirty main checkout. */
  warning?: string | null
}

/** One chat's context directory, as `git.json` and the manifest keep it. */
export interface ContextRecord {
  kind: 'context'
  sessionId: string
  workspaceRoot: string
  /** Absolute context directory. */
  path: string
  name: string
  createdAt: number
  /** Only repositories this chat actually checked out. */
  repos: Record<string, RepoCheckout>
}

/** The part of the checkout configuration this module reads. */
export interface ContextCheckoutConfig {
  directory?: string
  base?: string
  source?: 'local' | 'remote'
  remote?: string
  dirtyMain?: 'warn' | 'abort'
  fetchOnCheckout?: boolean
}

/** What one materialization produced. */
export interface MaterializeResult {
  checkout: RepoCheckout
  created: boolean
  warning: string | null
}

/** The checkout directory of one chat. */
export function contextPath(
  workspaceRoot: string,
  name: string,
  config?: { directory?: string },
): string {
  const directory = String(config?.directory ?? DEFAULT_CONTEXT_DIRECTORY).trim() || DEFAULT_CONTEXT_DIRECTORY
  return join(resolve(workspaceRoot), directory.split('/').join(sepName()), name)
}

/** The manifest path inside one context directory. */
export function contextManifestPath(contextDirectory: string): string {
  return join(contextDirectory, '.dsh', 'checkout.json')
}

/** The generated name of a chat's context directory. */
export function contextName(sessionId: string, prefix = 'dsh'): string {
  return generatedWorktreeName(sessionId, prefix)
}

/**
 * Create the context directory and its manifest, or return the existing one.
 *
 * Nothing Git-related happens here: this is the cheap step that makes the
 * Session's working directory a place where repositories can appear later.
 */
export async function ensureContext(options: {
  workspaceRoot: string
  sessionId: string
  name: string
  directory?: string
  now?: number
}): Promise<ContextRecord> {
  const workspaceRoot = await realpath(resolve(options.workspaceRoot)).catch(() => resolve(options.workspaceRoot))
  const directory = contextPath(workspaceRoot, options.name, { directory: options.directory })
  if (!isInside(workspaceRoot, directory) || resolve(directory) === resolve(workspaceRoot)) {
    throw new CommandError('context/invalid-path', 'The context directory must sit inside the workspace')
  }
  const existing = await readContext(directory).catch(() => undefined)
  if (existing !== undefined) return existing
  await mkdir(join(directory, '.dsh'), { recursive: true })
  const record: ContextRecord = {
    kind: 'context',
    sessionId: options.sessionId,
    workspaceRoot,
    path: resolve(directory),
    name: options.name,
    createdAt: options.now ?? Date.now(),
    repos: {},
  }
  await writeContext(record)
  return record
}

/** Read a context manifest, or undefined when the directory is not one. */
export async function readContext(contextDirectory: string): Promise<ContextRecord | undefined> {
  let text: string
  try {
    text = await readFile(contextManifestPath(contextDirectory), 'utf8')
  } catch {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object') return undefined
  const raw = parsed as Partial<ContextRecord>
  if (typeof raw.path !== 'string' || typeof raw.workspaceRoot !== 'string') return undefined
  const repos: Record<string, RepoCheckout> = {}
  for (const [id, value] of Object.entries(raw.repos ?? {})) {
    if (value === null || typeof value !== 'object') continue
    const entry = value as Partial<RepoCheckout>
    if (typeof entry.path !== 'string' || typeof entry.repositoryRoot !== 'string') continue
    repos[id] = {
      id,
      path: entry.path,
      repositoryRoot: entry.repositoryRoot,
      branch: String(entry.branch ?? ''),
      base: String(entry.base ?? ''),
      source: entry.source === 'remote' ? 'remote' : 'local',
      remote: typeof entry.remote === 'string' ? entry.remote : null,
      start: String(entry.start ?? ''),
      materializedAt: Number(entry.materializedAt) || 0,
      warning: entry.warning ?? null,
    }
  }
  return {
    kind: 'context',
    sessionId: String(raw.sessionId ?? ''),
    workspaceRoot: raw.workspaceRoot,
    path: raw.path,
    name: String(raw.name ?? ''),
    createdAt: Number(raw.createdAt) || 0,
    repos,
  }
}

/** Persist one context manifest atomically enough for this purpose. */
export async function writeContext(record: ContextRecord): Promise<void> {
  const path = contextManifestPath(record.path)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
}

/** Instruction files probed in every repository root, in listing order. */
const INSTRUCTION_FILE_NAMES = ['AGENTS.md', 'CLAUDE.md'] as const

/**
 * Render the AGENTS.md that sits at the root of a chat's context directory.
 *
 * A context is a plain folder, so DSH's project-root-to-cwd instruction chain
 * never reaches the repositories' own guidance. This file points the agent at
 * the workspace and each known repository instead.
 *
 * Pure: no filesystem access. `instructionFiles` is the set of absolute paths
 * that really exist; pass an empty set to list none. `writeContextInstructions`
 * stats repository roots to build it.
 */
export function renderContextInstructions(
  workspaceRoot: string,
  repos: readonly WorkspaceRepoEntry[],
  instructionFiles: ReadonlySet<string> = new Set(),
): string {
  const lines = [
    '<!-- Generated by DeepSeek Harness for this chat. Safe to edit: this file is never overwritten. -->',
    '',
    '# Chat workspace',
    '',
    'This directory is this chat\'s working folder, not a Git repository.',
    'Repositories appear here only when this chat changes them; the main checkouts below live elsewhere in the workspace.',
    '',
    `- Workspace root: \`${workspaceRoot}\``,
    '',
  ]
  if (repos.length === 0) {
    lines.push('No repositories were discovered in this workspace.', '')
    return lines.join('\n')
  }
  lines.push('## Repositories', '')
  for (const repo of repos) {
    lines.push(`### \`${repo.id}\``, '')
    lines.push(`- Main checkout: \`${repo.root}\``)
    if (repo.role.trim() !== '' && repo.role !== repo.name) lines.push(`- Role: ${repo.role}`)
    const files = INSTRUCTION_FILE_NAMES
      .map((name) => join(repo.root, name))
      .filter((path) => instructionFiles.has(path))
    if (files.length > 0) {
      lines.push('- Instruction files (read these before working in this repository):')
      for (const file of files) lines.push(`  - \`${file}\``)
    }
    lines.push('')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

/**
 * Create the generated AGENTS.md of a context directory, once.
 *
 * An existing file is left untouched so a user's edits survive context repair.
 * Callers may treat this as best-effort (`.catch(...)`); a failure to stat a
 * repository is simply treated as "no instruction file there".
 */
export async function writeContextInstructions(
  context: ContextRecord,
  repos: readonly WorkspaceRepoEntry[],
): Promise<void> {
  const target = join(context.path, 'AGENTS.md')
  if (await stat(target).catch(() => undefined) !== undefined) return

  const instructionFiles = new Set<string>()
  await Promise.all(
    repos.flatMap((repo) => INSTRUCTION_FILE_NAMES.map(async (name) => {
      const path = join(repo.root, name)
      const info = await stat(path).catch(() => undefined)
      if (info?.isFile() === true) instructionFiles.add(path)
    })),
  )

  await mkdir(context.path, { recursive: true })
  try {
    // `wx` also protects against a file appearing between the check and write.
    await writeFile(target, renderContextInstructions(context.workspaceRoot, repos, instructionFiles), {
      encoding: 'utf8',
      flag: 'wx',
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
}

/**
 * Create one repository's checkout inside a context directory.
 *
 * The base is fetched from the repository's remote when the configured source
 * is `remote`; a repository without a remote falls back to its local default.
 * A dirty main checkout is not copied: the checkout starts from the fetched
 * base, and the caller receives a warning so the user knows to commit or
 * stash before comparing. Nothing is created for a repository that never
 * reaches this function.
 */
export async function materializeRepo(options: {
  runner: GitRunner
  context: ContextRecord
  repo: WorkspaceRepoEntry
  set: RepoSet
  config: ContextCheckoutConfig
  timeoutMs?: number
  signal?: AbortSignal
  base?: string
  now?: number
}): Promise<MaterializeResult> {
  const { runner, context, repo, set, config, timeoutMs, signal } = options
  const existing = context.repos[repo.id]
  if (existing !== undefined) {
    const info = await stat(existing.path).catch(() => undefined)
    if (info?.isDirectory() === true) return { checkout: existing, created: false, warning: existing.warning ?? null }
    // The directory vanished: forget the record and prune Git's registration
    // before creating it again, or `worktree add` would refuse the stale path.
    delete context.repos[repo.id]
    await runner.run('git', ['worktree', 'prune'], { cwd: repo.root, signal }).catch(() => undefined)
    await writeContext(context).catch(() => undefined)
  }

  const remote = await preferredRemote(runner, repo, set, config, signal)
  const requestedBase = String(options.base ?? '').trim()
  const manifestBase = String(set.manifest.base?.[repo.id] ?? set.manifest.base?.[repo.name] ?? '').trim()
  const configuredBase = requestedBase || manifestBase || String(config.base ?? '').trim()
  let base = configuredBase
  if (base.length === 0) {
    base = (await resolveDefaultBase(runner, { root: repo.root, remote, signal })) ?? ''
  } else {
    const found = await runner.run('git', ['rev-parse', '--verify', '--quiet', `${base}^{commit}`], {
      cwd: repo.root,
      signal,
    })
    if (found.code !== 0) {
      base = (await resolveDefaultBase(runner, { root: repo.root, remote, signal })) ?? ''
    }
  }
  if (base.length === 0) {
    throw new CommandError('checkout/no-base', `Cannot determine a base branch for ${repo.name}`, { repo: repo.id })
  }

  const dirty = await mainCheckoutDirty(runner, repo.root, signal)
  const dirtyPolicy = set.manifest.checkout?.dirtyMain ?? config.dirtyMain ?? 'warn'
  if (dirty && dirtyPolicy === 'abort') {
    throw new CommandError(
      'checkout/dirty-main',
      `${repo.name} has uncommitted changes in its main checkout. Commit or stash them before this chat starts a checkout.`,
      { repo: repo.id, root: repo.root },
    )
  }

  // `fetchOnCheckout: false` means "never fetch", even when the config asks
  // for a remote source: the checkout still comes from a local branch.
  const source = config.fetchOnCheckout === false || config.source === 'local' || remote.length === 0 ? 'local' : 'remote'
  const branch = await uniqueBranchName(runner, { root: repo.root, branch: context.name, signal })
  const checkoutPath = join(context.path, repo.relativePath)
  if (checkoutPath !== context.path && !isInside(context.path, checkoutPath)) {
    throw new CommandError('checkout/invalid-path', `Checkout path for ${repo.name} escapes the context directory`)
  }
  let created: Awaited<ReturnType<typeof createWorktree>>
  let fetchFailed = false
  try {
    created = await createWorktree(runner, {
      repoRoot: repo.root,
      name: branch,
      base,
      source,
      remote: source === 'remote' ? remote : '',
      path: checkoutPath,
      timeoutMs,
      signal,
    })
  } catch (error) {
    if (source !== 'remote') throw error
    // A fetch can fail while the local base is perfectly usable; the checkout
    // is still isolated, just older. The caller shows the warning.
    fetchFailed = true
    created = await createWorktree(runner, {
      repoRoot: repo.root,
      name: branch,
      base,
      source: 'local',
      path: checkoutPath,
      timeoutMs,
      signal,
    })
  }
  const warnings: string[] = []
  if (dirty) warnings.push(`The main checkout of ${repo.name} has uncommitted changes that this checkout does not include.`)
  if (fetchFailed && source === 'remote') warnings.push(`Could not fetch ${remote}/${base}; started from the local branch instead.`)
  const warning = warnings.length === 0 ? null : warnings.join(' ')
  const checkout: RepoCheckout = {
    id: repo.id,
    path: created.path,
    repositoryRoot: repo.root,
    branch: created.branch,
    base,
    source,
    remote: source === 'remote' ? remote : null,
    start: created.start,
    materializedAt: options.now ?? Date.now(),
    warning,
  }
  context.repos[repo.id] = checkout
  try {
    await writeContext(context)
  } catch (error) {
    // Roll back the whole materialization, not just the directory: the
    // worktree registration and the new branch would otherwise be orphaned in
    // Git while nothing in the JSON store points at them any more.
    await removeWorktree(runner, {
      repoRoot: repo.root,
      path: checkout.path,
      branch: created.branch,
      deleteBranch: true,
      timeoutMs,
      signal,
    }).catch(() => undefined)
    await removeCheckoutDir(checkout.path)
    delete context.repos[repo.id]
    throw error
  }
  return { checkout, created: true, warning }
}

/**
 * Remove one repository's checkout from a context directory.
 *
 * A checkout with uncommitted work is kept unless `force` is set: losing a
 * chat's work because a button was pressed is never the right default.
 */
export async function removeRepoCheckout(options: {
  runner: GitRunner
  context: ContextRecord
  repoId: string
  deleteBranch?: boolean
  force?: boolean
  timeoutMs?: number
  signal?: AbortSignal
}): Promise<{ removed: boolean; branchDeleted: boolean }> {
  const checkout = options.context.repos[options.repoId]
  if (checkout === undefined) return { removed: false, branchDeleted: false }
  const result = await removeWorktree(options.runner, {
    repoRoot: checkout.repositoryRoot,
    path: checkout.path,
    branch: checkout.branch,
    deleteBranch: options.deleteBranch === true,
    force: options.force === true,
    timeoutMs: options.timeoutMs,
    signal: options.signal,
  })
  delete options.context.repos[options.repoId]
  await writeContext(options.context)
  return { removed: result.removed, branchDeleted: result.branchDeleted }
}

/** Remove every checkout of a context, then the directory itself. */
export async function removeContext(options: {
  runner: GitRunner
  context: ContextRecord
  deleteBranch?: boolean
  force?: boolean
  timeoutMs?: number
  signal?: AbortSignal
}): Promise<void> {
  for (const repoId of Object.keys(options.context.repos)) {
    await removeRepoCheckout({
      runner: options.runner,
      context: options.context,
      repoId,
      deleteBranch: options.deleteBranch,
      force: options.force,
      timeoutMs: options.timeoutMs,
      signal: options.signal,
    }).catch(() => undefined)
  }
  await rm(options.context.path, { recursive: true, force: true })
}

/** Remove a directory a failed materialization left behind. */
async function removeCheckoutDir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true }).catch(() => undefined)
}

/** The remote a checkout should fetch from. */
async function preferredRemote(
  runner: GitRunner,
  repo: WorkspaceRepoEntry,
  set: RepoSet,
  config: ContextCheckoutConfig,
  signal?: AbortSignal,
): Promise<string> {
  const names = await remoteNames(runner, { root: repo.root, signal })
  const candidates = [
    set.manifest.remote?.[repo.id] ?? set.manifest.remote?.[repo.name],
    config.remote,
    'origin',
  ]
  for (const candidate of candidates) {
    const name = String(candidate ?? '').trim()
    if (name.length > 0 && names.includes(name)) return name
  }
  return names[0] ?? ''
}

/** Whether the repository's main checkout has uncommitted changes. */
async function mainCheckoutDirty(
  runner: GitRunner,
  root: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const result = await runner.run('git', ['status', '--porcelain', '--untracked-files=normal'], {
    cwd: root,
    signal,
    maxBytes: 2 * 1024 * 1024,
  }).catch(() => undefined)
  if (result === undefined || result.code !== 0) return false
  return String(result.stdout ?? '').trim().length > 0
}

/** The platform's path separator, without importing `node:path` twice. */
function sepName(): string {
  return process.platform === 'win32' ? '\\' : '/'
}
