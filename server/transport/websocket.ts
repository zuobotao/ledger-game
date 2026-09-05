/**
 * 极简 WebSocket 服务器（无外部依赖）
 *
 * 基于 Node 内置 `http` + `crypto` 实现：
 * - RFC6455 握手（Sec-WebSocket-Accept）
 * - 文本/二进制帧解析（含掩码、分片、长度扩展）
 * - 控制帧：ping/pong/close
 *
 * 仅用于第一版多人房间，不追求完整 RFC 覆盖（不发扩展、不分片控制帧）。
 */

import type { Server as HTTPServer } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const OP_CONTINUATION = 0x0
const OP_TEXT = 0x1
const OP_BINARY = 0x2
const OP_CLOSE = 0x8
const OP_PING = 0x9
const OP_PONG = 0xa
const MAX_CONTROL_PAYLOAD = 125
const DEFAULT_MAX_MESSAGE = 64 * 1024 // 64KB

export interface WSConnection {
  readonly readyState: number
  send(data: string | Buffer): void
  close(code?: number, reason?: string): void
  terminate(): void
  on(event: 'message', listener: (data: string) => void): this
  on(event: 'close', listener: () => void): this
  /** 附加连接元数据（sessionId 等） */
  [key: string]: unknown
}

import { EventEmitter } from 'node:events'

export type WebSocketServerEvents = {
  connection: (conn: WSConnection) => void
}

const OPEN = 1
const CLOSING = 2
const CLOSED = 3

function computeAccept(key: string): string {
  const hash = createHash('sha1').update(key + WS_GUID).digest()
  return hash.toString('base64')
}

interface WSConnOptions {
  socket: NodeJS.Socket
  req: import('node:http').IncomingMessage
  maxMessageSize?: number
  onClose?: (conn: WSConnection) => void
}

class WSConnectionImpl extends EventEmitter implements WSConnection {
  readyState = OPEN
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3

  private socket: NodeJS.Socket
  private buffer: Buffer = Buffer.alloc(0)
  private fragments: Buffer[] = []
  private fragmentOpcode = 0
  private closeSent = false
  private maxMessageSize: number

  constructor(private opts: WSConnOptions) {
    super()
    this.socket = opts.socket
    this.maxMessageSize = opts.maxMessageSize ?? DEFAULT_MAX_MESSAGE
    this.socket.on('data', (chunk) => this.onData(chunk))
    this.socket.on('close', () => {
      this.readyState = 3
      this.opts.onClose?.(this)
      this.emit('close')
    })
    this.socket.on('end', () => {
      // 对端关闭（FIN）→ 收尾写方向以触发 'close'，避免半关闭悬挂
      this.socket.end()
    })
    this.socket.on('error', () => this.socket.destroy())
  }

  send(data: string | Buffer): void {
    if (this.socket.destroyed) return
    const payload = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
    this.socket.write(this.encodeFrame(payload, OP_TEXT))
  }

  close(code = 1000, reason = ''): void {
    if (this.closeSent) return
    this.closeSent = true
    // 控制帧长度 <= 125；code(2字节)+reason
    let payload: Buffer
    if (reason) {
      const r = Buffer.from(reason, 'utf8')
      payload = Buffer.alloc(2 + Math.min(r.length, MAX_CONTROL_PAYLOAD - 2))
      payload.writeUInt16BE(code, 0)
      r.copy(payload, 2, 0, Math.min(r.length, MAX_CONTROL_PAYLOAD - 2))
    } else {
      payload = Buffer.alloc(2)
      payload.writeUInt16BE(code, 0)
    }
    try {
      this.socket.write(this.encodeFrame(payload, OP_CLOSE))
    } catch {
      /* noop */
    }
    this.readyState = 2
  }

  terminate(): void {
    this.socket.destroy()
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    for (;;) {
      const consumed = this.tryDecodeFrame()
      if (consumed <= 0) break
      this.buffer = this.buffer.subarray(consumed)
      if (this.buffer.length === 0) break
    }
  }

