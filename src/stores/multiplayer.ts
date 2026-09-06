/**
 * MultiplayerStore — 多人房间客户端状态（计划 §44 / §6）
 *
 * 统一的多人状态源：连接 / 房间 / 会话凭据 / 权威 GameState / 回合上下文。
 * 客户端不接触规则状态机，一切 GameState 由服务器广播并经本 store 镜像。
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { RoomClient, type ConnectionStatus } from '@/network/RoomClient'
import { roomWsUrl, roomHttpBase } from '@/network/endpoint'
import {
  loadSession,
  storeSession,
  clearSession,
  captureSessionCredential,
  type PersistedSession,
} from '@/network/roomSession'
import type {
  ClientMessage,
  GameSessionDto,
  RoomDto,
  RoomPlayer,
  ServerMessage,
  TurnContext,
  ErrorCode,
} from '@/network/protocol'
import type { GameState, Player } from '@/types/game'
import type { GameAction, GameEvent } from '@/engine/contract'

export interface ActionResultSummary {
  sequence: number
  success: boolean
  error?: string
  events: GameEvent[]
  state: GameState
  turn: TurnContext
  stateHash: string
  financialDeltas: Record<string, unknown>
}

function genSessionId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export const useMultiplayerStore = defineStore('multiplayer', () => {
  // ==================== 会话 & 连接 ====================
  const status = ref<ConnectionStatus>('idle')
  const session = ref<PersistedSession | null>(null)
  const nickname = ref('')
  const lastError = ref<string | null>(null)
  const lastErrorCode = ref<ErrorCode | null>(null)

  // ==================== 房间 ====================
  const room = ref<RoomDto | null>(null)
  const sessionInfo = ref<GameSessionDto | null>(null)

  // ==================== 权威游戏状态（服务器广播镜像） ====================
  const gameState = ref<GameState | null>(null)
  const turn = ref<TurnContext | null>(null)
  const playerMap = ref<Record<string, string>>({})
  const sequence = ref(0)
  const stateHash = ref('')
  const lastEvents = ref<GameEvent[]>([])
  const lastResult = ref<ActionResultSummary | null>(null)
  /** 由本客户端主动提交、待服务器回包的 requestId（用于定位 action_result 是否为"我"的操作） */
  const pendingMyRequest = ref<string | null>(null)

  const finished = ref(false)
  const finishedWinnerRoomPlayerId = ref<string | null>(null)
  const finishedReason = ref<string | undefined>(undefined)
  const finalStateHash = ref('')
  const finishedReplayHash = ref('')
  const finishedActionCount = ref(0)
  const finishedEventCount = ref(0)
  const roomPaused = ref(false)
  const ready = ref(false)

  // ==================== 客户端实例（非响应式） ====================
  let client: RoomClient | null = null

  function setStatus(s: ConnectionStatus) {
    status.value = s
  }

  function handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'room_snapshot':
        room.value = msg.room
        roomPaused.value = msg.room.status === 'paused'
        // 刷新我方 ready 状态（以服务器为准）
        const self = findSelf(msg.room.players)
        if (self) ready.value = self.status === 'ready'
        break
      case 'session_bootstrap': {
        const cred = captureSessionCredential(msg)
        if (cred) {
          cred.nickname = nickname.value || cred.nickname
          storeSession(cred)
          session.value = cred
        }
        room.value = msgFromBootstrap(msg) ?? room.value
        break
      }
      case 'player_joined':
      case 'player_left':
      case 'player_ready':
      case 'host_changed':
        // 这些变化均反映在紧随其后的 room_snapshot 中，这里无需单独处理
        break
      case 'game_started':
        sessionInfo.value = msg.session
        gameState.value = msg.state
        playerMap.value = msg.playerMap
        turn.value = msg.turn ?? deriveTurn(msg.state)
        stateHash.value = ''
        finished.value = false
        roomPaused.value = false
        break
      case 'game_snapshot':
        sessionInfo.value = msg.session
        gameState.value = msg.state
        turn.value = msg.turn
        sequence.value = msg.sequence
        stateHash.value = msg.stateHash
        break
      case 'action_result':
        gameState.value = msg.state
        turn.value = msg.turn
        sequence.value = msg.sequence
        stateHash.value = msg.stateHash
        lastEvents.value = msg.events
        lastResult.value = {
          sequence: msg.sequence,
          success: msg.success,
          error: msg.error,
          events: msg.events,
          state: msg.state,
          turn: msg.turn,
          stateHash: msg.stateHash,
          financialDeltas: msg.financialDeltas,
        }
        if (msg.requestId && msg.requestId === pendingMyRequest.value) {
          pendingMyRequest.value = null
        }
        if (msg.success) lastError.value = null
        break
      case 'reconnect_snapshot':
        if (msg.ok) {
          room.value = msg.room ?? room.value
          sessionInfo.value = msg.session ?? sessionInfo.value
          if (msg.state) gameState.value = msg.state
          if (msg.turn) turn.value = msg.turn
          if (msg.playerMap) playerMap.value = msg.playerMap
          if (msg.stateHash) stateHash.value = msg.stateHash
          if (typeof msg.sequence === 'number') sequence.value = msg.sequence
        } else {
          lastError.value = msg.error ?? '会话无效'
          lastErrorCode.value = msg.code ?? null
        }
        break
      case 'game_finished':
        finished.value = true
        finishedWinnerRoomPlayerId.value = msg.winnerId ?? null
        finishedReason.value = msg.reason
        finalStateHash.value = msg.finalStateHash
        finishedReplayHash.value = msg.replayHash ?? ''
        finishedActionCount.value = msg.actionCount ?? 0
        finishedEventCount.value = msg.eventCount ?? 0
        break
      case 'error':
        lastError.value = msg.message
        lastErrorCode.value = msg.code
        break
      case 'pong':
        break
    }
  }

  /** 从 session_bootstrap 附带的 room_snapshot（无）中取房间；通常房间通过 room_snapshot 广播到达 */
  function msgFromBootstrap(_msg: { type: 'session_bootstrap' }): RoomDto | null {
    return null
  }

  function findSelf(players: RoomPlayer[]): RoomPlayer | undefined {
    const pid = session.value?.playerId
    return players.find((p) => p.playerId === pid)
  }

  /** 从初始 GameState 推导回合上下文（服务器 game_started 未带 turn，按 currentPlayerIndex 推导） */
  function deriveTurn(state: GameState): TurnContext {
    const current = state.players[state.currentPlayerIndex]
    return {
      currentPlayerId: current?.id ?? '',
      pendingAction: state.pendingAction?.type ?? null,
      allowedActions: state.pendingAction ? [] : ['roll_dice', 'end_turn'],
    }
  }

  // ==================== 响应式派生 ====================

  const selfRoomPlayer = computed<RoomPlayer | null>(() =>
    room.value ? findSelf(room.value.players) ?? null : null,
  )
  const myGamePlayerId = computed<string | null>(() => {
    const rid = session.value?.playerId
    return rid ? playerMap.value[rid] ?? null : null
  })
  const myGamePlayer = computed<Player | null>(() => {
    if (!gameState.value) return null
    const mid = myGamePlayerId.value
    return gameState.value.players.find((p) => p.id === mid) ?? null
  })
  const isHost = computed<boolean>(() => Boolean(room.value && room.value.hostPlayerId === session.value?.playerId))
  const isMyTurn = computed<boolean>(() =>
    Boolean(turn.value && myGamePlayerId.value === turn.value.currentPlayerId),
  )
  const hostPlayer = computed<RoomPlayer | null>(() => {
    if (!room.value) return null
    return room.value.players.find((p) => p.playerId === room.value!.hostPlayerId) ?? null
  })
  const canStart = computed<boolean>(() => {
    if (!isHost.value || !room.value) return false
    return room.value.players.length >= 2 && room.value.players.every((p) => p.status === 'ready' && !!p.careerId)
  })
  const allReady = computed<boolean>(() => {
    if (!room.value) return false
    return room.value.players.length >= 1 && room.value.players.every((p) => p.status === 'ready')
  })

  // ==================== 动作 ====================

  function ensureClient(): RoomClient {
    if (client) return client
    client = new RoomClient({
      url: roomWsUrl(),
      onMessage: handleMessage,
      onStatusChange: setStatus,
      onUnexpectedClose: (hadToken) => {
        // 意外断线：若仍持有 token 则自动重连
        if (session.value) {
          attemptReconnect()
        }
      },
      retry: false,
    })
    return client
  }

  function destroyClient(): void {
    client?.disconnect()
    client = null
  }

  function connect(attach?: ClientMessage): void {
    ensureClient().connect(attach)
  }

  function send(msg: ClientMessage): void {
    if (!client) return
    client.send(msg)
    if (msg.type === 'ready') ready.value = msg.ready
  }

  /** HTTP POST 创建房间，随后用返回的凭据重连（绑定房主座位） */
  async function createRoom(opts: { nickname: string; sessionId?: string; name?: string; maxPlayers?: number }): Promise<boolean> {
    const sessId = opts.sessionId ?? genSessionId()
    nickname.value = opts.nickname
    lastError.value = null
    try {
      const res = await fetch(`${roomHttpBase()}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessId,
          nickname: opts.nickname,
          name: opts.name,
          maxPlayers: opts.maxPlayers,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        lastError.value = body?.error ?? `创建房间失败（HTTP ${res.status}）`
        return false
      }
      const data = (await res.json()) as {
        room: RoomDto
        session: { sessionId: string; playerId: string; token: string }
      }
      const rec: PersistedSession = {
        sessionId: data.session.sessionId,
        playerId: data.session.playerId,
        roomId: data.room.id,
        token: data.session.token,
        nickname: opts.nickname,
      }
      storeSession(rec)
      session.value = rec
      room.value = data.room
      ready.value = false
      destroyClient()
      connect({ type: 'reconnect', sessionId: rec.sessionId, roomId: rec.roomId, token: rec.token })
      return true
    } catch {
      lastError.value = '无法连接到房间服务器，请确认服务已启动'
      return false
    }
  }

  /** 通过房间码加入房间 */
  async function joinRoom(opts: { roomCode: string; nickname: string; sessionId?: string }): Promise<void> {
    nickname.value = opts.nickname
    lastError.value = null
    const sessId = opts.sessionId ?? genSessionId()
    session.value = { sessionId: sessId, playerId: '', roomId: '', token: '', nickname: opts.nickname }
    destroyClient()
    connect({ type: 'join_room', roomCode: opts.roomCode.trim().toUpperCase(), sessionId: sessId, nickname: opts.nickname })
  }

  /** 恢复本地会话：若有已持久化凭据，自动重连原房间 */
  function autoReconnect(): boolean {
    const saved = loadSession()
    if (!saved) return false
    session.value = saved
    nickname.value = saved.nickname
    connect({ type: 'reconnect', sessionId: saved.sessionId, roomId: saved.roomId, token: saved.token })
    return true
  }

  function attemptReconnect(): void {
    const s = session.value
    if (!s || !s.token) return
    connect({ type: 'reconnect', sessionId: s.sessionId, roomId: s.roomId, token: s.token })
  }

  function setSetup(careerId: string, dreamId?: string, colorId?: string): void {
    send({ type: 'set_player_setup', careerId, dreamId, colorId })
  }

  function setReady(readyFlag: boolean): void {
    ready.value = readyFlag
    send({ type: 'ready', ready: readyFlag })
  }

  function startGame(): void {
    send({ type: 'start_game' })
  }

  /** 提交 GameAction（带 requestId，计划 §13） */
  function dispatch(action: GameAction): void {
    if (!client) return
    const rid = client.nextRequestId()
    pendingMyRequest.value = rid
    client.sendGameAction(action, rid)
  }

  function leaveRoom(): void {
    if (client) client.send({ type: 'leave_room' })
    clearSession()
    session.value = null
    room.value = null
    gameState.value = null
    turn.value = null
    sessionInfo.value = null
    playerMap.value = {}
    finished.value = false
    destroyClient()
  }

  function resetError(): void {
    lastError.value = null
    lastErrorCode.value = null
  }

  /** 退出当前对局视图（保留连接，便于回到大厅/再次加入） */
  function dispose(): void {
    destroyClient()
  }

  return {
    // state
    status,
    session,
    nickname,
    lastError,
    lastErrorCode,
    room,
    sessionInfo,
    gameState,
    turn,
    playerMap,
    sequence,
    stateHash,
    lastEvents,
    lastResult,
    pendingMyRequest,
    finished,
    finishedWinnerRoomPlayerId,
    finishedReason,
    finalStateHash,
    finishedReplayHash,
    finishedActionCount,
    finishedEventCount,
    roomPaused,
    ready,
    // derived
    selfRoomPlayer,
    myGamePlayerId,
    myGamePlayer,
    isHost,
    isMyTurn,
    hostPlayer,
    canStart,
    allReady,
    // actions
    createRoom,
    joinRoom,
    autoReconnect,
    attemptReconnect,
    setSetup,
    setReady,
    startGame,
    dispatch,
    leaveRoom,
    resetError,
    dispose,
  }
})