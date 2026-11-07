import { randomUUID } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expandHome, pluginDataDir } from '../lib/paths.js'
import { JsonStateStore, writeJsonFile } from '../lib/state-store.js'
import { TelegramApi, TelegramError, isTokenFailure } from '../lib/telegram-api.js'
import { chunkText, parseCommand, withSuffix } from '../lib/text.js'

/** Data directory name under the DeepSeek Harness home. */
const DATA_DIR_NAME = 'personal-hub'
const TELEGRAM_DATA_DIR = 'telegram-remote'
const PLACEHOLDER = '⏳ Đang xử lý…'
/** Credential reference the settings card writes and this feature resolves. */
const TOKEN_CREDENTIAL_REF = 'DSH_TELEGRAM_BOT_TOKEN'
const HELP_TEXT = [
  'Điều khiển DeepSeek Harness từ xa.',
  '',
  'Gửi tin nhắn văn bản để chuyển thành prompt cho phiên DSH đang gắn với chat này.',
  '',
  '/new [thư-mục] – tạo phiên mới (mặc định dùng thư mục làm việc hiện tại)',
  '/status – trạng thái phiên đang gắn và trạng thái bot',
  '/cancel – dừng lượt đang chạy',
  '/unbind – bỏ gắn phiên, tin nhắn sau sẽ tạo phiên mới',
  '/use <sessionId> – gắn chat này vào một phiên có sẵn',
  '/whoami – id chat của bạn',
  '/help – danh sách lệnh',
].join('\n')

/**
 * Mount the Telegram remote-control feature.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx Harness plugin context.
 * @param {Record<string, unknown>} config Feature configuration.
 * @param {{ logger: { info: Function, warn: Function, error: Function }, dataDir?: string, fetchImpl?: typeof fetch }} deps
 * @returns {() => void} disposer that stops polling and drops in-flight work
 */
