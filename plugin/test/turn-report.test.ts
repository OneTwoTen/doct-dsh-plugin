import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  applyToolResult,
  createTurnReporter,
  formatChangeSummary,
  formatFallbackChanges,
  lineStats,
  toolChangeEntry,
} from '../src/lib/turn-report.ts'
import type { SessionEvent } from '../src/lib/turn-report.ts'

/** One diff fixture as a tool result records it. */
interface DiffFixture {
  path: string
  oldText: string
  newText: string
}

function assistantEvent(text: string, { turn = 1, step = 1 }: { turn?: number; step?: number } = {}) {
  return {
    type: 'assistant/message',
    data: { turn, step, message: { role: 'assistant', content: [{ type: 'text', text }] } },
  }
}

function callEvent(name: string, args: Record<string, unknown>, callId = 'call-1') {
  return {
    type: 'tool/call',
    data: { turn: 1, step: 1, callId, name, arguments: JSON.stringify(args) },
  }
}

function resultEvent(callId: string, { diffs, isError = false }: { diffs?: DiffFixture[]; isError?: boolean } = {}) {
  return {
    type: 'tool/result',
    data: {
      turn: 1,
      step: 1,
      message: { role: 'tool', toolCallId: callId, isError, content: [] },
      ...(diffs === undefined ? {} : { meta: { diffs } }),
    },
  }
}

/** One committed workspace-changes event. */
function changesEvent(seq: number): SessionEvent {
  return { type: 'workspace/changes', seq, data: { turn: 1 } as unknown as SessionEvent['data'] }
}

test('toolChangeEntry keeps file edits, patches, and shell commands only', () => {
  assert.deepEqual(toolChangeEntry(callEvent('edit', { file_path: 'src/a.js' })), {
    callId: 'call-1',
    kind: 'file',
    tool: 'edit',
    files: [{ path: 'src/a.js', added: 0, deleted: 0 }],
    failed: false,
  })

  const patch = toolChangeEntry(callEvent('apply_patch', {
    input: '*** Begin Patch\n*** Update File: a.js\n*** Add File: b.js\n*** End Patch',
  }))
  assert.deepEqual(patch!.files!.map((file) => file.path), ['a.js', 'b.js'])

  assert.equal(toolChangeEntry(callEvent('pwsh', { command: 'node --test' }))!.command, 'node --test')
  assert.equal(toolChangeEntry(callEvent('read', { file_path: 'src/a.js' })), null)
})

test('applyToolResult takes paths and line counts from diffs', () => {
  const entry = toolChangeEntry(callEvent('edit', { file_path: 'old/name.js' }))
  applyToolResult(entry, resultEvent('call-1', {
    diffs: [{ path: 'src/a.js', oldText: 'a\nb\nc\n', newText: 'a\nB\nc\nd\n' }],
  }))
  assert.equal(entry!.failed, false)
  assert.deepEqual(entry!.files, [{ path: 'src/a.js', added: 2, deleted: 1 }])

  const failed = toolChangeEntry(callEvent('edit', { file_path: 'src/a.js' }))
  applyToolResult(failed, resultEvent('call-1', { isError: true }))
  assert.equal(failed!.failed, true)
})

test('lineStats covers creation, deletion, and merge edits', () => {
  assert.deepEqual(lineStats(null, 'a\nb\n'), { added: 2, removed: 0 })
  assert.deepEqual(lineStats('a\nb\n', ''), { added: 0, removed: 2 })
  assert.deepEqual(lineStats('a\nb\nc\n', 'a\nB\nc\n'), { added: 1, removed: 1 })
  assert.deepEqual(lineStats('a\n', 'b\n'), { added: 1, removed: 1 })
})

test('formatChangeSummary renders totals and truncates a long list', () => {
  const files = Array.from({ length: 20 }, (_, index) => ({
    display: `src/file-${index + 1}.js`,
    added: index + 1,
    deleted: index,
  }))
  const text = formatChangeSummary({ total: 20, added: 210, deleted: 190, files })
  assert.match(text, /^🔧 Thay đổi chính · 20 tệp \(\+210 −190\)/)
  assert.match(text, /src\/file-1\.js \(\+1 −0\)/)
  assert.match(text, /… và 5 tệp khác/)
  assert.equal(formatChangeSummary({ files: [] }), '')
  assert.equal(formatChangeSummary(undefined), '')
})

