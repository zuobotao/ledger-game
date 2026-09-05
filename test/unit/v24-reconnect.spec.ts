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
    setTimeout(() => resolve(), 500) // 防止残留连接卡住 hook
  })
})

// ==================== 测试客户端工具 ====================

/** 客户端侧 WebSocket 文本帧解码器（服务端 → 客户端，无掩码） */
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
      const opcode = b0 & 0x0f
      const fin = (b0 & 0x80) !== 0
      let len = buf[1]! & 0x7f
      let off = 2
      if (len === 126) {
        if (buf.length < 4) break
        len = buf.readUInt16BE(2)
        off = 4
      } else if (len === 127) {
        if (buf.length < 10) break
        len = buf.readUInt32BE(6) // 假定长度 < 4G
        off = 10
      }
      if (buf.length < off + len) break

      const payload = buf.subarray(off, off + len)
      buf = buf.subarray(off + len)

      if (opcode === 0x0) fragment = Buffer.concat([fragment, payload])
      else if (opcode === 0x1 || opcode === 0x2) fragment = payload
      else continue // 控制帧（ping/pong/close）忽略
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
    // 一旦进入已升级状态即视为握手完成
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

// ==================== 测试 ====================

describe('Phase 5 — 断线重连', () => {
  it('缺失/错误令牌 → SESSION_EXPIRED，不恢复座位', async () => {
    const { roomId, sessionId } = await createRoomDirect()
    const c = await createClient()
    // 先验证传输层与路由可用：ping 应回 pong
    sendText(c.sock, { type: 'ping', t: 1 })
    const pong = await waitFor(c, 'pong')
    expect(pong.t).toBe(1)
    // 再验证错误令牌被拒
    sendText(c.sock, { type: 'reconnect', sessionId, roomId, token: 'bad-token' })
    const err = await waitFor(c, 'error')
    expect(err.code).toBe(ErrorCodes.SESSION_EXPIRED)
  })

  it('正确令牌重连成功，返回 reconnect_snapshot 且座位与房内玩家一致', async () => {
    const { roomId, sessionId, token } = await createRoomDirect('小明')
    const c = await createClient()
    sendText(c.sock, { type: 'reconnect', sessionId, roomId, token })
    const snap = await waitFor(c, 'reconnect_snapshot')
    expect(snap.ok).toBe(true)
    expect((snap.room as { id: string }).id).toBe(roomId)
    const players = (snap.room as { players: { nickname: string }[] }).players
    expect(players[0]!.nickname).toBe('小明')
  })

  it('加入房间的玩家获得令牌，刷新后凭令牌恢复原座位', async () => {
    const host = await createRoomDirect('小明')
    const hostC = await createClient()
    sendText(hostC.sock, { type: 'reconnect', sessionId: host.sessionId, roomId: host.roomId, token: host.token })
    await waitFor(hostC, 'reconnect_snapshot')

    const bSession = 's-b-' + Math.random().toString(36).slice(2, 8)
    const bc = await createClient()
    sendText(bc.sock, { type: 'join_room', roomCode: host.code, sessionId: bSession, nickname: '小红' })
    const boot = await waitFor(bc, 'session_bootstrap')
    const bPlayerId = boot.playerId as string
    expect(boot.sessionId).toBe(bSession)
    expect(typeof boot.token).toBe('string')

    // B 刷新：新连接 + 令牌重连，回到同一玩家座位
    const b2 = await createClient()
    sendText(b2.sock, { type: 'reconnect', sessionId: bSession, roomId: host.roomId, token: boot.token as string })
    const snap = await waitFor(b2, 'reconnect_snapshot')
    expect(snap.ok).toBe(true)
    const b2Room = snap.room as { players: { playerId: string; sessionId: string; status: string }[] }
    const players = b2Room.players
    const me = players.find((p) => p.playerId === bPlayerId)
    expect(me).toBeTruthy()
    expect(me!.sessionId).toBe(bSession)
  })

  it('轮到断线的当前玩家 → 房间暂停，重连后自动恢复', async () => {
    const host = await createRoomDirect('小明')
    const hostC = await createClient()
    sendText(hostC.sock, { type: 'reconnect', sessionId: host.sessionId, roomId: host.roomId, token: host.token })
    await waitFor(hostC, 'reconnect_snapshot')

    const bSession = 's-b-' + Math.random().toString(36).slice(2, 8)
    const bc = await createClient()
    sendText(bc.sock, { type: 'join_room', roomCode: host.code, sessionId: bSession, nickname: '小红' })
    await waitFor(bc, 'session_bootstrap')

    // 双人设置职业/梦想并准备（等待广播生效后再开始，避免跨 socket 竞态）
    sendText(hostC.sock, { type: 'set_player_setup', careerId: 'programmer', dreamId: 'beach-house', colorId: 'blue' })
    sendText(hostC.sock, { type: 'ready', ready: true })
    await waitUntil(hostC, 'room_snapshot', () => true)
    sendText(bc.sock, { type: 'set_player_setup', careerId: 'doctor', dreamId: 'charity-foundation', colorId: 'red' })
    sendText(bc.sock, { type: 'ready', ready: true })
    // 等待广播中所有玩家都已选职业且 ready（start() 的前置条件，消除跨 socket 竞态）
    await waitUntil(bc, 'room_snapshot', (m) => {
      const players = (m.room as { players: { nickname: string; status: string; careerId?: string }[] }).players ?? []
      return (
        players.length >= 2 &&
        players.every((p) => p.status === 'ready' && !!p.careerId)
      )
    })
    sendText(hostC.sock, { type: 'start_game' })

    // B 进入游戏（首个 game_started）
    const started = await waitFor(bc, 'game_started')
    expect((started.state as { players: unknown[] }).players.length).toBe(2)

    // 房主 A（第一位玩家）当前回合。模拟 A 断线 → 房间 paused
    hostC.sock.end()
    const paused = await waitUntil(bc, 'room_snapshot', (m) => (m.room as { status: string }).status === 'paused')
    expect(paused).toBe(true)

    // A 用令牌重连 → 房间恢复 playing，并收到快照
    const hostR = await createClient()
    sendText(hostR.sock, { type: 'reconnect', sessionId: host.sessionId, roomId: host.roomId, token: host.token })
    const snap = await waitFor(hostR, 'reconnect_snapshot')
    expect(snap.ok).toBe(true)
    const resumed = await waitUntil(bc, 'room_snapshot', (m) => (m.room as { status: string }).status === 'playing')
    expect(resumed).toBe(true)
  })
})

