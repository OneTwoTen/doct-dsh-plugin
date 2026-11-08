/** Minimal Telegram Bot API client over the platform `fetch`. */

const API_BASE = 'https://api.telegram.org'

/** A chat or user id, as the Bot API accepts either form. */
export type TelegramChatId = string | number

/** The bot identity `getMe` answers with. */
export interface TelegramUser {
  id?: number
  username?: string
  [key: string]: unknown
}

/** One chat a message belongs to. */
export interface TelegramChat {
  id: TelegramChatId
  type?: string
  [key: string]: unknown
}

/** One message, as far as this client reads it. */
export interface TelegramMessage {
  message_id: number
  chat?: TelegramChat
  text?: string
  [key: string]: unknown
}

/** One tapped inline button. */
export interface TelegramCallbackQuery {
  id: string
  data?: string
  message?: TelegramMessage
  [key: string]: unknown
}

/** One long-poll update. */
export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
  [key: string]: unknown
}

/** One row of an inline keyboard. */
export interface TelegramInlineKeyboardButton {
  text: string
  callback_data?: string
}

/** The inline keyboard `reply_markup` carries. */
export interface TelegramKeyboard {
  inline_keyboard: TelegramInlineKeyboardButton[][]
}

/** A row of the bot command menu. */
export interface TelegramBotCommand {
  command: string
  description: string
}

/** `getUpdates` options. */
export interface GetUpdatesOptions {
  offset?: number
  timeoutSeconds?: number
  allowedUpdates?: string[]
}

/** `sendMessage` options. */
export interface SendMessageOptions {
  replyToMessageId?: number
  disablePreview?: boolean
  keyboard?: TelegramKeyboard
}

/** `editMessageText` options. */
export interface EditMessageOptions {
  disablePreview?: boolean
  keyboard?: TelegramKeyboard
}

/** `answerCallbackQuery` options. */
export interface AnswerCallbackQueryOptions {
  text?: string
  showAlert?: boolean
}

export class TelegramError extends Error {
  /** Bot API method that failed. */
  method: string
  /** HTTP status code. */
  status: number
  /** Bot API description or transport message. */
  description: string
  /** Seconds the Bot API asked the caller to wait. */
  retryAfter: number | undefined

  constructor(method: string, status: number, description: string, retryAfter?: number) {
    super(`${method} failed (${status}): ${description}`)
    this.name = 'TelegramError'
    this.method = method
    this.status = status
    this.description = description
    this.retryAfter = retryAfter
  }
}

/** True for failures that a new token (not a retry) can fix. */
export function isTokenFailure(error: unknown): boolean {
  return error instanceof TelegramError && (error.status === 401 || error.status === 404)
}

export class TelegramApi {
  #token: string
  #fetch: typeof fetch

  /**
   * @param token Bot token from BotFather.
   * @param options `fetchImpl` overrides the platform `fetch`.
   */
  constructor(token: string, options: { fetchImpl?: typeof fetch } = {}) {
    if (typeof token !== 'string' || token.trim().length === 0) throw new Error('Telegram bot token is empty')
    this.#token = token.trim()
    const impl = options.fetchImpl ?? globalThis.fetch
    if (typeof impl !== 'function') throw new Error('This runtime provides no fetch implementation')
    this.#fetch = impl
  }

  /** Masked bot identity for logs and status files. */
  get tokenFingerprint(): string {
    const [, id = '', secret = ''] = this.#token.split(':')
    return `bot${id}:${'*'.repeat(Math.max(0, secret.length - 4))}${secret.slice(-4)}`
  }

  async #call<T>(method: string, params: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
    let response: Response
    try {
      response = await this.#fetch(`${API_BASE}/bot${this.#token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
        signal,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new TelegramError(method, 0, error instanceof Error ? error.message : String(error))
    }

    let body: {
      ok?: boolean
      description?: string
      parameters?: { retry_after?: number }
      result?: T
    } | undefined
    try {
      body = await response.json()
    } catch {
      body = undefined
    }

    if (!body || body.ok !== true) {
      const description = body?.description ?? `HTTP ${response.status}`
      const retryAfter = body?.parameters?.retry_after
      throw new TelegramError(method, response.status, description, retryAfter)
    }
    return body.result as T
  }

  getMe(signal?: AbortSignal): Promise<TelegramUser> {
    return this.#call<TelegramUser>('getMe', {}, signal)
  }

  /**
   * Long-poll for updates.
   * @param options offset, poll timeout, and the update kinds to receive
   */
  getUpdates(options: GetUpdatesOptions = {}, signal?: AbortSignal): Promise<TelegramUpdate[]> {
    const { offset, timeoutSeconds = 25, allowedUpdates = ['message', 'callback_query'] } = options
    return this.#call<TelegramUpdate[]>('getUpdates', {
      offset,
      timeout: timeoutSeconds,
      allowed_updates: allowedUpdates,
    }, signal)
  }

  sendMessage(
    chatId: TelegramChatId,
    text: string,
    options: SendMessageOptions = {},
    signal?: AbortSignal,
  ): Promise<TelegramMessage> {
    const { replyToMessageId, disablePreview = true, keyboard } = options
    return this.#call<TelegramMessage>('sendMessage', {
      chat_id: chatId,
      text,
      disable_web_page_preview: disablePreview,
      ...(replyToMessageId === undefined ? {} : { reply_to_message_id: replyToMessageId }),
      ...(keyboard === undefined ? {} : { reply_markup: keyboard }),
    }, signal)
  }

  editMessageText(
    chatId: TelegramChatId,
    messageId: number,
    text: string,
    options: EditMessageOptions = {},
    signal?: AbortSignal,
  ): Promise<TelegramMessage> {
    const { disablePreview = true, keyboard } = options
    return this.#call<TelegramMessage>('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      disable_web_page_preview: disablePreview,
      ...(keyboard === undefined ? {} : { reply_markup: keyboard }),
    }, signal)
  }

  /** Acknowledge a tapped inline button; the tap keeps spinning until this answers. */
  answerCallbackQuery(
    callbackQueryId: string,
    options: AnswerCallbackQueryOptions = {},
    signal?: AbortSignal,
  ): Promise<boolean> {
    const { text, showAlert = false } = options
    return this.#call<boolean>('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...(text === undefined ? {} : { text }),
      ...(showAlert ? { show_alert: true } : {}),
    }, signal)
  }

  /** Remove a message; the status placeholder is deleted once the turn ends. */
  deleteMessage(chatId: TelegramChatId, messageId: number, signal?: AbortSignal): Promise<boolean> {
    return this.#call<boolean>('deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    }, signal)
  }

  sendChatAction(chatId: TelegramChatId, action = 'typing', signal?: AbortSignal): Promise<boolean> {
    return this.#call<boolean>('sendChatAction', { chat_id: chatId, action }, signal)
  }

  setMyCommands(commands: TelegramBotCommand[], signal?: AbortSignal): Promise<boolean> {
    return this.#call<boolean>('setMyCommands', { commands }, signal)
  }
}
