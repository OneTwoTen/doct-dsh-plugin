/**
 * The repositories one workspace directory contains.
 *
 * A workspace is a plain directory whose children (or grandchildren) are Git
 * checkouts. This module discovers them without asking the user, reads the
 * optional `.dsh-workspace.json` for roles and overrides, and answers the one
 * question every Git route needs: which checkout does a repo id name?
 *
 * Nothing here mutates the filesystem or Git; discovery is read-only and safe
 * to call while a chat is running.
 */
import { readFile, readdir, realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path'

import { locateRepository } from './git-run.ts'
import type { GitRunner } from './git-run.ts'

/** The manifest file a workspace may carry. */
export const WORKSPACE_MANIFEST = '.dsh-workspace.json'

/** Directory entries never treated as repositories nor descended into. */
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'vendor',
  'dist',
  'build',
  'target',
  'out',
  'coverage',
  'pods',
  'carthage',
  '.venv',
  'venv',
  'env',
  '__pycache__',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  '.gradle',
  '.idea',
  '.vscode',
])

/** What `.dsh-workspace.json` may say. Every field is optional. */
export interface WorkspaceManifest {
  version?: number
  /** Repos that belong to the everyday workflow; absent means every repo. */
  core?: string[]
  /** Repo ids (or directory names) that must not appear. */
  exclude?: string[]
  /** Display role per repo id. */
  roles?: Record<string, string>
  /** Short description per repo id. */
  description?: Record<string, string>
  /** Default base branch per repo id. */
  base?: Record<string, string>
  /** Default remote per repo id. */
  remote?: Record<string, string>
  checkout?: {
    mode?: 'lazy' | 'eager' | 'off'
    dirtyMain?: 'warn' | 'abort'
    enforceIsolation?: boolean
  }
}

/** One repository discovered in a workspace. */
export interface WorkspaceRepoEntry {
  /** Stable id: the path relative to the workspace root (`be`, `apps/fe`). */
  id: string
  /** Display name: the final path segment. */
  name: string
  /** Repository top-level, absolute and canonical. */
  root: string
  /** `id` is this path relative to the workspace root; `.` for a root repo. */
  relativePath: string
  role: string
  description: string
  /** Whether this repo belongs to the everyday workflow. */
  core: boolean
  /** Whether it is discovered but outside `core`. */
  available: boolean
  source: 'root' | 'scan'
}

/** The repositories of one workspace. */
export interface RepoSet {
  /** Canonical workspace directory. */
  workspaceRoot: string
  /**
   * `single` when the workspace itself is (inside) a Git repository; `multi`
   * when it is a plain directory with one or more repositories; `none` when it
   * holds no repository at all.
   */
  kind: 'single' | 'multi' | 'none'
  repos: WorkspaceRepoEntry[]
  warnings: string[]
  manifest: WorkspaceManifest
  manifestPath: string
  /** True when the workspace directory is inside a Git repository. */
  insideRepo: boolean
}

/** Limits that keep discovery cheap on a large folder. */
export interface RepoSetOptions {
  /** How many directory levels below the workspace root to inspect. */
  scanDepth?: number
  /** Whether to follow a symlinked child directory. */
  followSymlinks?: boolean
  /** Abort discovery when the caller's request is cancelled. */
  signal?: AbortSignal
}

/** The default discovery depth; `ws/apps/fe` needs 2. */
export const DEFAULT_SCAN_DEPTH = 2
/** How many directories one scan may inspect. */
const MAX_SCANNED_DIRECTORIES = 500

/** A path comparison key; Windows compares case-insensitively. */
export function repoPathKey(value: string): string {
  const normalized = resolve(String(value ?? ''))
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

/** Tell whether one directory is the same as or below another. */
export function isPathInside(parent: string, child: string): boolean {
  const from = resolve(parent)
  const to = resolve(child)
  if (from === to) return true
  const path = relative(from, to)
  return path.length > 0 && !path.startsWith('..') && !isAbsolute(path)
}

/** Read the optional manifest; a malformed file is reported, never thrown. */
export async function readWorkspaceManifest(workspaceRoot: string): Promise<{
  manifest: WorkspaceManifest
  path: string
  error?: string
}> {
  const path = join(workspaceRoot, WORKSPACE_MANIFEST)
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return { manifest: {}, path }
  }
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { manifest: {}, path, error: `${WORKSPACE_MANIFEST} must hold an object` }
    }
    return { manifest: normalizeManifest(parsed as Record<string, unknown>), path }
  } catch (error) {
    return { manifest: {}, path, error: `cannot read ${WORKSPACE_MANIFEST}: ${errorMessage(error)}` }
  }
}

