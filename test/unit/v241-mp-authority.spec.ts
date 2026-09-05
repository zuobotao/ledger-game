import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server as HTTPServer } from 'node:http'
import { connect, type Socket } from 'node:net'
import { randomBytes } from 'node:crypto'
import { RoomServer } from '../../server/RoomServer'
import { ErrorCodes } from '@/network/protocol'

let server: HTTPServer
let roomServer: RoomServer
let port = 0
const socks: Socket[] = []

beforeAll(async () => {
  server = createServer()
  roomServer = new RoomServer(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const addr = server.address()
  port = typeof addr === 'object' && addr ? addr.port : 0
})

afterAll(async () => {
  for (const s of socks) s.destroy()
  await new Promise<void>((resolve) => {
    server.close(() => resolve())
    setTimeout(() => resolve(), 500)
  })
})

// ==================== 测试客户端工具（与 v24-reconnect.spec 一致） ====================

function createJsonDecoder() {
  let buf = Buffer.alloc(0)
  const queue: Record<string, unknown>[] = []
  const waiters: ((m: Record<string, unknown>) => void)[] = []
  let fragment = Buffer.alloc(0)
  const drain = () => {
    while (queue.length && waiters.length) waiters.shift()!(queue.shift()!)
  }
  const push = (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk])
    for (;;) {
      if (buf.length < 2) break
      const b0 = buf[0]!
      const fin = (b0 & 0x80) !== 0
      let len = buf[1]! & 0x7f
      let off = 2
      if (len === 126) {
        if (buf.length < 4) break
        len = buf.readUInt16BE(2)
        off = 4
      } else if (len === 127) {
        if (buf.length < 10) break
        len = buf.readUInt32BE(6)
        off = 10
      }
      if (buf.length < off + len) break
      const payload = buf.subarray(off, off + len)
      buf = buf.subarray(off + len)
      if (opcode(b0) === 0x0) fragment = Buffer.concat([fragment, payload])
      else if (opcode(b0) === 0x1 || opcode(b0) === 0x2) fragment = payload
      if (fin) {
        queue.push(JSON.parse(fragment.toString('utf8')))
        fragment = Buffer.alloc(0)
      }
    }
    drain()
  }
  return {
    push,
    next(): Promise<Record<string, unknown>> {
      if (queue.length) return Promise.resolve(queue.shift()!)
      return new Promise((resolve) => waiters.push(resolve))
    },
  }
}

function opcode(b0: number): number {
  return b0 & 0x0f
}

