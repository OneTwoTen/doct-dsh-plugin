/**
 * Pure parsing helpers for git and code-host output.
 *
 * Everything here takes text and returns plain JSON, so the shapes the browser
 * receives can be tested without a repository, a git executable, or a code host.
 */
import type {
  ChangeKind,
  DiffFile,
  DiffHunk,
  DiffLine,
  GitBranch,
  GitCommitSummary,
  GitFileChange,
  GitRemoteInfo,
  GitStats,
} from '../shared/protocol.ts'

/** Pairs of index/work-tree codes that mark an unresolved merge. */
const CONFLICT_CODES = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'])

/**
 * Split one `git` path list produced with `-z`.
 * @param raw NUL-separated output.
 * @returns non-empty fields.
 */
export function nulFields(raw: string | null | undefined): string[] {
  return String(raw ?? '')
    .split('\0')
    .filter((field) => field.length > 0)
}

/**
 * Recognize the code host behind a git remote URL.
 *
 * Handles `https://`, `ssh://`, `git://`, and the scp-like `git@host:owner/repo`
 * spelling, strips credentials, and treats GitLab's nested groups as one owner.
 *
 * @param input remote URL as `git remote -v` prints it.
 */
export function parseRemoteUrl(input: string | null | undefined): GitRemoteInfo | undefined {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (raw.length === 0) return undefined

  let host = ''
  let path = ''
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(?!\/)(.+)$/.exec(raw)
  if (!raw.includes('://') && scp !== null) {
    host = scp[1]
    path = scp[2]
  } else {
    let parsed: URL
    try {
      parsed = new URL(raw)
    } catch {
      return undefined
    }
    if (parsed.protocol === 'file:') return undefined
    host = parsed.hostname
    path = parsed.pathname
  }

  const segments = path
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '')
    .split('/')
    .filter((segment) => segment.length > 0)
  if (segments.length < 2) return undefined
  const name = segments[segments.length - 1]
  const owner = segments.slice(0, -1).join('/')
  const lowered = host.toLowerCase()
  const provider = /(^|\.)github\.com$/.test(lowered) || lowered === 'github.com'
    ? 'github'
    : lowered.includes('gitlab')
      ? 'gitlab'
      : 'other'

  return {
    name,
    url: raw,
    provider,
    host,
    owner,
    repository: name,
    slug: `${owner}/${name}`,
  }
}

/** The branch header of a porcelain v2 status. */
export interface ParsedBranchHeader {
  head: string | null
  oid: string | null
  upstream: string | null
  ahead: number
  behind: number
  detached: boolean
  unborn: boolean
}

/** One status answer: the branch header and every changed file. */
export interface ParsedStatus {
  branch: ParsedBranchHeader
  files: GitFileChange[]
}

/**
 * Parse `git status --porcelain=v2 -z --branch --untracked-files=all`.
 *
 * @param raw NUL-separated porcelain v2 output.
 */
export function parsePorcelainV2(raw: string | null | undefined): ParsedStatus {
  const fields = String(raw ?? '').split('\0')
  const branch: ParsedBranchHeader = {
    head: null,
    oid: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    detached: false,
    unborn: false,
  }
  const files: GitFileChange[] = []

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]
    if (field.length === 0) continue

    if (field.startsWith('# ')) {
      readBranchHeader(branch, field.slice(2))
      continue
    }

    const type = field[0]
    if (type === '1') {
      const parts = field.split(' ')
      const codes = parts[1] ?? '..'
      files.push(fileEntry({ codes, path: parts.slice(8).join(' ') }))
      continue
    }
    if (type === '2') {
      const parts = field.split(' ')
      const codes = parts[1] ?? '..'
      const original = fields[index + 1]
      index += 1
      files.push(fileEntry({ codes, path: parts.slice(9).join(' '), origPath: original }))
      continue
    }
    if (type === 'u') {
      const parts = field.split(' ')
      files.push(fileEntry({ codes: parts[1] ?? 'UU', path: parts.slice(10).join(' ') }))
      continue
    }
    if (type === '?') {
      const path = field.slice(2)
      files.push({
        path,
        origPath: undefined,
        index: '?',
        worktree: '?',
        kind: 'untracked',
        staged: false,
        unstaged: true,
        untracked: true,
        conflicted: false,
        additions: 0,
        deletions: 0,
        binary: false,
      })
      continue
    }
    // `!` (ignored) and any future record type carry no file the panel shows.
  }

  return { branch, files }
}