  /** 尝试从 buffer 解码一帧；返回消费字节数，不足返回 0 */
  private tryDecodeFrame(): number {
    if (this.buffer.length < 2) return 0
    const b0 = this.buffer[0]!
    const b1 = this.buffer[1]!
    const fin = (b0 & 0x80) !== 0
    const opcode = b0 & 0x0f
    const masked = (b1 & 0x80) !== 0
    let len = b1 & 0x7f
    let offset = 2

    if (len === 126) {
      if (this.buffer.length < 4) return 0
      len = this.buffer.readUInt16BE(2)
      offset = 4
    } else if (len === 127) {
      if (this.buffer.length < 10) return 0
      const hi = this.buffer.readUInt32BE(2)
      const lo = this.buffer.readUInt32BE(6)
      len = hi * 0x100000000 + lo
      offset = 10
    }

    let maskKey: Buffer | undefined
    if (masked) {
      if (this.buffer.length < offset + 4) return 0
      maskKey = this.buffer.subarray(offset, offset + 4)
      offset += 4
    }

    if (this.buffer.length < offset + len) return 0

    // 控制帧必须 FIN=1 且长度 <=125
    if (opcode >= 0x8 && (!fin || len > MAX_CONTROL_PAYLOAD)) {
      this.close(1002, 'protocol error')
      return 0
    }

    if (opcode === OP_PING) {
      const payload = this.unmask(maskKey, this.buffer.subarray(offset, offset + len))
      this.socket.write(this.encodeFrame(payload, OP_PONG))
      return offset + len
    }
    if (opcode === OP_PONG) {
      return offset + len
    }
    if (opcode === OP_CLOSE) {
      this.close(1000)
      return offset + len
    }

    const isText = opcode === OP_TEXT
    const isBinary = opcode === OP_BINARY
    const isContinuation = opcode === OP_CONTINUATION

    if (isText || isBinary) {
      if (!fin) {
        this.fragments = []
        this.fragmentOpcode = opcode
      }
      const payload = this.unmask(maskKey, this.buffer.subarray(offset, offset + len))
      this.fragments.push(payload)
      this.checkFragmentsSize()
      if (fin) {
        const full = Buffer.concat(this.fragments)
        this.fragments = []
        this.dispatchMessage(full)
      }
      return offset + len
    }
    if (isContinuation) {
      this.fragments.push(this.unmask(maskKey, this.buffer.subarray(offset, offset + len)))
      this.checkFragmentsSize()
      if (fin) {
        const full = Buffer.concat(this.fragments)
        this.fragments = []
        this.dispatchMessage(full)
      }
      return offset + len
    }

    // 未知 opcode
    this.close(1002, 'unknown opcode')
    return 0
  }

  private checkFragmentsSize(): void {
    const total = this.fragments.reduce((s, b) => s + b.length, 0)
    if (total > this.maxMessageSize) {
      this.close(1009, 'message too big')
    }
  }

  private unmask(mask: Buffer | undefined, data: Buffer): Buffer {
    if (!mask) return Buffer.from(data)
    const out = Buffer.alloc(data.length)
    for (let i = 0; i < data.length; i++) {
      out[i] = data[i]! ^ mask[i % 4]!
    }
    return out
  }

  private dispatchMessage(payload: Buffer): void {
    const text = payload.toString('utf8')
    this.emit('message', text)
  }

  private encodeFrame(payload: Buffer, opcode: number, masked = false): Buffer {
    let header: Buffer
    const len = payload.length
    if (len < 126) {
      header = Buffer.alloc(2)
      header[0] = 0x80 | opcode
      header[1] = (masked ? 0x80 : 0x00) | len
    } else if (len < 65536) {
      header = Buffer.alloc(4)
      header[0] = 0x80 | opcode
      header[1] = (masked ? 0x80 : 0x00) | 126
      header.writeUInt16BE(len, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x80 | opcode
      header[1] = (masked ? 0x80 : 0x00) | 127
      header.writeUInt32BE(Math.floor(len / 0x100000000), 2)
      header.writeUInt32BE(len & 0xffffffff, 6)
    }
    if (masked) {
      const key = randomBytes(4)
      const maskedPayload = Buffer.alloc(len)
      for (let i = 0; i < len; i++) maskedPayload[i] = payload[i]! ^ key[i % 4]!
      return Buffer.concat([header, key, maskedPayload])
    }
    return Buffer.concat([header, payload])
  }
}

/** 在 HTTP server 上挂载 WebSocket "/ws" 端点 */
export function attachWebSocketServer(
  server: HTTPServer,
  onConnection: (conn: WSConnection) => void,
  options: { path?: string; maxMessageSize?: number } = {},
): void {
  const path = options.path ?? '/ws'
  server.on('upgrade', (req, socket, head) => {
    const url = (req.url ?? '').split('?')[0]!
    if (url !== path) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
      socket.destroy()
      return
    }
    const key = req.headers['sec-websocket-key']
    if (typeof key !== 'string') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
      socket.destroy()
      return
    }
    const accept = computeAccept(key)
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    )
    socket.removeAllListeners('data')
    const conn = new WSConnectionImpl({ socket, req, maxMessageSize: options.maxMessageSize })
    onConnection(conn)
  })
}

export function createServerFrameForTest(payload: string): Buffer {
  const body = Buffer.from(payload, 'utf8')
  const len = body.length
  let header: Buffer
  if (len < 126) {
    header = Buffer.alloc(2)
    header[1] = 0x80 | len
  } else if (len < 65536) {
    header = Buffer.alloc(4)
    header[1] = 0x80 | 126
    header.writeUInt16BE(len, 2)
  } else {
    header = Buffer.alloc(10)
    header[1] = 0x80 | 127
    header.writeUInt32BE(0, 2)
    header.writeUInt32BE(len, 6)
  }
  const key = Buffer.from([1, 2, 3, 4])
  const bodyMasked = Buffer.alloc(len)
  for (let i = 0; i < len; i++) bodyMasked[i] = body[i]! ^ key[i % 4]!
  return Buffer.concat([header, key, bodyMasked])
}

export type { WSConnection }