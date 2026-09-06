/**
 * RoomClient — 浏览器 WebSocket 客户端（计划 §44）
 *
 * 封装浏览器原生 WebSocket：
 * - 连接 / 断开 / 自动重连
 * - 发送 ClientMessage（会话鉴权自动附加的可选项由调用方传入）
 * - 订阅 ServerMessage → 回调
 * - ping 心跳防止代理断连
 */

import type { ClientMessage, ServerMessage } from './protocol'
import type { GameAction } from '@/engine/contract'

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

export interface RoomClientOptions {
  url: string
  onMessage?: (msg: ServerMessage) => void
  onStatusChange?: (status: ConnectionStatus) => void
  onUnexpectedClose?: (hadToken: boolean) => void
  retry?: boolean
}

export class RoomClient {
  private ws: WebSocket | null = null
  private url: string
  private status: ConnectionStatus = 'idle'
  private messageHandler?: (msg: ServerMessage) => void
  private statusHandler?: (s: ConnectionStatus) => void
  private unexpectedCloseHandler?: (hadToken: boolean) => void
  private retry: boolean
  private manualClosed = false
  private pending: ClientMessage[] = []
  /** 自增 requestId；调用方也可显式指定 */
  private seq = 0

  constructor(opts: RoomClientOptions) {
    this.url = opts.url
    this.messageHandler = opts.onMessage
    this.statusHandler = opts.onStatusChange
    this.unexpectedCloseHandler = opts.onUnexpectedClose
    this.retry = opts.retry ?? false
  }

  get isOpen(): boolean {
    return this.status === 'open' && this.ws?.readyState === WebSocket.OPEN
  }

  /** 连接；attach 可选地作为连接建立后立即发送的首条消息（如 join/reconnect） */
  connect(attach?: ClientMessage): void {
    if (this.isOpen) {
      if (attach) this.send(attach)
      return
    }
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return
    }
    this.manualClosed = false
    this.setStatus('connecting')
    const ws = new WebSocket(this.url)
    this.ws = ws
    this.pending = attach ? [attach] : []

    ws.onopen = () => {
      this.setStatus('open')
      this.flushPending()
      // 连接建立后启动心跳
      this.startHeartbeat()
    }
    ws.onmessage = (ev: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(ev.data as string) as ServerMessage
        this.messageHandler?.(parsed)
      } catch {
        /* 忽略非 JSON 帧 */
      }
    }
    ws.onerror = () => this.setStatus('error')
    ws.onclose = () => {
      const hadToken = Boolean(this.pending.length)
      const unexpected = !this.manualClosed
      this.setStatus('closed')
      this.stopHeartbeat()
      if (!this.manualClosed && this.retry) {
        window.setTimeout(() => this.connect(), 800)
      }
      // 主动断开不应触发调用方的自动重连，否则离开房间/清理会话时
      // 会在后台重新建立连接，表现为页面一直卡在“进入房间”。
      if (unexpected) this.unexpectedCloseHandler?.(hadToken)
      this.ws = null
    }
  }

  /** 主动断开（不自动重连） */
  disconnect(): void {
    this.manualClosed = true
    this.stopHeartbeat()
    this.pending = []
    if (this.ws) {
      try {
        this.ws.close(1000, 'client clear')
      } catch {
        /* noop */
      }
      this.ws = null
    }
    this.setStatus('closed')
  }

  send(msg: ClientMessage): void {
    if (this.isOpen && this.ws) {
      this.ws.send(JSON.stringify(msg))
    } else {
      // 尚未就绪：缓冲，等待 onopen 后 flush
      this.pending.push(msg)
    }
  }

  /** 生成唯一 requestId */
  nextRequestId(): string {
    this.seq += 1
    return `${Date.now().toString(36)}-${this.seq}-${Math.random().toString(36).slice(2, 7)}`
  }

  /** 便捷封装：提交 GameAction（计划 §13，requestId 必须） */
  sendGameAction(action: GameAction, requestId = this.nextRequestId()): string {
    this.send({ type: 'game_action', requestId, action })
    return requestId
  }

  private flushPending(): void {
    if (this.pending.length === 0) return
    const batch = this.pending.splice(0, this.pending.length)
    for (const msg of batch) {
      if (this.isOpen && this.ws) this.ws.send(JSON.stringify(msg))
    }
  }

  private heartbeatTimer: number | null = null
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isOpen) this.send({ type: 'ping', t: Date.now() })
    }, 25_000)
  }
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private setStatus(s: ConnectionStatus): void {
    this.status = s
    this.statusHandler?.(s)
  }
}