/**
 * Read one `# ` header line of porcelain v2 into the branch record.
 * @param branch mutable record.
 * @param text header text after `# `.
 */
function readBranchHeader(branch: ParsedBranchHeader, text: string): void {
  const space = text.indexOf(' ')
  const key = space < 0 ? text : text.slice(0, space)
  const value = space < 0 ? '' : text.slice(space + 1)
  switch (key) {
    case 'branch.oid':
      branch.unborn = value === '(initial)'
      branch.oid = branch.unborn ? null : value
      return
    case 'branch.head':
      branch.detached = value === '(detached)'
      branch.head = branch.detached ? null : value
      return
    case 'branch.upstream':
      branch.upstream = value.length > 0 ? value : null
      return
    case 'branch.ab': {
      const match = /^\+(\d+)\s+-(\d+)$/.exec(value.trim())
      if (match !== null) {
        branch.ahead = Number(match[1])
        branch.behind = Number(match[2])
      }
      return
    }
    default:
  }
}

/**
 * Build one changed-file record from its two status codes.
 * @param input status codes and path.
 */
function fileEntry(input: { codes: string; path: string; origPath?: string }): GitFileChange {
  const index = input.codes[0] ?? '.'
  const worktree = input.codes[1] ?? '.'
  const conflicted = CONFLICT_CODES.has(input.codes)
  const staged = index !== '.' && index !== ' ' && index !== '?'
  const unstaged = worktree !== '.' && worktree !== ' '
  return {
    path: input.path,
    origPath: input.origPath !== undefined && input.origPath.length > 0 ? input.origPath : undefined,
    index,
    worktree,
    kind: kindOf(index, worktree, conflicted),
    staged,
    unstaged,
    untracked: false,
    conflicted,
    additions: 0,
    deletions: 0,
    binary: false,
  }
}

/**
 * Name one file's change for display.
 * @param index index status code.
 * @param worktree work-tree status code.
 * @param conflicted whether the entry is an unresolved merge.
 */
function kindOf(index: string, worktree: string, conflicted: boolean): ChangeKind {
  if (conflicted) return 'conflicted'
  const staged = index !== '.' && index !== ' ' && index !== '?'
  const primary = staged ? index : worktree
  switch (primary) {
    case 'A':
      return 'added'
    case 'D':
      return 'deleted'
    case 'R':
      return 'renamed'
    case 'C':
      return 'copied'
    case 'T':
      return 'typechange'
    case 'U':
      return 'conflicted'
    default:
      return 'modified'
  }
}

/** One `--numstat -z` record. */
export interface NumstatEntry {
  path: string
  origPath?: string
  additions: number
  deletions: number
  binary: boolean
}

/**
 * Parse `git diff --numstat -z`, including rename records.
 *
 * A normal record is `added<TAB>deleted<TAB>path`; a rename is
 * `added<TAB>deleted<TAB>` followed by the old and new paths as their own
 * NUL-separated fields. A binary file reports `-` for both counts.
 *
 * @param raw NUL-separated numstat output.
 */
