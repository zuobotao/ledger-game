/**
 * RoomServer — 房间多人服务器编排层（计划 §21 / §42）
 *
 * 职责：
 * - 在 HTTP server 上挂载 WebSocket，管理连接与会话绑定。
 * - 把 RoomManager（房间/大厅）与 GameSession（权威游戏）串联。
 * - 路由 ClientMessage：join / ready / setup / start / game_action / reconnect / leave / ping。
 * - 广播房间快照与游戏状态（全体同服玩家一致）。
 *
 * 并发模型：单进程顺序处理，一次只处理一个 Action（计划 §42，无需复杂锁）。
 */

import type { Http2ServerRequest } from 'node:http'
import type { Server as HTTPServer, IncomingMessage } from 'node:http'
import type { WSConnection } from './transport/websocket'
import { attachWebSocketServer } from './transport/websocket'
import { parseClientMessage } from './protocol/validate'
import { RoomManager } from './room/RoomManager'
import { RoomError } from './room/Room'
import { MemoryRoomRepository } from './room/MemoryRoomRepository'
import type { Room, RoomFactory } from './room/Room'
import { GameSession, type SessionActionResult } from './game/GameSession'
import { SessionManager } from './session/SessionManager'
import {
  ErrorCodes,
  type GameAction,
  type GameConfig,
  type GameMessage,
  type RoomDto,
} from '@/network/protocol'
import type { ClientMessage } from '@/network/protocol'

const DEFAULT_PLAYER_COLORS = ['blue', 'green', 'red', 'orange', 'purple', 'pink'] as const

interface ConnState {
  sessionId: string
  playerId: string
  roomId: string
  nickname: string
}

export interface RoomServerOptions {
  factory?: RoomFactory
}

export class RoomServer {
  readonly roomManager: RoomManager
  /** roomId → GameSession */
  private sessions = new Map<string, GameSession>()
  /** roomId → SessionRegistry 记录（playerId ↔ token），供断线重连校验 */
  readonly sessionRegistry = new SessionManager()
  /** roomId → Set<conn> 在线连接 */
  private roomConns = new Map<string, Set<WSConnection>>()
  private connState = new WeakMap<WSConnection, ConnState>()
  private readonly factory: RoomFactory

  private factoryNow(): number {
    return this.factory.now()
  }

  constructor(
    private readonly http: HTTPServer,
    private readonly options: RoomServerOptions = {},
  ) {
    const factory: RoomFactory = this.options.factory ?? {
      generateId: () => generateId(),
      nextInt: (min, max) => randomInt(min, max),
      now: () => Date.now(),
    }
    this.factory = factory

    this.roomManager = new RoomManager({
      factory,
      repo: new MemoryRoomRepository(),
      onStateChanged: (room) => this.broadcastRoom(room),
      createSession: (room) => this.createSession(room),
      confirmSessionStarted: (sessionId) => {
        // 在 room.gameSessionId 赋值之后才可按 id 定位并把房间置为 playing
        this.roomManager.confirmPlaying(sessionId)
      },
    })

    // HTTP bootstrap：POST /rooms 创建房间
    this.http.on('request', (_req: IncomingMessage, res: import('node:http').ServerResponse) => {
      this.handleHttpBootstrap(_req, res).catch(() => this.respondJson(res, 500, { error: 'internal' }))
    })

    attachWebSocketServer(http, (conn) => this.onConnection(conn))
  }

  // ==================== HTTP Bootstrap ====================

