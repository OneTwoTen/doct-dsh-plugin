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
  '/new [thư-mục] – tạo phiên mới (mặc định dùng workspace hoặc thư mục đang chọn)',
  '/workspaces – liệt kê workspace (có nút bấm để chọn)',
  '/workspace <số|id|đường-dẫn> – chọn workspace cho phiên mới',
  '/models – liệt kê provider và model (có nút bấm để chọn)',
  '/model <số|provider/model[@effort]> – đổi model cho phiên này',
  '/status – phiên đang gắn, workspace, model, trạng thái chạy',
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
    prefs: {},
    lists: {},
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
  let currentState = 'starting'
  let lastStatusText = ''
  let published = {}
  let lastPollAt = 0

  logger.info('telegram-remote: mounted, data directory %s', dataDir)

  /** Publish observable runtime status for the user and for debugging. */
  async function publishStatus(patch) {
    if (typeof patch?.state === 'string') currentState = patch.state
    const next = {
      ...published,
      updatedAt: new Date().toISOString(),
      state: currentState,
      tokenSource: published.tokenSource ?? 'none',
      lastPollAt: lastPollAt > 0 ? new Date(lastPollAt).toISOString() : published.lastPollAt ?? null,
      lastError: published.lastError ?? null,
      bot: identity ? { id: identity.id, username: identity.username } : published.bot ?? null,
      allowedChatIds: staticAllowed.length > 0 ? staticAllowed : store.state?.allowedChatIds ?? [],
      bindings: store.state?.bindings ?? {},
      ...patch,
    }
    const comparable = JSON.stringify({ ...next, updatedAt: '' })
    if (comparable === lastStatusText) return
    lastStatusText = comparable
    published = next
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
    const { keyboard, ...rest } = options
    const chunks = chunkText(text)
    for (let index = 0; index < chunks.length; index += 1) {
      const isLast = index === chunks.length - 1
      await api.sendMessage(chatId, chunks[index], isLast && keyboard ? { ...rest, keyboard } : rest)
    }
  }

  /** Last listing sent to this chat, so numbered replies and buttons resolve after a restart. */
  function cachedList(chatId, kind) {
    return store.state.lists?.[chatId]?.[kind] ?? []
  }

  async function saveListing(chatId, kind, items) {
    await store.update((state) => {
      const lists = state.lists ?? {}
      state.lists = { ...lists, [chatId]: { ...(lists[chatId] ?? {}), [kind]: items } }
    })
  }

  function shorten(value, max) {
    const text = String(value ?? '')
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`
  }

  function workspaceKeyboard(chatId, workspaces) {
    const chosen = preferencesOf(chatId).workspaceId
    return {
      inline_keyboard: workspaces.map((workspace, index) => [{
        text: `${workspace.id === chosen ? '✅ ' : ''}${index + 1}. ${shorten(workspace.title, 44)}`,
        callback_data: `w:${index}`,
      }]),
    }
  }

  function modelKeyboard(chatId, models) {
    const current = preferencesOf(chatId).model
    const rows = []
    let row = []
    models.forEach((entry, index) => {
      const chosen = current?.provider === entry.provider && current?.model === entry.model
      row.push({
        text: `${chosen ? '✅ ' : ''}${shorten(`${entry.provider} · ${entry.model}`, 46)}`,
        callback_data: `m:${index}`,
      })
      if (row.length === 2) {
        rows.push(row)
        row = []
      }
    })
    if (row.length > 0) rows.push(row)
    return { inline_keyboard: rows }
  }

  /** Edit one message, tolerating "message is not modified" and rate limits. */
  async function editQuietly(api, chatId, messageId, text, options = {}) {
    try {
      await api.editMessageText(chatId, messageId, text, options)
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

  async function forgetBinding(chatId) {
    await store.update((state) => {
      if (state.bindings) delete state.bindings[chatId]
    })
  }

  /** Workspaces the DSH profile knows about, in sidebar order. */
  function listWorkspaces() {
    const registry = ctx.get('workspaceRegistry')
    if (!registry || typeof registry.list !== 'function') return []
    try {
      return registry.list().map((workspace) => ({
        id: workspace.id,
        title: workspace.title ?? workspace.path,
        path: workspace.path,
      }))
    } catch (error) {
      logger.warn('telegram-remote: cannot list workspaces: %s', errorMessage(error))
      return []
    }
  }

  function preferencesOf(chatId) {
    return store.state.prefs?.[chatId] ?? {}
  }

  async function savePreferences(chatId, patch) {
    await store.update((state) => {
      const prefs = state.prefs ?? {}
      state.prefs = { ...prefs, [chatId]: { ...(prefs[chatId] ?? {}), ...patch } }
    })
  }

  /** Apply one model selection to a live session, surfacing catalog errors to the chat. */
  async function applyModel(sessionId, selection) {
    const applied = await sessionController.selectModel({
      sessionId,
      provider: selection.provider,
      model: selection.model,
      ...(selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}),
    }, controller.signal)
    return applied?.selected ?? selection
  }

  /**
   * Create the chat's session from its preferences: an explicit directory wins,
   * then the chosen workspace, then the configured default directory.
   * @returns {{ binding: Record<string, unknown>, note?: string }}
   */
  async function createSession(chatId, { cwd, workspaceId } = {}) {
    const prefs = preferencesOf(chatId)
    const wantedWorkspace = workspaceId ?? (cwd ? undefined : prefs.workspaceId)

    let request
    if (cwd) request = { cwd }
    else if (wantedWorkspace) request = { workspaceId: wantedWorkspace }
    else request = { cwd: resolveCwd() }

    let note
    let created
    try {
      created = await sessionController.create(request)
    } catch (error) {
      if (request.workspaceId === undefined) throw error
      note = `⚠ Không mở được workspace ${request.workspaceId} (${errorMessage(error)}); đã dùng thư mục mặc định.`
      request = { cwd: resolveCwd() }
      created = await sessionController.create(request)
    }

    const model = prefs.model
    if (model) {
      try {
        await applyModel(created.sessionId, model)
      } catch (error) {
        note = `${note ? `${note}\n` : ''}⚠ Không đặt được model ${model.provider}/${model.model}: ${errorMessage(error)}`
      }
    }

    const binding = {
      sessionId: created.sessionId,
      ...(request.cwd ? { cwd: request.cwd } : {}),
      ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
      ...(model ? { model } : {}),
      createdAt: Date.now(),
    }
    await store.update((state) => {
      state.bindings = { ...(state.bindings ?? {}), [chatId]: binding }
    })
    return { binding, note }
  }

  function readSessionState(sessionId) {
    return sessionController.state({ sessionId }, controller.signal)
  }

  /** Flatten the provider-grouped model catalog into one ordered list. */
  function flattenModels(catalog) {
    const groups = Array.isArray(catalog?.groups) ? catalog.groups : []
    return groups.flatMap((group) => (group.models ?? []).map((model) => ({
      provider: group.id,
      providerName: group.name ?? group.id,
      model: model.id,
      modelName: model.name ?? model.id,
    })))
  }

  function modelLabel(selection) {
    if (!selection?.provider || !selection?.model) return 'mặc định của DSH'
    const effort = selection.reasoningEffort ? `@${selection.reasoningEffort}` : ''
    return `${selection.provider}/${selection.model}${effort}`
  }

  async function loadModelCatalog() {
    try {
      return await sessionController.modelCatalog()
    } catch (error) {
      logger.warn('telegram-remote: cannot read model catalog: %s', errorMessage(error))
      return { groups: [], failures: [] }
    }
  }

  /** Resolve a `/workspace` argument: list number, id, absolute or partial path. */
  function resolveWorkspaceArgument(chatId, argument) {
    const all = listWorkspaces()
    const value = argument.trim()
    if (/^\d+$/.test(value)) {
      const cached = cachedList(chatId, 'workspaces')
      const pool = cached.length > 0 ? cached : all
      return pool[Number(value) - 1]
    }
    const lowered = value.toLowerCase()
    const expanded = expandHome(value).toLowerCase()
    return all.find((workspace) => workspace.id === value)
      ?? all.find((workspace) => workspace.path.toLowerCase() === expanded)
      ?? all.find((workspace) => workspace.path.toLowerCase().endsWith(lowered))
      ?? { id: value, title: value, path: value }
  }

  /** Resolve a `/model` argument: list number, `provider/model`, `@effort`, or a unique model id. */
  function resolveModelArgument(chatId, argument, catalog) {
    const value = argument.trim()
    const flat = flattenModels(catalog)
    if (/^\d+$/.test(value)) {
      const cached = cachedList(chatId, 'models')
      const pool = cached.length > 0 ? cached : flat
      return pool[Number(value) - 1]
    }
    const at = value.indexOf('@')
    const head = at < 0 ? value : value.slice(0, at)
    const reasoningEffort = at < 0 ? undefined : value.slice(at + 1)
    const slash = head.indexOf('/')
    if (slash > 0) {
      return {
        provider: head.slice(0, slash),
        model: head.slice(slash + 1),
        ...(reasoningEffort ? { reasoningEffort } : {}),
      }
    }
    const matches = flat.filter((entry) => entry.model === head)
    if (matches.length !== 1) return undefined
    return {
      provider: matches[0].provider,
      model: matches[0].model,
      ...(reasoningEffort ? { reasoningEffort } : {}),
    }
  }

  /** Run one prompt and stream the assistant's answer back into the chat. */
  async function runPrompt(api, chatId, text) {
    let binding = store.state.bindings?.[chatId]
    if (!binding?.sessionId) {
      const created = await createSession(chatId, {})
      binding = created.binding
      if (created.note) await reply(api, chatId, created.note)
    }
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
        const created = await createSession(chatId, argument.length > 0 ? { cwd: expandHome(argument) } : {})
        const lines = [`🆕 Phiên mới: ${created.binding.sessionId}`]
        if (created.binding.cwd) lines.push(`📁 ${created.binding.cwd}`)
        if (created.binding.workspaceId) lines.push(`🗂 workspace: ${created.binding.workspaceId}`)
        if (created.binding.model) lines.push(`🤖 ${modelLabel(created.binding.model)}`)
        if (created.note) lines.push(created.note)
        await reply(api, chatId, lines.join('\n'))
        return
      }
      case 'workspaces': {
        const workspaces = listWorkspaces()
        await saveListing(chatId, 'workspaces', workspaces)
        if (workspaces.length === 0) {
          await reply(api, chatId, 'DSH chưa có workspace nào. Dùng /new <thư-mục> để mở phiên trong một thư mục.')
          return
        }
        const chosen = preferencesOf(chatId).workspaceId
        const lines = ['🗂 Workspace của DSH:']
        workspaces.forEach((workspace, index) => {
          const mark = workspace.id === chosen ? ' ✅' : ''
          lines.push(`${index + 1}. ${workspace.title} — ${workspace.path}${mark}`)
        })
        lines.push('', 'Chạm nút bên dưới để chọn, hoặc gõ /workspace <số|id|đường-dẫn>.')
        await reply(api, chatId, lines.join('\n'), { keyboard: workspaceKeyboard(chatId, workspaces) })
        return
      }
      case 'workspace': {
        if (argument.length === 0) {
          const chosen = preferencesOf(chatId).workspaceId
          await reply(api, chatId, chosen
            ? `Workspace đang chọn: ${chosen}\nGửi /workspaces để xem danh sách, /new để mở phiên trong workspace này.`
            : 'Chưa chọn workspace. Gửi /workspaces để xem danh sách.')
          return
        }
        const target = resolveWorkspaceArgument(chatId, argument)
        if (!target) {
          await reply(api, chatId, `Không tìm thấy workspace "${argument}". Gửi /workspaces để xem danh sách.`)
          return
        }
        await savePreferences(chatId, { workspaceId: target.id })
        await reply(api, chatId, [
          `🗂 Đã chọn workspace: ${target.title} — ${target.path}`,
          `Id: ${target.id}`,
          'Phiên hiện tại không đổi; gửi /new để mở phiên trong workspace này.',
        ].join('\n'))
        return
      }
      case 'models': {
        const catalog = await loadModelCatalog()
        const flat = flattenModels(catalog)
        await saveListing(chatId, 'models', flat)
        if (flat.length === 0) {
          await reply(api, chatId, 'Không đọc được model nào đang dùng được. Kiểm tra provider trong DSH.')
          return
        }
        const current = preferencesOf(chatId).model
        const defaultSelection = catalog.default
        const lines = ['🤖 Model đang dùng được:']
        let lastProvider
        flat.forEach((entry, index) => {
          if (entry.provider !== lastProvider) {
            lines.push(`\n${entry.providerName} (${entry.provider})`)
            lastProvider = entry.provider
          }
          const marks = []
          if (defaultSelection?.provider === entry.provider && defaultSelection?.model === entry.model) marks.push('⭐ mặc định')
          if (current?.provider === entry.provider && current?.model === entry.model) marks.push('✅ đang chọn')
          const suffix = marks.length > 0 ? `  ${marks.join(' · ')}` : ''
          lines.push(`${index + 1}. ${entry.model}${suffix}`)
        })
        for (const failure of catalog.failures ?? []) {
          lines.push(`⚠ ${failure.name ?? failure.id}: ${failure.message}`)
        }
        lines.push('', 'Chạm nút bên dưới để chọn, hoặc gõ /model <số> hay /model provider/model[@effort].')
        await reply(api, chatId, lines.join('\n'), { keyboard: modelKeyboard(chatId, flat) })
        return
      }
      case 'model': {
        const current = preferencesOf(chatId).model
        if (argument.length === 0) {
          await reply(api, chatId, [
            `Model đang chọn: ${modelLabel(current)}`,
            'Gửi /models để xem danh sách, rồi /model <số> hoặc /model provider/model.',
          ].join('\n'))
          return
        }
        const catalog = await loadModelCatalog()
        const selection = resolveModelArgument(chatId, argument, catalog)
        if (!selection) {
          await reply(api, chatId, `Không xác định được model "${argument}". Gửi /models để xem danh sách.`)
          return
        }

        const binding = store.state.bindings?.[chatId]
        let applied = selection
        if (binding?.sessionId) {
          try {
            applied = await applyModel(binding.sessionId, selection)
          } catch (error) {
            await reply(api, chatId, `❌ Không đổi được model: ${errorMessage(error)}`)
            return
          }
        }
        await savePreferences(chatId, { model: applied })
        if (binding?.sessionId) {
          await store.update((state) => {
            state.bindings = { ...(state.bindings ?? {}), [chatId]: { ...binding, model: applied } }
          })
        }
        await reply(api, chatId, `🤖 Đã chọn ${modelLabel(applied)}${binding?.sessionId ? '' : ' cho phiên kế tiếp'}`)
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
        await reply(api, chatId, 'Đã bỏ gắn. Tin nhắn tiếp theo sẽ tạo phiên mới (giữ workspace và model đã chọn).')
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
        const prefs = preferencesOf(chatId)
        const lines = []
        if (binding?.sessionId) {
          const state = await readSessionState(binding.sessionId)
          lines.push(`Phiên: ${binding.sessionId}`)
          if (binding.cwd) lines.push(`Thư mục: ${binding.cwd}`)
          if (binding.workspaceId) lines.push(`Workspace: ${binding.workspaceId}`)
          lines.push(`Model: ${modelLabel(binding.model ?? prefs.model)}`)
          lines.push(`Đang chạy: ${state.running ? 'có' : 'không'}`)
          lines.push(`Hàng đợi: ${state.queue?.length ?? 0}`)
          lines.push(`Chờ phê duyệt: ${(state.pendingInput ?? []).join(', ') || 'không'}`)
        } else {
          lines.push('Chưa gắn phiên nào. Gửi một tin nhắn hoặc /new.')
          lines.push(`Workspace đã chọn: ${prefs.workspaceId ?? 'mặc định'}`)
          lines.push(`Model đã chọn: ${modelLabel(prefs.model)}`)
        }
        await reply(api, chatId, lines.join('\n'))
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

  /** Apply a tapped inline button: a workspace choice or a model choice. */
  async function handleCallback(api, query) {
    const message = query?.message
    const chatId = message?.chat ? String(message.chat.id) : undefined
    const data = typeof query?.data === 'string' ? query.data : ''
    const answer = async (text, showAlert = false) => {
      try {
        await api.answerCallbackQuery(query.id, text ? { text, showAlert } : {})
      } catch (error) {
        logger.warn('telegram-remote: answerCallbackQuery failed: %s', errorMessage(error))
      }
    }
    if (!chatId) return

    if (message.chat.type !== 'private' || !isAllowed(chatId)) {
      await answer('Chat này chưa được ghép nối với DSH.')
      return
    }

    const match = /^([wm]):(\d+)$/.exec(data)
    if (!match) {
      await answer()
      return
    }
    const index = Number(match[2])
    const messageId = message.message_id

    if (match[1] === 'w') {
      const target = cachedList(chatId, 'workspaces')[index]
      if (!target) {
        await answer('Danh sách đã cũ, gửi /workspaces lại nhé.', true)
        return
      }
      await savePreferences(chatId, { workspaceId: target.id })
      await answer('Đã chọn workspace')
      await editQuietly(api, chatId, messageId, [
        `🗂 Đã chọn workspace: ${target.title} — ${target.path}`,
        `Id: ${target.id}`,
        'Phiên hiện tại không đổi; gửi /new để mở phiên trong workspace này.',
      ].join('\n'), { keyboard: { inline_keyboard: [] } })
      return
    }

    const entry = cachedList(chatId, 'models')[index]
    if (!entry) {
      await answer('Danh sách đã cũ, gửi /models lại nhé.', true)
      return
    }

    const binding = store.state.bindings?.[chatId]
    const selection = { provider: entry.provider, model: entry.model }
    let applied = selection
    if (binding?.sessionId) {
      try {
        applied = await applyModel(binding.sessionId, selection)
      } catch (error) {
        await answer(`Không đổi được: ${errorMessage(error)}`, true)
        return
      }
    }
    await savePreferences(chatId, { model: applied })
    if (binding?.sessionId) {
      await store.update((state) => {
        state.bindings = { ...(state.bindings ?? {}), [chatId]: { ...binding, model: applied } }
      })
    }
    await answer('Đã chọn model')
    await editQuietly(
      api,
      chatId,
      messageId,
      `🤖 Đã chọn ${modelLabel(applied)}${binding?.sessionId ? '' : ' cho phiên kế tiếp'}`,
      { keyboard: { inline_keyboard: [] } },
    )
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

  /** Record what this profile can offer, so `/workspaces` and `/models` failures are visible. */
  async function probeCapabilities() {
    const workspaces = listWorkspaces().length
    let providers = 0
    let models = 0
    let modelError
    try {
      const catalog = await sessionController.modelCatalog()
      const flat = flattenModels(catalog)
      models = flat.length
      providers = new Set(flat.map((entry) => entry.provider)).size
    } catch (error) {
      modelError = errorMessage(error)
    }
    await publishStatus({
      capabilities: {
        workspaces,
        ...(modelError === undefined ? { providers, models } : { modelError }),
      },
    })
  }

  async function pollLoop() {
    await mkdir(dataDir, { recursive: true })
    await store.load()
    let backoff = 1000
    let probed = false

    while (!stopped) {
      const { token, source, tokenFile } = await resolveToken()
      if (token.length === 0) {
        await publishStatus({
          state: 'waiting-token',
          tokenSource: source,
          hint: `Đặt token vào ${tokenFile ?? join(dataDir, 'token')}, hoặc đặt biến môi trường ${config.tokenEnv}. Tệp token được đọc lại mỗi vòng nên không cần khởi động lại.`,
        })
        if (!probed) {
          probed = true
          void probeCapabilities().catch(() => {})
        }
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
            { command: 'workspaces', description: 'Liệt kê workspace' },
            { command: 'workspace', description: 'Chọn workspace cho phiên mới' },
            { command: 'models', description: 'Liệt kê provider và model' },
            { command: 'model', description: 'Đổi model cho phiên' },
            { command: 'status', description: 'Trạng thái phiên đang gắn' },
            { command: 'cancel', description: 'Dừng lượt đang chạy' },
            { command: 'unbind', description: 'Bỏ gắn phiên' },
            { command: 'help', description: 'Danh sách lệnh' },
          ]).catch(() => {})
        }
        await publishStatus({ state: 'polling', tokenSource: source, hint: null })
        if (!probed) {
          probed = true
          void probeCapabilities().catch(() => {})
        }

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
          if (update.callback_query) {
            void handleCallback(api, update.callback_query).catch((error) => {
              logger.error('telegram-remote: callback failed: %s', errorMessage(error))
            })
            continue
          }
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
