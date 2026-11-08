import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { assistantText, mountTelegramRemote } from '../src/features/telegram-remote.ts'

const CHAT = 555001

/** A loose event or payload shape the fake Host services record. */
type TestEvent = Record<string, any>

/** Resolve once `check` returns truthy, or fail after `timeout` ms. */
async function waitFor(check: () => boolean | Promise<boolean>, timeout = 4000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('timed out waiting for condition')
}

/**
 * Remove one feature's data directory.
 *
 * A disposed feature can still finish a status write, so a removal may lose a
 * race with it; retrying is what makes that cleanup reliable.
 */
async function removeDataDir(directory: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await rm(directory, { recursive: true, force: true })
      return
    } catch (error) {
      if (error?.code !== 'ENOTEMPTY' && error?.code !== 'EBUSY') throw error
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
}

/** The state one fake session controller records. */
interface SessionBag {
  cursor: number
  inbox: Array<{ type: 'event'; event: TestEvent }>
  log: TestEvent[]
  script: TestEvent[]
  prompts: TestEvent[]
  cancelled: TestEvent[]
  running: boolean
  created: TestEvent[]
  selected: TestEvent[]
  listing: TestEvent[]
  archived: string[]
  archiveCalls: string[]
  unarchiveCalls: string[]
  answer: string
}

function createSessionController({ onEvent }: { onEvent?: (event: TestEvent) => void } = {}) {
  const bag: SessionBag = {
    cursor: 5,
    inbox: [],
    log: [],
    script: [],
    prompts: [],
    cancelled: [],
    running: false,
    created: [],
    selected: [],
    listing: [],
    archived: [],
    archiveCalls: [],
    unarchiveCalls: [],
    answer: 'Xin chào từ DSH',
  }
  const append = (event: TestEvent) => {
    bag.cursor += 1
    const stored = { ...event, seq: bag.cursor, time: Date.now() }
    bag.log.push(stored)
    bag.inbox.push({ type: 'event', event: stored })
    onEvent?.(stored)
    return stored
  }
  const controller = {
    bag,
    async create(request: TestEvent) {
      bag.created.push(request)
      return { sessionId: 'session-fake-1' }
    },
    async state({ sessionId }: { sessionId: string }) {
      const known = sessionId === 'session-fake-1' || bag.listing.some((item) => item.sessionId === sessionId)
      if (!known) throw new Error('unknown session')
      return { cursor: bag.cursor, active: true, running: bag.running, queue: null, pendingInput: [] }
    },
    async list() {
      return { items: bag.listing }
    },
    async prompt(request: TestEvent) {
      bag.prompts.push(request)
      bag.running = true
      if (bag.script.length > 0) {
        for (const event of bag.script) append(event)
      } else {
        append({
          type: 'assistant/message',
          data: {
            turn: 1,
            step: 1,
            message: {
              role: 'assistant',
              content: [
                { type: 'reasoning', text: 'nghĩ thầm' },
                { type: 'text', text: bag.answer },
              ],
            },
          },
        })
      }
    },
    async events({ throughSeq }: { throughSeq?: number }) {
      const records = bag.log
        .filter((event) => throughSeq === undefined || event.seq <= throughSeq)
        .map((event) => ({ type: 'event', event }))
      return { cursor: bag.cursor, records, hasMore: false }
    },
    async wait({ afterSeq }: { afterSeq: number }) {
      const records = bag.inbox.filter((record) => record.event.seq > afterSeq)
      bag.inbox = []
      bag.running = false
      return {
        reason: 'idle',
        state: { cursor: bag.cursor, active: true, running: false, queue: null, pendingInput: [] },
        output: { records, truncated: false },
      }
    },
    cancel(request: TestEvent) {
      bag.cancelled.push(request)
    },
    async modelCatalog() {
      return {
        default: { provider: 'demo', model: 'demo-model' },
        routableProviders: ['demo', 'second'],
        groups: [
          { id: 'demo', name: 'Demo provider', models: [{ id: 'demo-model', name: 'Demo model' }, { id: 'other-model', name: 'Other model' }] },
          { id: 'second', name: 'Second provider', models: [{ id: 'second-model', name: 'Second model' }] },
        ],
        failures: [],
      }
    },
    async selectModel(request: TestEvent) {
      bag.selected.push(request)
      return {
        selected: {
          provider: request.provider,
          model: request.model,
          ...(request.reasoningEffort ? { reasoningEffort: request.reasoningEffort } : {}),
        },
      }
    },
  }
  return controller
}

