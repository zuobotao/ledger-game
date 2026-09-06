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
import {
  JoinStateMachine,
  type JoinRoomResult,
  type JoinStatus,
} from '@/network/join'
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

/** 加入房间整体超时（计划 §12：timeout 属于失败条件） */
const JOIN_TIMEOUT_MS = 10_000

export const useMultiplayerStore = defineStore('multiplayer', () => {
  // ==================== 会话 & 连接 ====================
  const status = ref<ConnectionStatus>('idle')
  const session = ref<PersistedSession | null>(null)
  const nickname = ref('')
  const lastError = ref<string | null>(null)
  const lastErrorCode = ref<ErrorCode | null>(null)

  // ==================== 加入房间流程（计划 §11.1 状态机） ====================
  const joinStatus = ref<JoinStatus>('idle')

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
  let joinMachine: JoinStateMachine | null = null
  let joinResolve: ((r: JoinRoomResult) => void) | null = null
  let joinTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttemptActive = false

  function setStatus(s: ConnectionStatus) {
    status.value = s
    // 加入流程中：socket 打开 → 视为 join_room 已发出；异常断开 → 判定失败
    if (joinMachine?.isActive) {
      if (s === 'open') joinMachine.onSocketOpen()
      else if (s === 'error' || s === 'closed') failJoin('连接断开，加入失败')
    }
  }

  function ensureJoinMachine(): JoinStateMachine {
    if (joinMachine) return joinMachine
    joinMachine = new JoinStateMachine({
      onStatusChange: (s) => {
        joinStatus.value = s
      },
    })
    return joinMachine
  }

  function startJoinTimer(): void {
    clearJoinTimer()
    joinTimer = setTimeout(() => {
      if (joinResolve) failJoin('加入超时，请检查房间码后重试')
    }, JOIN_TIMEOUT_MS)
  }
  function clearJoinTimer(): void {
    if (joinTimer !== null) {
      clearTimeout(joinTimer)
      joinTimer = null
    }
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectAttemptActive = false
  }

  function startReconnectTimer(): void {
    clearReconnectTimer()
    reconnectAttemptActive = true
    reconnectTimer = setTimeout(() => {
      if (!reconnectAttemptActive) return
      clearReconnectTimer()
      lastError.value = '恢复房间超时，请检查网络后重试'
      lastErrorCode.value = null
      destroyClient()
    }, JOIN_TIMEOUT_MS)
  }

  /** 加入成功：bootstrap + snapshot + 自我身份 全部到位 */
  function completeJoin(): void {
    if (!joinResolve) return
    clearJoinTimer()
    const resolve = joinResolve
    joinResolve = null
    resolve({ ok: true, room: room.value ?? undefined })
  }

  /** 加入失败：记录错误、切断残留连接、以失败结果返回 */
  function failJoin(error: string, code?: ErrorCode): void {
    if (!joinResolve) return
    clearJoinTimer()
    joinMachine?.fail()
    lastError.value = error
    lastErrorCode.value = code ?? null
    const resolve = joinResolve
    joinResolve = null
    destroyClient()
    resolve({ ok: false, error, code })
  }

  /** 取消进行中的加入（不写错误提示，用于离开/退出场景） */
  function abortJoin(): void {
    if (!joinResolve) return
    clearJoinTimer()
    joinMachine?.reset()
    const resolve = joinResolve
    joinResolve = null
    resolve({ ok: false, error: '已取消加入' })
  }

  function handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'room_snapshot':
        room.value = msg.room
        roomPaused.value = msg.room.status === 'paused'
        // 刷新我方 ready 状态（以服务器为准）
        const self = findSelf(msg.room.players)
        if (self) ready.value = self.status === 'ready'
        // 加入流程：快照到位且能找到自己（plan §11.1）
        if (joinMachine?.isActive) {
          joinMachine.onSnapshot(Boolean(self))
          if (joinMachine.current === 'joined') completeJoin()
        }
        break
      case 'session_bootstrap': {
        const cred = captureSessionCredential(msg)
        if (cred) {
          cred.nickname = nickname.value || cred.nickname
          storeSession(cred)
          session.value = cred
        }
        room.value = msgFromBootstrap(msg) ?? room.value
        // 加入流程：身份确认（plan §11.1）
        if (joinMachine?.isActive) {
          joinMachine.onBootstrap()
          // 若快照早于 bootstrap 到达（异常顺序），身份到位后补做一次自我确认
          if (joinMachine.isActive && room.value) {
            joinMachine.onSnapshot(Boolean(findSelf(room.value.players)))
          }
          if (joinMachine.current === 'joined') completeJoin()
        }
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
        clearReconnectTimer()
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
          // 会话已被服务端回收时，继续自动重连只会造成死循环。
          if (msg.code === 'SESSION_EXPIRED' || msg.code === 'ROOM_NOT_FOUND' || msg.code === 'ROOM_CLOSED') {
            clearSession()
            session.value = null
            destroyClient()
          }
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
        if (reconnectAttemptActive) clearReconnectTimer()
        lastError.value = msg.message
        lastErrorCode.value = msg.code
        // 加入流程：服务端明确拒绝（房间不存在 / 已满 / 已开始…）
        if (joinMachine?.isActive) failJoin(msg.message, msg.code)
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

  /**
   * 通过房间码加入房间（计划 §12：真正可 await）
   *
   * 返回的 Promise 只有在满足全部成功条件后才 resolve(ok=true)：
   *   socket open → join_room 发出 → session_bootstrap → room_snapshot → 快照中找到自己
   * 失败条件（resolve(ok=false)）：服务端错误 / 网络错误 / 超时 / 房间不存在 / 房间已满。
   */
  async function joinRoom(opts: { roomCode: string; nickname: string; sessionId?: string }): Promise<JoinRoomResult> {
    nickname.value = opts.nickname
    lastError.value = null
    lastErrorCode.value = null
    const sessId = opts.sessionId ?? genSessionId()
    session.value = { sessionId: sessId, playerId: '', roomId: '', token: '', nickname: opts.nickname }
    room.value = null
    destroyClient()
    ensureJoinMachine()
    joinMachine!.start()
    return new Promise<JoinRoomResult>((resolve) => {
      joinResolve = resolve
      connect({ type: 'join_room', roomCode: opts.roomCode.trim().toUpperCase(), sessionId: sessId, nickname: opts.nickname })
      startJoinTimer()
    })
  }

  /** 恢复本地会话：若有已持久化凭据，自动重连原房间 */
  function autoReconnect(): boolean {
    const saved = loadSession()
    if (!saved) {
      lastError.value = '没有可恢复的房间会话，请重新加入房间'
      lastErrorCode.value = null
      return false
    }
    lastError.value = null
    lastErrorCode.value = null
    session.value = saved
    nickname.value = saved.nickname
    room.value = null
    startReconnectTimer()
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
    abortJoin()
    clearReconnectTimer()
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
    abortJoin()
    destroyClient()
  }

  return {
    // state
    status,
    joinStatus,
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
