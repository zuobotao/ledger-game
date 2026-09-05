import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server as HTTPServer } from 'node:http'
import { connect, type Socket } from 'node:net'
import { randomBytes, createHash } from 'node:crypto'
import { attachWebSocketServer, type WSConnection } from '../../server/transport/websocket'
import { parseClientMessage } from '../../server/protocol/validate'
import { ErrorCodes } from '@/network/protocol'

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

let server: HTTPServer
let port = 0
const conns: WSConnection[] = []
let nextConnIdx = 0

function computeAccept(key: string): string {
  return createHash('sha1').update(key + WS_GUID).digest('base64')
}

beforeAll(async () => {
  server = createServer((_req, res) => res.writeHead(200).end('ok'))
  attachWebSocketServer(server, (conn) => conns.push(conn))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const addr = server.address()
  port = typeof addr === 'object' && addr ? addr.port : 0
})

afterAll(async () => {
  for (const c of conns) c.terminate()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

function openPendingClient(): { sock: Socket; key: string } {
  const sock = connect(port, '127.0.0.1')
  const key = randomBytes(16).toString('base64')
  sock.on('connect', () => {
    sock.write(
      `GET /ws HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
    )
  })
  return { sock, key }
}

function readHandshakeResponse(sock: Socket): Promise<Buffer> {
  return new Promise((resolve) => {
    let buf = Buffer.alloc(0)
    const ondata = (c: Buffer) => {
      buf = Buffer.concat([buf, c])
      const idx = buf.indexOf(Buffer.from('\r\n\r\n'))
      if (idx >= 0) {
        sock.off('data', ondata)
        resolve(buf.subarray(0, idx + 4))
      }
    }
    sock.on('data', ondata)
  })
}

function awaitNextConnection(): Promise<WSConnection> {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (conns.length > nextConnIdx) {
        clearInterval(timer)
        resolve(conns[nextConnIdx++]!)
      }
    }, 5)
  })
}

function sendMaskedText(sock: Socket, text: string): void {
  const payload = Buffer.from(text, 'utf8')
  const len = payload.length
  const header = len < 126 ? Buffer.alloc(2) : Buffer.alloc(4)
  header[0] = 0x81
  if (len < 126) {
    header[1] = 0x80 | len
  } else {
    header[1] = 0x80 | 126
    header.writeUInt16BE(len, 2)
  }
  const key = Buffer.from([9, 8, 7, 6])
  const masked = Buffer.alloc(len)
  for (let i = 0; i < len; i++) masked[i] = payload[i]! ^ key[i % 4]!
  sock.write(Buffer.concat([header, key, masked]))
}

/** 等待服务端发送的包含指定子串的文本帧 */
function nextServerText(sock: Socket, needle: string): Promise<string> {
  return new Promise((resolve) => {
    let buf = Buffer.alloc(0)
    const ondata = (c: Buffer) => {
      buf = Buffer.concat([buf, c])
      const text = buf.toString('utf8')
      if (text.includes(needle)) {
        sock.off('data', ondata)
        resolve(text)
      }
    }
    sock.on('data', ondata)
  })
}

describe('WebSocket 服务器握手', () => {
  it('合法握手返回 101 与正确 accept', async () => {
    const { sock, key } = openPendingClient()
    const resp = await readHandshakeResponse(sock)
    expect(resp.toString('utf8')).toMatch(/101 Switching Protocols/)
    expect(resp.toString('utf8')).toContain(`Sec-WebSocket-Accept: ${computeAccept(key)}`)
    const conn = await awaitNextConnection()
    expect(conn).toBeTruthy()
    sock.destroy()
    conn.close()
  })

  it('非 /ws 路径升级被拒', async () => {
    await new Promise<void>((resolve) => {
      const sock = connect(port, '127.0.0.1', () => {
        sock.write(
          'GET /other HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n',
        )
      })
      sock.on('data', (d) => {
        expect(d.toString('utf8')).toMatch(/404/)
        sock.destroy()
        resolve()
      })
    })
  })
})

describe('WebSocket 消息收发', () => {
  it('客户端掩码文本被服务端收到', async () => {
    const { sock } = openPendingClient()
    await readHandshakeResponse(sock)
    const conn = await awaitNextConnection()
    const received = new Promise<string>((resolve) => conn.on('message', (d: string) => resolve(d)))
    sendMaskedText(sock, '{"type":"ping"}')
    await expect(received).resolves.toBe('{"type":"ping"}')
    sock.destroy()
  })

  it('服务端文本可被客户端解析', async () => {
    const { sock } = openPendingClient()
    await readHandshakeResponse(sock)
    const conn = await awaitNextConnection()
    const frame = nextServerText(sock, 'hello-ws')
    conn.send('hello-ws')
    await expect(frame).resolves.toContain('hello-ws')
    sock.destroy()
  })

  it('分片文本可被拼接', async () => {
    const { sock } = openPendingClient()
    await readHandshakeResponse(sock)
    const conn = await awaitNextConnection()
    const received = new Promise<string>((resolve) => conn.on('message', (d: string) => resolve(d)))
    // 先发一个非 FIN 文本帧，再发 continuation
    const part1 = Buffer.from('{"type":"frag','utf8')
    const part2 = Buffer.from('hook"}','utf8')
    const mk = (buf: Buffer, fin: boolean, opcode: number) => {
      const header = Buffer.alloc(2)
      header[0] = (fin ? 0x80 : 0x00) | opcode
      header[1] = 0x80 | buf.length
      const key = Buffer.from([1, 2, 3, 4])
      const m = Buffer.alloc(buf.length)
      for (let i = 0; i < buf.length; i++) m[i] = buf[i]! ^ key[i % 4]!
      return Buffer.concat([header, key, m])
    }
    sock.write(Buffer.concat([mk(part1, false, 0x1), mk(part2, true, 0x0)]))
    await expect(received).resolves.toBe('{"type":"fraghook"}')
    sock.destroy()
  })
})

describe('协议运行时校验', () => {
  it('合法 game_action 信封通过', () => {
    const r = parseClientMessage({ type: 'game_action', requestId: 'req-1', action: { type: 'roll_dice', playerId: 'p1' } })
    expect(r.ok).toBe(true)
  })
  it('未知动作类型拒绝', () => {
    expect(parseClientMessage({ type: 'game_action', requestId: 'r', action: { type: 'hack' } }).ok).toBe(false)
  })
  it('未知消息类型拒绝', () => {
    const r = parseClientMessage({ type: 'garbage' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe(ErrorCodes.INVALID_MESSAGE)
  })
  it('join_room 校验 nickname', () => {
    expect(parseClientMessage({ type: 'join_room', roomCode: 'ABC123', sessionId: 's', nickname: '' }).ok).toBe(false)
    expect(parseClientMessage({ type: 'join_room', roomCode: 'ABC123', sessionId: 's', nickname: 'a'.repeat(21) }).ok).toBe(false)
    expect(parseClientMessage({ type: 'join_room', roomCode: 'ABC123', sessionId: 's', nickname: '小明' }).ok).toBe(true)
  })
  it('ready 必须为布尔', () => {
    expect(parseClientMessage({ type: 'ready', ready: 'yes' }).ok).toBe(false)
    expect(parseClientMessage({ type: 'ready', ready: true }).ok).toBe(true)
  })
})