/** The fake Bot API state one test records. */
interface TelegramState {
  updates: TestEvent[]
  sent: any[]
  edits: any[]
  answers: any[]
  commands: any[]
  deleted: any[]
  me: { id: number; username: string }
}

function createTelegram() {
  const state: TelegramState = {
    updates: [],
    sent: [],
    edits: [],
    answers: [],
    commands: [],
    deleted: [],
    me: { id: 42, username: 'personal_hub_bot' },
  }
  const fetchImpl = async (url: string, init: any) => {
    const method = url.split('/').pop()
    const body = JSON.parse(init.body ?? '{}')
    if (method === 'getUpdates') {
      const updates = state.updates
      state.updates = []
      if (updates.length === 0) await new Promise((resolve) => setTimeout(resolve, 20))
      return ok(updates)
    }
    if (method === 'getMe') return ok(state.me)
    if (method === 'sendMessage') {
      const message = {
        message_id: state.sent.length + 1,
        chat: { id: body.chat_id },
        text: body.text,
        keyboard: body.reply_markup,
      }
      state.sent.push(message)
      return ok(message)
    }
    if (method === 'editMessageText') {
      state.edits.push({ ...body, keyboard: body.reply_markup })
      return ok({ message_id: body.message_id })
    }
    if (method === 'answerCallbackQuery') {
      state.answers.push(body)
      return ok(true)
    }
    if (method === 'deleteMessage') {
      state.deleted.push(body)
      return ok(true)
    }
    if (method === 'setMyCommands') {
      state.commands = body.commands
      return ok(true)
    }
    return ok(true)
  }
  return { state, fetchImpl, push: (...messages: TestEvent[]) => state.updates.push(...messages) }
}

function ok(result: any) {
  return { ok: true, status: 200, json: async () => ({ ok: true, result }) }
}

const logger = { info() {}, warn() {}, error() {}, debug() {} }

/** Mount the feature against a fresh data directory and return a teardown. */
async function mountFeature({ changes, observe = false }: { changes?: any; observe?: boolean } = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'personal-hub-test-'))
  const sessionListeners = new Set<(session: { id: string }, event: TestEvent) => void>()
  const sessions = createSessionController({
    onEvent: (event) => {
      for (const listener of [...sessionListeners]) listener({ id: 'session-fake-1' }, event)
    },
  })
  const telegram = createTelegram()
  const stop = mountTelegramRemote(
    {
      on: observe
        ? (name: string, listener: (session: { id: string }, event: TestEvent) => void) => {
          if (name === 'session/event') sessionListeners.add(listener)
          return () => sessionListeners.delete(listener)
        }
        : undefined,
      get: (key: string): any => {
        if (key === 'sessionController') return sessions
        if (key === 'workspaceChanges') return changes
        if (key === 'workspaceRegistry') {
          return {
            list: () => [
              { id: 'ws-1', title: 'First project', path: 'C:\\work\\first' },
              { id: 'ws-2', title: 'Second project', path: 'C:\\work\\second' },
            ],
            get archivedSessionIds() {
              return sessions.bag.archived
            },
            async archiveSession(sessionId: string) {
              sessions.bag.archiveCalls.push(sessionId)
              if (!sessions.bag.archived.includes(sessionId)) sessions.bag.archived.push(sessionId)
            },
            async unarchiveSession(sessionId: string) {
              sessions.bag.unarchiveCalls.push(sessionId)
              sessions.bag.archived = sessions.bag.archived.filter((id) => id !== sessionId)
            },
          }
        }
        return undefined
      },
    } as unknown as Parameters<typeof mountTelegramRemote>[0],
    {
      enabled: true,
      token: '123:abcdef',
      cwd: dataDir,
      allowedChatIds: [],
      pollTimeoutSec: 1,
      requestTimeoutMs: 60000,
      progressIntervalMs: 1,
    } as unknown as Parameters<typeof mountTelegramRemote>[1],
    { logger, dataDir, fetchImpl: telegram.fetchImpl } as unknown as Parameters<typeof mountTelegramRemote>[2],
  )
  return {
    dataDir,
    sessions,
    telegram,
    async dispose() {
      stop()
      await new Promise((resolve) => setTimeout(resolve, 60))
    await removeDataDir(dataDir)
    },
  }
}