test('formatFallbackChanges deduplicates paths and commands', () => {
  const first = toolChangeEntry(callEvent('edit', { file_path: 'C:\\work\\a.js' }, 'call-1'))
  applyToolResult(first, resultEvent('call-1', {
    diffs: [{ path: 'C:\\work\\a.js', oldText: 'a\n', newText: 'a\nb\n' }],
  }))
  const second = toolChangeEntry(callEvent('edit', { file_path: 'C:\\work\\a.js' }, 'call-2'))
  applyToolResult(second, resultEvent('call-2', {
    diffs: [{ path: 'C:\\work\\a.js', oldText: 'a\nb\n', newText: 'a\nb\nc\n' }],
  }))
  const shell = toolChangeEntry(callEvent('pwsh', { command: 'npm test' }, 'call-3'))
  applyToolResult(shell, resultEvent('call-3', { isError: true }))

  const text = formatFallbackChanges([first, second, shell], { cwd: 'C:\\work' })
  assert.match(text, /^🔧 Thay đổi chính/)
  assert.match(text, /• a\.js \(\+2 −0\)/)
  assert.match(text, /• ▶ npm test ❌/)
  assert.equal(text.match(/a\.js/g)!.length, 1)
})

test('the reporter streams responses, then the summary, then returns the final answer', async () => {
  const sent: string[] = []
  const reporter = createTurnReporter({
    send: async (text) => sent.push(text),
    updateStatus: async () => {},
    resolveChanges: () => ({
      total: 1,
      added: 3,
      deleted: 1,
      files: [{ display: 'src/a.js', added: 3, deleted: 1 }],
    }),
    config: { progressIntervalMs: 250 },
  })

  await reporter.handle(assistantEvent('Đang làm.'))
  await reporter.handle(callEvent('edit', { file_path: 'src/a.js' }))
  await reporter.handle(resultEvent('call-1', {
    diffs: [{ path: 'src/a.js', oldText: 'a\n', newText: 'a\nb\nc\nd\n' }],
  }))
  await reporter.handle(changesEvent(9))
  await reporter.handle(assistantEvent('Xong.', { step: 2 }))

  const finalText = await reporter.finish()
  assert.equal(finalText, 'Xong.')
  assert.deepEqual(sent.map((text) => text.split('\n')[0]), [
    '💬 Đang làm.',
    '🔧 Thay đổi chính · 1 tệp (+3 −1)',
  ])
})

test('a newer assistant message pushes the previous one as an intermediate response', async () => {
  const sent: string[] = []
  const reporter = createTurnReporter({
    send: async (text) => sent.push(text),
    updateStatus: async () => {},
    config: { progressIntervalMs: 250 },
  })

  await reporter.handle(assistantEvent('Một.'))
  await reporter.handle(assistantEvent('Hai.'))
  assert.equal(await reporter.finish(), 'Hai.')
  assert.deepEqual(sent, ['💬 Một.'])
})

test('the reporter falls back to tool diffs when no summary is available', async () => {
  const sent: string[] = []
  const reporter = createTurnReporter({
    send: async (text) => sent.push(text),
    updateStatus: async () => {},
    config: { progressIntervalMs: 250 },
  })

  await reporter.handle(callEvent('edit', { file_path: 'src/a.js' }))
  await reporter.handle(resultEvent('call-1', {
    diffs: [{ path: 'src/a.js', oldText: 'a\n', newText: 'a\nb\n' }],
  }))
  await reporter.handle(assistantEvent('Xong.'))

  assert.equal(await reporter.finish(), 'Xong.')
  assert.match(sent.join('\n'), /🔧 Thay đổi chính/)
  assert.match(sent.join('\n'), /a\.js \(\+1 −0\)/)
})

test('pushResponses and pushChanges can be turned off', async () => {
  const sent: string[] = []
  const reporter = createTurnReporter({
    send: async (text) => sent.push(text),
    updateStatus: async () => {},
    resolveChanges: () => ({ total: 1, added: 1, deleted: 0, files: [{ display: 'a.js', added: 1, deleted: 0 }] }),
    config: { pushResponses: false, pushChanges: false, progressIntervalMs: 250 },
  })

  await reporter.handle(assistantEvent('Đang làm.'))
  await reporter.handle(callEvent('edit', { file_path: 'a.js' }))
  await reporter.handle(changesEvent(3))
  await reporter.handle(assistantEvent('Xong.'))

  assert.equal(await reporter.finish(), 'Xong.')
  assert.deepEqual(sent, [])
})
