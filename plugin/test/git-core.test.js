import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  mergeLineCounts,
  parseBranches,
  parseLog,
  parseNumstatZ,
  parsePatch,
  parsePorcelainV2,
  parseRemoteUrl,
  pickRemote,
  summarizeChanges,
  untrackedPatch,
} from '../lib/git-core.js'

test('parseRemoteUrl reads the https, ssh, and scp spellings', () => {
  const https = parseRemoteUrl('https://github.com/OneTwoTen/doct-dsh-plugin.git')
  assert.equal(https.provider, 'github')
  assert.equal(https.host, 'github.com')
  assert.equal(https.owner, 'OneTwoTen')
  assert.equal(https.name, 'doct-dsh-plugin')
  assert.equal(https.slug, 'OneTwoTen/doct-dsh-plugin')

  const ssh = parseRemoteUrl('git@github.com:owner/repo.git')
  assert.equal(ssh.slug, 'owner/repo')

  const url = parseRemoteUrl('ssh://git@gitlab.com/group/sub/repo.git')
  assert.equal(url.provider, 'gitlab')
  assert.equal(url.owner, 'group/sub')
  assert.equal(url.name, 'repo')

  const withCredentials = parseRemoteUrl('https://user:secret@github.com/owner/repo')
  assert.equal(withCredentials.slug, 'owner/repo')
  assert.equal(withCredentials.url.includes('secret'), true)

  assert.equal(parseRemoteUrl(''), undefined)
  assert.equal(parseRemoteUrl('not a url'), undefined)
  assert.equal(parseRemoteUrl('https://example.com/onlyone'), undefined)
})

test('parsePorcelainV2 reads the branch header and every file record', () => {
  const raw = [
    '# branch.oid 3db4cf05e4ab7ac9c7e3853d48af5c16d8b02f16',
    '# branch.head main',
    '# branch.upstream origin/main',
    '# branch.ab +2 -1',
    '1 M. N... 100644 100644 100644 a a a.txt',
    '1 A. N... 000000 100644 100644 0 b b.txt',
    '2 R. N... 100644 100644 100644 c c R100 renamed.txt',
    'rename-me.txt',
    '? untracked.txt',
    'u UU N... 100644 100644 100644 100644 a a a conflicted.txt',
  ].join('\0')

  const { branch, files } = parsePorcelainV2(raw)
  assert.equal(branch.head, 'main')
  assert.equal(branch.upstream, 'origin/main')
  assert.equal(branch.ahead, 2)
  assert.equal(branch.behind, 1)
  assert.equal(branch.detached, false)

  assert.deepEqual(files.map((file) => file.path), ['a.txt', 'b.txt', 'renamed.txt', 'untracked.txt', 'conflicted.txt'])
  assert.equal(files[0].kind, 'modified')
  assert.equal(files[0].staged, true)
  assert.equal(files[0].unstaged, false)
  assert.equal(files[1].kind, 'added')
  assert.equal(files[2].kind, 'renamed')
  assert.equal(files[2].origPath, 'rename-me.txt')
  assert.equal(files[3].untracked, true)
  assert.equal(files[3].staged, false)
  assert.equal(files[4].conflicted, true)
})

test('parsePorcelainV2 reads a detached head and an unborn branch', () => {
  const detached = parsePorcelainV2('# branch.oid abc\0# branch.head (detached)\0')
  assert.equal(detached.branch.detached, true)
  assert.equal(detached.branch.head, null)

  const unborn = parsePorcelainV2('# branch.oid (initial)\0# branch.head main\0')
  assert.equal(unborn.branch.unborn, true)
  assert.equal(unborn.branch.oid, null)
})

test('parseNumstatZ reads plain, renamed, and binary records', () => {
  const raw = [
    '12\t3\ta.txt',
    '0\t0\t',
    'rename-me.txt',
    'renamed.txt',
    '-\t-\timage.png',
  ].join('\0') + '\0'

  const entries = parseNumstatZ(raw)
  assert.equal(entries.length, 3)
  assert.deepEqual(entries[0], { path: 'a.txt', additions: 12, deletions: 3, binary: false })
  assert.equal(entries[1].path, 'renamed.txt')
  assert.equal(entries[1].origPath, 'rename-me.txt')
  assert.equal(entries[2].binary, true)
  assert.equal(entries[2].additions, 0)
})

test('mergeLineCounts attaches counts by new and old path', () => {
  const files = [
    { path: 'a.txt', kind: 'modified' },
    { path: 'renamed.txt', origPath: 'rename-me.txt', kind: 'renamed' },
    { path: 'untracked.txt', kind: 'untracked', untracked: true },
  ]
  const merged = mergeLineCounts(files, [
    { path: 'a.txt', additions: 2, deletions: 1, binary: false },
    { path: 'renamed.txt', origPath: 'rename-me.txt', additions: 0, deletions: 0, binary: false },
  ])
  assert.equal(merged[0].additions, 2)
  assert.equal(merged[1].additions, 0)
  assert.equal(merged[2].additions, 0)
  assert.equal(merged[2].deletions, 0)
})

