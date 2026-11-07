/**
 * Pure parsing helpers for git and code-host output.
 *
 * Everything here takes text and returns plain JSON, so the shapes the browser
 * receives can be tested without a repository, a git executable, or a code host.
 */

/** Pairs of index/work-tree codes that mark an unresolved merge. */
const CONFLICT_CODES = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'])

/**
 * Split one `git` path list produced with `-z`.
 * @param {string} raw NUL-separated output.
 * @returns {string[]} non-empty fields.
 */
export function nulFields(raw) {
  return String(raw ?? '').split('\0').filter((field) => field.length > 0)
}

/**
 * Recognize the code host behind a git remote URL.
 *
 * Handles `https://`, `ssh://`, `git://`, and the scp-like `git@host:owner/repo`
 * spelling, strips credentials, and treats GitLab's nested groups as one owner.
 *
 * @param {string} input remote URL as `git remote -v` prints it.
 * @returns {{ url: string, provider: string, host: string, owner: string, name: string, slug: string } | undefined}
 */
export function parseRemoteUrl(input) {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (raw.length === 0) return undefined

  let host = ''
  let path = ''
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(?!\/)(.+)$/.exec(raw)
  if (!raw.includes('://') && scp !== null) {
    host = scp[1]
    path = scp[2]
  } else {
    let parsed
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
    url: raw,
    provider,
    host,
    owner,
    name,
    slug: `${owner}/${name}`,
  }
}

/**
 * Parse `git status --porcelain=v2 -z --branch --untracked-files=all`.
 *
 * @param {string} raw NUL-separated porcelain v2 output.
 * @returns {{ branch: Record<string, unknown>, files: Array<Record<string, unknown>> }}
 */
export function parsePorcelainV2(raw) {
  const fields = String(raw ?? '').split('\0')
  const branch = {
    head: null,
    oid: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    detached: false,
    unborn: false,
  }
  const files = []

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
      })
      continue
    }
    // `!` (ignored) and any future record type carry no file the panel shows.
  }

  return { branch, files }
}

/**
 * Read one `# ` header line of porcelain v2 into the branch record.
 * @param {Record<string, unknown>} branch mutable record.
 * @param {string} text header text after `# `.
 */
