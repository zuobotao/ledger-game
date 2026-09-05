/**
 * RoomManager — 房间编排核心
 *
 * 职责：create/join/leave/ready/setup/start/kick/host transfer/expiry。
 * 服务端权威：所有变更都通过 RoomManager 完成，完成后调用 onStateChanged 供传输层广播。
 *
 * 游戏开始不在此实现：start() 校验通过后，将房间置为 'starting'
 * 并调用 createSession(room) 交给上层（GameSession 协调器）创建权威会话，
 * 会话创建成功后再调用 confirmSessionStarted(sessionId) 将房间置为 'playing'。
 */

import {
  ErrorCodes,
  type ErrorCode,
  type RoomConfig,
  type RoomDto,
  type RoomPlayer,
  type RoomStatus,
} from '../../src/network/protocol'
import { generateRoomCode } from '../../src/network/protocol'
import {
  normalizeNickname,
  normalizeRoomName,
  Room,
  RoomError,
  PLAYER_GRACE_MS,
  type RoomFactory,
} from './Room'
import { assertCanTransition, evaluateExpiry } from './RoomLifecycle'
import type { RoomRepository } from './MemoryRoomRepository'

export interface PlayerSetupInput {
  careerId?: string
  dreamId?: string
  colorId?: string
}

export interface SessionCreation {
  sessionId: string
  seed: number
}

export interface RoomManagerDeps {
  factory: RoomFactory
  repo: RoomRepository
  /** 房间任意状态变更后回调（用于广播） */
  onStateChanged?: (room: Room) => void
  /** 开始游戏时创建权威会话；返回 sessionId 与 seed */
  createSession?: (room: Room) => SessionCreation
  /** 会话确认开始后调用 */
  confirmSessionStarted?: (sessionId: string) => void
  /** 优雅踢出提示（可选接入点） */
  onKicked?: (playerId: string) => void
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase()
}

export class RoomManager {
  private deps: RoomManagerDeps

  constructor(deps: RoomManagerDeps) {
    this.deps = deps
  }

  private get repo(): RoomRepository {
    return this.deps.repo
  }
  private get factory(): RoomFactory {
    return this.deps.factory
  }

  // ==================== Create ====================

  get nextSeat(): () => number {
    return () => this.factory.nextInt(0, 1 << 30)
  }

  create(input: {
    name?: string
    host: { sessionId: string; nickname: string }
    maxPlayers?: number
    allowSpectators?: boolean
    seed?: number
  }): Room {
    const hostPlayerId = this.factory.generateId()
    const room = new Room(
      this.factory.generateId(),
      generateRoomCode(this.factory),
      normalizeRoomName(input.name),
      hostPlayerId,
      {
        maxPlayers: clamp(input.maxPlayers, 6, 2),
        allowSpectators: input.allowSpectators ?? false,
        turnTimeoutSeconds: null,
        gameVersion: '2.4.0',
        protocolVersion: '2.4.0',
        seed: input.seed ?? this.factory.nextInt(1, 0x7fffffff),
      },
      this.factory.now(),
      [
        {
          playerId: hostPlayerId,
          sessionId: input.host.sessionId,
          nickname: normalizeNickname(input.host.nickname),
          role: 'host',
          status: 'ready',
          seatIndex: 0,
          joinedAt: this.factory.now(),
          lastSeenAt: this.factory.now(),
        },
      ],
    )
    this.repo.create(room)
    this.deps.onStateChanged?.(room)
    return room
  }

  getByCode(code: string): Room | undefined {
    return this.repo.getByCode(normalizeCode(code))
  }

  get(roomId: string): Room | undefined {
    return this.repo.get(roomId)
  }

  // ==================== Join ====================

  join(roomId: string, sessionId: string, nickname: string): RoomPlayer {
    const room = this.repo.get(roomId)
    if (!room) throw new RoomError(ErrorCodes.ROOM_NOT_FOUND, '房间不存在')
    if (room.status === 'closed') throw new RoomError(ErrorCodes.ROOM_CLOSED, '房间已关闭')
    if (room.status === 'starting' || room.status === 'playing' || room.status === 'paused') {
      throw new RoomError(ErrorCodes.ROOM_STARTED, '游戏已开始，无法加入')
    }

    // 同一 session 重复加入 → 视为重连，复用原玩家
    const existing = room.getPlayerBySession(sessionId)
    if (existing) {
      existing.lastSeenAt = this.factory.now()
      existing.status = 'connected'
      room.touch(this.factory.now())
      this.deps.onStateChanged?.(room)
      return existing
    }

    if (room.players.length >= room.config.maxPlayers) {
      throw new RoomError(ErrorCodes.ROOM_FULL, '房间已满')
    }

    const player: RoomPlayer = {
      playerId: this.factory.generateId(),
      sessionId,
      nickname: normalizeNickname(nickname),
      role: 'player',
      status: 'connected',
      seatIndex: room.players.length,
      joinedAt: this.factory.now(),
      lastSeenAt: this.factory.now(),
    }
    room.players.push(player)
    room.touch(this.factory.now())
    this.deps.onStateChanged?.(room)
    return player
  }