/** Keep only the manifest fields this plugin understands, with the right shapes. */
function normalizeManifest(raw: Record<string, unknown>): WorkspaceManifest {
  const manifest: WorkspaceManifest = {}
  const strings = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined
    const list = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
    return list.length > 0 ? list : undefined
  }
  const record = (value: unknown): Record<string, string> | undefined => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
    const out: Record<string, string> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (typeof item === 'string' && item.trim().length > 0) out[key] = item.trim()
    }
    return Object.keys(out).length > 0 ? out : undefined
  }
  const version = typeof raw.version === 'number' ? raw.version : undefined
  if (version !== undefined) manifest.version = version
  const core = strings(raw.core)
  if (core !== undefined) manifest.core = core
  const exclude = strings(raw.exclude)
  if (exclude !== undefined) manifest.exclude = exclude
  const roles = record(raw.roles)
  if (roles !== undefined) manifest.roles = roles
  const description = record(raw.description)
  if (description !== undefined) manifest.description = description
  const base = record(raw.base)
  if (base !== undefined) manifest.base = base
  const remote = record(raw.remote)
  if (remote !== undefined) manifest.remote = remote
  if (raw.checkout !== null && typeof raw.checkout === 'object' && !Array.isArray(raw.checkout)) {
    const checkout = raw.checkout as Record<string, unknown>
    manifest.checkout = {}
    if (checkout.mode === 'lazy' || checkout.mode === 'eager' || checkout.mode === 'off') {
      manifest.checkout.mode = checkout.mode
    }
    if (checkout.dirtyMain === 'warn' || checkout.dirtyMain === 'abort') {
      manifest.checkout.dirtyMain = checkout.dirtyMain
    }
    if (typeof checkout.enforceIsolation === 'boolean') manifest.checkout.enforceIsolation = checkout.enforceIsolation
  }
  return manifest
}

/**
 * Discover the repositories of one workspace.
 *
 * The workspace itself is checked first: when it is a Git repository, the
 * workspace is a single-repo workspace and nested repositories are its
 * contents, not siblings. Otherwise its children (and grandchildren, up to
 * `scanDepth`) are inspected. A child counts only when Git itself reports the
 * directory as its top-level, which excludes vendored repositories and
 * submodules from becoming siblings.
 *
 * @param runner command runner used for `git rev-parse`.
 * @param workspaceRoot directory the user opened as a workspace.
 * @param options discovery limits and cancellation.
 * @returns the discovered set; never throws for a missing workspace (it returns `none`).
 */