  private async handleHttpBootstrap(req: IncomingMessage, res: import('node:http').ServerResponse): Promise<void> {
    // CORS 预检：前端(3000/5173…)跨源 POST /rooms 前会先发 OPTIONS
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': this.corsOrigin(req),
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '3600',
      })
      return res.end()
    }
    if (req.method !== 'POST' || !req.url || !req.url.startsWith('/rooms')) {
      return this.respondJson(res, 404, { error: ErrorCodes.ROOM_NOT_FOUND })
    }
    let body = ''
    for await (const chunk of req) body += String(chunk)
    let input: { sessionId?: string; nickname?: string; name?: string; maxPlayers?: number }
    try {
      input = body ? JSON.parse(body) : {}
    } catch {
      return this.respondJson(res, 400, { error: ErrorCodes.INVALID_MESSAGE })
    }
    if (!input.sessionId || !input.nickname) {
      return this.respondJson(res, 400, { error: ErrorCodes.INVALID_MESSAGE })
    }
    const room = this.roomManager.create({
      name: input.name,
      host: { sessionId: input.sessionId, nickname: input.nickname },
      maxPlayers: input.maxPlayers,
    })
    const rec = this.sessionRegistry.register({
      sessionId: input.sessionId,
      playerId: room.hostPlayerId,
      roomId: room.id,
      nickname: room.players[0]!.nickname,
      now: this.factoryNow(),
    })
    return this.respondJson(res, 200, {
      room: room.toDto(),
      session: { sessionId: rec.sessionId, playerId: rec.playerId, token: rec.token },
    })
  }

  private respondJson(res: import('node:http').ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': this.corsOriginFromRes(res),
    })
    res.end(JSON.stringify(data))
  }

  /** 反射请求来源（多客户端部署形态下宽松放行）；未指定则放行任意前端 */
  private corsOrigin(req: IncomingMessage): string | '*' {
    const h = String(req.headers.origin ?? '')
    return h || '*'
  }

  private corsOriginFromRes(res: import('node:http').ServerResponse): string | '*' {
    const req = (res as unknown as { req?: IncomingMessage }).req
    if (req?.headers?.origin) return String(req.headers.origin)
    return '*'
  }

  // 供测试/程序化创建房间（HTTP 之外的能力）
  createRoom(input: {
    name?: string
    host: { sessionId: string; nickname: string }
    maxPlayers?: number
  }): Room {
    const room = this.roomManager.create(input)
    this.sessionRegistry.register({
      sessionId: input.host.sessionId,
      playerId: room.hostPlayerId,
      roomId: room.id,
      nickname: room.players[0]!.nickname,
      now: this.factoryNow(),
    })
    return room
  }

  // ==================== 会话创建 ====================

  private createSession(room: Room): { sessionId: string; seed: number } {
    const config: GameConfig = {
      playerCount: room.players.length,
      insurance: false,
      bigFamily: false,
      mortgage: false,
      fastStart: false,
      ageLimit: true,
    }
    const players = room.players.map((p, i) => ({
      name: p.nickname,
      colorId: DEFAULT_PLAYER_COLORS[i % DEFAULT_PLAYER_COLORS.length]!,
      careerId: p.careerId!,
      dreamId: p.dreamId,
    }))
    const session = new GameSession({
      id: `sess-${room.id}`,
      roomId: room.id,
      seed: room.config.seed,
      version: room.config.gameVersion,
      config,
      players,
    })
    this.sessions.set(room.id, session)
    this.broadcastGameStarted(room)
    return { sessionId: session.id, seed: session.seed }
  }

  getSession(roomId: string): GameSession | undefined {
    return this.sessions.get(roomId)
  }

  /**
   * 清理断线超过 grace period 的玩家会话（服务端可定时/心跳调用）。
   * 返回被失效的 playerId 列表。
   */
  pruneDisconnected(now = this.factoryNow()): string[] {
    const expired = this.roomManager.pruneDisconnected(now)
    for (const playerId of expired) this.sessionRegistry.deletePlayer(playerId)
    return expired
  }

  // ==================== WebSocket Connection ====================

  private onConnection(conn: WSConnection): void {
    conn.on('message', (data) => this.onMessage(conn, data))
    conn.on('close', () => this.onClose(conn))
  }

  private onMessage(conn: WSConnection, data: string): void {
    let raw: unknown
    try {
      raw = JSON.parse(data)
    } catch {
      return this.sendError(conn, ErrorCodes.INVALID_MESSAGE, '消息不是合法 JSON')
    }
    const parsed = parseClientMessage(raw)
    if (!parsed.ok) {
      return this.sendError(conn, parsed.code, parsed.message)
    }
    const msg = parsed.message
    try {
      this.route(conn, msg)
    } catch (err) {
      const e = err as RoomError
      this.sendError(conn, e?.code ?? ErrorCodes.INVALID_ACTION, e?.message ?? '服务器内部错误')
    }
  }

  private route(conn: WSConnection, msg: ClientMessage): void {
    switch (msg.type) {
      case 'ping':
        conn.send(JSON.stringify({ type: 'pong', t: msg.t }))
        break
      case 'join_room': {
        const room = this.roomManager.getByCode(msg.roomCode)
        if (!room) throw new RoomError(ErrorCodes.ROOM_NOT_FOUND, '房间不存在')
        const player = this.roomManager.join(room.id, msg.sessionId, msg.nickname)
        const rec = this.sessionRegistry.register({
          sessionId: msg.sessionId,
          playerId: player.playerId,
          roomId: room.id,
          nickname: player.nickname,
          now: this.factoryNow(),
        })
        this.bind(conn, { sessionId: msg.sessionId, playerId: player.playerId, roomId: room.id, nickname: player.nickname })
        this.roomManager.markConnected(player.playerId)
        // 私密下发会话令牌，供刷新/重连凭据（不外泄给其他玩家）
        conn.send(
          JSON.stringify({
            type: 'session_bootstrap',
            sessionId: rec.sessionId,
            playerId: rec.playerId,
            roomId: room.id,
            token: rec.token,
          }),
        )
        this.sendRoomToConn(room, conn)
        this.sendPlayerJoined(room, player)
        this.broadcastRoom(room)
        break
      }
      case 'ready':
        this.withContext(conn, ({ roomId, playerId }) => {
          this.roomManager.setReady(playerId, msg.ready)
          const room = this.roomManager.get(roomId)!
          this.broadcastRoom(room)
        })
        break
      case 'set_player_setup':
        this.withContext(conn, ({ roomId, playerId }) => {
          this.roomManager.setPlayerSetup(playerId, { careerId: msg.careerId, dreamId: msg.dreamId, colorId: msg.colorId })
          const room = this.roomManager.get(roomId)!
          this.broadcastRoom(room)
        })
        break
      case 'start_game':
        this.withContext(conn, ({ roomId, playerId }) => {
          this.roomManager.start(playerId) // 内部触发 createSession + confirmPlaying + broadcastGameStarted
        })
        break
      case 'game_action': {
        this.withContext(conn, ({ roomId, playerId }) => {
          const room = this.roomManager.get(roomId)
          if (!room) throw new RoomError(ErrorCodes.ROOM_NOT_FOUND, '房间不存在')
          if (room.status !== 'playing' && room.status !== 'paused') throw new RoomError(ErrorCodes.INVALID_ACTION, '游戏未在进行')
          const session = this.sessions.get(roomId)
          if (!session) throw new RoomError(ErrorCodes.INVALID_ACTION, '会话不存在')
          // 权威身份绑定：行动者以"连接所绑定的座位"为准，而非信任客户端自填的 playerId。
          // 防止恶意/异常客户端冒充当前玩家提交 action（计划 §11.1）。
          const actorGameId = this.gamePlayerIdForRoomPlayer(room, playerId)
          if (!actorGameId) throw new RoomError(ErrorCodes.NOT_YOUR_TURN, '座位与游戏玩家未对齐')
          const actorAction = { ...(msg.action as GameAction), playerId: actorGameId } as GameAction
          const result = session.dispatch(actorAction, msg.requestId)
          this.broadcastActionResult(room, msg.requestId, result)
          if (session.status === 'finished') {
            this.roomManager.finishGame(session.id)
            this.broadcastGameFinished(room, session)
          }
        })
        break
      }
      case 'reconnect':
        this.handleReconnect(conn, msg.sessionId, msg.roomId, msg.token)
        break
      case 'leave_room':
        this.withContext(conn, ({ roomId, playerId }) => {
          const room = this.roomManager.leave(playerId)
          this.sessionRegistry.deletePlayer(playerId)
          this.unbind(conn)
          this.broadcastPlayerLeft(room, playerId)
        })
        break
      default:
        throw new RoomError(ErrorCodes.INVALID_MESSAGE, '不支持的消息类型')
    }
  }

  // ==================== 连接上下文 ====================

  private bind(conn: WSConnection, state: ConnState): void {
    const prev = this.connState.get(conn)
    if (prev) {
      const prevSet = this.roomConns.get(prev.roomId)
      prevSet?.delete(conn)
    }
    this.connState.set(conn, state)
    const set = this.roomConns.get(state.roomId) ?? new Set<WSConnection>()
    set.add(conn)
    this.roomConns.set(state.roomId, set)
  }

  private unbind(conn: WSConnection): void {
    const state = this.connState.get(conn)
    if (state) {
      this.roomConns.get(state.roomId)?.delete(conn)
      this.connState.delete(conn)
    }
  }

  private withContext(conn: WSConnection, fn: (state: ConnState) => void): void {
    const state = this.connState.get(conn)
    if (!state) throw new RoomError(ErrorCodes.SESSION_EXPIRED, '连接尚未加入房间')
    fn(state)
  }

  private onClose(conn: WSConnection): void {
    const state = this.connState.get(conn)
    if (!state) return
    this.roomConns.get(state.roomId)?.delete(conn)
    this.connState.delete(conn)
    // 断线不立即移除玩家；标记离线并记录断线时间（grace period 由 pruneDisconnected 处理）
    try {
      this.sessionRegistry.markDisconnected(state.sessionId, this.factoryNow())
      this.roomManager.markDisconnected(state.playerId)
      this.pauseIfCurrentPlayerOffline(state.roomId)
    } catch {
      /* 房间可能已被回收 */
    }
  }

  /** 若游戏进行中且当前轮到断线的玩家，则暂停房间（计划 §24） */
  private pauseIfCurrentPlayerOffline(roomId: string): void {
    const room = this.roomManager.get(roomId)
    const session = this.sessions.get(roomId)
    if (!room || !session || room.status !== 'playing') return
    const currentRoomPlayerId = this.roomPlayerIdForGamePlayer(room, session.currentPlayerId)
    if (currentRoomPlayerId && room.getPlayerById(currentRoomPlayerId)?.status === 'disconnected') {
      this.roomManager.pauseGame(roomId)
    }
  }

  /** 游戏玩家 id → 房内玩家 id（按座位对齐） */
  private roomPlayerIdForGamePlayer(room: Room, gamePlayerId: string): string | undefined {
    const idx = this.gamePlayers(room).findIndex((gp) => gp.id === gamePlayerId)
    if (idx < 0) return undefined
    return room.players[idx]?.playerId
  }

  /** 房内玩家 id → 游戏玩家 id（按座位对齐，权威身份反查） */
  private gamePlayerIdForRoomPlayer(room: Room, roomPlayerId: string): string | undefined {
    const idx = room.players.findIndex((p) => p.playerId === roomPlayerId)
    if (idx < 0) return undefined
    return this.gamePlayers(room)[idx]?.id
  }

  /** 取当前会话的游戏玩家列表（与房内玩家按座位对齐） */
  private gamePlayers(room: Room): { id: string }[] {
    const session = this.sessions.get(room.id)
    if (!session) return []
    return session.snapshot().state.players ?? []
  }

  private handleReconnect(conn: WSConnection, sessionId: string, roomId: string, token: string): void {
    const room = this.roomManager.get(roomId)
    if (!room) throw new RoomError(ErrorCodes.ROOM_NOT_FOUND, '房间不存在')
    // 令牌校验：失效/错误 → SESSION_EXPIRED，不恢复座位
    if (!this.sessionRegistry.validate(sessionId, token)) {
      throw new RoomError(ErrorCodes.SESSION_EXPIRED, '会话已失效，请重新加入')
    }
    const rec = this.sessionRegistry.getBySessionId(sessionId)!
    this.bind(conn, { sessionId, playerId: rec.playerId, roomId: room.id, nickname: rec.nickname })
    this.roomManager.markConnected(rec.playerId)
    // 玩家回位后先广播（恢复状态），最后下发重连快照
    this.broadcastRoom(room)
    const session = this.sessions.get(room.id)
    // 玩家回位后，若房间处于本期因该玩家离线而暂停 → 恢复
    if (session && room.status === 'paused') this.roomManager.resumeGame(room.id)
    const snap = session?.snapshot()
    conn.send(
      JSON.stringify({
        type: 'reconnect_snapshot',
        ok: true,
        room: room.toDto(),
        session: snap?.session,
        state: snap?.state,
        turn: snap?.turn,
        stateHash: snap?.stateHash,
        sequence: snap?.sequence,
      }),
    )
  }

  // ==================== 广播 ====================

  private broadcastRoom(room: Room): void {
    const dto = room.toDto()
    this.toRoom(room.id, (conn) => this.send(conn, { type: 'room_snapshot', room: dto }))
  }

  private broadcastGameStarted(room: Room): void {
    const session = this.sessions.get(room.id)
    if (!session) return
    const snap = session.snapshot()
    // roomPlayerId → 局内游戏玩家 id，便于客户端定位"自己"
    const playerMap: Record<string, string> = {}
    room.players.forEach((p, i) => {
      const gamePlayer = snap.state.players[i]
      if (gamePlayer) playerMap[p.playerId] = gamePlayer.id
    })
    this.toRoom(room.id, (conn) =>
      this.send(conn, { type: 'game_started', session: snap.session, state: snap.state, playerMap, turn: snap.turn }),
    )
  }

  private broadcastActionResult(
    room: Room,
    requestId: string | undefined,
    result: SessionActionResult,
  ): void {
    this.toRoom(room.id, (conn) =>
      this.send(conn, {
        type: 'action_result',
        requestId,
        sequence: result.sequence,
        success: result.success,
        error: result.error,
        events: result.events,
        financialDeltas: result.financialDeltas,
        warnings: result.warnings,
        messages: result.messages as GameMessage[],
        state: result.state,
        turn: result.turn,
        stateHash: result.stateHash,
      }),
    )
  }

  private broadcastGameFinished(room: Room, session: GameSession): void {
    const snap = session.snapshot()
    const replay = session.getReplay()
    const winnerId = snap.state.winnerId ?? undefined
    // roomPlayerId → gamePlayerId 反查房主视角
    let winnerRoomPlayerId: string | undefined
    room.players.forEach((p, i) => {
      if (snap.state.players[i]?.id === winnerId) winnerRoomPlayerId = p.playerId
    })
    this.toRoom(room.id, (conn) =>
      this.send(conn, {
        type: 'game_finished',
        session: snap.session,
        winnerId: winnerRoomPlayerId,
        reason: snap.state.gameEndReason ?? undefined,
        finalStateHash: snap.stateHash,
        actionCount: replay.actionCount,
        eventCount: replay.eventCount,
        replayHash: replay.replayHash,
      }),
    )
  }

  private sendPlayerJoined(room: Room, player: { playerId: string; nickname: string }): void {
    this.toRoom(room.id, (conn) =>
      this.send(conn, { type: 'player_joined', playerId: player.playerId, nickname: player.nickname }),
    )
  }

  private broadcastPlayerLeft(room: Room, playerId: string): void {
    this.toRoom(room.id, (conn) => this.send(conn, { type: 'player_left', playerId }))
  }

  private sendRoomToConn(room: Room, conn: WSConnection): void {
    this.send(conn, { type: 'room_snapshot', room: room.toDto() })
  }

  private sendToRoom(room: Room, payload: unknown): void {
    this.toRoom(room.id, (conn) => this.send(conn, payload))
  }

  private toRoom(roomId: string, fn: (conn: WSConnection) => void): void {
    const set = this.roomConns.get(roomId)
    if (!set) return
    for (const conn of set) fn(conn)
  }

  private send(conn: WSConnection, payload: unknown): void {
    conn.send(JSON.stringify(payload))
  }

  private sendError(conn: WSConnection, code: string, message: string): void {
    conn.send(JSON.stringify({ type: 'error', code, message }))
  }
}

// ==================== 工厂辅助 ====================

function generateId(): string {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min))
}