export function parseNumstatZ(raw: string | null | undefined): NumstatEntry[] {
  const fields = String(raw ?? '').split('\0')
  const entries: NumstatEntry[] = []
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]
    if (field.length === 0) continue
    const firstTab = field.indexOf('\t')
    const secondTab = firstTab < 0 ? -1 : field.indexOf('\t', firstTab + 1)
    if (firstTab < 0 || secondTab < 0) continue

    const added = field.slice(0, firstTab)
    const deleted = field.slice(firstTab + 1, secondTab)
    let path = field.slice(secondTab + 1)
    let origPath: string | undefined
    if (path.length === 0) {
      origPath = fields[index + 1]
      path = fields[index + 2] ?? ''
      index += 2
    }
    if (path === undefined || path.length === 0) continue

    const binary = added === '-' || deleted === '-'
    entries.push({
      path,
      ...(origPath !== undefined && origPath.length > 0 ? { origPath } : {}),
      additions: binary ? 0 : Number.parseInt(added, 10) || 0,
      deletions: binary ? 0 : Number.parseInt(deleted, 10) || 0,
      binary,
    })
  }
  return entries
}

/**
 * Attach line counts from numstat records to changed-file records.
 *
 * A rename is matched by its new path first and by its old path second, because
 * porcelain v2 and numstat both report renames in their own shape.
 *
 * @param files records from {@link parsePorcelainV2}.
 * @param stats numstat records.
 */
export function mergeLineCounts(files: GitFileChange[], stats: NumstatEntry[]): GitFileChange[] {
  const byPath = new Map<string, NumstatEntry>()
  for (const entry of stats) {
    byPath.set(entry.path, entry)
    if (entry.origPath !== undefined) byPath.set(entry.origPath, entry)
  }
  return files.map((file) => {
    const hit = byPath.get(file.path)
    return {
      ...file,
      additions: hit?.additions ?? 0,
      deletions: hit?.deletions ?? 0,
      binary: hit?.binary === true,
    }
  })
}

/**
 * Parse one or more `git diff` patches into files, hunks, and numbered lines.
 *
 * Every line carries the line numbers it occupies, so the browser can draw a
 * real gutter without tracking hunk offsets itself.
 *
 * @param raw unified diff text.
 */
