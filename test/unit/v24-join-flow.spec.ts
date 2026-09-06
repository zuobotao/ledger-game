/**
 * Phase 7 — joinRoom 可 await 端到端测试（计划 §12）
 *
 * 用 FakeWebSocket 替换全局 WebSocket，驱动 RoomClient → store 的完整加入链路：
 *   joinRoom() → socket open → join_room 发出 → session_bootstrap → room_snapshot → 找到自己 → joined
 * 覆盖成功 / 服务端拒绝 / socket 错误 / 超时 四类结果。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMultiplayerStore } from '@/stores/multiplayer'
import { ErrorCodes, type RoomDto, type RoomPlayer, type ServerMessage } from '@/network/protocol'

// ==================== FakeWebSocket ====================

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.CONNECTING
  onopen: ((ev: unknown) => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onclose: ((ev: unknown) => void) | null = null
  onerror: ((ev: unknown) => void) | null = null
  sent: string[] = []
  url: string

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(code?: number, reason?: string): void {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({ code: code ?? 1000, reason: reason ?? '' })
  }
}

const NativeWebSocket = globalThis.WebSocket

function openSocket(ws: FakeWebSocket): void {
  ws.readyState = FakeWebSocket.OPEN
  ws.onopen?.({})
}

function push(ws: FakeWebSocket, msg: ServerMessage): void {
  ws.onmessage?.({ data: JSON.stringify(msg) })
}

function sentOfType(ws: FakeWebSocket, type: string): Record<string, unknown>[] {
  return ws.sent.map((s) => JSON.parse(s) as Record<string, unknown>).filter((m) => m.type === type)
}

// ==================== 消息构造 ====================

function makeRoomDto(selfPlayerId: string): RoomDto {
  const me: RoomPlayer = {
    playerId: selfPlayerId,
    sessionId: 'sess-1',
    nickname: '小红',
    role: 'player',
    status: 'ready',
    seatIndex: 0,
    joinedAt: 0,
    lastSeenAt: 0,
  }
  const host: RoomPlayer = {
    playerId: 'host-1',
    sessionId: 'sess-host',
    nickname: '小明',
    role: 'host',
    status: 'ready',
    seatIndex: 1,
    joinedAt: 0,
    lastSeenAt: 0,
  }
  return {
    id: 'room-1',
    code: 'ABC123',
    name: '测试房',
    status: 'waiting',
    hostPlayerId: 'host-1',
    config: {
      maxPlayers: 4,
      allowSpectators: false,
      turnTimeoutSeconds: null,
      gameVersion: '2.4.3',
      protocolVersion: '2.4.0',
      seed: 1,
    },
    players: [me, host],
    createdAt: 0,
    updatedAt: 0,
  }
}

const bootstrap: ServerMessage = {
  type: 'session_bootstrap',
  sessionId: 'sess-1',
  playerId: 'p-1',
  roomId: 'room-1',
  token: 'tok-1',
}

// ==================== 用例 ====================

describe('joinRoom — 可 await 的加入流程（计划 §12）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    FakeWebSocket.instances = []
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.WebSocket = NativeWebSocket
  })

  it('成功：socket open + bootstrap + 快照找到自己 后才 resolve(ok:true)', async () => {
    const store = useMultiplayerStore()
    const promise = store.joinRoom({ roomCode: 'abc123', nickname: '小红' })
    expect(store.joinStatus).toBe('connecting')

    const ws = FakeWebSocket.instances[0]!
    openSocket(ws)
    expect(store.joinStatus).toBe('joining')

    // join_room 已发出，房间码大写、携带 sessionId
    const joinMsgs = sentOfType(ws, 'join_room')
    expect(joinMsgs).toHaveLength(1)
    expect(joinMsgs[0]!.roomCode).toBe('ABC123')
    expect(joinMsgs[0]!.sessionId).toBeTruthy()
    expect(joinMsgs[0]!.nickname).toBe('小红')

    push(ws, bootstrap)
    expect(store.joinStatus).toBe('bootstrapping')
    expect(store.session?.playerId).toBe('p-1')

    // 快照未找到自己 → 不完成
    push(ws, { type: 'room_snapshot', room: makeRoomDto('someone-else') })
    expect(store.joinStatus).toBe('bootstrapping')

    // 快照找到自己 → joined
    push(ws, { type: 'room_snapshot', room: makeRoomDto('p-1') })
    expect(store.joinStatus).toBe('joined')

    const res = await promise
    expect(res.ok).toBe(true)
    expect(res.room?.id).toBe('room-1')
    expect(res.room?.code).toBe('ABC123')
  })

  it('快照先于 bootstrap 到达：身份确认后补做自我检查完成加入', async () => {
    const store = useMultiplayerStore()
    const promise = store.joinRoom({ roomCode: 'ABC123', nickname: '小红' })
    const ws = FakeWebSocket.instances[0]!
    openSocket(ws)

    // 异常顺序：快照先到（此时 playerId 未定，找不到自己 → 不推进）
    push(ws, { type: 'room_snapshot', room: makeRoomDto('p-1') })
    expect(store.joinStatus).toBe('joining')

    // bootstrap 到位 → 补做自我确认 → joined
    push(ws, bootstrap)
    expect(store.joinStatus).toBe('joined')

    const res = await promise
    expect(res.ok).toBe(true)
  })

  it('服务端拒绝（房间不存在）→ resolve(ok:false) 且携带错误码', async () => {
    const store = useMultiplayerStore()
    const promise = store.joinRoom({ roomCode: 'XXXXXX', nickname: '小红' })
    const ws = FakeWebSocket.instances[0]!
    openSocket(ws)

    push(ws, { type: 'error', code: ErrorCodes.ROOM_NOT_FOUND, message: '房间不存在' })
    const res = await promise
    expect(res.ok).toBe(false)
    expect(res.code).toBe(ErrorCodes.ROOM_NOT_FOUND)
    expect(res.error).toBe('房间不存在')
    expect(store.joinStatus).toBe('failed')
    expect(store.lastError).toBe('房间不存在')
  })

  it('房间已满 → resolve(ok:false)', async () => {
    const store = useMultiplayerStore()
    const promise = store.joinRoom({ roomCode: 'ABC123', nickname: '小红' })
    const ws = FakeWebSocket.instances[0]!
    openSocket(ws)

    push(ws, { type: 'error', code: ErrorCodes.ROOM_FULL, message: '房间已满' })
    const res = await promise
    expect(res.ok).toBe(false)
    expect(res.code).toBe(ErrorCodes.ROOM_FULL)
    expect(store.joinStatus).toBe('failed')
  })

  it('socket 错误 → resolve(ok:false)', async () => {
    const store = useMultiplayerStore()
    const promise = store.joinRoom({ roomCode: 'ABC123', nickname: '小红' })
    const ws = FakeWebSocket.instances[0]!
    openSocket(ws)
    expect(store.joinStatus).toBe('joining')

    ws.onerror?.({})
    const res = await promise
    expect(res.ok).toBe(false)
    expect(store.joinStatus).toBe('failed')
    expect(store.lastError).toBe('连接断开，加入失败')
  })

  it('超时（10s 无回包）→ resolve(ok:false)', async () => {
    vi.useFakeTimers()
    const store = useMultiplayerStore()
    const promise = store.joinRoom({ roomCode: 'ABC123', nickname: '小红' })
    openSocket(FakeWebSocket.instances[0]!)
    expect(store.joinStatus).toBe('joining')

    vi.advanceTimersByTime(10_001)
    const res = await promise
    expect(res.ok).toBe(false)
    expect(store.joinStatus).toBe('failed')
    expect(store.lastError).toContain('超时')
  })

  it('加入成功后 joinStatus 保持 joined，room 可用', async () => {
    const store = useMultiplayerStore()
    const promise = store.joinRoom({ roomCode: 'ABC123', nickname: '小红' })
    const ws = FakeWebSocket.instances[0]!
    openSocket(ws)
    push(ws, bootstrap)
    push(ws, { type: 'room_snapshot', room: makeRoomDto('p-1') })
    await promise
    expect(store.joinStatus).toBe('joined')
    expect(store.room?.players.some((p) => p.playerId === 'p-1')).toBe(true)
    expect(store.status).toBe('open')
  })
})
