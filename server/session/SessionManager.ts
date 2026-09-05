/**
 * SessionManager / PlayerSession — 会话凭据层（计划 §6 / §23 / §36）
 *
 * 区分三个身份：
 * - Player ID       逻辑玩家
 * - Session ID      浏览器会话（客户端首次注册时携带）
 * - Connection ID   当前网络连接（由传输层维护，本模块不感知）
 *
 * 会话令牌（token）由服务端签发：刷新/重连时客户端凭它恢复原座位，
 * 而非仅仅靠可猜测的 sessionId。错误/缺省/过期 → SESSION_EXPIRED。
 *
 * 会话在此扮演 PlayerSession 的角色（计划目录 server/session/PlayerSession.ts）。
 */

import { randomBytes } from 'node:crypto'

export interface PlayerSessionRecord {
  sessionId: string
  playerId: string
  roomId: string
  nickname: string
  token: string
  joinedAt: number
  lastSeenAt: number
  /** 断线时间；null 表示在线。超过 grace period 后由 RoomManager 清理 */
  disconnectedAt: number | null
}

export interface SessionManagerOptions {
  /** 随机性来源（默认 crypto），便于测试注入 */
  random?: () => string
}

export class SessionManager {
  private bySessionId = new Map<string, PlayerSessionRecord>()
  private byPlayerId = new Map<string, string>()
  private byToken = new Map<string, string>()
  private readonly rand: () => string

  constructor(options: SessionManagerOptions = {}) {
    this.rand = options.random ?? (() => randomBytes(24).toString('base64url'))
  }

  /** 注册/补发会话。同一 sessionId 复用 playerId/token（幂等重连）。 */
  register(input: {
    sessionId: string
    playerId: string
    roomId: string
    nickname: string
    now: number
  }): PlayerSessionRecord {
    const existing = this.bySessionId.get(input.sessionId)
    if (existing) {
      existing.roomId = input.roomId
      existing.nickname = input.nickname
      existing.lastSeenAt = input.now
      existing.disconnectedAt = null
      return existing
    }
    const rec: PlayerSessionRecord = {
      sessionId: input.sessionId,
      playerId: input.playerId,
      roomId: input.roomId,
      nickname: input.nickname,
      token: this.rand(),
      joinedAt: input.now,
      lastSeenAt: input.now,
      disconnectedAt: null,
    }
    this.bySessionId.set(rec.sessionId, rec)
    this.byPlayerId.set(rec.playerId, rec.sessionId)
    this.byToken.set(rec.token, rec.sessionId)
    return rec
  }

  getBySessionId(sessionId: string): PlayerSessionRecord | undefined {
    return this.bySessionId.get(sessionId)
  }

  getByPlayerId(playerId: string): PlayerSessionRecord | undefined {
    const sessionId = this.byPlayerId.get(playerId)
    return sessionId ? this.bySessionId.get(sessionId) : undefined
  }

  getByToken(token: string): PlayerSessionRecord | undefined {
    const sessionId = this.byToken.get(token)
    return sessionId ? this.bySessionId.get(sessionId) : undefined
  }

  /** 校验令牌与 sessionId 是否匹配当前会话 */
  validate(sessionId: string, token: string): boolean {
    const rec = this.getBySessionId(sessionId)
    return !!rec && rec.token === token
  }

  touch(sessionId: string, now: number): void {
    const rec = this.bySessionId.get(sessionId)
    if (!rec) return
    rec.lastSeenAt = now
    rec.disconnectedAt = null
  }

  markDisconnected(sessionId: string, now: number): void {
    const rec = this.bySessionId.get(sessionId)
    if (!rec || rec.disconnectedAt != null) return
    rec.disconnectedAt = now
  }

  /** 清理某 playerId 的会话绑定（离开/被踢/过期回收） */
  deletePlayer(playerId: string): void {
    const sessionId = this.byPlayerId.get(playerId)
    if (!sessionId) return
    const rec = this.bySessionId.get(sessionId)
    if (rec) {
      this.bySessionId.delete(rec.sessionId)
      this.byToken.delete(rec.token)
    }
    this.byPlayerId.delete(playerId)
  }
}