function update(updateId: number, text: string, chatId = CHAT) {
  return {
    update_id: updateId,
    message: { message_id: updateId * 10, chat: { id: chatId, type: 'private' }, text },
  }
}

/** One Host SessionSummary row with a projected title. */
function sessionRow(sessionId: string, title: string, updatedAt = Date.now()) {
  return {
    sessionId,
    updatedAt,
    running: false,
    blank: false,
    cwd: `C:\\work\\${sessionId}`,
    projections: { kind: 'cached', asOfSeq: 0, values: { title } },
  }
}

/** One scripted assistant message event. */
function assistantEvent(text: string, { turn = 1, step = 1 }: { turn?: number; step?: number } = {}) {
  return {
    type: 'assistant/message',
    data: { turn, step, message: { role: 'assistant', content: [{ type: 'text', text }] } },
  }
}

test('assistantText keeps only visible text blocks', () => {
  const text = assistantText({
    data: { message: { content: [{ type: 'reasoning', text: 'hidden' }, { type: 'text', text: 'visible' }] } },
  })
  assert.equal(text, 'visible')
  assert.equal(assistantText({}), '')
})

test('pairs the first chat, turns a message into a prompt, and replies with the answer', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Đã ghép nối/.test(message.text)))

    feature.telegram.push(update(2, 'Chạy kiểm thử giúp tôi'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.text.includes('Xin chào từ DSH')))

    const { prompts, created } = feature.sessions.bag
    assert.equal(prompts.length, 1)
    assert.equal(prompts[0].content[0].text, 'Chạy kiểm thử giúp tôi')
    assert.equal(prompts[0].sessionId, 'session-fake-1')
    assert.equal(prompts[0].mode, 'queue')
    assert.equal(created.length, 1)
    assert.equal(typeof created[0].cwd, 'string')

    const status = JSON.parse(await readFile(join(feature.dataDir, 'status.json'), 'utf8'))
    assert.equal(status.state, 'polling')
    assert.equal(status.bot.username, 'personal_hub_bot')
    assert.deepEqual(status.allowedChatIds, [String(CHAT)])
    assert.equal(feature.telegram.state.commands.length > 0, true)
  } finally {
    await feature.dispose()
  }
})

