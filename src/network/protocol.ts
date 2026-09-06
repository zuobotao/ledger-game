/**
 * Ledger Multiplayer — Room / Protocol 共享类型
 *
 * 这是多人房间的单一类型源头，浏览器客户端（RoomClient）与 Node 房间服务器
 * 都复用此模块：房间实体、Client/Server 消息、错误码、协议版本。
 *
 * 原则：
 * - 客户端只提交"意图"（room 操作 / GameAction），服务端权威裁决。
 * - 协议必须带 version，未知字段不拒绝，非法结构拒绝。
 * - Room ID 与 Room Code 分离：code 仅用于加入。
 */

import type { GameState, Player, PendingActionType } from '@/types/game'
import type {
  GameAction,
  GameEvent,
  FinancialDelta,
  GameMessage,
  GameWarning,
} from '@/engine/contract'

/** 协议版本：随报文结构变更递增 */
export const PROTOCOL_VERSION = '2.4.0'

// ==================== 房间生命周期与角色状态 ====================

export type RoomStatus = 'waiting' | 'starting' | 'playing' | 'paused' | 'finished' | 'closed'

export type PlayerRole = 'host' | 'player'

export type PlayerStatus = 'connected' | 'disconnected' | 'ready' | 'playing' | 'finished'

export type GameSessionStatus = 'playing' | 'paused' | 'finished'

// ==================== Room 实体 ====================

export interface RoomConfig {
  maxPlayers: number
  allowSpectators: boolean
  turnTimeoutSeconds: number | null
  gameVersion: string
  protocolVersion: string
  seed: number
}

export interface RoomPlayer {
  playerId: string
  sessionId: string
  nickname: string
  role: PlayerRole
  status: PlayerStatus
  seatIndex: number
  joinedAt: number
  lastSeenAt: number
  careerId?: string
  dreamId?: string
  colorId?: string
}

/** 广播给客户端的最小化房间视图（不含网络连接信息） */
export interface RoomDto {
  id: string
  code: string
  name: string
  status: RoomStatus
  hostPlayerId: string
  config: RoomConfig
  players: RoomPlayer[]
  createdAt: number
  updatedAt: number
  gameSessionId?: string
  expiresAt?: number
}

export interface GameSessionDto {
  id: string
  roomId: string
  seed: number
  version: string
  turnNumber: number
  currentPlayerId: string
  status: GameSessionStatus
  startedAt: number
}

/** 玩家回合上下文：客户端据此渲染可操作集，服务端据此校验 */
export interface TurnContext {
  currentPlayerId: string
  pendingAction: PendingActionType
  allowedActions: string[]
}

/**
 * Room EventLog 记录（计划 §34）：对局内每一次被裁决的动作/事件都会被记入。
 * 用途：Replay、Debug、State recovery、审计、测试。
 */
export interface GameEventRecord {
  /** 稳定记录 id：`${gameSessionId}-e${sequence}` */
  id: string
  roomId: string
  gameSessionId: string
  /** 会话内递增的事件序号 */
  sequence: number
  type: string
  playerId?: string
  payload?: unknown
  timestamp: number
}

/** 一局结束后的结果摘要（计划 §52 final result） */
export interface GameFinalResult {
  winnerId?: string
  gameEndReason?: 'victory' | 'bankrupt' | 'retirement'
  turnNumber: number
  stateHash: string
  startedAt: number
  finishedAt: number
  durationMs: number
  players: GameFinalPlayer[]
}

export interface GameFinalPlayer {
  playerId: string
  name: string
  phase: string
  cash: number
  savings: number
  passiveIncome: number
  cashFlow: number
  totalIncome: number
  totalExpenses: number
  childrenCount: number
  netWorth: number
  isBankrupt: boolean
}

// ==================== 房间码 ====================

/** 易混淆字符（0/O、1/I/L）不参与房间码，减少人工输入错误 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const ROOM_CODE_LENGTH = 6
export const MAX_NICKNAME_LENGTH = 20

export function generateRoomCode(random: { nextInt(min: number, max: number): number }): string {
  const chars: string[] = []
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    chars.push(CODE_ALPHABET[random.nextInt(0, CODE_ALPHABET.length)]!)
  }
  return chars.join('')
}

// ==================== Client Messages ====================

export interface JoinRoomMessage {
  type: 'join_room'
  roomCode: string
  sessionId: string
  nickname: string
}

export interface ReadyMessage {
  type: 'ready'
  ready: boolean
}

export interface SetPlayerSetupMessage {
  type: 'set_player_setup'
  careerId: string
  dreamId?: string
  colorId?: string
}

export interface StartGameMessage {
  type: 'start_game'
}

export interface GameActionMessage {
  type: 'game_action'
  requestId: string
  action: GameAction
}

export interface ReconnectMessage {
  type: 'reconnect'
  sessionId: string
  roomId: string
  /** 服务端下发的会话令牌；缺失/错误/过期 → SESSION_EXPIRED */
  token: string
}