  // ==================== Ready / Setup ====================

  setReady(playerId: string, ready: boolean): void {
    const room = this.requireRoomOfPlayer(playerId)
    if (room.status === 'playing' || room.status === 'starting') {
      throw new RoomError(ErrorCodes.ROOM_STARTED, '游戏已开始，无法修改准备状态')
    }
    const player = room.getPlayerById(playerId)
    if (!player) throw new RoomError(ErrorCodes.PLAYER_NOT_FOUND, '玩家不存在')
    player.status = ready ? 'ready' : 'connected'
    room.touch(this.factory.now())
    this.deps.onStateChanged?.(room)
  }

  setPlayerSetup(playerId: string, setup: PlayerSetupInput): void {
    const room = this.requireRoomOfPlayer(playerId)
    if (room.status === 'playing' || room.status === 'starting') {
      throw new RoomError(ErrorCodes.ROOM_STARTED, '游戏已开始，无法修改配置')
    }
    const player = room.getPlayerById(playerId)
    if (!player) throw new RoomError(ErrorCodes.PLAYER_NOT_FOUND, '玩家不存在')
    if (setup.careerId != null) player.careerId = setup.careerId
    if (setup.dreamId != null) player.dreamId = setup.dreamId
    if (setup.colorId != null) player.colorId = setup.colorId
    room.touch(this.factory.now())
    this.deps.onStateChanged?.(room)
  }

  updateConfig(playerId: string, patch: Partial<RoomConfig>): void {
    const room = this.requireRoomOfPlayer(playerId)
    if (room.hostPlayerId !== playerId) throw new RoomError(ErrorCodes.NOT_HOST, '仅房主可以修改房间配置')
    if (room.status === 'playing' || room.status === 'starting') {
      throw new RoomError(ErrorCodes.ROOM_STARTED, '游戏已开始，无法修改配置')
    }
    if (patch.maxPlayers != null) {
      room.config.maxPlayers = clamp(patch.maxPlayers, 6, 2)
    }
    if (patch.allowSpectators != null) room.config.allowSpectators = patch.allowSpectators
    room.touch(this.factory.now())
    this.deps.onStateChanged?.(room)
  }

  // ==================== Leave / Kick / Host transfer ====================

  leave(playerId: string, now = this.factory.now()): Room {
    const room = this.requireRoomOfPlayer(playerId)
    const idx = room.players.findIndex((p) => p.playerId === playerId)
    if (idx < 0) throw new RoomError(ErrorCodes.PLAYER_NOT_FOUND, '玩家不存在')
    const [leaving] = room.players.splice(idx, 1)
    // 重排座位
    room.players.forEach((p, i) => (p.seatIndex = i))
    // 房主离开 → 转移房主
    if (room.hostPlayerId === playerId && room.players.length > 0) {
      room.hostPlayerId = room.players[0]!.playerId
      room.players[0]!.role = 'host'
    }
    // 无人 → 房间进入可回收状态
    if (room.players.length === 0) {
      room.touch(now)
      this.deps.onStateChanged?.(room)
      return room
    }
    room.touch(now)
    this.deps.onStateChanged?.(room)
    return room
  }

  kick(actorPlayerId: string, targetPlayerId: string): void {
    const room = this.requireRoomOfPlayer(actorPlayerId)
    const actor = room.getPlayerById(actorPlayerId)
    if (!actor || actor.role !== 'host') throw new RoomError(ErrorCodes.NOT_HOST, '仅房主可以踢出玩家')
    if (actorPlayerId === targetPlayerId) throw new RoomError(ErrorCodes.INVALID_ACTION, '不能踢出自己')
    const idx = room.players.findIndex((p) => p.playerId === targetPlayerId)
    if (idx < 0) throw new RoomError(ErrorCodes.PLAYER_NOT_FOUND, '目标玩家不存在')
    room.players.splice(idx, 1)
    room.players.forEach((p, i) => (p.seatIndex = i))
    room.touch(this.factory.now())
    this.deps.onKicked?.(targetPlayerId)
    this.deps.onStateChanged?.(room)
  }