test('pushes intermediate responses, the changed-files summary, and the final answer in order', async () => {
  const changes = {
    summary() {
      return {
        turn: 1,
        total: 1,
        added: 4,
        deleted: 1,
        files: [{ display: 'src/app.js', path: 'src/app.js', added: 4, deleted: 1 }],
      }
    },
  }
  const feature = await mountFeature({ changes })
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Đã ghép nối/.test(message.text)))

    feature.sessions.bag.script = [
      assistantEvent('Đang sửa tệp.'),
      {
        type: 'tool/call',
        data: {
          turn: 1,
          step: 1,
          callId: 'call-1',
          name: 'edit',
          arguments: JSON.stringify({ file_path: 'src/app.js' }),
        },
      },
      {
        type: 'tool/result',
        data: {
          turn: 1,
          step: 1,
          message: { role: 'tool', toolCallId: 'call-1', content: [{ type: 'text', text: 'ok' }] },
          meta: { diffs: [{ path: 'src/app.js', oldText: 'a\n', newText: 'a\nb\nc\nd\ne\n' }] },
        },
      },
      { type: 'workspace/changes', data: { turn: 1 } },
      assistantEvent('Đã xong.', { step: 2 }),
    ]

    feature.telegram.push(update(2, 'sửa giúp tôi'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.text.includes('Đã xong.')))

    const texts = feature.telegram.state.sent.map((message) => message.text)
    const response = texts.find((text) => text.includes('Đang sửa tệp.'))
    const summary = texts.find((text) => text.includes('Thay đổi chính'))
    const final = texts.find((text) => text.includes('Đã xong.'))

    assert.match(response, /^💬 Đang sửa tệp\./)
    assert.match(summary, /Thay đổi chính · 1 tệp \(\+4 −1\)/)
    assert.match(summary, /src\/app\.js/)
    assert.match(final, /^✅ Đã xong\./)
    assert.ok(texts.indexOf(response) < texts.indexOf(summary))
    assert.ok(texts.indexOf(summary) < texts.indexOf(final))
    assert.equal(feature.telegram.state.deleted.length, 1)
  } finally {
    await feature.dispose()
  }
})

test('streams committed session events through the Host listener', async () => {
  const changes = {
    summary() {
      return {
        total: 1,
        added: 2,
        deleted: 0,
        files: [{ display: 'src/b.js', path: 'src/b.js', added: 2, deleted: 0 }],
      }
    },
  }
  const feature = await mountFeature({ changes, observe: true })
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Đã ghép nối/.test(message.text)))

    feature.sessions.bag.script = [
      assistantEvent('Bắt đầu.'),
      {
        type: 'tool/call',
        data: {
          turn: 1,
          step: 1,
          callId: 'call-1',
          name: 'write',
          arguments: JSON.stringify({ file_path: 'src/b.js', content: 'x' }),
        },
      },
      {
        type: 'tool/result',
        data: {
          turn: 1,
          step: 1,
          message: { role: 'tool', toolCallId: 'call-1', content: [] },
        },
      },
      { type: 'workspace/changes', data: { turn: 1 } },
      assistantEvent('Xong.', { step: 2 }),
    ]

    feature.telegram.push(update(2, 'viết tệp'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.text.includes('Xong.')))

    const texts = feature.telegram.state.sent.map((message) => message.text)
    const response = texts.find((text) => text.includes('Bắt đầu.'))
    const summary = texts.find((text) => text.includes('Thay đổi chính'))
    const final = texts.find((text) => text.includes('Xong.'))
    assert.match(response, /^💬 Bắt đầu\./)
    assert.match(summary, /Thay đổi chính · 1 tệp \(\+2 −0\)/)
    assert.match(final, /^✅ Xong\./)
    assert.ok(texts.indexOf(response) < texts.indexOf(summary))
    assert.ok(texts.indexOf(summary) < texts.indexOf(final))
  } finally {
    await feature.dispose()
  }
})

test('rejects a second chat after pairing', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.telegram.push(update(3, '/start', 999))
    await waitFor(() => feature.telegram.state.sent.some((message) => String(message.chat.id) === '999'))
    const rejection = feature.telegram.state.sent.find((message) => String(message.chat.id) === '999')
    assert.match(rejection.text, /không nằm trong danh sách cho phép/)
    assert.equal(feature.sessions.bag.prompts.length, 0)
  } finally {
    await feature.dispose()
  }
})

test('status command reports the bound session', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.telegram.push(update(2, 'hello'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.text.includes('Xin chào từ DSH')))

    feature.telegram.push(update(4, '/status'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Phiên: session-fake-1/.test(message.text)))
  } finally {
    await feature.dispose()
  }
})

