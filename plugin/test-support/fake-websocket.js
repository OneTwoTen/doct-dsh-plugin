/** Deterministic WebSocket stand-in for transport tests. */

export class FakeWebSocket {
  static instances = []

  static reset() {
    FakeWebSocket.instances = []
  }

  static get last() {
    return FakeWebSocket.instances.at(-1)
  }

  constructor(url, protocols) {
    this.url = url
    this.protocols = Array.isArray(protocols) ? [...protocols] : protocols === undefined ? [] : [protocols]
    this.readyState = 0
    this.sent = []
    this.listeners = new Map()
    FakeWebSocket.instances.push(this)
    queueMicrotask(() => {
      if (this.readyState !== 0) return
      this.readyState = 1
      this.emit('open', {})
    })
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) ?? []
    list.push(listener)
    this.listeners.set(type, list)
  }

  removeEventListener(type, listener) {
    const list = this.listeners.get(type)
    if (list === undefined) return
    this.listeners.set(type, list.filter((item) => item !== listener))
  }

  emit(type, event) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event)
  }

  send(text) {
    if (this.readyState !== 1) throw new Error('FakeWebSocket: send on a non-open socket')
    this.sent.push(JSON.parse(text))
  }

  close(code = 1000) {
    if (this.readyState >= 2) return
    this.readyState = 3
    queueMicrotask(() => this.emit('close', { code }))
  }

  /** Deliver a frame as if it came from the relay. */
  serverSend(frame) {
    this.emit('message', { data: JSON.stringify(frame) })
  }

  /** Simulate the relay dropping the connection without a close handshake. */
  serverDrop(code = 1006) {
    this.readyState = 3
    this.emit('close', { code })
  }

  get lastSent() {
    return this.sent.at(-1)
  }
}

/** Poll until `predicate()` is truthy or the deadline passes. */
export async function waitFor(predicate, { timeoutMs = 500, intervalMs = 2 } = {}) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await predicate()
    if (value) return value
    if (Date.now() > deadline) throw new Error('waitFor: condition did not become true')
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

export function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