  transferHost(fromPlayerId: string, toPlayerId?: string): void {
    const room = this.requireRoomOfPlayer(fromPlayerId)
    if (room.hostPlayerId !== fromPlayerId) throw new RoomError(ErrorCodes.NOT_HOST, '仅房主可以转移房主权限')
    const target = toPlayerId
      ? room.getPlayerById(toPlayerId)
      : room.players.find((p) => p.playerId !== fromPlayerId && p.status !== 'disconnected')
    if (!target) throw new RoomError(ErrorCodes.PLAYER_NOT_FOUND, '没有可转移的玩家')
    const oldHost = room.getPlayerById(room.hostPlayerId)
    if (oldHost) oldHost.role = 'player'
    room.hostPlayerId = target.playerId
    target.role = 'host'
    room.touch(this.factory.now())
    this.deps.onStateChanged?.(room)
  }

  // ==================== Start Game ====================

  /** START_GAME：校验房主 + 玩家数 + 配置，原子化创建会话 */
  start(actorPlayerId: string): { room: Room; session: SessionCreation } {
    const room = this.requireRoomOfPlayer(actorPlayerId)
    const actor = room.getPlayerById(actorPlayerId)
    if (!actor || actor.role !== 'host') throw new RoomError(ErrorCodes.NOT_HOST, '仅房主可以开始游戏')
    if (room.status !== 'waiting') throw new RoomError(ErrorCodes.ROOM_STARTED, '当前状态无法开始游戏')
    if (room.players.length < 2) throw new RoomError(ErrorCodes.INVALID_SETUP, '至少需要 2 名玩家')
    // 所有玩家必须已准备
    for (const p of room.players) {
      if (p.status === 'disconnected') throw new RoomError(ErrorCodes.INVALID_SETUP, '存在离线玩家，暂时无法开始')
      if (p.status !== 'ready') throw new RoomError(ErrorCodes.INVALID_SETUP, `玩家 ${p.nickname} 尚未准备`)
      if (!p.careerId) throw new RoomError(ErrorCodes.INVALID_SETUP, `玩家 ${p.nickname} 尚未选择职业`)
    }

    assertCanTransition(room.status, 'starting')
    room.status = 'starting'
    room.touch(this.factory.now())
    this.deps.onStateChanged?.(room)

    if (!this.deps.createSession) {
      throw new RoomError(ErrorCodes.INVALID_ACTION, '服务器未配置会话创建器')
    }
    const session = this.deps.createSession(room)
    room.gameSessionId = session.sessionId
    this.deps.confirmSessionStarted?.(session.sessionId)
    return { room, session }
  }

  /** 由会话协调器在 GameSession 真正初始化完成后调用 */
  confirmPlaying(sessionId: string): void {
    const room = this.repo.all().find((r) => r.gameSessionId === sessionId)
    if (!room) return
    assertCanTransition(room.status, 'playing')
    room.status = 'playing'
    room.expiresAt = this.factory.now() + PLAYER_GRACE_MS
    room.players.forEach((p) => {
      if (p.status === 'ready' || p.status === 'connected') p.status = 'playing'
    })
    room.touch(this.factory.now())
    this.deps.onStateChanged?.(room)
  }

  finishGame(sessionId: string): void {
    const room = this.repo.all().find((r) => r.gameSessionId === sessionId)
    if (!room) return
    if (room.status !== 'playing' && room.status !== 'paused') return
    room.status = 'finished'
    room.touch(this.factory.now())
    this.deps.onStateChanged?.(room)
  }

  // ==================== Presence & Expiry ====================

  markDisconnected(playerId: string, now = this.factory.now()): void {
    const room = this.requireRoomOfPlayer(playerId)
    const player = room.getPlayerById(playerId)
    if (!player) return
    player.status = 'disconnected'
    player.lastSeenAt = now
    room.touch(now)
    // 房主断线 → 转移房主到任意在线玩家（waiting/starting/playing/paused 一致，计划 §25）
    if (room.hostPlayerId === playerId) {
      const next = room.players.find((p) => p.playerId !== playerId && p.status !== 'disconnected')
      if (next) {
        room.hostPlayerId = next.playerId
        next.role = 'host'
      }
    }
    this.deps.onStateChanged?.(room)
  }

  markConnected(playerId: string, now = this.factory.now()): void {
    const room = this.requireRoomOfPlayer(playerId)
    const player = room.getPlayerById(playerId)
    if (!player) return
    // 对局中 → playing；大厅中仅在“断线重连”时恢复到 ready，新加入的玩家保持 connected（未准备）
    player.status =
      room.status === 'playing' || room.status === 'paused'
        ? 'playing'
        : player.status === 'disconnected'
          ? 'ready'
          : player.status
    player.lastSeenAt = now
    room.touch(now)
    this.deps.onStateChanged?.(room)
  }

