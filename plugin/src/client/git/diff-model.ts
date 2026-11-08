/**
 * Pure transformations of parsed patches, so the diff view stays a rendering
 * concern.
 *
 * Everything here is testable without React: whitespace filtering, the
 * two-column pairing, and the per-file summaries the stacked view shows.
 */
import type { DiffBundle, DiffFile, DiffHunk, DiffLine, FileDiff } from '../../shared/protocol.ts'

/** One row of the two-column (split) layout. */
export interface SplitRow {
  left: DiffLine | null
  right: DiffLine | null
  /** `context` for unchanged lines, `change` when a deletion pairs an addition. */
  kind: 'context' | 'change' | 'deletion' | 'addition'
}

/** Whether a hunk changes nothing but whitespace. */
export function isWhitespaceOnlyHunk(hunk: DiffHunk): boolean {
  const removed = hunk.lines.filter((line) => line.type === 'del').map((line) => normalizeWhitespace(line.text))
  const added = hunk.lines.filter((line) => line.type === 'add').map((line) => normalizeWhitespace(line.text))
  if (removed.length === 0 && added.length === 0) return false
  if (removed.length !== added.length) return false
  return removed.every((line, index) => line === added[index])
}

/** Collapse runs of whitespace so two lines can be compared by their words. */
export function normalizeWhitespace(text: string): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * Drop the hunks that only re-indent or re-space existing lines.
 *
 * Counts are left alone: the header still reports the full change, which is
 * what a "hide whitespace" switch means.
 *
 * @param file one parsed patch.
 */
export function filterWhitespaceChanges(file: DiffFile): DiffFile {
  if (file.binary) return file
  const hunks = file.hunks.filter((hunk) => !isWhitespaceOnlyHunk(hunk))
  return hunks.length === file.hunks.length ? file : { ...file, hunks }
}

/**
 * Pair a hunk's deletions and additions into rows for the split layout.
 *
 * A deletion and the addition that follows it are shown side by side; leftover
 * lines on either side occupy their column alone, which is how every split diff
 * viewer renders unbalanced hunks.
 *
 * @param hunk one parsed hunk.
 */
export function buildSplitRows(hunk: DiffHunk): SplitRow[] {
  const rows: SplitRow[] = []
  let pending: DiffLine[] = []

  const flush = (): void => {
    for (const line of pending) rows.push({ left: line, right: null, kind: 'deletion' })
    pending = []
  }

  for (const line of hunk.lines) {
    if (line.type === 'del') {
      pending.push(line)
      continue
    }
    if (line.type === 'add') {
      const partner = pending.shift()
      if (partner !== undefined) {
        rows.push({ left: partner, right: line, kind: 'change' })
        continue
      }
      rows.push({ left: null, right: line, kind: 'addition' })
      continue
    }
    flush()
    if (line.type === 'context') {
      rows.push({ left: line, right: line, kind: 'context' })
    } else {
      rows.push({ left: null, right: null, kind: 'context' })
    }
  }
  flush()
  return rows
}

/** Sum the line counts of one file's patch. */
export function countPatch(file: DiffFile): { additions: number; deletions: number } {
  let additions = 0
  let deletions = 0
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add') additions += 1
      else if (line.type === 'del') deletions += 1
    }
  }
  return { additions, deletions }
}

/** One file as the stacked view renders it. */
export interface StackFile {
  path: string
  /** The file's patch, already whitespace-filtered when the switch is on. */
  file: DiffFile | null
  additions: number
  deletions: number
  binary: boolean
  truncated: boolean
  tooLarge: boolean
  untracked: boolean
  /** The previous path of a rename. */
  oldPath: string | null
  /** Whether every hunk was dropped as a whitespace-only change. */
  whitespaceOnly: boolean
}

/**
 * Turn a diff bundle into the stack's file list.
 *
 * @param bundle every changed file's diff.
 * @param hideWhitespace whether whitespace-only hunks are dropped.
 */
export function buildStack(bundle: DiffBundle | undefined, hideWhitespace: boolean): StackFile[] {
  if (bundle === undefined) return []
  const stack: StackFile[] = []
  for (const entry of bundle.files) {
    for (const patch of entry.files.length > 0 ? entry.files : [null]) {
      if (patch === null) {
        stack.push({
          path: entry.path,
          file: null,
          additions: 0,
          deletions: 0,
          binary: entry.binary,
          truncated: entry.truncated,
          tooLarge: entry.tooLarge === true,
          untracked: entry.untracked,
          oldPath: null,
          whitespaceOnly: false,
        })
        continue
      }
      const filtered = hideWhitespace ? filterWhitespaceChanges(patch) : patch
      const counts = countPatch(patch)
      stack.push({
        path: patch.path ?? entry.path,
        file: filtered,
        additions: counts.additions,
        deletions: counts.deletions,
        binary: patch.binary || entry.binary,
        truncated: entry.truncated || patch.truncated === true,
        tooLarge: entry.tooLarge === true,
        untracked: entry.untracked,
        oldPath: patch.oldPath,
        whitespaceOnly: filtered.hunks.length === 0 && patch.hunks.length > 0,
      })
    }
  }
  return stack
}

/** Every file of a bundle, flattened for selection and counting. */
export function bundleFiles(bundle: DiffBundle | undefined): FileDiff[] {
  return bundle === undefined ? [] : bundle.files
}

/** The identity key a collapsed-file set uses. */
export function stackKey(file: StackFile): string {
  return `${file.oldPath ?? ''}\0${file.path}`
}
