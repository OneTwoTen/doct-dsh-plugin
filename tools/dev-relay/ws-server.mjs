/**
 * Minimal RFC 6455 WebSocket server for the development relay.
 *
 * It implements exactly what the relay needs: upgrade, masked client frames,
 * fragmentation, text messages, ping/pong, close, and a byte budget. It is not
 * a general-purpose server: no extensions, no binary messages, no TLS.
 */
import { createHash } from 'node:crypto'
import { EventEmitter } from 'node:events'

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const OPCODE = { continuation: 0x0, text: 0x1, binary: 0x2, close: 0x8, ping: 0x9, pong: 0xa }

export class WsConnection extends EventEmitter {
  constructor(socket, head, { maxFrameBytes = 262144 } = {}) {
    super()
    this.socket = socket
    this.maxFrameBytes = maxFrameBytes
    this.buffer = head && head.length > 0 ? Buffer.from(head) : Buffer.alloc(0)
    this.fragments = []
    this.fragmentBytes = 0
    this.closed = false

    socket.on('data', (chunk) => this.#receive(chunk))
    socket.on('close', () => this.#finish())
    socket.on('error', () => this.#finish())
    if (this.buffer.length > 0) queueMicrotask(() => this.#drain())
  }

  get remoteAddress() {
    return this.socket.remoteAddress
  }

  /** Bytes queued on the kernel/socket buffer; used for backpressure. */
  get bufferedBytes() {
    return this.socket.writableLength ?? 0
  }

  sendText(text) {
    if (this.closed) return false
    try {
      this.#writeFrame(OPCODE.text, Buffer.from(text, 'utf8'))
      return true
    } catch {
      this.terminate()
      return false
    }
  }

  ping(payload = Buffer.alloc(0)) {
    if (this.closed) return
    this.#writeFrame(OPCODE.ping, payload)
  }

  close(code = 1000, reason = '') {
    if (this.closed) return
    this.closed = true
    const body = Buffer.alloc(2 + Buffer.byteLength(reason))
    body.writeUInt16BE(code, 0)
    body.write(reason, 2)
    try {
      this.#writeFrame(OPCODE.close, body)
    } catch {
      // Ignore a socket that is already gone.
    }
    this.socket.end()
    this.emit('close', { code, reason })
  }

  terminate() {
    if (this.closed) return
    this.closed = true
    this.socket.destroy()
    this.emit('close', { code: 1006, reason: 'terminated' })
  }

  #finish() {
    if (this.closed) return
    this.closed = true
    this.emit('close', { code: 1006, reason: 'socket closed' })
  }

  #receive(chunk) {
    if (this.closed) return
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk])
    this.#drain()
  }

  #drain() {
    while (!this.closed) {
      const frame = this.#parse()
      if (frame === undefined) return
      this.#handle(frame)
    }
  }

  #parse() {
    const buffer = this.buffer
    if (buffer.length < 2) return undefined

    const first = buffer[0]
    const second = buffer[1]
    const fin = (first & 0x80) !== 0
    const opcode = first & 0x0f
    const masked = (second & 0x80) !== 0
    let length = second & 0x7f
    let offset = 2

    if (length === 126) {
      if (buffer.length < 4) return undefined
      length = buffer.readUInt16BE(2)
      offset = 4
    } else if (length === 127) {
      if (buffer.length < 10) return undefined
      const big = buffer.readBigUInt64BE(2)
      if (big > BigInt(this.maxFrameBytes)) {
        this.close(1009, 'frame too large')
        return undefined
      }
      length = Number(big)
      offset = 10
    }

    if (!masked) {
      this.close(1002, 'client frames must be masked')
      return undefined
    }
    if (length > this.maxFrameBytes) {
      this.close(1009, 'frame too large')
      return undefined
    }
    if (buffer.length < offset + 4 + length) return undefined

    const mask = buffer.subarray(offset, offset + 4)
    offset += 4
    const payload = Buffer.from(buffer.subarray(offset, offset + length))
    for (let index = 0; index < payload.length; index += 1) {
      payload[index] ^= mask[index % 4]
    }
    this.buffer = buffer.subarray(offset + length)

    return { fin, opcode, payload }
  }

  #handle({ fin, opcode, payload }) {
    switch (opcode) {
      case OPCODE.text:
      case OPCODE.continuation: {
        if (opcode === OPCODE.continuation && this.fragments.length === 0) {
          this.close(1002, 'unexpected continuation')
          return
        }
        this.fragments.push(payload)
        this.fragmentBytes += payload.length
        if (this.fragmentBytes > this.maxFrameBytes) {
          this.close(1009, 'message too large')
          return
        }
        if (!fin) return
        const message = Buffer.concat(this.fragments)
        this.fragments = []
        this.fragmentBytes = 0
        try {
          this.emit('message', message.toString('utf8'))
        } catch {
          this.close(1011, 'message handler failed')
        }
        return
      }
      case OPCODE.binary:
        this.close(1003, 'binary messages are not supported')
        return
      case OPCODE.ping:
        this.#writeFrame(OPCODE.pong, payload)
        return
      case OPCODE.pong:
        this.emit('pong')
        return
      case OPCODE.close: {
        const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1000
        this.close(code, 'peer closed')
        return
      }
      default:
        this.close(1002, 'unknown opcode')
    }
  }

  #writeFrame(opcode, payload) {
    if (this.socket.destroyed) throw new Error('socket destroyed')
    const length = payload.length
    let header
    if (length < 126) {
      header = Buffer.alloc(2)
      header[1] = length
    } else if (length < 65536) {
      header = Buffer.alloc(4)
      header[1] = 126
      header.writeUInt16BE(length, 2)
    } else {
      header = Buffer.alloc(10)
      header[1] = 127
      header.writeBigUInt64BE(BigInt(length), 2)
    }
    header[0] = 0x80 | opcode
    this.socket.write(Buffer.concat([header, payload]))
  }
}

