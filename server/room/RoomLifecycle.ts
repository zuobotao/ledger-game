/**
 * RoomLifecycle — 房间生命周期状态机与过期策略
 *
 * 生命周期：CREATED → WAITING → STARTING → PLAYING → FINISHED → CLOSED
 * 异常：PLAYING ↔ PAUSED
 *
 * 过期策略（时间参数化，不硬编码到业务逻辑）：
 * - WAITING + 无玩家 30min → CLOSED
 * - PLAYING + 全员离线 5min → PAUSED
 * - PAUSED 长期无人 → CLOSED
 */

import type { RoomStatus } from '../../src/network/protocol'
import {
  ALL_OFFLINE_PAUSE_MS,
  PAUSED_CLOSE_MS,
  PLAYER_GRACE_MS,
  WAITING_EXPIRY_MS,
} from './Room'

export const ROOM_STATUS_FLOW: Partial<Record<RoomStatus, RoomStatus[]>> = {
  waiting: ['starting', 'closed'],
  starting: ['playing', 'waiting'],
  playing: ['paused', 'finished', 'closed'],
  paused: ['playing', 'closed'],
  finished: ['closed'],
  closed: [],
}

export function canTransition(from: RoomStatus, to: RoomStatus): boolean {
  const allowed = ROOM_STATUS_FLOW[from]
  return !!allowed && allowed.includes(to)
}

export function assertCanTransition(from: RoomStatus, to: RoomStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`非法状态流转: ${from} → ${to}`)
  }
}

export interface LifecycleSnapshot {
  status: RoomStatus
  waitingExpiryMs: number
  playerGraceMs: number
  allOfflinePauseMs: number
  pausedCloseMs: number
}

export const LIFECYCLE_CONSTANTS: LifecycleSnapshot = {
  status: 'waiting',
  waitingExpiryMs: WAITING_EXPIRY_MS,
  playerGraceMs: PLAYER_GRACE_MS,
  allOfflinePauseMs: ALL_OFFLINE_PAUSE_MS,
  pausedCloseMs: PAUSED_CLOSE_MS,
}

/**
 * WAITING 且无玩家超过 waitingExpiry → shouldClose
 * WAITING 且进入 STARTING → waitingExpiry 重置为 now（等待 start，超长则回退/关闭）
 * PLAYING 且全部玩家离线超过 allOfflinePause → shouldPause
 * PAUSED 且长期无连接超过 pausedClose → shouldClose
 */
export interface RoomActivity {
  status: RoomStatus
  lastPlayerJoinAt?: number
  lastActivityAt?: number
  connectedCount: number
  now: number
}

export function evaluateExpiry(a: RoomActivity): { action: 'none' | 'close' | 'pause' } {
  if (a.status === 'waiting') {
    const lastFill = a.lastPlayerJoinAt ?? a.lastActivityAt ?? a.now
    if (a.connectedCount === 0 && a.now - lastFill >= WAITING_EXPIRY_MS) {
      return { action: 'close' }
    }
    return { action: 'none' }
  }

  if (a.status === 'playing') {
    if (a.connectedCount === 0 && a.now - (a.lastActivityAt ?? a.now) >= ALL_OFFLINE_PAUSE_MS) {
      return { action: 'pause' }
    }
    return { action: 'none' }
  }

  if (a.status === 'paused') {
    if (a.now - (a.lastActivityAt ?? a.now) >= PAUSED_CLOSE_MS) {
      return { action: 'close' }
    }
    return { action: 'none' }
  }

  return { action: 'none' }
}