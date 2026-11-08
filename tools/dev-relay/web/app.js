/**
 * WebChat for the development relay: vanilla JS, one WebSocket, protocol v1.
 * It is deliberately small; the production SvelteKit client will replace it.
 */
const TOKEN_KEY = 'dsh-web-remote-token'
const MAX_RECONNECT_MS = 15000

/** `crypto.randomUUID` needs a secure context; LAN HTTP does not have one. */
function newId() {
  const webCrypto = globalThis.crypto
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID()
  const bytes = new Uint8Array(16)
  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const els = {
  status: document.getElementById('status'),
  title: document.getElementById('title'),
  sessions: document.getElementById('sessions'),
  messages: document.getElementById('messages'),
  notices: document.getElementById('notices'),
  composer: document.getElementById('composer'),
  prompt: document.getElementById('prompt'),
  send: document.getElementById('send'),
  stop: document.getElementById('stop'),
  menu: document.getElementById('menu'),
  newSession: document.getElementById('new'),
  refresh: document.getElementById('refresh'),
  scrim: document.getElementById('scrim'),
  login: document.getElementById('login'),
  loginForm: document.getElementById('login-form'),
  token: document.getElementById('token'),
}

const state = {
  token: '',
  ws: undefined,
  ready: false,
  attempt: 0,
  reconnectTimer: undefined,
  sessions: [],
  currentSessionId: undefined,
  followId: undefined,
  pending: new Map(),
  approvals: [],
  questions: [],
  typing: false,
  typingEl: undefined,
  streamingText: '',
  stopping: false,
}

boot()

function boot() {
  const url = new URL(location.href)
  const fromUrl = url.searchParams.get('token')
  if (fromUrl !== null) {
    sessionStorage.setItem(TOKEN_KEY, fromUrl)
    url.searchParams.delete('token')
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }
  state.token = fromUrl ?? sessionStorage.getItem(TOKEN_KEY) ?? ''
  if (state.token.length === 0) {
    els.login.hidden = false
    els.loginForm.addEventListener('submit', (event) => {
      event.preventDefault()
      const value = els.token.value.trim()
      if (value.length === 0) return
      sessionStorage.setItem(TOKEN_KEY, value)
      location.reload()
    })
    els.token.focus()
    return
  }
  els.login.hidden = true
  bindUi()
  connect()
}

function bindUi() {
  els.composer.addEventListener('submit', (event) => {
    event.preventDefault()
    void sendPrompt()
  })
  els.prompt.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      void sendPrompt()
    }
  })
  els.prompt.addEventListener('input', () => {
    els.prompt.style.height = 'auto'
    els.prompt.style.height = `${Math.min(140, els.prompt.scrollHeight)}px`
  })
  els.newSession.addEventListener('click', () => void createSession())
  els.refresh.addEventListener('click', () => void loadSessions())
  els.stop.addEventListener('click', () => void cancelTurn())
  els.menu.addEventListener('click', () => document.body.classList.toggle('sidebar-open'))
  els.scrim.addEventListener('click', () => document.body.classList.remove('sidebar-open'))
  els.newSession.addEventListener('click', () => document.body.classList.remove('sidebar-open'))
}

// ------------------------------------------------------------------ socket --