  // ==================== Pause / Resume（断线轮空保护） ====================

  /** 当前轮到断线玩家 → 房间暂停（只允许从 playing 进入） */
  pauseGame(roomId: string, now = this.factory.now()): void {
    const room = this.repo.get(roomId)
    if (!room) return
    if (room.status !== 'playing' && room.status !== 'starting') return
    assertCanTransition(room.status as 'playing', 'paused')
    room.status = 'paused'
    room.touch(now)
    this.deps.onStateChanged?.(room)
  }

  /** 断线玩家重连回位 → 恢复进行中（只允许从 paused 进入） */
  resumeGame(roomId: string, now = this.factory.now()): void {
    const room = this.repo.get(roomId)
    if (!room || room.status !== 'paused') return
    assertCanTransition('paused', 'playing')
    room.status = 'playing'
    room.touch(now)
    this.deps.onStateChanged?.(room)
  }

  // ==================== Grace 过期清理（计划 §24） ====================

  /**
   * 清理由断线超过 grace period 的玩家引发的会话失效。
   * - waiting/starting 房间里的过期断线玩家会被移出并重新排座（允许被回收）。
   * - playing/paused 房间不移除玩家（引擎已固化席位），仅使会话失效 → 重连 SESSION_EXPIRED。
   * 返回所有被标记失效的 playerId，供会话层删除令牌。
   */
  pruneDisconnected(now = this.factory.now(), graceMs = PLAYER_GRACE_MS): string[] {
    const expired: string[] = []
    for (const room of this.repo.all()) {
      const expiredHere = room.players.filter(
        (p) => p.status === 'disconnected' && now - p.lastSeenAt >= graceMs,
      )
      if (expiredHere.length === 0) continue
      if (room.status === 'waiting' || room.status === 'starting') {
        for (const victim of expiredHere) {
          const idx = room.players.findIndex((p) => p.playerId === victim.playerId)
          room.players.splice(idx, 1)
          this.deletePlayer([victim.playerId])
          expired.push(victim.playerId)
        }
        room.players.forEach((p, i) => (p.seatIndex = i))
        if (room.hostPlayerId && !room.getPlayerById(room.hostPlayerId)) {
          const next = room.players.find((p) => p.status !== 'disconnected')
          if (next) room.hostPlayerId = next.playerId
        }
      } else {
        expired.push(...expiredHere.map((p) => p.playerId))
      }
      if (room.players.length > 0) room.touch(now)
      this.deps.onStateChanged?.(room)
    }
    return expired
  }

  /** 应用过期策略；返回被关闭/暂停的房间 */
  applyExpiry(now = this.factory.now()): { closed: string[]; paused: string[] } {
    const closed: string[] = []
    const paused: string[] = []
    for (const room of this.repo.all()) {
      const connectedCount = room.players.filter((p) => p.status !== 'disconnected').length
      const decision = evaluateExpiry({
        status: room.status,
        lastActivityAt: room.lastActivityAt,
        now,
        connectedCount,
      })
      if (decision.action === 'close') {
        this.deletePlayer(room.players.map((p) => p.playerId))
        room.status = 'closed'
        this.repo.delete(room.id)
        closed.push(room.id)
        this.deps.onStateChanged?.(room)
      } else if (decision.action === 'pause') {
        if (room.status === 'playing') {
          room.status = 'paused'
          paused.push(room.id)
          this.deps.onStateChanged?.(room)
        }
      }
    }
    return { closed, paused }
  }

  /** 缓存玩家 → 房间关系（避免多次遍历）；由连接层维护 */
  private relationships = new Map<string, string>()

  bindPlayerRoom(playerId: string, roomId: string): void {
    this.relationships.set(playerId, roomId)
  }

  private deletePlayer(playerIds: string[]): void {
    for (const id of playerIds) this.relationships.delete(id)
  }

  private requireRoomOfPlayer(playerId: string): Room {
    const roomId = this.relationships.get(playerId)
    const room = (roomId && this.repo.get(roomId)) || this.repo.all().find((r) => r.getPlayerById(playerId))
    if (!room) throw new RoomError(ErrorCodes.ROOM_NOT_FOUND, '未找到玩家所在房间')
    return room
  }
}

function clamp(n: number | undefined, max: number, min: number): number {
  if (n == null || !Number.isFinite(n)) return max
  return Math.min(max, Math.max(min, Math.floor(n)))
}

export type { RoomDto, RoomPlayer, RoomStatus, ErrorCode }