/** Deterministic WebSocket stand-in for transport tests. */

/** One listener the fake socket holds. */
type FakeListener = (event: unknown) => void

export class FakeWebSocket {
  static instances: FakeWebSocket[] = []

  static reset(): void {
    FakeWebSocket.instances = []
  }

  static get last(): FakeWebSocket | undefined {
    return FakeWebSocket.instances.at(-1)
  }

  url: string
  protocols: string[]
  readyState: number
  sent: unknown[]
  listeners: Map<string, FakeListener[]>

  constructor(url: string, protocols?: string | string[]) {
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

  addEventListener(type: string, listener: FakeListener): void {
    const list = this.listeners.get(type) ?? []
    list.push(listener)
    this.listeners.set(type, list)
  }

  removeEventListener(type: string, listener: FakeListener): void {
    const list = this.listeners.get(type)
    if (list === undefined) return
    this.listeners.set(type, list.filter((item) => item !== listener))
  }

  emit(type: string, event: unknown): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event)
  }

  send(text: string): void {
    if (this.readyState !== 1) throw new Error('FakeWebSocket: send on a non-open socket')
    this.sent.push(JSON.parse(text))
  }

  close(code = 1000): void {
    if (this.readyState >= 2) return
    this.readyState = 3
    queueMicrotask(() => this.emit('close', { code }))
  }

  /** Deliver a frame as if it came from the relay. */
  serverSend(frame: unknown): void {
    this.emit('message', { data: JSON.stringify(frame) })
  }

  /** Simulate the relay dropping the connection without a close handshake. */
  serverDrop(code = 1006): void {
    this.readyState = 3
    this.emit('close', { code })
  }

  get lastSent(): unknown {
    return this.sent.at(-1)
  }
}

/** Poll until `predicate()` is truthy or the deadline passes. */
export async function waitFor<T>(
  predicate: () => T | Promise<T>,
  { timeoutMs = 500, intervalMs = 2 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await predicate()
    if (value) return value
    if (Date.now() > deadline) throw new Error('waitFor: condition did not become true')
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

export function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