export function mountTelegramRemote(ctx, config, deps) {
  const logger = deps.logger
  const dataDir = deps.dataDir ?? join(pluginDataDir(DATA_DIR_NAME), TELEGRAM_DATA_DIR)
  const stateFile = join(dataDir, 'state.json')
  const statusFile = join(dataDir, 'status.json')
  const store = new JsonStateStore(stateFile, {
    version: 1,
    offset: 0,
    allowedChatIds: [],
    bindings: {},
  })

  const controller = new AbortController()
  const chatQueues = new Map()
  const activeTurns = new Map()
  const fetchImpl = deps.fetchImpl
  const sessionController = ctx.get('sessionController')
  const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const staticAllowed = (Array.isArray(config.allowedChatIds) ? config.allowedChatIds : [])
    .map((id) => String(id).trim())
    .filter((id) => id.length > 0)

  let stopped = false
  let identity
  let identityToken = ''
  let lastStatusText = ''
  let lastPollAt = 0

  logger.info('telegram-remote: mounted, data directory %s', dataDir)

  /** Publish observable runtime status for the user and for debugging. */
  async function publishStatus(patch) {
    const next = {
      updatedAt: new Date().toISOString(),
      state: 'starting',
      tokenSource: 'none',
      lastPollAt: lastPollAt > 0 ? new Date(lastPollAt).toISOString() : null,
      lastError: null,
      bot: identity ? { id: identity.id, username: identity.username } : null,
      allowedChatIds: staticAllowed.length > 0 ? staticAllowed : store.state?.allowedChatIds ?? [],
      bindings: store.state?.bindings ?? {},
      ...patch,
    }
    const comparable = JSON.stringify({ ...next, updatedAt: '' })
    if (comparable === lastStatusText) return
    lastStatusText = comparable
    try {
      await writeJsonFile(statusFile, next)
    } catch (error) {
      logger.warn('telegram-remote: cannot write status file: %s', errorMessage(error))
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms)
      function done() {
        clearTimeout(timer)
        controller.signal.removeEventListener('abort', done)
        resolve()
      }
      controller.signal.addEventListener('abort', done, { once: true })
    })
  }

  /** Resolve the bot token: config value, credential store, environment variable, then token file. */
  async function resolveToken() {
    const fromConfig = typeof config.token === 'string' ? config.token.trim() : ''
    if (fromConfig.length > 0) return { token: fromConfig, source: 'config' }

    const credentials = ctx.get('credentials')
    if (credentials) {
      try {
        const hit = await credentials.resolve(TOKEN_CREDENTIAL_REF)
        if (typeof hit?.value === 'string' && hit.value.trim().length > 0) {
          return { token: hit.value.trim(), source: `credential:${TOKEN_CREDENTIAL_REF}` }
        }
      } catch (error) {
        logger.warn('telegram-remote: cannot read credential: %s', errorMessage(error))
      }
    }

    const envName = typeof config.tokenEnv === 'string' ? config.tokenEnv.trim() : ''
    const fromEnv = envName.length > 0 ? (process.env[envName] ?? '').trim() : ''
    if (fromEnv.length > 0) return { token: fromEnv, source: `env:${envName}` }

    const tokenFile = config.tokenFile ? expandHome(String(config.tokenFile)) : join(dataDir, 'token')
    try {
      const raw = (await readFile(tokenFile, 'utf8')).trim()
      if (raw.length > 0) return { token: raw, source: `file:${tokenFile}` }
    } catch (error) {
      if (error?.code !== 'ENOENT') logger.warn('telegram-remote: cannot read token file: %s', errorMessage(error))
    }
    return { token: '', source: 'none', tokenFile }
  }

  function resolveCwd() {
    if (typeof config.cwd === 'string' && config.cwd.trim().length > 0) return expandHome(config.cwd.trim())
    const workingDirectory = ctx.get('workingDirectory')
    if (workingDirectory?.defaultDirectory) return workingDirectory.defaultDirectory
    return process.cwd()
  }

  function isAllowed(chatId) {
    if (staticAllowed.length > 0) return staticAllowed.includes(chatId)
    return (store.state.allowedChatIds ?? []).includes(chatId)
  }

  function canPair() {
    return staticAllowed.length === 0 && (store.state.allowedChatIds ?? []).length === 0
  }

  async function reply(api, chatId, text, options = {}) {
    for (const chunk of chunkText(text)) {
      await api.sendMessage(chatId, chunk, options)
    }
  }

  /** Edit one message, tolerating "message is not modified" and rate limits. */
  async function editQuietly(api, chatId, messageId, text) {
    try {
      await api.editMessageText(chatId, messageId, text)
    } catch (error) {
      if (error instanceof TelegramError) {
        if (error.status === 400 && /not modified/i.test(error.description)) return
        if (error.status === 429) {
          await sleep(Math.min(5000, (error.retryAfter ?? 1) * 1000))
          return
        }
      }
      logger.warn('telegram-remote: edit failed: %s', errorMessage(error))
    }
  }

  async function ensureBinding(chatId) {
    const existing = store.state.bindings?.[chatId]
    if (existing?.sessionId) return existing

    const cwd = resolveCwd()
    const created = await sessionController.create({ cwd })
    const binding = { sessionId: created.sessionId, cwd, createdAt: Date.now() }
    await store.update((state) => {
      state.bindings = { ...(state.bindings ?? {}), [chatId]: binding }
    })
    return binding
  }

  async function forgetBinding(chatId) {
    await store.update((state) => {
      if (state.bindings) delete state.bindings[chatId]
    })
  }

  function readSessionState(sessionId) {
    return sessionController.state({ sessionId }, controller.signal)
  }

  /** Run one prompt and stream the assistant's answer back into the chat. */
  async function runPrompt(api, chatId, text) {
    const binding = await ensureBinding(chatId)
    const sessionId = binding.sessionId
    const deadline = Date.now() + config.requestTimeoutMs

    let before
    try {
      before = await readSessionState(sessionId)
    } catch (error) {
      await forgetBinding(chatId)
      throw new Error(`Không đọc được phiên ${sessionId}: ${errorMessage(error)}`)
    }

    const placeholder = await api.sendMessage(chatId, PLACEHOLDER)
    activeTurns.set(chatId, sessionId)
    try {
      await api.sendChatAction(chatId, 'typing').catch(() => {})
      await sessionController.prompt({
        requestId: randomUUID(),
        sessionId,
        mode: 'queue',
        content: [{ type: 'text', text }],
        clientTimeZone,
      }, controller.signal)

      const outcome = await pump(api, chatId, sessionId, before.cursor, placeholder.message_id, deadline)
      await finishTurn(api, chatId, placeholder.message_id, outcome)
    } finally {
      activeTurns.delete(chatId)
    }
  }

  /** Follow the turn until the session is quiescent or the deadline passes. */
  async function pump(api, chatId, sessionId, startSeq, placeholderId, deadline) {
    const parts = []
    let lastSeq = startSeq
    let lastEditAt = 0
    let lastPreview = ''

    while (!controller.signal.aborted) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) return { parts, pendingInput: [], timedOut: true }

      const wait = await sessionController.wait({
        sessionId,
        timeoutMs: Math.min(15000, Math.max(1000, remaining)),
        afterSeq: lastSeq,
        maxMessages: 50,
      }, controller.signal)

      for (const record of wait.output?.records ?? []) {
        const event = record?.event
        if (!event) continue
        if (typeof event.seq === 'number' && event.seq > lastSeq) lastSeq = event.seq
        if (event.type === 'assistant/message') {
          const text = assistantText(event)
          if (text.length > 0) parts.push(text)
        }
      }

      if (parts.length > 0 && Date.now() - lastEditAt > config.progressIntervalMs) {
        const preview = withSuffix(parts.join('\n\n'), '…')
        if (preview !== lastPreview) {
          await editQuietly(api, chatId, placeholderId, `${PLACEHOLDER}\n\n${preview}`)
          lastPreview = preview
          lastEditAt = Date.now()
        }
      }

      const pendingInput = wait.state?.pendingInput ?? []
      if (wait.reason === 'idle') return { parts, pendingInput, timedOut: false }
      if (wait.reason === 'input-required') return { parts, pendingInput, timedOut: false }
    }
    return { parts, pendingInput: [], timedOut: true }
  }

  async function finishTurn(api, chatId, placeholderId, outcome) {
    const notes = []
    if (outcome.timedOut) notes.push('⏱ Hết thời gian chờ. Lượt chạy có thể vẫn tiếp tục trong DSH – gửi /status để kiểm tra.')
    if (outcome.pendingInput.length > 0) {
      notes.push('⏸ DSH đang chờ bạn phê duyệt hoặc trả lời câu hỏi trong ứng dụng.')
    }

    const body = outcome.parts.join('\n\n').trim()
    const text = [body, ...notes].filter((part) => part.length > 0).join('\n\n')
      || '✅ Xong, nhưng lượt này không sinh ra nội dung văn bản.'
    const chunks = chunkText(text)
    await editQuietly(api, chatId, placeholderId, chunks[0] ?? '✅ Xong.')
    for (const chunk of chunks.slice(1)) await api.sendMessage(chatId, chunk)
  }

  async function handleCommand(api, chatId, text) {
    const { name, argument } = parseCommand(text)
    switch (name) {
      case 'start': {
        if (canPair()) {
          await store.update((state) => {
            state.allowedChatIds = [chatId]
            state.pairedAt = Date.now()
          })
          await reply(api, chatId, `✅ Đã ghép nối chat này với DSH.\n\n${HELP_TEXT}`)
          return
        }
        if (!isAllowed(chatId)) {
          await reply(api, chatId, `⛔ Chat ${chatId} không nằm trong danh sách cho phép.`)
          return
        }
        await reply(api, chatId, HELP_TEXT)
        return
      }
      case 'help':
        await reply(api, chatId, HELP_TEXT)
        return
      case 'whoami':
        await reply(api, chatId, [
          `Chat id: ${chatId}`,
          `Bot: @${identity?.username ?? '?'}`,
          `Phiên đang gắn: ${store.state.bindings?.[chatId]?.sessionId ?? 'chưa có'}`,
        ].join('\n'))
        return
      case 'ping':
        await reply(api, chatId, '🏓 pong')
        return
      case 'new': {
        const cwd = argument.length > 0 ? expandHome(argument) : resolveCwd()
        const created = await sessionController.create({ cwd })
        const binding = { sessionId: created.sessionId, cwd, createdAt: Date.now() }
        await store.update((state) => {
          state.bindings = { ...(state.bindings ?? {}), [chatId]: binding }
        })
        await reply(api, chatId, `🆕 Phiên mới: ${created.sessionId}\n📁 ${cwd}`)
        return
      }
      case 'use': {
        if (argument.length === 0) {
          await reply(api, chatId, 'Cú pháp: /use <sessionId>')
          return
        }
        const sessionId = argument.split(/\s+/)[0]
        await readSessionState(sessionId)
        await store.update((state) => {
          state.bindings = {
            ...(state.bindings ?? {}),
            [chatId]: { sessionId, cwd: resolveCwd(), createdAt: Date.now() },
          }
        })
        await reply(api, chatId, `🔗 Đã gắn chat này với phiên ${sessionId}`)
        return
      }
      case 'unbind':
        await forgetBinding(chatId)
        await reply(api, chatId, 'Đã bỏ gắn. Tin nhắn tiếp theo sẽ tạo phiên mới.')
        return
      case 'cancel': {
        const sessionId = activeTurns.get(chatId) ?? store.state.bindings?.[chatId]?.sessionId
        if (!sessionId) {
          await reply(api, chatId, 'Chưa có phiên nào để dừng.')
          return
        }
        sessionController.cancel({ sessionId })
        await reply(api, chatId, `⏹ Đã yêu cầu dừng ${sessionId}`)
        return
      }
      case 'status': {
        const binding = store.state.bindings?.[chatId]
        if (!binding?.sessionId) {
          await reply(api, chatId, 'Chưa gắn phiên nào. Gửi một tin nhắn hoặc /new.')
          return
        }
        const state = await readSessionState(binding.sessionId)
        await reply(api, chatId, [
          `Phiên: ${binding.sessionId}`,
          `Thư mục: ${binding.cwd}`,
          `Đang chạy: ${state.running ? 'có' : 'không'}`,
          `Hàng đợi: ${state.queue?.length ?? 0}`,
          `Chờ phê duyệt: ${(state.pendingInput ?? []).join(', ') || 'không'}`,
        ].join('\n'))
        return
      }
      default:
        await reply(api, chatId, `Lệnh /${name} chưa được hỗ trợ. Gửi /help để xem danh sách.`)
    }
  }

  async function handleMessage(api, message) {
    if (!message?.chat) return
    const chatId = String(message.chat.id)
    const text = typeof message.text === 'string' ? message.text.trim() : ''

    if (message.chat.type !== 'private') {
      await api.sendMessage(chatId, 'Bot này chỉ điều khiển DSH trong chat riêng.')
      return
    }

    const command = text.startsWith('/') ? parseCommand(text) : undefined
    if (!isAllowed(chatId) && !(command?.name === 'start' && canPair())) {
      if (!command) return
      await reply(api, chatId, canPair()
        ? `👋 Gửi /start để ghép nối chat này với DSH (chat id ${chatId}).`
        : `⛔ Chat ${chatId} không nằm trong danh sách cho phép.`)
      return
    }

    if (command) {
      await handleCommand(api, chatId, text)
      return
    }

    if (text.length === 0) {
      await reply(api, chatId, 'Hiện chỉ hỗ trợ tin nhắn văn bản.')
      return
    }

    void enqueue(chatId, async () => {
      try {
        await runPrompt(api, chatId, text)
      } catch (error) {
        logger.error('telegram-remote: prompt failed: %s', errorMessage(error))
        await reply(api, chatId, `❌ ${errorMessage(error)}`).catch(() => {})
      }
    })
  }

  function enqueue(chatId, task) {
    const previous = chatQueues.get(chatId) ?? Promise.resolve()
    const next = previous.then(task, task)
    chatQueues.set(chatId, next)
    const clear = () => {
      if (chatQueues.get(chatId) === next) chatQueues.delete(chatId)
    }
    next.then(clear, clear)
    return next
  }

  async function pollLoop() {
    await mkdir(dataDir, { recursive: true })
    await store.load()
    let backoff = 1000

    while (!stopped) {
      const { token, source, tokenFile } = await resolveToken()
      if (token.length === 0) {
        await publishStatus({
          state: 'waiting-token',
          tokenSource: source,
          hint: `Đặt token vào ${tokenFile ?? join(dataDir, 'token')}, hoặc đặt biến môi trường ${config.tokenEnv}. Tệp token được đọc lại mỗi vòng nên không cần khởi động lại.`,
        })
        await sleep(3000)
        continue
      }

      const api = new TelegramApi(token, { fetchImpl })
      if (identityToken !== token) {
        // A rotated or newly configured token invalidates the cached bot identity.
        identity = undefined
        identityToken = token
      }
      try {
        if (!identity) {
          identity = await api.getMe(controller.signal)
          logger.info('telegram-remote: connected as @%s', identity.username)
          await api.setMyCommands([
            { command: 'new', description: 'Tạo phiên DSH mới' },
            { command: 'status', description: 'Trạng thái phiên đang gắn' },
            { command: 'cancel', description: 'Dừng lượt đang chạy' },
            { command: 'unbind', description: 'Bỏ gắn phiên' },
            { command: 'help', description: 'Danh sách lệnh' },
          ]).catch(() => {})
        }
        await publishStatus({ state: 'polling', tokenSource: source, hint: null })

        const updates = await api.getUpdates({
          offset: store.state.offset,
          timeoutSeconds: config.pollTimeoutSec,
        }, controller.signal)

        backoff = 1000
        lastPollAt = Date.now()
        for (const update of updates) {
          await store.update((state) => {
            state.offset = update.update_id + 1
          })
          void handleMessage(api, update.message).catch((error) => {
            logger.error('telegram-remote: update failed: %s', errorMessage(error))
          })
        }
        await publishStatus({
          state: 'polling',
          lastPollAt: new Date(lastPollAt).toISOString(),
          lastError: null,
        })
      } catch (error) {
        if (stopped || controller.signal.aborted) break

        if (isTokenFailure(error)) {
          identity = undefined
          logger.error('telegram-remote: token rejected: %s', errorMessage(error))
          await publishStatus({ state: 'invalid-token', tokenSource: source, lastError: errorMessage(error) })
          await sleep(15000)
          continue
        }

        const wait = error instanceof TelegramError && error.retryAfter
          ? Math.min(60000, error.retryAfter * 1000)
          : backoff
        logger.warn('telegram-remote: poll failed (%s), retrying in %dms', errorMessage(error), wait)
        await publishStatus({ state: 'error', tokenSource: source, lastError: errorMessage(error) })
        await sleep(wait)
        backoff = Math.min(backoff * 2, 30000)
      }
    }

    await publishStatus({ state: 'stopped' })
    logger.info('telegram-remote: stopped')
  }

  const loopPromise = pollLoop()
  loopPromise.catch((error) => {
    logger.error('telegram-remote: loop crashed: %s', errorMessage(error))
  })

  return () => {
    if (stopped) return
    stopped = true
    controller.abort()
  }
}

/** Extract the visible text of one assistant message event. */
export function assistantText(event) {
  const content = event?.data?.message?.content
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim().length > 0) {
      parts.push(block.text)
    }
  }
  return parts.join('\n').trim()
}

function errorMessage(error) {
  if (error instanceof Error) return error.message
  return String(error)
}