function wsUrl() {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${location.host}/ws`
}

function connect() {
  clearTimeout(state.reconnectTimer)
  setStatus('connecting', 'Äang káº¿t ná»‘iâ€¦')
  let socket
  try {
    socket = new WebSocket(wsUrl(), ['dsh-remote.v1', `webbearer.${state.token}`])
  } catch (error) {
    scheduleReconnect(error.message)
    return
  }
  state.ws = socket
  state.ready = false

  socket.addEventListener('message', (event) => {
    let frame
    try {
      frame = JSON.parse(event.data)
    } catch {
      return
    }
    handleFrame(frame)
  })
  socket.addEventListener('close', () => {
    if (state.ws !== socket) return
    state.ws = undefined
    state.ready = false
    state.followId = undefined
    state.streamingText = ''
    rejectAll('Máº¥t káº¿t ná»‘i tá»›i relay')
    clearNotices()
    setTyping(false)
    setStatus('offline', 'Máº¥t káº¿t ná»‘i â€” Ä‘ang thá»­ láº¡iâ€¦')
    scheduleReconnect('socket closed')
  })
  socket.addEventListener('error', () => {
    // The close event carries the retry.
  })
}

function scheduleReconnect(reason) {
  if (state.stopping) return
  state.attempt += 1
  const delay = Math.min(MAX_RECONNECT_MS, 500 * 2 ** Math.min(5, state.attempt)) + Math.random() * 300
  setStatus('offline', `Máº¥t káº¿t ná»‘i â€” thá»­ láº¡i sau ${Math.round(delay / 1000)}s`)
  state.reconnectTimer = setTimeout(() => {
    void reason
    connect()
  }, delay)
}

function send(frame) {
  if (state.ws === undefined || state.ws.readyState !== WebSocket.OPEN) return false
  state.ws.send(JSON.stringify(frame))
  return true
}

function request(op, args = {}, timeoutMs = 60000) {
  if (!state.ready) return Promise.reject(new Error('chÆ°a káº¿t ná»‘i'))
  const id = newId()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      state.pending.delete(id)
      reject(new Error(`háº¿t thá»i gian chá» ${op}`))
    }, timeoutMs)
    state.pending.set(id, { resolve, reject, timer })
    if (!send({ t: 'req', id, op, args })) {
      clearTimeout(timer)
      state.pending.delete(id)
      reject(new Error('chÆ°a káº¿t ná»‘i'))
    }
  })
}

function respond(id, value) {
  send({ t: 'res', id, ok: true, value })
}

function respondError(id, code, message) {
  send({ t: 'res', id, ok: false, error: { code, message } })
}

function rejectAll(message) {
  for (const entry of state.pending.values()) {
    clearTimeout(entry.timer)
    entry.reject(new Error(message))
  }
  state.pending.clear()
}

// ------------------------------------------------------------------ frames --

function handleFrame(frame) {
  switch (frame.t) {
    case 'hello.ok':
      state.ready = true
      state.attempt = 0
      setStatus('online', 'ÄÃ£ káº¿t ná»‘i')
      void loadSessions()
      if (state.currentSessionId !== undefined) openFollow(state.currentSessionId)
      return

    case 'res': {
      const entry = state.pending.get(frame.id)
      if (entry === undefined) return
      state.pending.delete(frame.id)
      clearTimeout(entry.timer)
      if (frame.ok === true) entry.resolve(frame.value)
      else entry.reject(new Error(frame.error?.message ?? frame.error?.code ?? 'lá»—i relay'))
      return
    }

    case 'req':
      handleIncoming(frame)
      return

    case 'item':
      handleItem(frame)
      return

    case 'end':
      if (frame.id === state.followId) {
        const sessionId = state.currentSessionId
        state.followId = undefined
        setTyping(false)
        // The device may be reconnecting behind the relay; reopen the follow so
        // its opening snapshot restores a consistent window.
        if (frame.reason === 'error' && state.ready && sessionId !== undefined) {
          setTimeout(() => {
            if (state.ready && state.currentSessionId === sessionId && state.followId === undefined) {
              openFollow(sessionId)
            }
          }, 2000)
        }
      }
      return

    case 'error':
      toast(frame.message ?? frame.code)
      return

    default:
      return
  }
}

function handleIncoming(frame) {
  if (frame.op === 'relay.ping') {
    respond(frame.id, { time: Date.now() })
    return
  }
  if (frame.op === 'approval.ask') {
    state.approvals.push(frame)
    renderNotices()
    return
  }
  if (frame.op === 'question.ask') {
    state.questions.push(frame)
    renderNotices()
    return
  }
  respondError(frame.id, 'unsupported', `${frame.op} chÆ°a Ä‘Æ°á»£c WebChat há»— trá»£`)
}

// ---------------------------------------------------------------- sessions --

async function loadSessions() {
  if (!state.ready) return
  try {
    const value = await request('session.list', {})
    state.sessions = Array.isArray(value?.items) ? value.items : []
    renderSessions()
  } catch (error) {
    toast(error.message)
    if (state.ready) setTimeout(() => void loadSessions(), 2500)
  }
}

function sessionTitle(session) {
  const title = session?.projections?.values?.title
  if (typeof title === 'string' && title.length > 0) return title
  const id = session?.sessionId ?? ''
  return `PhiÃªn ${id.slice(0, 8)}`
}

function renderSessions() {
  els.sessions.replaceChildren()
  if (state.sessions.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = 'ChÆ°a cÃ³ phiÃªn. Báº¥m ï¼‹ Ä‘á»ƒ táº¡o.'
    els.sessions.append(empty)
    return
  }
  for (const session of state.sessions) {
    const button = document.createElement('button')
    button.className = `session${session.sessionId === state.currentSessionId ? ' active' : ''}`
    button.addEventListener('click', () => {
      document.body.classList.remove('sidebar-open')
      openFollow(session.sessionId)
    })

    const name = document.createElement('div')
    name.className = 'name'
    name.textContent = sessionTitle(session)
    const meta = document.createElement('div')
    meta.className = 'meta'
    const dot = document.createElement('span')
    dot.className = `dot${session.running ? '' : ' idle'}`
    meta.append(dot)
    const time = document.createElement('span')
    time.textContent = session.updatedAt ? new Date(session.updatedAt).toLocaleString('vi-VN') : ''
    meta.append(time)
    if (session.cwd) {
      const cwd = document.createElement('span')
      cwd.textContent = session.cwd
      cwd.style.overflow = 'hidden'
      cwd.style.textOverflow = 'ellipsis'
      cwd.style.whiteSpace = 'nowrap'
      meta.append(cwd)
    }
    button.append(name, meta)
    els.sessions.append(button)
  }
}

async function createSession() {
  if (!state.ready) return
  try {
    const value = await request('session.create', {})
    await loadSessions()
    if (typeof value?.sessionId === 'string') openFollow(value.sessionId)
  } catch (error) {
    toast(error.message)
  }
}

function openFollow(sessionId) {
  if (state.followId !== undefined) {
    send({ t: 'cancel', id: state.followId })
  }
  state.currentSessionId = sessionId
  state.followId = undefined
  els.messages.replaceChildren()
  clearNotices()
  setTyping(false)
  renderSessions()

  const session = state.sessions.find((item) => item.sessionId === sessionId)
  els.title.textContent = session === undefined ? 'PhiÃªn' : sessionTitle(session)

  const id = newId()
  state.followId = id
  send({ t: 'open', id, op: 'session.follow', args: { sessionId, assistantStream: false } })
  els.prompt.focus()
}

// ------------------------------------------------------------------- items --

function handleItem(frame) {
  if (frame.id !== state.followId) return
  const item = frame.item
  if (item === null || typeof item !== 'object') return

  if (item.type === 'snapshot') {
    els.messages.replaceChildren()
    setTyping(false)
    for (const record of item.records ?? []) {
      if (record?.type === 'event') processEvent(record.event)
    }
    applyTitleFromProjections(item.projections)
    scrollToBottom(true)
    return
  }
  if (item.type === 'event') {
    processEvent(item.event)
    scrollToBottom(false)
    return
  }
  // assistant-stream frames are intentionally ignored by this MVP; the
  // committed assistant/message event carries the final text.
}

function applyTitleFromProjections(projections) {
  const title = projections?.values?.title
  if (typeof title === 'string' && title.length > 0) els.title.textContent = title
}

function processEvent(event) {
  if (event === null || typeof event !== 'object') return
  const data = event.data ?? {}
  switch (event.type) {
    case 'user/message': {
      if (data.source?.kind !== 'user') return
      const text = textOf(data.content)
      if (text.length > 0) appendMessage('user', text)
      return
    }
    case 'assistant/message': {
      const text = textOf(data.message?.content)
      if (text.length > 0) appendMessage('assistant', text)
      return
    }
    case 'tool/call': {
      appendTool(`ðŸ”§ ${data.name ?? 'tool'}`)
      return
    }
    case 'turn/start':
      setTyping(true)
      return
    case 'turn/end':
      setTyping(false)
      return
    case 'session/title': {
      if (typeof data.title === 'string') els.title.textContent = data.title
      return
    }
    case 'agent/error':
    case 'session/error': {
      const message = data.message ?? data.error ?? 'lá»—i khÃ´ng rÃµ'
      appendTool(`âš  ${typeof message === 'string' ? message : JSON.stringify(message)}`)
      return
    }
    default:
      return
  }
}

function textOf(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
}

function appendMessage(role, text) {
  const node = document.createElement('div')
  node.className = `msg ${role}`
  node.textContent = text
  insertBeforeTyping(node)
}

function appendTool(text) {
  const node = document.createElement('div')
  node.className = 'msg tool'
  node.textContent = text
  insertBeforeTyping(node)
}

function insertBeforeTyping(node) {
  if (state.typingEl !== undefined && state.typingEl.parentNode === els.messages) {
    els.messages.insertBefore(node, state.typingEl)
  } else {
    els.messages.append(node)
  }
}

function setTyping(value) {
  state.typing = value
  els.stop.hidden = !value
  if (value && state.typingEl === undefined) {
    const node = document.createElement('div')
    node.className = 'typing'
    node.textContent = 'DSH Ä‘ang xá»­ lÃ½'
    els.messages.append(node)
    state.typingEl = node
    scrollToBottom(false)
  }
  if (!value && state.typingEl !== undefined) {
    state.typingEl.remove()
    state.typingEl = undefined
  }
}

function scrollToBottom(force) {
  const distance = els.messages.scrollHeight - els.messages.scrollTop - els.messages.clientHeight
  if (force || distance < 160) els.messages.scrollTop = els.messages.scrollHeight
}

// ------------------------------------------------------------------ prompt --

async function sendPrompt() {
  const text = els.prompt.value.trim()
  if (text.length === 0 || !state.ready) return
  if (state.currentSessionId === undefined) {
    await createSession()
    if (state.currentSessionId === undefined) return
  }
  els.send.disabled = true
  try {
    await request('session.prompt', {
      sessionId: state.currentSessionId,
      text,
      requestId: newId(),
      mode: 'queue',
    })
    els.prompt.value = ''
    els.prompt.style.height = 'auto'
    setTyping(true)
  } catch (error) {
    toast(error.message)
  } finally {
    els.send.disabled = false
  }
}

async function cancelTurn() {
  if (!state.ready || state.currentSessionId === undefined) return
  try {
    await request('session.cancel', { sessionId: state.currentSessionId })
    setTyping(false)
  } catch (error) {
    toast(error.message)
  }
}

// ----------------------------------------------------------------- notices --

function clearNotices() {
  state.approvals = []
  state.questions = []
  renderNotices()
}

function renderNotices() {
  els.notices.replaceChildren()
  const approval = state.approvals[0]
  if (approval !== undefined) {
    els.notices.append(approvalCard(approval))
    return
  }
  const question = state.questions[0]
  if (question !== undefined) {
    els.notices.append(questionCard(question))
  }
}

function approvalCard(frame) {
  const args = frame.args ?? {}
  const card = document.createElement('div')
  card.className = 'notice'
  const title = document.createElement('h3')
  title.textContent = `Cáº§n duyá»‡t: ${args.toolName ?? 'cÃ´ng cá»¥'}`
  const detail = document.createElement('p')
  const reason = args.displayReason?.vi ?? args.displayReason?.en ?? args.reason ?? ''
  detail.textContent = reason.length > 0 ? reason : 'DSH Ä‘ang chá» báº¡n cho phÃ©p thao tÃ¡c nÃ y.'
  card.append(title, detail)
  if (typeof args.callId === 'string') {
    const code = document.createElement('p')
    const c = document.createElement('code')
    c.textContent = args.callId
    code.append(c)
    card.append(code)
  }

  const row = document.createElement('div')
  row.className = 'row'
  const allow = document.createElement('button')
  allow.className = 'primary'
  allow.textContent = 'Cho phÃ©p má»™t láº§n'
  allow.addEventListener('click', () => {
    state.approvals.shift()
    respond(frame.id, { outcome: 'allowed-once' })
    renderNotices()
  })
  const reject = document.createElement('button')
  reject.textContent = 'Tá»« chá»‘i'
  reject.addEventListener('click', () => {
    state.approvals.shift()
    respond(frame.id, { outcome: 'rejected' })
    renderNotices()
  })
  row.append(allow, reject)
  card.append(row)
  return card
}

function questionCard(frame) {
  const questions = Array.isArray(frame.args?.questions) ? frame.args.questions : []
  const selected = new Map(questions.map((question) => [question.id, new Set()]))
  const custom = new Map()
  const card = document.createElement('div')
  card.className = 'notice'
  const title = document.createElement('h3')
  title.textContent = 'DSH cáº§n báº¡n tráº£ lá»i'
  card.append(title)

  for (const question of questions) {
    const block = document.createElement('div')
    const label = document.createElement('p')
    label.textContent = question.question
    block.append(label)

    for (const option of question.options ?? []) {
      const button = document.createElement('button')
      button.textContent = option.label
      if (option.description) button.title = option.description
      button.addEventListener('click', () => {
        const set = selected.get(question.id)
        if (question.multiSelect === true) {
          if (set.has(option.label)) set.delete(option.label)
          else set.add(option.label)
        } else {
          set.clear()
          set.add(option.label)
        }
        for (const sibling of block.querySelectorAll('button')) {
          sibling.classList.toggle('selected', set.has(sibling.textContent))
        }
      })
      block.append(button)
    }

    if ((question.options ?? []).length === 0) {
      const input = document.createElement('input')
      input.type = 'text'
      input.placeholder = 'CÃ¢u tráº£ lá»i'
      input.addEventListener('input', () => custom.set(question.id, input.value))
      block.append(input)
    }
    card.append(block)
  }

  const row = document.createElement('div')
  row.className = 'row'
  const submit = document.createElement('button')
  submit.className = 'primary'
  submit.textContent = 'Gá»­i tráº£ lá»i'
  submit.addEventListener('click', () => {
    const answers = []
    for (const question of questions) {
      const set = selected.get(question.id)
      const text = custom.get(question.id)?.trim()
      if (set.size === 0 && (text === undefined || text.length === 0)) {
        toast('HÃ£y chá»n hoáº·c nháº­p cÃ¢u tráº£ lá»i')
        return
      }
      answers.push({
        id: question.id,
        selected: [...set],
        ...(text !== undefined && text.length > 0 ? { custom: text } : {}),
      })
    }
    state.questions.shift()
    respond(frame.id, { answers })
    renderNotices()
  })
  const dismiss = document.createElement('button')
  dismiss.textContent = 'Äá»ƒ sau'
  dismiss.addEventListener('click', () => {
    state.questions.shift()
    respondError(frame.id, 'approval/expired', 'ngÆ°á»i dÃ¹ng bá» qua cÃ¢u há»i')
    renderNotices()
  })
  row.append(submit, dismiss)
  card.append(row)
  return card
}

// -------------------------------------------------------------------- misc --

function setStatus(kind, text) {
  els.status.dataset.state = kind
  els.status.textContent = text
}

let toastTimer
function toast(text) {
  setStatus('error', text)
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    if (state.ready) setStatus('online', 'ÄÃ£ káº¿t ná»‘i')
  }, 4000)
}

window.addEventListener('pagehide', () => {
  state.stopping = true
  clearTimeout(state.reconnectTimer)
  try {
    state.ws?.close()
  } catch {
    // Ignore.
  }
})

window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return
  state.stopping = false
  if (state.ws === undefined) connect()
})