function readBranchHeader(branch, text) {
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
 * @param {{ codes: string, path: string, origPath?: string }} input status codes and path.
 * @returns {Record<string, unknown>} the record the panel renders.
 */
function fileEntry({ codes, path, origPath }) {
  const index = codes[0] ?? '.'
  const worktree = codes[1] ?? '.'
  const conflicted = CONFLICT_CODES.has(codes)
  const staged = index !== '.' && index !== ' ' && index !== '?'
  const unstaged = worktree !== '.' && worktree !== ' '
  return {
    path,
    origPath: origPath !== undefined && origPath.length > 0 ? origPath : undefined,
    index,
    worktree,
    kind: kindOf(index, worktree, conflicted),
    staged,
    unstaged,
    untracked: false,
    conflicted,
  }
}

/**
 * Name one file's change for display.
 * @param {string} index index status code.
 * @param {string} worktree work-tree status code.
 * @param {boolean} conflicted whether the entry is an unresolved merge.
 * @returns {string} one of added, deleted, renamed, copied, typechange, conflicted, modified.
 */
function kindOf(index, worktree, conflicted) {
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

/**
 * Parse `git diff --numstat -z`, including rename records.
 *
 * A normal record is `added<TAB>deleted<TAB>path`; a rename is
 * `added<TAB>deleted<TAB>` followed by the old and new paths as their own
 * NUL-separated fields. A binary file reports `-` for both counts.
 *
 * @param {string} raw NUL-separated numstat output.
 * @returns {Array<{ path: string, origPath?: string, additions: number, deletions: number, binary: boolean }>}
 */
export function parseNumstatZ(raw) {
  const fields = String(raw ?? '').split('\0')
  const entries = []
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]
    if (field.length === 0) continue
    const firstTab = field.indexOf('\t')
    const secondTab = firstTab < 0 ? -1 : field.indexOf('\t', firstTab + 1)
    if (firstTab < 0 || secondTab < 0) continue

    const added = field.slice(0, firstTab)
    const deleted = field.slice(firstTab + 1, secondTab)
    let path = field.slice(secondTab + 1)
    let origPath
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
 * @param {Array<Record<string, unknown>>} files records from {@link parsePorcelainV2}.
 * @param {Array<{ path: string, origPath?: string, additions: number, deletions: number, binary: boolean }>} stats numstat records.
 * @returns {Array<Record<string, unknown>>} new records carrying `additions`, `deletions`, and `binary`.
 */
export function mergeLineCounts(files, stats) {
  const byPath = new Map()
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
 * @param {string} raw unified diff text.
 * @returns {Array<Record<string, unknown>>} one record per file.
 */
export function parsePatch(raw) {
  const lines = String(raw ?? '').split('\n')
  const files = []
  let file
  let hunk
  let oldNumber = 0
  let newNumber = 0

  const startFile = () => {
    file = { path: null, oldPath: null, hunks: [], additions: 0, deletions: 0, binary: false, meta: [] }
    files.push(file)
    hunk = undefined
    return file
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === undefined) continue

    if (line.startsWith('diff --git ')) {
      startFile()
      const rest = line.slice('diff --git '.length)
      const split = rest.lastIndexOf(' b/')
      if (split > 0) {
        file.oldPath = unquotePath(rest.slice(0, split).replace(/^a\//, ''))
        file.path = unquotePath(rest.slice(split + 3))
      } else {
        file.path = rest
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
      hunk = {
        header: line,
        section: header[5] ?? '',
        oldStart: oldNumber,
        oldLines: header[2] === undefined ? 1 : Number(header[2]),
        newStart: newNumber,
        newLines: header[4] === undefined ? 1 : Number(header[4]),
        lines: [],
      }
      file.hunks.push(hunk)
      continue
    }

    if (line.startsWith('Binary files ') || line === 'GIT binary patch') {
      if (file === undefined) startFile()
      file.binary = true
      continue
    }

    if (line.length === 0) continue

    if (hunk === undefined) {
      if (file === undefined) startFile()
      file.meta.push(line)
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
      file.additions += 1
      continue
    }
    if (marker === '-') {
      hunk.lines.push({ type: 'del', text: line.slice(1), oldNumber, newNumber: null })
      oldNumber += 1
      file.deletions += 1
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
 * @param {string} text path as printed.
 * @returns {string} plain path.
 */
export function unquotePath(text) {
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
 * @param {string} path repository-relative path.
 * @param {string} text file content.
 * @param {{ truncated?: boolean, binary?: boolean }} [options] read outcome.
 * @returns {Array<Record<string, unknown>>} one file patch, in the shape {@link parsePatch} returns.
 */
export function untrackedPatch(path, text, options = {}) {
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
 * @param {string} raw log output.
 * @returns {Array<{ hash: string, short: string, author: string, date: string, refs: string, subject: string }>}
 */
export function parseLog(raw) {
  const commits = []
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

/**
 * Parse `git for-each-ref` output for the branch picker.
 * @param {string} raw unit-separated output.
 * @returns {Array<Record<string, unknown>>}
 */
export function parseBranches(raw) {
  const branches = []
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
 * Pick the remote a repository's branch tracks, preferring the configured
 * remote, then the upstream's remote, then `origin`, then the first remote.
 *
 * @param {string} raw `git remote -v` output.
 * @param {{ preferred?: string, upstream?: string | null }} options selection hints.
 * @returns {{ name: string, url: string } | undefined}
 */
export function pickRemote(raw, options = {}) {
  const remotes = new Map()
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
  const [name, url] = remotes.entries().next().value
  return { name, url }
}

/**
 * Sum the changed files into the counters the panel header shows.
 * @param {Array<Record<string, unknown>>} files changed-file records.
 * @returns {Record<string, number>} totals.
 */
export function summarizeChanges(files) {
  const totals = { files: files.length, additions: 0, deletions: 0, staged: 0, unstaged: 0, untracked: 0, conflicted: 0 }
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