/**
 * Attach a WebSocket endpoint to an HTTP server.
 *
 * `verifyClient(request, url, protocols)` synchronously returns either
 * `{ ok: false, status, message }` or `{ ok: true, protocol, context, onConnection }`.
 * The first protocol offered by the client is echoed; per RFC 6455 the server
 * must not answer with a protocol the client did not offer.
 */
export function attachWebSocketServer(httpServer, { path = '/ws', maxFrameBytes = 262144, verifyClient } = {}) {
  const clients = new Set()

  httpServer.on('upgrade', (request, socket, head) => {
    socket.on('error', () => socket.destroy())
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    if (url.pathname !== path) {
      reject(socket, 404, 'not found')
      return
    }
    if ((request.headers.upgrade ?? '').toLowerCase() !== 'websocket') {
      reject(socket, 400, 'upgrade required')
      return
    }
    const key = request.headers['sec-websocket-key']
    if (typeof key !== 'string' || key.length === 0) {
      reject(socket, 400, 'missing Sec-WebSocket-Key')
      return
    }

    const offered = String(request.headers['sec-websocket-protocol'] ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

    let verdict
    try {
      verdict = verifyClient(request, url, offered)
    } catch (error) {
      reject(socket, 500, error instanceof Error ? error.message : 'verify failed')
      return
    }
    if (!verdict?.ok) {
      reject(socket, verdict?.status ?? 401, verdict?.message ?? 'unauthorized')
      return
    }

    const accept = createHash('sha1').update(`${key}${GUID}`).digest('base64')
    const lines = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
    ]
    if (typeof verdict.protocol === 'string' && offered.includes(verdict.protocol)) {
      lines.push(`Sec-WebSocket-Protocol: ${verdict.protocol}`)
    }
    socket.write(`${lines.join('\r\n')}\r\n\r\n`)

    const connection = new WsConnection(socket, head, { maxFrameBytes })
    clients.add(connection)
    connection.on('close', () => clients.delete(connection))
    try {
      verdict.onConnection(connection, verdict.context)
    } catch (error) {
      connection.close(1011, error instanceof Error ? error.message : 'connection setup failed')
    }
  })

  return {
    clients,
    closeAll(code = 1001, reason = 'server shutting down') {
      for (const client of [...clients]) client.close(code, reason)
    },
  }
}

function reject(socket, status, message) {
  if (socket.destroyed) return
  const body = `${message}\n`
  const reason = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : status === 404 ? 'Not Found' : 'Bad Request'
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\n`
    + 'Connection: close\r\n'
    + 'Content-Type: text/plain; charset=utf-8\r\n'
    + `Content-Length: ${Buffer.byteLength(body)}\r\n`
    + '\r\n'
    + body,
  )
  socket.end()
}
