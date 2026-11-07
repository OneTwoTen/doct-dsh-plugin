/** Minimal Telegram Bot API client over the platform `fetch`. */

const API_BASE = 'https://api.telegram.org'

export class TelegramError extends Error {
  /**
   * @param {string} method Bot API method that failed.
   * @param {number} status HTTP status code.
   * @param {string} description Bot API description or transport message.
   * @param {number} [retryAfter] Seconds the Bot API asked the caller to wait.
   */
  constructor(method, status, description, retryAfter) {
    super(`${method} failed (${status}): ${description}`)
    this.name = 'TelegramError'
    this.method = method
    this.status = status
    this.description = description
    this.retryAfter = retryAfter
  }
}

/** True for failures that a new token (not a retry) can fix. */
export function isTokenFailure(error) {
  return error instanceof TelegramError && (error.status === 401 || error.status === 404)
}

export class TelegramApi {
  #token
  #fetch

  /**
   * @param {string} token Bot token from BotFather.
   * @param {{ fetchImpl?: typeof fetch }} [options]
   */
  constructor(token, options = {}) {
    if (typeof token !== 'string' || token.trim().length === 0) throw new Error('Telegram bot token is empty')
    this.#token = token.trim()
    const impl = options.fetchImpl ?? globalThis.fetch
    if (typeof impl !== 'function') throw new Error('This runtime provides no fetch implementation')
    this.#fetch = impl
  }

  /** Masked bot identity for logs and status files. */
  get tokenFingerprint() {
    const [, id = '', secret = ''] = this.#token.split(':')
    return `bot${id}:${'*'.repeat(Math.max(0, secret.length - 4))}${secret.slice(-4)}`
  }

  async #call(method, params = {}, signal) {
    let response
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

    let body
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
    return body.result
  }

  getMe(signal) {
    return this.#call('getMe', {}, signal)
  }

  /**
   * Long-poll for updates.
   * @param {{ offset?: number, timeoutSeconds?: number, allowedUpdates?: string[] }} options
   */
  getUpdates(options = {}, signal) {
    const { offset, timeoutSeconds = 25, allowedUpdates = ['message'] } = options
    return this.#call('getUpdates', {
      offset,
      timeout: timeoutSeconds,
      allowed_updates: allowedUpdates,
    }, signal)
  }

  sendMessage(chatId, text, options = {}, signal) {
    const { replyToMessageId, disablePreview = true } = options
    return this.#call('sendMessage', {
      chat_id: chatId,
      text,
      disable_web_page_preview: disablePreview,
      ...(replyToMessageId === undefined ? {} : { reply_to_message_id: replyToMessageId }),
    }, signal)
  }

  editMessageText(chatId, messageId, text, options = {}, signal) {
    const { disablePreview = true } = options
    return this.#call('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      disable_web_page_preview: disablePreview,
    }, signal)
  }

  sendChatAction(chatId, action = 'typing', signal) {
    return this.#call('sendChatAction', { chat_id: chatId, action }, signal)
  }

  setMyCommands(commands, signal) {
    return this.#call('setMyCommands', { commands }, signal)
  }
}
