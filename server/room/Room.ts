/**
 * Room — 房间聚合根（服务端权威实体）
 *
 * Room 与 Lobby / GameSession 分离：
 * - Room：生命周期、玩家、配置（本文件）
 * - GameSession：真正的游戏状态与引擎（见 server/game/GameSession.ts）
 *
 * Room 直接承载 players/config/status，不承载 GameState 字段。
 * 网络连接信息存放于 RoomPlayer 之外（见 server/session/）。
 */

import {
  ErrorCodes,
  generateRoomCode,
  MAX_NICKNAME_LENGTH,
  type ErrorCode,
  type RoomConfig,
  type RoomDto,
  type RoomPlayer,
  type RoomStatus,
} from '../../src/network/protocol'

/** 房间名长度上限 */
export const MAX_ROOM_NAME_LENGTH = 30
/** 昵称长度上限（与协议一致） */
export const MAX_PLAYER_NICKNAME = MAX_NICKNAME_LENGTH

export class RoomError extends Error {
  readonly code: ErrorCode
  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'RoomError'
    this.code = code
  }
}

export interface RoomCreateInput {
  id: string
  name: string
  config: RoomConfig
  host: {
    playerId: string
    sessionId: string
    nickname: string
  }
  now?: number
}

interface NewRoomOptions {
  name?: string
  maxPlayers?: number
  allowSpectators?: boolean
  seed?: number
}

export class Room {
  readonly id: string
  readonly code: string
  name: string
  status: RoomStatus = 'waiting'
  hostPlayerId: string
  config: RoomConfig
  players: RoomPlayer[] = []
  createdAt: number
  updatedAt: number
  gameSessionId?: string
  /** 房间过期时间（毫秒）；waiting 长期无人时由生命周期更新 */
  expiresAt: number
  /** 每玩家最近动作时间戳，用于心跳/断线判定 */
  lastActivityAt: number

  constructor(
    id: string,
    code: string,
    name: string,
    hostPlayerId: string,
    config: RoomConfig,
    now: number,
    players: RoomPlayer[] = [],
  ) {
    this.id = id
    this.code = code
    this.name = name
    this.hostPlayerId = hostPlayerId
    this.config = config
    this.players = players
    this.createdAt = now
    this.updatedAt = now
    this.lastActivityAt = now
    this.expiresAt = now + WAITING_EXPIRY_MS
  }

  touch(now: number): void {
    this.updatedAt = now
    this.lastActivityAt = now
  }

  toDto(): RoomDto {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      status: this.status,
      hostPlayerId: this.hostPlayerId,
      config: this.config,
      players: this.players,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      gameSessionId: this.gameSessionId,
      expiresAt: this.expiresAt,
    }
  }

  getPlayerById(playerId: string): RoomPlayer | undefined {
    return this.players.find((p) => p.playerId === playerId)
  }

  getPlayerBySession(sessionId: string): RoomPlayer | undefined {
    return this.players.find((p) => p.sessionId === sessionId)
  }
}

// ==================== 生命周期配置（时间参数化，不硬编码） ====================

/** WAITING 且无玩家 30min → CLOSED */
export const WAITING_EXPIRY_MS = 30 * 60 * 1000
/** PLAYING 且全员离线 5min → PAUSED */
export const ALL_OFFLINE_PAUSE_MS = 5 * 60 * 1000
/** 玩家断线 grace period（第一版 5 分钟） */
export const PLAYER_GRACE_MS = 5 * 60 * 1000
/** PAUSED 长期无人 → CLOSED */
export const PAUSED_CLOSE_MS = 60 * 60 * 1000

export function isCodeCharacterSafe(nickname: string): boolean {
  return nickname.trim().length > 0 && nickname.trim().length <= MAX_PLAYER_NICKNAME
}

// ==================== 工厂与辅助函数（纯逻辑，可单测） ====================

export function normalizeRoomName(raw: string | undefined, maxLength = MAX_ROOM_NAME_LENGTH): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return '周末家庭局'
  return trimmed.slice(0, maxLength)
}

export function normalizeNickname(raw: string, maxLength = MAX_PLAYER_NICKNAME): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return '玩家'
  return trimmed.slice(0, maxLength)
}

export interface RoomFactory {
  generateId(): string
  nextInt(min: number, max: number): number
  now(): number
}

/** 创建新的 Room 实例（不落库；由 RoomManager 持久化） */
export function createRoom(
  factory: RoomFactory,
  input: RoomCreateInput,
): Room {
  const name = normalizeRoomName(input.name)
  const player: RoomPlayer = {
    playerId: input.host.playerId,
    sessionId: input.host.sessionId,
    nickname: normalizeNickname(input.host.nickname),
    role: 'host',
    status: 'ready',
    seatIndex: 0,
    joinedAt: input.now ?? factory.now(),
    lastSeenAt: input.now ?? factory.now(),
  }
  const config: RoomConfig = {
    maxPlayers: clampMaxPlayers(input.config.maxPlayers),
    allowSpectators: input.config.allowSpectators,
    turnTimeoutSeconds: input.config.turnTimeoutSeconds,
    gameVersion: input.config.gameVersion,
    protocolVersion: input.config.protocolVersion,
    seed: input.config.seed,
  }
  const room = new Room(
    input.id,
    generateRoomCode(factory),
    name,
    player.playerId,
    config,
    input.now ?? factory.now(),
    [player],
  )
  room.expiresAt = room.createdAt + WAITING_EXPIRY_MS
  return room
}

export function clampMaxPlayers(n: number): number {
  if (!Number.isFinite(n)) return 6
  return Math.min(6, Math.max(2, Math.floor(n)))
}

export type { RoomConfig, RoomStatus, RoomPlayer, ErrorCode, RoomError }