export async function resolveRepoSet(
  runner: GitRunner,
  workspaceRoot: string,
  options: RepoSetOptions = {},
): Promise<RepoSet> {
  const requested = resolve(String(workspaceRoot ?? ''))
  const canonical = await realpath(requested).catch(() => requested)
  const read = await readWorkspaceManifest(canonical)
  const warnings: string[] = []
  if (read.error !== undefined) warnings.push(read.error)
  const manifest = read.manifest

  const inside = await locateRepository(runner, canonical, options.signal).catch(() => null)
  if (inside !== null) {
    const root = await realpath(resolve(inside)).catch(() => resolve(inside))
    const entry: WorkspaceRepoEntry = {
      id: basename(root),
      name: basename(root),
      root,
      relativePath: '.',
      role: manifest.roles?.[basename(root)] ?? manifest.roles?.[root] ?? basename(root),
      description: manifest.description?.[basename(root)] ?? '',
      core: true,
      available: false,
      source: 'root',
    }
    return {
      workspaceRoot: canonical,
      kind: 'single',
      repos: [entry],
      warnings,
      manifest,
      manifestPath: read.path,
      insideRepo: true,
    }
  }

  const exists = await stat(canonical).catch(() => undefined)
  if (exists === undefined || exists.isDirectory() !== true) {
    return {
      workspaceRoot: canonical,
      kind: 'none',
      repos: [],
      warnings: [...warnings, `${canonical} is not a directory`],
      manifest,
      manifestPath: read.path,
      insideRepo: false,
    }
  }

  const depthLimit = Math.max(1, Math.min(5, Number(options.scanDepth) || DEFAULT_SCAN_DEPTH))
  const found: WorkspaceRepoEntry[] = []
  const seen = new Set<string>()
  let scanned = 0
  const queue: Array<{ directory: string; depth: number }> = [{ directory: canonical, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (options.signal?.aborted) break
    if (scanned >= MAX_SCANNED_DIRECTORIES) {
      warnings.push(`discovery stopped after ${MAX_SCANNED_DIRECTORIES} directories`)
      break
    }
    let entries
    try {
      entries = await readdir(current.directory, { withFileTypes: true })
    } catch {
      continue
    }
    scanned += 1
    for (const entry of entries) {
      if (options.signal?.aborted) break
      const name = entry.name
      const lower = name.toLowerCase()
      if (name === '.git' || lower === WORKSPACE_MANIFEST) continue
      if (name.startsWith('.')) continue
      if (IGNORED_DIRECTORIES.has(lower)) continue
      const child = join(current.directory, name)
      let isDirectory = entry.isDirectory()
      if (entry.isSymbolicLink()) {
        if (options.followSymlinks !== true) continue
        const info = await stat(child).catch(() => undefined)
        isDirectory = info?.isDirectory() === true
      }
      if (!isDirectory) continue
      const marker = await stat(join(child, '.git')).catch(() => undefined)
      if (marker !== undefined) {
        const top = await gitTopLevel(runner, child, options.signal)
        if (top === null) {
          warnings.push(`${child} has a .git entry but git does not report it as a repository root`)
          continue
        }
        const key = repoPathKey(top)
        if (!seen.has(key)) {
          seen.add(key)
          const relativePath = relative(canonical, top).split(sep).join('/')
          const id = relativePath.length > 0 ? relativePath : basename(top)
          if (isExcluded(manifest, id, basename(top))) continue
          found.push({
            id,
            name: basename(top),
            root: top,
            relativePath: id,
            role: manifest.roles?.[id] ?? manifest.roles?.[basename(top)] ?? basename(top),
            description: manifest.description?.[id] ?? '',
            core: true,
            available: false,
            source: 'scan',
          })
        }
        // A repository owns its contents; do not treat nested repositories as siblings.
        continue
      }
      if (current.depth + 1 < depthLimit) {
        queue.push({ directory: child, depth: current.depth + 1 })
      }
    }
  }

  found.sort((left, right) => left.id.localeCompare(right.id))
  const coreIds = new Set((manifest.core ?? []).map((id) => id.split('\\').join('/')))
  if (coreIds.size > 0) {
    const known = new Set(found.map((repo) => repo.id))
    for (const id of coreIds) {
      if (!known.has(id)) warnings.push(`manifest core entry "${id}" is not a repository in this workspace`)
    }
    for (const repo of found) {
      repo.core = coreIds.has(repo.id) || coreIds.has(repo.name)
      repo.available = !repo.core
    }
  }

  return {
    workspaceRoot: canonical,
    kind: found.length === 0 ? 'none' : 'multi',
    repos: found,
    warnings,
    manifest,
    manifestPath: read.path,
    insideRepo: false,
  }
}

/** Whether a manifest excludes one repo id or directory name. */
function isExcluded(manifest: WorkspaceManifest, id: string, name: string): boolean {
  return (manifest.exclude ?? []).some((entry) => entry === id || entry === name)
}

/** The canonical top-level of one candidate, or null when it is not its own root. */
async function gitTopLevel(
  runner: GitRunner,
  directory: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const top = await locateRepository(runner, directory, signal).catch(() => null)
  if (top === null) return null
  const canonicalTop = await realpath(resolve(top)).catch(() => resolve(top))
  const canonicalDirectory = await realpath(resolve(directory)).catch(() => resolve(directory))
  return repoPathKey(canonicalTop) === repoPathKey(canonicalDirectory) ? canonicalTop : null
}

/** Find one repo by id (or name, when unique). */
export function repoOf(set: RepoSet, id: string): WorkspaceRepoEntry | undefined {
  const wanted = String(id ?? '').trim()
  if (wanted.length === 0) return undefined
  const direct = set.repos.find((repo) => repo.id === wanted)
  if (direct !== undefined) return direct
  const byName = set.repos.filter((repo) => repo.name === wanted)
  return byName.length === 1 ? byName[0] : undefined
}

/** The default repo when a route did not name one: the only one, or undefined. */
export function defaultRepo(set: RepoSet): WorkspaceRepoEntry | undefined {
  if (set.repos.length === 1) return set.repos[0]
  return set.repos.find((repo) => repo.core) ?? set.repos[0]
}

/** Error message of an unknown thrown value. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