test('cancel asks the session controller to stop the bound session', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.telegram.push(update(2, 'hello'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.text.includes('Xin chào từ DSH')))

    feature.telegram.push(update(5, '/cancel'))
    await waitFor(() => feature.sessions.bag.cancelled.length > 0)
    assert.equal(feature.sessions.bag.cancelled[0].sessionId, 'session-fake-1')
  } finally {
    await feature.dispose()
  }
})

test('unbind drops the binding so the next message opens a new session', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.telegram.push(update(2, 'hello'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.text.includes('Xin chào từ DSH')))

    feature.telegram.push(update(6, '/unbind'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Đã bỏ gắn/.test(message.text)))
    assert.equal(feature.sessions.bag.created.length, 1)

    feature.telegram.push(update(7, 'lại nào'))
    await waitFor(() => feature.sessions.bag.created.length === 2)
  } finally {
    await feature.dispose()
  }
})

test('lists workspaces and opens the next session inside the chosen one', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.telegram.push(update(2, '/workspaces'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Workspace của DSH/.test(message.text)))
    const listing = feature.telegram.state.sent.find((message) => /Workspace của DSH/.test(message.text))
    assert.match(listing.text, /1\. First project — C:\\work\\first/)
    assert.match(listing.text, /2\. Second project — C:\\work\\second/)

    feature.telegram.push(update(3, '/workspace 2'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Đã chọn workspace/.test(message.text)))

    feature.telegram.push(update(4, '/new'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Phiên mới/.test(message.text)))
    assert.equal(feature.sessions.bag.created.at(-1)!.workspaceId, 'ws-2')
  } finally {
    await feature.dispose()
  }
})

test('lists models and applies the chosen one to the bound session', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.telegram.push(update(2, '/models'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Model đang dùng được/.test(message.text)))
    const listing = feature.telegram.state.sent.find((message) => /Model đang dùng được/.test(message.text))
    assert.match(listing.text, /1\. demo-model/)
    assert.match(listing.text, /2\. other-model/)
    assert.match(listing.text, /3\. second-model/)

    feature.telegram.push(update(3, 'chào'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.text.includes('Xin chào từ DSH')))

    feature.telegram.push(update(4, '/model 2'))
    await waitFor(() => feature.sessions.bag.selected.length > 0)
    assert.deepEqual(feature.sessions.bag.selected[0], {
      sessionId: 'session-fake-1',
      provider: 'demo',
      model: 'other-model',
    })

    feature.telegram.push(update(5, '/status'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Model: demo\/other-model/.test(message.text)))
  } finally {
    await feature.dispose()
  }
})

test('accepts provider/model with a reasoning effort for the next session', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.telegram.push(update(2, '/model second/second-model@high'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Đã chọn second\/second-model@high/.test(message.text)))

    feature.telegram.push(update(3, '/new'))
    await waitFor(() => feature.sessions.bag.selected.length > 0)
    assert.deepEqual(feature.sessions.bag.selected[0], {
      sessionId: 'session-fake-1',
      provider: 'second',
      model: 'second-model',
      reasoningEffort: 'high',
    })
  } finally {
    await feature.dispose()
  }
})

/** Build one inline-button tap. */
function tap(updateId: number, data: string, messageId: number) {
  return {
    update_id: updateId,
    callback_query: {
      id: `cb-${updateId}`,
      data,
      message: { message_id: messageId, chat: { id: CHAT, type: 'private' } },
    },
  }
}

test('workspace buttons choose a workspace without typing', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.telegram.push(update(2, '/workspaces'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.keyboard !== undefined))
    const listing = feature.telegram.state.sent.find((message) => message.keyboard !== undefined)
    const buttons = listing.keyboard.inline_keyboard.flat()
    assert.equal(buttons.length, 2)
    assert.equal(buttons[1].callback_data, 'w:1')

    feature.telegram.push(tap(3, 'w:1', listing.message_id))
    await waitFor(() => feature.telegram.state.edits.some((edit) => /Đã chọn workspace/.test(edit.text)))
    assert.equal(feature.telegram.state.answers.length > 0, true)

    feature.telegram.push(update(4, '/new'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Phiên mới/.test(message.text)))
    assert.equal(feature.sessions.bag.created.at(-1)!.workspaceId, 'ws-2')
  } finally {
    await feature.dispose()
  }
})