async function createClient(): Promise<{ sock: Socket; decoder: ReturnType<typeof createJsonDecoder> }> {
  const sock = connect(port, '127.0.0.1')
  const decoder = createJsonDecoder()
  socks.push(sock)
  let upgraded = false
  sock.on('data', (c) => {
    if (!upgraded && c.toString('utf8').includes('101 Switching Protocols')) {
      upgraded = true
      return
    }
    if (upgraded) decoder.push(c)
  })
  sock.on('connect', () => {
    sock.write(
      `GET /ws HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
    )
  })
  await new Promise<void>((resolve, reject) => {
    sock.on('error', reject)
    const t = setInterval(() => {
      if (upgraded) {
        clearInterval(t)
        resolve()
      }
    }, 2)
  })
  return { sock, decoder }
}

function sendText(sock: Socket, obj: unknown): void {
  const text = JSON.stringify(obj)
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

async function waitFor(c: { decoder: ReturnType<typeof createJsonDecoder> }, type: string): Promise<Record<string, unknown>> {
  for (;;) {
    const m = await c.decoder.next()
    if (m.type === type) return m
  }
}

async function waitUntil(
  c: { decoder: ReturnType<typeof createJsonDecoder> },
  type: string,
  predicate: (m: Record<string, unknown>) => boolean,
  guard = 20,
): Promise<boolean> {
  for (let i = 0; i < guard; i++) {
    const m = await c.decoder.next()
    if (m.type === type && predicate(m)) return true
  }
  return false
}

async function createRoomDirect(nickname = '小明'): Promise<{ roomId: string; code: string; sessionId: string; token: string; playerId: string }> {
  const sessionId = 's-host-' + Math.random().toString(36).slice(2, 8)
  const room = roomServer.createRoom({ host: { sessionId, nickname } })
  const rec = roomServer.sessionRegistry.getBySessionId(sessionId)!
  return { roomId: room.id, code: room.code, sessionId, token: rec.token, playerId: room.hostPlayerId }
}

/** 组建双人房间并开局，返回 host/guest 连接、房内玩家 id 与游戏玩家 id 映射 */
async function startTwoPlayerGame(): Promise<{
  host: { sock: Socket; decoder: ReturnType<typeof createJsonDecoder> }
  guest: { sock: Socket; decoder: ReturnType<typeof createJsonDecoder> }
  roomId: string
  hostRoomId: string
  guestRoomId: string
  hostGameId: string
  guestGameId: string
}> {
  const host = await createRoomDirect('小明')
  const hostC = await createClient()
  sendText(hostC.sock, { type: 'reconnect', sessionId: host.sessionId, roomId: host.roomId, token: host.token })
  await waitFor(hostC, 'reconnect_snapshot')

  const bSession = 's-b-' + Math.random().toString(36).slice(2, 8)
  const guestC = await createClient()
  sendText(guestC.sock, { type: 'join_room', roomCode: host.code, sessionId: bSession, nickname: '小红' })
  const boot = await waitFor(guestC, 'session_bootstrap')
  const guestRoomId = boot.playerId as string

  sendText(hostC.sock, { type: 'set_player_setup', careerId: 'programmer', dreamId: 'beach-house', colorId: 'blue' })
  sendText(hostC.sock, { type: 'ready', ready: true })
  await waitUntil(hostC, 'room_snapshot', () => true)
  sendText(guestC.sock, { type: 'set_player_setup', careerId: 'doctor', dreamId: 'charity-foundation', colorId: 'red' })
  sendText(guestC.sock, { type: 'ready', ready: true })
  await waitUntil(guestC, 'room_snapshot', (m) => {
    const players = (m.room as { players: { status: string; careerId?: string }[] }).players ?? []
    return players.length >= 2 && players.every((p) => p.status === 'ready' && !!p.careerId)
  })
  sendText(hostC.sock, { type: 'start_game' })

  const started = await waitFor(guestC, 'game_started')
  const playerMap = started.playerMap as Record<string, string>
  const hostGameId = playerMap[host.playerId]!
  const guestGameId = playerMap[guestRoomId]!
  return {
    host: hostC,
    guest: guestC,
    roomId: host.roomId,
    hostRoomId: host.playerId,
    guestRoomId,
    hostGameId,
    guestGameId,
  }
}

// ==================== Phase 6 权限测试 ====================

describe('Phase 6 — 多人动作权威与防盗用', () => {
  it('当前玩家合法动作通过', async () => {
    const g = await startTwoPlayerGame()
    // 房主为第一位玩家，是当前回合。
    sendText(g.host.sock, { type: 'game_action', requestId: 'auth-ok-1', action: { type: 'roll_dice', playerId: g.hostGameId } })
    const ok = await waitUntil(g.host, 'action_result', (m) => (m as { success?: boolean }).success === true)
    expect(ok).toBe(true)
  })

  it('非当前玩家冒充当前玩家提交动作 → 被服务端拒绝（身份绑定，以座位为准）', async () => {
    const g = await startTwoPlayerGame()
    const curPlayerId = g.hostGameId // 当前回合 = 房主
    // 客人在没有轮到自己时，故意把 playerId 伪装成当前玩家（房主）。
    sendText(g.guest.sock, {
      type: 'game_action',
      requestId: 'auth-forge-1',
      action: { type: 'roll_dice', playerId: curPlayerId },
    })
    const result = await waitFor(g.guest, 'action_result')
    expect(result.success).toBe(false)
    expect((result as { error?: string }).error ?? '').toContain(ErrorCodes.NOT_YOUR_TURN)
  })

  it('被盗用/被拒动作不会推进回合或改变状态（无双结算）', async () => {
    const g = await startTwoPlayerGame()
    const session = () => roomServer.getSession(g.roomId)!
    const before = session().snapshot()
    const turnNumberBefore = before.session.turnNumber
    const currentBefore = before.turn.currentPlayerId

    // 客人伪造动作被拒
    sendText(g.guest.sock, {
      type: 'game_action',
      requestId: 'auth-noop-1',
      action: { type: 'roll_dice', playerId: g.hostGameId },
    })
    await waitFor(g.guest, 'action_result')

    // 回合与当前玩家均未变化：被拒动作没有副作用，杜绝双结算
    const after = session().snapshot()
    expect(after.session.turnNumber).toBe(turnNumberBefore)
    expect(after.turn.currentPlayerId).toBe(currentBefore)
    expect(after.turn.currentPlayerId).toBe(g.hostGameId)
  })

  it('未加入房间的连接提交动作 → 拒绝', async () => {
    const c = await createClient()
    // 无 withContext 上下文的连接，提交动作应被拒绝（SESSION_EXPIRED 或 error）
    sendText(c.sock, {
      type: 'game_action',
      requestId: 'auth-nobind-1',
      action: { type: 'roll_dice', playerId: 'whatever' },
    })
    await waitFor(c, 'error')
  })
})