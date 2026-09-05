/**
 * 会话凭据本地持久化（计划 §6 / §23）
 *
 * 刷新 / 短暂断线后，浏览器凭 localStorage 中的 sessionId + token 安全恢复原座位。
 * localStorage 仅保存"我的"会话凭据（不含权威状态），权威状态始终来自服务器。
 */

import type { ServerMessage } from './protocol'

export interface PersistedSession {
  sessionId: string
  playerId: string
  roomId: string
  token: string
  nickname: string
}

const KEY = 'ledger.room.session'

function isBootstrap(m: ServerMessage): m is Extract<ServerMessage, { type: 'session_bootstrap' }> {
  return m.type === 'session_bootstrap'
}

export function storeSession(rec: PersistedSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(rec))
  } catch {
    /* 隐私模式等场景下忽略 */
  }
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedSession
    if (!parsed.sessionId || !parsed.token || !parsed.roomId) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

/** 从服务器消息中提取会话凭据并持久化 */
export function captureSessionCredential(msg: ServerMessage): PersistedSession | null {
  if (isBootstrap(msg)) {
    const rec: PersistedSession = {
      sessionId: msg.sessionId,
      playerId: msg.playerId,
      roomId: msg.roomId,
      token: msg.token,
      nickname: '',
    }
    storeSession(rec)
    return rec
  }
  return null
}