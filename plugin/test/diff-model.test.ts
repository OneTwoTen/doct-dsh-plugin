import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildSplitRows,
  buildStack,
  countPatch,
  filterWhitespaceChanges,
  isWhitespaceOnlyHunk,
  normalizeWhitespace,
  stackKey,
} from '../src/client/git/diff-model.ts'
import type { DiffBundle, DiffFile, DiffHunk } from '../src/shared/protocol.ts'

function hunk(lines: DiffHunk['lines']): DiffHunk {
  return { header: '@@ -1 +1 @@', section: '', oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines }
}

function patch(overrides: Partial<DiffFile> = {}): DiffFile {
  return {
    path: 'src/a.ts',
    oldPath: null,
    hunks: [],
    additions: 0,
    deletions: 0,
    binary: false,
    meta: [],
    ...overrides,
  }
}

test('a hunk that only re-spaces lines counts as whitespace-only', () => {
  assert.equal(isWhitespaceOnlyHunk(hunk([
    { type: 'del', text: '  const a = 1', oldNumber: 1, newNumber: null },
    { type: 'add', text: 'const a = 1', oldNumber: null, newNumber: 1 },
  ])), true)
  assert.equal(isWhitespaceOnlyHunk(hunk([
    { type: 'del', text: 'const a = 1', oldNumber: 1, newNumber: null },
    { type: 'add', text: 'const a = 2', oldNumber: null, newNumber: 1 },
  ])), false)
  assert.equal(isWhitespaceOnlyHunk(hunk([
    { type: 'context', text: 'unchanged', oldNumber: 1, newNumber: 1 },
  ])), false)
  assert.equal(normalizeWhitespace('  a   b \t c '), 'a b c')
})

test('hiding whitespace drops only the whitespace-only hunks', () => {
  const file = patch({
    hunks: [
      hunk([
        { type: 'del', text: '  one', oldNumber: 1, newNumber: null },
        { type: 'add', text: 'one', oldNumber: null, newNumber: 1 },
      ]),
      hunk([
        { type: 'del', text: 'two', oldNumber: 2, newNumber: null },
        { type: 'add', text: 'TWO', oldNumber: null, newNumber: 2 },
      ]),
    ],
  })
  const filtered = filterWhitespaceChanges(file)
  assert.equal(filtered.hunks.length, 1)
  assert.equal(file.hunks.length, 2, 'the input patch is not mutated')
  assert.equal(filterWhitespaceChanges(patch({ binary: true })).binary, true)
})

test('the split layout pairs deletions with the additions that follow', () => {
  const rows = buildSplitRows(hunk([
    { type: 'context', text: 'keep', oldNumber: 1, newNumber: 1 },
    { type: 'del', text: 'old a', oldNumber: 2, newNumber: null },
    { type: 'add', text: 'new a', oldNumber: null, newNumber: 2 },
    { type: 'del', text: 'gone b', oldNumber: 3, newNumber: null },
    { type: 'del', text: 'gone c', oldNumber: 4, newNumber: null },
    { type: 'add', text: 'new d', oldNumber: null, newNumber: 3 },
    { type: 'add', text: 'new e', oldNumber: null, newNumber: 4 },
    { type: 'add', text: 'new f', oldNumber: null, newNumber: 5 },
  ]))
  assert.equal(rows.length, 5)
  assert.equal(rows[0].kind, 'context')
  assert.equal(rows[0].left?.text, 'keep')
  assert.equal(rows[0].right?.text, 'keep')
  assert.equal(rows[1].kind, 'change')
  assert.equal(rows[1].left?.text, 'old a')
  assert.equal(rows[1].right?.text, 'new a')
  assert.equal(rows[2].kind, 'change')
  assert.equal(rows[2].left?.text, 'gone b')
  assert.equal(rows[2].right?.text, 'new d')
  assert.equal(rows[3].kind, 'change')
  assert.equal(rows[3].left?.text, 'gone c')
  assert.equal(rows[3].right?.text, 'new e')
  assert.equal(rows[4].kind, 'addition')
  assert.equal(rows[4].left, null)
  assert.equal(rows[4].right?.text, 'new f')
})

test('a bundle becomes one stack entry per file, with counts and status', () => {
  const tracked = patch({
    path: 'src/a.ts',
    hunks: [hunk([
      { type: 'del', text: 'one', oldNumber: 1, newNumber: null },
      { type: 'add', text: 'two', oldNumber: null, newNumber: 1 },
      { type: 'add', text: 'three', oldNumber: null, newNumber: 2 },
    ])],
  })
  const renamed = patch({ path: 'src/new.ts', oldPath: 'src/old.ts' })
  const untracked = patch({ path: 'notes.md' })
  const bundle: DiffBundle = {
    scope: 'working',
    baseRef: null,
    truncated: false,
    totalFiles: 3,
    files: [
      { path: 'src/a.ts', staged: false, untracked: false, binary: false, truncated: false, files: [tracked] },
      { path: 'src/new.ts', staged: false, untracked: false, binary: false, truncated: false, files: [renamed] },
      { path: 'notes.md', staged: false, untracked: true, binary: false, truncated: false, files: [untracked] },
    ],
  }
  const stack = buildStack(bundle, false)
  assert.equal(stack.length, 3)
  assert.equal(stack[0].path, 'src/a.ts')
  assert.equal(stack[0].additions, 2)
  assert.equal(stack[0].deletions, 1)
  assert.equal(stack[1].oldPath, 'src/old.ts')
  assert.equal(stack[2].untracked, true)
  assert.deepEqual(countPatch(tracked), { additions: 2, deletions: 1 })
  assert.equal(stackKey(stack[1]), 'src/old.ts\0src/new.ts')
})

test('a file whose every hunk is whitespace is marked, not hidden', () => {
  const whitespace = patch({
    path: 'src/ws.ts',
    hunks: [hunk([
      { type: 'del', text: '   x', oldNumber: 1, newNumber: null },
      { type: 'add', text: 'x', oldNumber: null, newNumber: 1 },
    ])],
  })
  const stack = buildStack({
    scope: 'working',
    baseRef: null,
    truncated: false,
    totalFiles: 1,
    files: [{ path: 'src/ws.ts', staged: false, untracked: false, binary: false, truncated: false, files: [whitespace] }],
  }, true)
  assert.equal(stack[0].whitespaceOnly, true)
  assert.equal(stack[0].file?.hunks.length, 0)
  assert.equal(stack[0].additions, 1, 'counts keep the full change')
})