test('model buttons switch the bound session model', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.telegram.push(update(2, 'chào'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.text.includes('Xin chào từ DSH')))

    feature.telegram.push(update(3, '/models'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.keyboard !== undefined))
    const listing = feature.telegram.state.sent.find((message) => message.keyboard !== undefined)
    const buttons = listing.keyboard.inline_keyboard.flat()
    assert.equal(buttons.length, 3)
    assert.deepEqual(buttons.map((button: any) => button.callback_data), ['m:0', 'm:1', 'm:2'])

    feature.telegram.push(tap(4, 'm:2', listing.message_id))
    await waitFor(() => feature.sessions.bag.selected.length > 0)
    assert.deepEqual(feature.sessions.bag.selected[0], {
      sessionId: 'session-fake-1',
      provider: 'second',
      model: 'second-model',
    })
    await waitFor(() => feature.telegram.state.edits.some((edit) => /Đã chọn second\/second-model/.test(edit.text)))
  } finally {
    await feature.dispose()
  }
})

test('lists sessions and binds the one selected with a button', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.sessions.bag.listing = [
      sessionRow('session-fake-0', 'Phiên cũ', Date.now() - 60000),
      sessionRow('session-fake-1', 'Phiên hiện tại'),
    ]
    feature.telegram.push(update(2, '/sessions'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Phiên DSH/.test(message.text)))
    const listing = feature.telegram.state.sent.find((message) => /Phiên DSH/.test(message.text))
    assert.match(listing.text, /1\. Phiên cũ/)
    assert.match(listing.text, /2\. Phiên hiện tại/)
    assert.deepEqual(
      listing.keyboard.inline_keyboard.flat().map((button: any) => button.callback_data),
      ['s:0', 'x:0', 's:1', 'x:1'],
    )

    feature.telegram.push(tap(3, 's:0', listing.message_id))
    await waitFor(() => feature.telegram.state.edits.some((edit) => /Đã gắn chat này với phiên session-fake-0/.test(edit.text)))

    feature.telegram.push(update(4, 'chào'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.text.includes('Xin chào từ DSH')))
    assert.equal(feature.sessions.bag.prompts.at(-1)!.sessionId, 'session-fake-0')
    assert.equal(feature.sessions.bag.created.length, 0)
  } finally {
    await feature.dispose()
  }
})

test('archives a session from the picker and restores it from /archived', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.sessions.bag.listing = [
      sessionRow('session-fake-0', 'Phiên cũ', Date.now() - 60000),
      sessionRow('session-fake-1', 'Phiên hiện tại'),
    ]
    feature.telegram.push(update(2, '/sessions'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Phiên DSH/.test(message.text)))
    const listing = feature.telegram.state.sent.find((message) => /Phiên DSH/.test(message.text))

    feature.telegram.push(tap(3, 'x:0', listing.message_id))
    await waitFor(() => feature.telegram.state.edits.some((edit) => /Lưu trữ phiên này\?/.test(edit.text)))
    feature.telegram.push(tap(4, 'A:0', listing.message_id))
    await waitFor(() => feature.telegram.state.edits.some((edit) => /Đã lưu trữ phiên/.test(edit.text)))
    assert.deepEqual(feature.sessions.bag.archived, ['session-fake-0'])
    assert.deepEqual(feature.sessions.bag.archiveCalls, ['session-fake-0'])

    feature.telegram.push(update(5, '/archived'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Phiên đã lưu trữ/.test(message.text)))
    const archived = feature.telegram.state.sent.find((message) => /Phiên đã lưu trữ/.test(message.text))
    assert.deepEqual(archived.keyboard.inline_keyboard.flat().map((button: any) => button.callback_data), ['u:0'])

    feature.telegram.push(tap(6, 'u:0', archived.message_id))
    await waitFor(() => feature.telegram.state.edits.some((edit) => /Đã khôi phục phiên/.test(edit.text)))
    assert.deepEqual(feature.sessions.bag.archived, [])
    assert.deepEqual(feature.sessions.bag.unarchiveCalls, ['session-fake-0'])
  } finally {
    await feature.dispose()
  }
})

