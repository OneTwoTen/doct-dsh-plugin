import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { assistantText, mountTelegramRemote } from '../features/telegram-remote.js'

const CHAT = 555001

/** Resolve once `check` returns truthy, or fail after `timeout` ms. */
async function waitFor(check, timeout = 4000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('timed out waiting for condition')
}

function createSessionController() {
  const bag = {
    cursor: 5,
    inbox: [],
    prompts: [],
    cancelled: [],
    running: false,
    created: [],
    selected: [],
    answer: 'Xin chào từ DSH',
  }
  const controller = {
    bag,
    async create(request) {
      bag.created.push(request)
      return { sessionId: 'session-fake-1' }
    },
    async state({ sessionId }) {
      if (sessionId !== 'session-fake-1') throw new Error('unknown session')
      return { cursor: bag.cursor, active: true, running: bag.running, queue: null, pendingInput: [] }
    },
    async prompt(request) {
      bag.prompts.push(request)
      bag.running = true
      bag.cursor += 1
      bag.inbox.push({
        type: 'event',
        event: {
          type: 'assistant/message',
          seq: bag.cursor,
          time: Date.now(),
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
        },
      })
    },
    async wait({ afterSeq }) {
      const records = bag.inbox.filter((record) => record.event.seq > afterSeq)
      bag.inbox = []
      bag.running = false
      return {
        reason: 'idle',
        state: { cursor: bag.cursor, active: true, running: false, queue: null, pendingInput: [] },
        output: { records, truncated: false },
      }
    },
    cancel(request) {
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
    async selectModel(request) {
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

function createTelegram() {
  const state = {
    updates: [],
    sent: [],
    edits: [],
    commands: [],
    me: { id: 42, username: 'personal_hub_bot' },
  }
  const fetchImpl = async (url, init) => {
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
      const message = { message_id: state.sent.length + 1, chat: { id: body.chat_id }, text: body.text }
      state.sent.push(message)
      return ok(message)
    }
    if (method === 'editMessageText') {
      state.edits.push(body)
      return ok({ message_id: body.message_id })
    }
    if (method === 'setMyCommands') {
      state.commands = body.commands
      return ok(true)
    }
    return ok(true)
  }
  return { state, fetchImpl, push: (...messages) => state.updates.push(...messages) }
}

function ok(result) {
  return { ok: true, status: 200, json: async () => ({ ok: true, result }) }
}

const logger = { info() {}, warn() {}, error() {}, debug() {} }

/** Mount the feature against a fresh data directory and return a teardown. */
async function mountFeature() {
  const dataDir = await mkdtemp(join(tmpdir(), 'personal-hub-test-'))
  const sessions = createSessionController()
  const telegram = createTelegram()
  const stop = mountTelegramRemote(
    {
      get: (key) => {
        if (key === 'sessionController') return sessions
        if (key === 'workspaceRegistry') {
          return {
            list: () => [
              { id: 'ws-1', title: 'First project', path: 'C:\\work\\first' },
              { id: 'ws-2', title: 'Second project', path: 'C:\\work\\second' },
            ],
          }
        }
        return undefined
      },
    },
    {
      enabled: true,
      token: '123:abcdef',
      cwd: dataDir,
      allowedChatIds: [],
      pollTimeoutSec: 1,
      requestTimeoutMs: 60000,
      progressIntervalMs: 1,
    },
    { logger, dataDir, fetchImpl: telegram.fetchImpl },
  )
  return {
    dataDir,
    sessions,
    telegram,
    async dispose() {
      stop()
      await new Promise((resolve) => setTimeout(resolve, 60))
      await rm(dataDir, { recursive: true, force: true })
    },
  }
}

function update(updateId, text, chatId = CHAT) {
  return {
    update_id: updateId,
    message: { message_id: updateId * 10, chat: { id: chatId, type: 'private' }, text },
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
    await waitFor(() => feature.telegram.state.edits.some((edit) => edit.text.includes('Xin chào từ DSH')))

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
    await waitFor(() => feature.telegram.state.edits.length > 0)

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
    await waitFor(() => feature.telegram.state.edits.length > 0)

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
    await waitFor(() => feature.telegram.state.edits.length > 0)

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
    assert.equal(feature.sessions.bag.created.at(-1).workspaceId, 'ws-2')
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
    await waitFor(() => feature.telegram.state.edits.length > 0)

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

test('resolves the bot token from the credential store before the environment', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'personal-hub-cred-'))
  const telegram = createTelegram()
  const seen = []
  const recordingFetch = async (url, init) => {
    seen.push(url.split('/').pop())
    return telegram.fetchImpl(url, init)
  }
  const sessions = createSessionController()
  const stop = mountTelegramRemote(
    {
      get: (key) => {
        if (key === 'sessionController') return sessions
        if (key === 'credentials') {
          return { resolve: async (ref) => (ref === 'DSH_TELEGRAM_BOT_TOKEN' ? { value: '777:credential-token' } : undefined) }
        }
        return undefined
      },
    },
    {
      enabled: true,
      token: '',
      cwd: dataDir,
      allowedChatIds: [],
      pollTimeoutSec: 1,
      requestTimeoutMs: 60000,
      progressIntervalMs: 1,
    },
    { logger, dataDir, fetchImpl: recordingFetch },
  )
  try {
    await waitFor(() => seen.includes('getMe'))
    const status = JSON.parse(await readFile(join(dataDir, 'status.json'), 'utf8'))
    assert.equal(status.tokenSource, 'credential:DSH_TELEGRAM_BOT_TOKEN')
    assert.equal(status.state, 'polling')
  } finally {
    stop()
    await rm(dataDir, { recursive: true, force: true })
  }
})
