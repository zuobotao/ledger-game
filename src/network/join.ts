/**
 * JoinStateMachine — 加入房间流程状态机（计划 §11.1 / §12）
 *
 * 加入成功的完整条件是三条信息全部到位：
 *   1. session_bootstrap —— 服务端确认身份（playerId / token）
 *   2. room_snapshot     —— 房间快照已到达
 *   3. 快照玩家列表中存在自己 —— 座位已落位
 *
 * 状态流转：
 *   idle → connecting → joining → bootstrapping / syncing → joined
 *   任意进行中状态 → failed（服务端错误 / 网络错误 / 超时）
 *
 * 与 RoomClient 的 ConnectionStatus（纯 socket 层）正交：本状态机关注
 * 「加入房间」这一业务流程，由 store 负责把 socket 事件与协议消息喂进来。
 */

import type { ErrorCode, RoomDto } from './protocol'

export type JoinStatus = 'idle' | 'connecting' | 'joining' | 'bootstrapping' | 'syncing' | 'joined' | 'failed'

/** joinRoom 的返回结果：ok=true 时 room 可用；失败时携带错误信息 */
export interface JoinRoomResult {
  ok: boolean
  room?: RoomDto
  error?: string
  code?: ErrorCode
}

export interface JoinStateMachineOptions {
  onStatusChange?: (status: JoinStatus) => void
}

const ACTIVE: ReadonlySet<JoinStatus> = new Set(['connecting', 'joining', 'bootstrapping', 'syncing'])

export class JoinStateMachine {
  private status: JoinStatus = 'idle'
  private bootstrapped = false
  private synced = false
  private readonly onStatusChange?: (status: JoinStatus) => void

  constructor(opts: JoinStateMachineOptions = {}) {
    this.onStatusChange = opts.onStatusChange
  }

  get current(): JoinStatus {
    return this.status
  }

  /** 一次加入是否仍在进行中 */
  get isActive(): boolean {
    return ACTIVE.has(this.status)
  }

  /** 开始一次新的加入（重置进度） */
  start(): void {
    this.bootstrapped = false
    this.synced = false
    this.transition('connecting')
  }

  /** WebSocket 已打开（join_room 消息已随连接附发） */
  onSocketOpen(): void {
    if (this.status === 'connecting') this.transition('joining')
  }

  /** 收到 session_bootstrap（自我身份确认） */
  onBootstrap(): void {
    if (!this.isActive || this.bootstrapped) return
    this.bootstrapped = true
    this.transition(this.synced ? 'joined' : 'bootstrapping')
  }

  /** 收到 room_snapshot；selfFound = 快照玩家列表中存在自己 */
  onSnapshot(selfFound: boolean): void {
    if (!this.isActive || this.synced || !selfFound) return
    this.synced = true
    this.transition(this.bootstrapped ? 'joined' : 'syncing')
  }

  /** 加入失败（服务端错误 / 网络错误 / 超时） */
  fail(): void {
    if (this.status === 'failed') return
    this.transition('failed')
  }

  /** 结束一次加入，回到空闲 */
  reset(): void {
    this.bootstrapped = false
    this.synced = false
    this.transition('idle')
  }

  private transition(next: JoinStatus): void {
    if (this.status === next) return
    this.status = next
    this.onStatusChange?.(next)
  }
}