export interface LeaveRoomMessage {
  type: 'leave_room'
}

export interface PingMessage {
  type: 'ping'
  t: number
}

export type ClientMessage =
  | JoinRoomMessage
  | ReadyMessage
  | SetPlayerSetupMessage
  | StartGameMessage
  | GameActionMessage
  | ReconnectMessage
  | LeaveRoomMessage
  | PingMessage

// ==================== Server Messages ====================

export interface RoomSnapshotMessage {
  type: 'room_snapshot'
  room: RoomDto
}

export interface PlayerJoinedMessage {
  type: 'player_joined'
  playerId: string
  nickname: string
}

export interface PlayerLeftMessage {
  type: 'player_left'
  playerId: string
}

export interface PlayerReadyMessage {
  type: 'player_ready'
  playerId: string
  ready: boolean
}

export interface HostChangedMessage {
  type: 'host_changed'
  hostPlayerId: string
}

export interface GameStartedMessage {
  type: 'game_started'
  session: GameSessionDto
  state: GameState
  playerMap: Record<string, string>
  turn: TurnContext
}

/** 游戏状态快照：重连 / 广播后客户端据此渲染 */
export interface GameSnapshotMessage {
  type: 'game_snapshot'
  sequence: number
  session: GameSessionDto
  state: GameState
  turn: TurnContext
  stateHash: string
}

/** 单次动作结果 + 事件广播 */
export interface ActionResultMessage {
  type: 'action_result'
  requestId?: string
  sequence: number
  success: boolean
  error?: string
  events: GameEvent[]
  financialDeltas: Record<string, FinancialDelta>
  warnings: GameWarning[]
  messages: GameMessage[]
  state: GameState
  turn: TurnContext
  stateHash: string
}

/** 断线/刷新恢复所需的最小会话凭据（仅发给持有所属连接，不外泄） */
export interface SessionBootstrapMessage {
  type: 'session_bootstrap'
  sessionId: string
  playerId: string
  roomId: string
  token: string
}

export interface ReconnectSnapshotMessage {
  type: 'reconnect_snapshot'
  ok: boolean
  error?: string
  room?: RoomDto
  session?: GameSessionDto
  state?: GameState
  turn?: TurnContext
  stateHash?: string
  sequence?: number
  /** 座位号 → 局内游戏玩家 id（重连客户端据此定位「自己」；缺失会导致 isMyTurn 恒为 false） */
  playerMap?: Record<string, string>
  /** 会话已过期被回收时：ok=false，code=SESSION_EXPIRED */
  code?: ErrorCode
}

export interface GameFinishedMessage {
  type: 'game_finished'
  session: GameSessionDto
  winnerId?: string
  reason?: string
  finalStateHash: string
  /** Phase 7：对局元数据，供结果保留与 Replay 校验 */
  actionCount: number
  eventCount: number
  replayHash: string
}

export interface ErrorMessage {
  type: 'error'
  code: ErrorCode
  message: string
  requestId?: string
}

export interface PongMessage {
  type: 'pong'
  t: number
}

export type ServerMessage =
  | RoomSnapshotMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerReadyMessage
  | HostChangedMessage
  | GameStartedMessage
  | GameSnapshotMessage
  | ActionResultMessage
  | SessionBootstrapMessage
  | ReconnectSnapshotMessage
  | GameFinishedMessage
  | ErrorMessage
  | PongMessage

// ==================== 错误码 ====================

export const ErrorCodes = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  ROOM_STARTED: 'ROOM_STARTED',
  ROOM_CLOSED: 'ROOM_CLOSED',
  NOT_HOST: 'NOT_HOST',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_ACTION: 'INVALID_ACTION',
  INVALID_SETUP: 'INVALID_SETUP',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  RATE_LIMITED: 'RATE_LIMITED',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ==================== 公开的派生辅助 ====================

export function toRoomDto(
  partial: Pick<RoomDto, 'id' | 'code' | 'name' | 'status' | 'hostPlayerId' | 'config' | 'players' | 'createdAt' | 'updatedAt' | 'gameSessionId' | 'expiresAt'>,
): RoomDto {
  return {
    id: partial.id,
    code: partial.code,
    name: partial.name,
    status: partial.status,
    hostPlayerId: partial.hostPlayerId,
    config: partial.config,
    players: partial.players,
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt,
    gameSessionId: partial.gameSessionId,
    expiresAt: partial.expiresAt,
  }
}

export type { Player, GameState, GameAction, GameEvent }