export function parsePatch(raw: string | null | undefined): DiffFile[] {
  const lines = String(raw ?? '').split('\n')
  const files: DiffFile[] = []
  let file: DiffFile | undefined
  let hunk: DiffHunk | undefined
  let oldNumber = 0
  let newNumber = 0

  const startFile = (): DiffFile => {
    const created: DiffFile = { path: null, oldPath: null, hunks: [], additions: 0, deletions: 0, binary: false, meta: [] }
    files.push(created)
    file = created
    hunk = undefined
    return created
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === undefined) continue

    if (line.startsWith('diff --git ')) {
      const created = startFile()
      const rest = line.slice('diff --git '.length)
      const split = rest.lastIndexOf(' b/')
      if (split > 0) {
        created.oldPath = unquotePath(rest.slice(0, split).replace(/^a\//, ''))
        created.path = unquotePath(rest.slice(split + 3))
      } else {
        created.path = rest
      }
      continue
    }

    if (line.startsWith('--- ') && lines[index + 1]?.startsWith('+++ ') && file !== undefined && file.hunks.length === 0) {
      // A plain `diff -u` header (no `diff --git` line) still names both sides.
      const oldPath = unquotePath(line.slice(4))
      const newPath = unquotePath(lines[index + 1].slice(4))
      if (file.path === null) {
        file.path = newPath === '/dev/null' ? oldPath : newPath
        if (oldPath !== '/dev/null' && oldPath !== file.path) file.oldPath = oldPath
      }
      index += 1
      continue
    }

    if (line.startsWith('@@')) {
      const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/.exec(line)
      if (header === null) continue
      if (file === undefined) startFile()
      oldNumber = Number(header[1])
      newNumber = Number(header[3])
      const created: DiffHunk = {
        header: line,
        section: header[5] ?? '',
        oldStart: oldNumber,
        oldLines: header[2] === undefined ? 1 : Number(header[2]),
        newStart: newNumber,
        newLines: header[4] === undefined ? 1 : Number(header[4]),
        lines: [],
      }
      hunk = created
      file!.hunks.push(created)
      continue
    }

    if (line.startsWith('Binary files ') || line === 'GIT binary patch') {
      if (file === undefined) startFile()
      file!.binary = true
      continue
    }

    if (line.length === 0) continue

    if (hunk === undefined) {
      if (file === undefined) startFile()
      file!.meta.push(line)
      continue
    }

    const marker = line[0]
    if (marker === '\\') {
      hunk.lines.push({ type: 'meta', text: line.slice(1).trim(), oldNumber: null, newNumber: null })
      continue
    }
    if (marker === '+') {
      hunk.lines.push({ type: 'add', text: line.slice(1), oldNumber: null, newNumber })
      newNumber += 1
      file!.additions += 1
      continue
    }
    if (marker === '-') {
      hunk.lines.push({ type: 'del', text: line.slice(1), oldNumber, newNumber: null })
      oldNumber += 1
      file!.deletions += 1
      continue
    }
    if (marker === ' ') {
      hunk.lines.push({ type: 'context', text: line.slice(1), oldNumber, newNumber })
      oldNumber += 1
      newNumber += 1
      continue
    }
    // A stray line (for example an untracked marker) ends the hunk's numbering run.
    hunk.lines.push({ type: 'meta', text: line, oldNumber: null, newNumber: null })
  }

  return files
}

/**
 * Strip git's quotes from a path it printed with `C`-style escaping.
 * @param text path as printed.
 */
export function unquotePath(text: string | null | undefined): string {
  const trimmed = String(text ?? '').trim()
  if (trimmed.length < 2 || !trimmed.startsWith('"') || !trimmed.endsWith('"')) return trimmed
  try {
    return JSON.parse(trimmed.replace(/\\"/g, '"'))
  } catch {
    return trimmed.slice(1, -1)
  }
}

/**
 * Build an everyone-added patch for a file git does not diff (an untracked one).
 *
 * @param path repository-relative path.
 * @param text file content.
 * @param options read outcome.
 */
export function untrackedPatch(
  path: string,
  text: string | null | undefined,
  options: { truncated?: boolean; binary?: boolean } = {},
): DiffFile[] {
  const content = String(text ?? '')
  const lines = content.length === 0 ? [] : content.replace(/\r\n/g, '\n').split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return [{
    path,
    oldPath: null,
    additions: lines.length,
    deletions: 0,
    binary: options.binary === true,
    truncated: options.truncated === true,
    meta: [],
    hunks: options.binary === true || lines.length === 0
      ? []
      : [{
          header: `@@ -0,0 +1,${lines.length} @@`,
          section: '',
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: lines.length,
          lines: lines.map((line, index) => ({ type: 'add', text: line, oldNumber: null, newNumber: index + 1 })),
        }],
  }]
}

/**
 * Parse the `git log` format this plugin asks for: unit-separated fields, one
 * record per NUL-terminated entry.
 *
 * @param raw log output.
 */
export function parseLog(raw: string | null | undefined): GitCommitSummary[] {
  const commits: GitCommitSummary[] = []
  for (const entry of nulFields(raw)) {
    const fields = entry.split('\x1f')
    if (fields.length < 6) continue
    commits.push({
      hash: fields[0],
      short: fields[1],
      author: fields[2],
      date: fields[3],
      refs: fields[4],
      subject: fields.slice(5).join('\x1f'),
    })
  }
  return commits
}

/** One branch as `git for-each-ref` prints it. */
export interface ParsedBranch {
  name: string
  short: string
  upstream: string | null
  date: string
  subject: string
  current: boolean
}

/**
 * Parse `git for-each-ref` output for the branch picker.
 * @param raw unit-separated output.
 */
export function parseBranches(raw: string | null | undefined): ParsedBranch[] {
  const branches: ParsedBranch[] = []
  for (const entry of String(raw ?? '').split('\n')) {
    if (entry.length === 0) continue
    const fields = entry.split('\x1f')
    if (fields.length < 5) continue
    branches.push({
      name: fields[0],
      short: fields[1],
      upstream: fields[2] || null,
      date: fields[3],
      subject: fields[4],
      current: fields[5] === '*',
    })
  }
  return branches
}

/**
 * Turn one `for-each-ref` listing into the picker's branch records.
 *
 * The listing asks for the full ref name, so a local `feature` and a remote
 * `origin/feature` stay distinguishable even though their short names collide.
 *
 * @param raw unit-separated output: full ref, short name, upstream, date, subject, HEAD marker, remote.
 * @param defaultBranch the repository's default branch, marked in the list.
 */
export function parseBranchRefs(raw: string | null | undefined, defaultBranch: string | null): GitBranch[] {
  const branches: GitBranch[] = []
  for (const entry of String(raw ?? '').split('\n')) {
    if (entry.length === 0) continue
    const fields = entry.split('\x1f')
    if (fields.length < 6) continue
    const full = fields[0]
    const short = fields[1]
    const isRemote = full.startsWith('refs/remotes/')
    const remoteName = isRemote ? (fields[6] || short.split('/')[0] || null) : null
    branches.push({
      name: short,
      short,
      upstream: fields[2] || null,
      date: fields[3],
      subject: fields[4],
      current: fields[5] === '*',
      isRemote,
      remoteName,
      isDefault: !isRemote && defaultBranch !== null && short === defaultBranch,
    })
  }
  return branches
}

/**
 * Pick the remote a repository's branch tracks, preferring the configured
 * remote, then the upstream's remote, then `origin`, then the first remote.
 *
 * @param raw `git remote -v` output.
 * @param options selection hints.
 */
export function pickRemote(
  raw: string | null | undefined,
  options: { preferred?: string; upstream?: string | null } = {},
): { name: string; url: string } | undefined {
  const remotes = new Map<string, string>()
  for (const line of String(raw ?? '').split('\n')) {
    const match = /^(\S+)\t(\S+)\s+\((fetch|push)\)$/.exec(line)
    if (match === null) continue
    const name = match[1]
    if (!remotes.has(name)) remotes.set(name, match[2])
  }
  if (remotes.size === 0) return undefined

  const preferred = options.preferred?.trim()
  if (preferred !== undefined && preferred.length > 0) {
    const url = remotes.get(preferred)
    if (url !== undefined) return { name: preferred, url }
  }
  const upstream = options.upstream
  if (typeof upstream === 'string' && upstream.includes('/')) {
    const name = upstream.slice(0, upstream.indexOf('/'))
    const url = remotes.get(name)
    if (url !== undefined) return { name, url }
  }
  const origin = remotes.get('origin')
  if (origin !== undefined) return { name: 'origin', url: origin }
  const [name, url] = remotes.entries().next().value as [string, string]
  return { name, url }
}

/**
 * Sum the changed files into the counters the panel header shows.
 * @param files changed-file records.
 */
export function summarizeChanges(files: GitFileChange[]): GitStats {
  const totals: GitStats = {
    files: files.length,
    additions: 0,
    deletions: 0,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicted: 0,
  }
  for (const file of files) {
    totals.additions += Number(file.additions) || 0
    totals.deletions += Number(file.deletions) || 0
    if (file.untracked === true) totals.untracked += 1
    else if (file.conflicted === true) totals.conflicted += 1
    if (file.staged === true) totals.staged += 1
    if (file.unstaged === true) totals.unstaged += 1
  }
  return totals
}

/**
 * Read `git rev-list --left-right --count A...B` as two numbers.
 * @param raw command output, `ahead<TAB>behind`.
 */
export function parseAheadBehind(raw: string | null | undefined): { ahead: number; behind: number } {
  const [ahead, behind] = String(raw ?? '').trim().split(/\s+/)
  return {
    ahead: Number.parseInt(ahead ?? '', 10) || 0,
    behind: Number.parseInt(behind ?? '', 10) || 0,
  }
}

/**
 * Parse the default branch from `git symbolic-ref refs/remotes/<remote>/HEAD`.
 * @param raw full ref, for example `refs/remotes/origin/main`.
 * @param remote the remote the ref belongs to.
 */
export function parseDefaultBranch(raw: string | null | undefined, remote = 'origin'): string | null {
  const text = String(raw ?? '').trim()
  const prefix = `refs/remotes/${remote}/`
  if (text.startsWith(prefix) && text.length > prefix.length) return text.slice(prefix.length)
  return text.length > 0 && !text.includes('/') ? text : null
}

/**
 * Parse the porcelain codes of one file into a single letter and tone, matching
 * the panel's status badge.
 * @param file one changed-file record.
 */
export function changeLetter(file: Pick<GitFileChange, 'kind'>): string {
  switch (file.kind) {
    case 'added':
      return 'A'
    case 'deleted':
      return 'D'
    case 'renamed':
      return 'R'
    case 'copied':
      return 'C'
    case 'typechange':
      return 'T'
    case 'conflicted':
      return '!'
    case 'untracked':
      return 'U'
    default:
      return 'M'
  }
}

/* ------------------------------------------------------------------ */
/* Branch names                                                        */
/* ------------------------------------------------------------------ */

/** The fallback fragment a branch name keeps when the text yields nothing. */
const BRANCH_FALLBACK = 'update'

/**
 * Reduce arbitrary text to a fragment Git accepts as a ref name.
 *
 * Diacritics are stripped, letters lowercased, and everything Git rejects
 * collapsed to a single `-`; the result never starts or ends with a separator.
 *
 * @param raw the text to reduce.
 */
export function sanitizeBranchFragment(raw: string): string {
  const normalized = String(raw ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/^[./\s_-]+|[./\s_-]+$/g, '')

  const fragment = normalized
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/-+/g, '-')
    .replace(/^[./_-]+|[./_-]+$/g, '')
    .slice(0, 64)
    .replace(/[./_-]+$/g, '')

  return fragment.length > 0 ? fragment : BRANCH_FALLBACK
}

/**
 * Build a feature branch name, keeping the `feature/` prefix unless the text
 * already names a path.
 * @param raw the text to reduce.
 */
export function sanitizeFeatureBranchName(raw: string): string {
  const sanitized = sanitizeBranchFragment(raw)
  return sanitized.includes('/') ? sanitized : `feature/${sanitized}`
}

/**
 * Pick the first branch name that neither exists nor shadows a child ref.
 *
 * Git stores refs as paths, so `feature/x` cannot be created when `feature/x/y`
 * exists; the loop walks every segment for that reason.
 *
 * @param existingBranchNames every local ref name.
 * @param preferredBranch the name the text suggests.
 */
export function resolveAutoFeatureBranchName(
  existingBranchNames: readonly string[],
  preferredBranch?: string,
): string {
  const preferred = preferredBranch?.trim()
  const resolvedBase = sanitizeFeatureBranchName(
    preferred !== undefined && preferred.length > 0 ? preferred : BRANCH_FALLBACK,
  )
  const existingNames = existingBranchNames.map((refName) => refName.toLowerCase())
  const existingRefs = new Set(existingNames)
  const parts = resolvedBase.split('/')
  let resolved = ''

  for (const [index, part] of parts.entries()) {
    const base = resolved ? `${resolved}/${part}` : part
    let candidate = base
    let suffix = 2
    while (
      existingRefs.has(candidate)
      || (index === parts.length - 1 && existingNames.some((refName) => refName.startsWith(`${candidate}/`)))
    ) {
      candidate = `${base}-${suffix}`
      suffix += 1
    }
    resolved = candidate
  }

  return resolved
}