describe('Phase 9 — 游戏结束后 Action 被拒', () => {
  it('游戏中合法 Action 通过；会话结束后继续提交 Action 被拒', async () => {
    const host = await createRoomDirect('小明')
    const hostC = await createClient()
    sendText(hostC.sock, { type: 'reconnect', sessionId: host.sessionId, roomId: host.roomId, token: host.token })
    await waitFor(hostC, 'reconnect_snapshot')

    const bSession = 's-b-end-' + Math.random().toString(36).slice(2, 8)
    const bc = await createClient()
    sendText(bc.sock, { type: 'join_room', roomCode: host.code, sessionId: bSession, nickname: '小红' })
    await waitFor(bc, 'session_bootstrap')

    // 双人准备后开局
    sendText(hostC.sock, { type: 'set_player_setup', careerId: 'programmer', dreamId: 'beach-house', colorId: 'blue' })
    sendText(hostC.sock, { type: 'ready', ready: true })
    await waitUntil(hostC, 'room_snapshot', () => true)
    sendText(bc.sock, { type: 'set_player_setup', careerId: 'doctor', dreamId: 'charity-foundation', colorId: 'red' })
    sendText(bc.sock, { type: 'ready', ready: true })
    await waitUntil(bc, 'room_snapshot', (m) => {
      const players = (m.room as { players: { status: string; careerId?: string }[] }).players ?? []
      return players.length >= 2 && players.every((p) => p.status === 'ready' && !!p.careerId)
    })
    sendText(hostC.sock, { type: 'start_game' })
    const started = await waitFor(hostC, 'game_started')
    expect(Array.isArray((started.state as { players: unknown[] }).players)).toBe(true)

    // 游戏中：当前玩家（房主）掷骰 → action_result 成功
    const curPlayerId = (started.turn as { currentPlayerId: string }).currentPlayerId
    const action = { type: 'roll_dice', playerId: curPlayerId }
    sendText(hostC.sock, { type: 'game_action', requestId: 'phase9-req-1', action })
    const ok = await waitUntil(hostC, 'action_result', (m) => (m as { success?: boolean }).success === true)
    expect(ok).toBe(true)

    // 服务端权威终结对局（模拟胜者产生）→ 房间 finished
    const room = roomServer.roomManager.get(host.roomId)!
    const sid = room.gameSessionId
    expect(sid).toBeTruthy()
    roomServer.roomManager.finishGame(sid!)

    // 结束后继续提交 action → 被拒 INVALID_ACTION
    sendText(hostC.sock, { type: 'game_action', requestId: 'phase9-req-2', action })
    const err = await waitFor(hostC, 'error')
    expect(err.code).toBe(ErrorCodes.INVALID_ACTION)
  })
})