test('summarizeChanges counts staged, unstaged, untracked, and conflicted files', () => {
  const totals = summarizeChanges([
    { additions: 2, deletions: 1, staged: true, unstaged: false },
    { additions: 0, deletions: 0, staged: false, unstaged: true },
    { additions: 4, deletions: 0, untracked: true, staged: false, unstaged: true },
    { additions: 0, deletions: 2, conflicted: true, staged: false, unstaged: true },
  ])
  assert.deepEqual(totals, {
    files: 4,
    additions: 6,
    deletions: 3,
    staged: 1,
    unstaged: 3,
    untracked: 1,
    conflicted: 1,
  })
})

test('parsePatch numbers the lines of every hunk', () => {
  const text = [
    'diff --git a/a.txt b/a.txt',
    'index 111..222 100644',
    '--- a/a.txt',
    '+++ b/a.txt',
    '@@ -1,3 +1,4 @@ section',
    ' one',
    '-two',
    '+TWO',
    '+three and a half',
    ' three',
  ].join('\n')

  const [file] = parsePatch(text)
  assert.equal(file.path, 'a.txt')
  assert.equal(file.hunks.length, 1)
  assert.equal(file.additions, 2)
  assert.equal(file.deletions, 1)
  const hunk = file.hunks[0]
  assert.equal(hunk.oldStart, 1)
  assert.equal(hunk.newStart, 1)
  assert.equal(hunk.section, 'section')
  assert.deepEqual(hunk.lines.map((line) => [line.type, line.oldNumber, line.newNumber]), [
    ['context', 1, 1],
    ['del', 2, null],
    ['add', null, 2],
    ['add', null, 3],
    ['context', 3, 4],
  ])
  assert.equal(hunk.lines[1].text, 'two')
  assert.equal(hunk.lines[2].text, 'TWO')
})

test('parsePatch marks binary patches and rename headers', () => {
  const text = [
    'diff --git a/image.png b/image.png',
    'index 111..222 100644',
    'Binary files a/image.png and b/image.png differ',
    'diff --git a/old name.txt b/new name.txt',
    'similarity index 100%',
    'rename from old name.txt',
    'rename to new name.txt',
  ].join('\n')
  const files = parsePatch(text)
  assert.equal(files.length, 2)
  assert.equal(files[0].binary, true)
  assert.equal(files[1].path, 'new name.txt')
  assert.equal(files[1].oldPath, 'old name.txt')
})

test('untrackedPatch turns content into one all-added hunk', () => {
  const [file] = untrackedPatch('new.txt', 'hello\nworld\n')
  assert.equal(file.additions, 2)
  assert.equal(file.hunks.length, 1)
  assert.deepEqual(file.hunks[0].lines.map((line) => [line.type, line.newNumber, line.text]), [
    ['add', 1, 'hello'],
    ['add', 2, 'world'],
  ])

  const [binary] = untrackedPatch('image.png', '', { binary: true })
  assert.equal(binary.binary, true)
  assert.equal(binary.hunks.length, 0)
})

test('parseLog reads unit-separated commit records', () => {
  const raw = 'hash1\x1fhash\x1fAda\x1f2024-01-02T03:04:05Z\x1fHEAD -> main\x1ffirst subject\x1fignored\0'
    + 'hash2\x1fhas2\x1fBob\x1f2024-01-01T00:00:00Z\x1f\x1fsecond\0'
  const commits = parseLog(raw)
  assert.equal(commits.length, 2)
  assert.equal(commits[0].short, 'hash')
  assert.equal(commits[0].refs, 'HEAD -> main')
  assert.equal(commits[1].author, 'Bob')
})

test('pickRemote prefers the configured remote, then the upstream, then origin', () => {
  const raw = [
    'origin\thttps://github.com/o/r.git (fetch)',
    'origin\thttps://github.com/o/r.git (push)',
    'upstream\thttps://gitlab.com/u/r.git (fetch)',
    'upstream\thttps://gitlab.com/u/r.git (push)',
  ].join('\n')

  assert.deepEqual(pickRemote(raw, { preferred: 'upstream' }), { name: 'upstream', url: 'https://gitlab.com/u/r.git' })
  assert.deepEqual(pickRemote(raw, { upstream: 'upstream/main' }), { name: 'upstream', url: 'https://gitlab.com/u/r.git' })
  assert.deepEqual(pickRemote(raw, {}), { name: 'origin', url: 'https://github.com/o/r.git' })
  assert.equal(pickRemote('', {}), undefined)
})

test('parseBranches reads for-each-ref rows', () => {
  const branches = parseBranches('main\x1fabc\x1forigin/main\x1f2024-01-01T00:00:00Z\x1fsubject\x1f*\n')
  assert.equal(branches.length, 1)
  assert.equal(branches[0].name, 'main')
  assert.equal(branches[0].upstream, 'origin/main')
  assert.equal(branches[0].current, true)
})
