import { describe, it, expect, vi } from 'vitest'
import { createSeededRandom } from '@/engine/randomSource'
import { RoomError, normalizeNickname, normalizeRoomName } from '../../server/room/Room'
import { RoomManager } from '../../server/room/RoomManager'
import { MemoryRoomRepository } from '../../server/room/MemoryRoomRepository'
import { assertCanTransition, canTransition, evaluateExpiry } from '../../server/room/RoomLifecycle'
import { ErrorCodes, generateRoomCode } from '@/network/protocol'

function makeFactory(seed = 42, now = 1_000_000) {
  const random = createSeededRandom(seed)
  let counter = 0
  return {
    random,
    now: () => now,
    factory: {
      generateId: () => `room_fake_${++counter}_${random.nextInt(0, 1 << 20)}`,
      nextInt: (min: number, max: number) => random.nextInt(min, max),
      now: () => now,
    },
  }
}

function makeManager(seed = 42, now = 1_000_000) {
  const { factory } = makeFactory(seed, now)
  const repo = new MemoryRoomRepository()
  const onStateChanged = vi.fn()
  const manager = new RoomManager({
    factory,
    repo,
    onStateChanged,
    createSession: (r) => ({ sessionId: `ses_${r.id}`, seed: r.config.seed }),
    confirmSessionStarted: () => {},
  })
  return { manager, repo, onStateChanged, factory }
}

describe('生成昵称 / 房间名', () => {
  it('规范化昵称', () => {
    expect(normalizeNickname('  小明  ')).toBe('小明')
    expect(normalizeNickname('')).toBe('玩家')
    expect(normalizeNickname('abcdefghijklmnopqrstuvwxyz123456789')).toHaveLength(20)
  })
  it('默认房间名', () => {
    expect(normalizeRoomName('')).toBe('周末家庭局')
    expect(normalizeRoomName('  家庭局  ')).toBe('家庭局')
  })
})

describe('房间码', () => {
  it('长度为 6 且仅含安全字符', () => {
    const { factory } = makeFactory(1)
    const code = generateRoomCode(factory)
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[A-Z2-9]+$/)
  })
  it('确定性种子产生相同码', () => {
    const a = generateRoomCode(makeFactory(7).factory)
    const b = generateRoomCode(makeFactory(7).factory)
    expect(a).toBe(b)
  })
})

describe('Room 生命周期状态机', () => {
  it('合法流转', () => {
    expect(canTransition('waiting', 'starting')).toBe(true)
    expect(canTransition('starting', 'playing')).toBe(true)
    expect(canTransition('playing', 'finished')).toBe(true)
    expect(canTransition('playing', 'paused')).toBe(true)
    expect(canTransition('paused', 'playing')).toBe(true)
    expect(canTransition('finished', 'closed')).toBe(true)
  })
  it('非法流转抛错', () => {
    expect(() => assertCanTransition('waiting', 'playing')).toThrow()
    expect(() => assertCanTransition('closed', 'waiting')).toThrow()
  })
  it('WAITING 无玩家超时关闭', () => {
    expect(
      evaluateExpiry({ status: 'waiting', connectedCount: 0, now: 1_000_000 + 31 * 60 * 1000, lastPlayerJoinAt: 1_000_000 }),
    ).toEqual({ action: 'close' })
  })
  it('PLAYING 全员离线 5min 暂停', () => {
    expect(evaluateExpiry({ status: 'playing', connectedCount: 0, now: 1_000_000 + 5 * 60 * 1000 + 1, lastActivityAt: 1_000_000 })).toEqual({ action: 'pause' })
  })
})

describe('RoomManager.create / join / leave', () => {
  it('创建房间后房主为 ready 且 role=host', () => {
    const { manager } = makeManager()
    const room = manager.create({ name: '周末家庭局', host: { sessionId: 's1', nickname: '小明' } })
    expect(room.status).toBe('waiting')
    expect(room.players).toHaveLength(1)
    expect(room.players[0]!.role).toBe('host')
    expect(room.players[0]!.status).toBe('ready')
    expect(manager.getByCode(room.code)?.id).toBe(room.id)
  })

  it('加入玩家分配座位与 role=player', () => {
    const { manager } = makeManager()
    const room = manager.create({ host: { sessionId: 's1', nickname: '小明' } })
    const p = manager.join(room.id, 's2', '小红')
    expect(p.seatIndex).toBe(1)
    expect(p.role).toBe('player')
    expect(room.players).toHaveLength(2)
  })

  it('房间已满时拒绝加入', () => {
    const { manager } = makeManager()
    const room = manager.create({ host: { sessionId: 's1', nickname: 'A' }, maxPlayers: 2 })
    manager.join(room.id, 's2', 'B')
    expect(() => manager.join(room.id, 's3', 'C')).toThrowError(RoomError)
  })

  it('同一 session 重复加入视为重连，复用玩家', () => {
    const { manager } = makeManager()
    const room = manager.create({ host: { sessionId: 's1', nickname: '小明' } })
    const p2 = manager.join(room.id, 's2', '小红')
    const again = manager.join(room.id, 's2', '小红')
    expect(again.playerId).toBe(p2.playerId)
    expect(room.players).toHaveLength(2)
  })

  it('房主离开自动转移房主', () => {
    const { manager } = makeManager()
    const room = manager.create({ host: { sessionId: 's1', nickname: 'A' } })
    const b = manager.join(room.id, 's2', 'B')
    manager.leave(room.hostPlayerId)
    expect(room.hostPlayerId).toBe(b.playerId)
    expect(b.role).toBe('host')
  })

  it('离席后座位重排', () => {
    const { manager } = makeManager()
    const room = manager.create({ host: { sessionId: 's1', nickname: 'A' } })
    manager.join(room.id, 's2', 'B')
    const c = manager.join(room.id, 's3', 'C')
    manager.leave(c.playerId)
    expect(room.players.map((p) => p.seatIndex)).toEqual([0, 1])
  })
})