test('archiving the bound session unbinds the chat', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.telegram.push(update(2, 'hello'))
    await waitFor(() => feature.telegram.state.sent.some((message) => message.text.includes('Xin chào từ DSH')))
    assert.equal(feature.sessions.bag.created.length, 1)

    feature.telegram.push(update(3, '/archive'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /Đã lưu trữ phiên/.test(message.text)))
    assert.deepEqual(feature.sessions.bag.archived, ['session-fake-1'])
    assert.match(feature.telegram.state.sent.find((message) => /Đã lưu trữ phiên/.test(message.text)).text, /bỏ gắn/)

    feature.telegram.push(update(4, 'lại nào'))
    await waitFor(() => feature.sessions.bag.created.length === 2)
  } finally {
    await feature.dispose()
  }
})

test('pages through the session picker', async () => {
  const feature = await mountFeature()
  try {
    feature.telegram.push(update(1, '/start'))
    await waitFor(() => feature.telegram.state.sent.length > 0)

    feature.sessions.bag.listing = Array.from({ length: 9 }, (_, index) => (
      sessionRow(`session-page-${index}`, `Phiên ${index + 1}`, Date.now() - index * 1000)
    ))
    feature.telegram.push(update(2, '/sessions'))
    await waitFor(() => feature.telegram.state.sent.some((message) => /trang 1\/2/.test(message.text)))
    const listing = feature.telegram.state.sent.find((message) => /trang 1\/2/.test(message.text))
    assert.match(listing.text, /8\. Phiên 8/)
    assert.doesNotMatch(listing.text, /9\. Phiên 9/)

    feature.telegram.push(tap(3, 'p:2', listing.message_id))
    await waitFor(() => feature.telegram.state.edits.some((edit) => /trang 2\/2/.test(edit.text)))
    const second = feature.telegram.state.edits.find((edit) => /trang 2\/2/.test(edit.text))
    assert.match(second.text, /9\. Phiên 9/)
  } finally {
    await feature.dispose()
  }
})

test('resolves the bot token from the credential store before the environment', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'personal-hub-cred-'))
  const telegram = createTelegram()
  const seen: string[] = []
  const recordingFetch = async (url: string, init: any) => {
    seen.push(url.split('/').pop()!)
    return telegram.fetchImpl(url, init)
  }
  const sessions = createSessionController()
  const stop = mountTelegramRemote(
    {
      get: (key: string): any => {
        if (key === 'sessionController') return sessions
        if (key === 'credentials') {
          return { resolve: async (ref: string) => (ref === 'DSH_TELEGRAM_BOT_TOKEN' ? { value: '777:credential-token' } : undefined) }
        }
        return undefined
      },
    } as unknown as Parameters<typeof mountTelegramRemote>[0],
    {
      enabled: true,
      token: '',
      cwd: dataDir,
      allowedChatIds: [],
      pollTimeoutSec: 1,
      requestTimeoutMs: 60000,
      progressIntervalMs: 1,
    } as unknown as Parameters<typeof mountTelegramRemote>[1],
    { logger, dataDir, fetchImpl: recordingFetch } as unknown as Parameters<typeof mountTelegramRemote>[2],
  )
  try {
    await waitFor(() => seen.includes('getMe'))
    const status = JSON.parse(await readFile(join(dataDir, 'status.json'), 'utf8'))
    assert.equal(status.tokenSource, 'credential:DSH_TELEGRAM_BOT_TOKEN')
    assert.equal(status.state, 'polling')
  } finally {
    stop()
    await removeDataDir(dataDir)
  }
})