describe('Ready / Setup / Start', () => {
  it('未准备玩家不能开始', () => {
    const { manager } = makeManager()
    const room = manager.create({ host: { sessionId: 's1', nickname: 'A' } })
    manager.join(room.id, 's2', 'B')
    manager.setPlayerSetup(room.hostPlayerId, { careerId: 'doctor' })
    manager.setPlayerSetup(room.players[1]!.playerId, { careerId: 'engineer' })
    expect(() => manager.start(room.hostPlayerId)).toThrowError(RoomError)
  })

  it('选择的职业校验：未选职业不能开始', () => {
    const { manager } = makeManager()
    const room = manager.create({ host: { sessionId: 's1', nickname: 'A' } })
    manager.join(room.id, 's2', 'B')
    manager.setReady(room.hostPlayerId, true)
    manager.setReady(room.players[1]!.playerId, true)
    expect(() => manager.start(room.hostPlayerId)).toThrowError(RoomError)
  })

  it('房主 + 全员就绪 + 已选职业 → 创建会话并 playing', () => {
    const { manager } = makeManager()
    const room = manager.create({ host: { sessionId: 's1', nickname: 'A' } })
    manager.join(room.id, 's2', 'B')
    room.players.forEach((p) => manager.setPlayerSetup(p.playerId, { careerId: 'doctor', dreamId: 'house' }))
    room.players.forEach((p) => manager.setReady(p.playerId, true))
    const { session } = manager.start(room.hostPlayerId)
    expect(session.sessionId).toBeTruthy()
    expect(room.status).toBe('starting')
    manager.confirmPlaying(session.sessionId)
    expect(room.status).toBe('playing')
    expect(room.players.every((p) => p.status === 'playing')).toBe(true)
  })

  it('少于 2 人不能开始', () => {
    const { manager } = makeManager()
    const room = manager.create({ host: { sessionId: 's1', nickname: 'A' } })
    expect(() => manager.start(room.hostPlayerId)).toThrowError(RoomError)
  })

  it('仅房主可开始', () => {
    const { manager } = makeManager()
    const room = manager.create({ host: { sessionId: 's1', nickname: 'A' } })
    const b = manager.join(room.id, 's2', 'B')
    expect(() => manager.start(b.playerId)).toThrowError(RoomError)
  })
})

describe('Error codes', () => {
  it('映射稳定', async () => {
    const { manager } = makeManager()
    manager.create({ host: { sessionId: 's1', nickname: 'A' } })
    let err = null as unknown
    try {
      manager.join('missing-room', 's2', 'B')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(RoomError)
    expect((err as RoomError).code).toBe(ErrorCodes.ROOM_NOT_FOUND)
  })
})

describe('Expiry', () => {
  it('applyExpiry 关闭无人 waiting 房间', () => {
    const { manager } = makeManager(1, 1_000_000)
    const room = manager.create({ host: { sessionId: 's1', nickname: 'A' } })
    // 清空玩家使其为无人 waiting
    room.players.length = 0
    room.lastActivityAt = 1_000_000
    const res = manager.applyExpiry(1_000_000 + 31 * 60 * 1000)
    expect(res.closed).toContain(room.id)
  })

  it('applyExpiry 全员离线时暂停 playing 房间', () => {
    const now = 1_000_000
    const { manager } = makeManager(2, now)
    const room = manager.create({ host: { sessionId: 's1', nickname: 'A' } })
    manager.join(room.id, 's2', 'B')
    // 模拟已进入 playing
    room.status = 'playing'
    room.players.forEach((p) => {
      p.status = 'disconnected'
      p.lastSeenAt = now
    })
    room.lastActivityAt = now
    const res = manager.applyExpiry(now + 5 * 60 * 1000 + 1)
    expect(res.paused).toContain(room.id)
    expect(room.status).toBe('paused')
  })
})