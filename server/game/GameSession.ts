/**
 * GameSession — 房间内的权威游戏会话（计划 §20/§21）。
 *
 * 负责：
 * - 持有无头 store（独立 Pinia 实例），作为 GameState 的唯一权威载体。
 * - 将协议 GameAction 经 actionMap 应用到 store，执行 Turn / PendingAction 校验。
 * - 维护 sequence 与请求去重（requestId，计划 §13），剩余 sequence 供 Replay 演进。
 * - 产出快照（GameState + TurnContext + StateHash）广播给全体玩家。
 *
 * 边界（禁止事项 §1/§2/§3）：不重写规则、不触碰 WebSocket、不直接改客户端 State。
 */

import type { GameAction, GameEvent, GameReplay } from '@/engine/contract'
import type { GameConfig, GameState, PlayerSetup } from '@/types/game'
import { calculateStateHash, calculateReplayHash } from '@/engine/stateHash'
import type {
  GameSessionDto,
  GameSessionStatus,
  GameEventRecord,
  GameFinalResult,
  TurnContext,
} from '@/network/protocol'
import { createGameHost } from './headlessStore'
import { applyGameAction } from './actionMap'
import { buildGameState, buildTurnContext } from './snapshot'

export interface SessionPlayerSetup {
  name: string
  colorId: string
  careerId: string
  dreamId?: string
}

export interface GameSessionSnapshot {
  sequence: number
  session: GameSessionDto
  state: ReturnType<typeof buildGameState>
  turn: TurnContext
  stateHash: string
}

export interface SessionActionResult {
  sequence: number
  success: boolean
  error?: string
  events: GameEvent[]
  financialDeltas: Record<string, unknown>
  warnings: unknown[]
  messages: unknown[]
  state: ReturnType<typeof buildGameState>
  turn: TurnContext
  stateHash: string
}

export interface ReplayVerification {
  passed: boolean
  expectedHash: string
  actualHash: string
  error?: string
}

export interface GameSessionOptions {
  id: string
  roomId: string
  seed: number
  version: string
  config: GameConfig
  players: SessionPlayerSetup[]
  startedAt?: number
}

export class GameSession {
  readonly id: string
  readonly roomId: string
  readonly seed: number
  readonly version: string
  private store: GameStore
  private host: ReturnType<typeof createGameHost>
  private _status: GameSessionStatus = 'playing'
  private _startedAt: number
  private _finishedAt?: number
  private sequence = 0
  private readonly requestResults = new Map<string, SessionActionResult>()
  readonly actionLog: GameAction[] = []
  private eventSequence = 0
  private readonly eventLog: GameEventRecord[] = []
  private initialState: GameState
  private readonly opts: GameSessionOptions

  constructor(opts: GameSessionOptions) {
    this.opts = opts
    this.id = opts.id
    this.roomId = opts.roomId
    this.seed = opts.seed
    this.version = opts.version
    this._startedAt = opts.startedAt ?? Date.now()
    // 确定性宿主：创建会话前复位随机源，使相同 seed + 相同 actionLog 可重建（Phase 7）
    this.host = createGameHost({ seed: this.seed })
    this.store = this.host.store

    const config: GameConfig = {
      ...opts.config,
      playerCount: opts.config.playerCount || opts.players.length,
    }
    const setups: PlayerSetup[] = opts.players.map((p) => ({
      name: p.name,
      colorId: p.colorId,
      careerId: p.careerId,
      dreamId: p.dreamId,
      isAI: false,
    }))
    this.store.startGame(config, setups)
    // 捕获对局初始状态（Replay 的起点）；此刻 randomness 从 seed 起步，确定性成立
    this.initialState = deepCloneState(buildGameState(this.store))
    this.recordEvents([this.makeGameStartedEvent()])
  }

  get status(): GameSessionStatus {
    return this._status
  }

  get currentPlayerId(): string {
    return this.store.currentPlayer?.id ?? ''
  }

  get startedAt(): number {
    return this._startedAt
  }

  get finishedAt(): number | undefined {
    return this._finishedAt
  }

  /** 由 store 当前状态判定是否结束，并同步会话状态 */
  private syncFinished(): void {
    if (this._status !== 'finished' && (this.store.winnerId || this.store.phase === 'finished')) {
      this._status = 'finished'
      this._finishedAt = Date.now()
    }
  }

  /** 返回当前快照（不做任何变异） */
  snapshot(): GameSessionSnapshot {
    this.syncFinished()
    const state = buildGameState(this.store)
    const turn = buildTurnContext(this.store)
    return {
      sequence: this.sequence,
      session: this.toDto(),
      state,
      turn,
      stateHash: calculateStateHash(state),
    }
  }

  toDto(): GameSessionDto {
    return {
      id: this.id,
      roomId: this.roomId,
      seed: this.seed,
      version: this.version,
      turnNumber: this.store.turnNumber,
      currentPlayerId: this.currentPlayerId,
      status: this._status,
      startedAt: this._startedAt,
    }
  }

  /**
   * 提交一个 GameAction。requestId 用于幂等去重（重复提交返回上次结果）。
   */
  dispatch(action: GameAction, requestId?: string): SessionActionResult {
    // requestId 幂等：命中缓存直接返回上次结果，不重复执行
    if (requestId) {
      const cached = this.requestResults.get(requestId)
      if (cached) return cached
    }

    const outcome = applyGameAction(this.store, action)
    this.actionLog.push(action)

    this.syncFinished()

    const events = this.collectEvents(action)
    const state = buildGameState(this.store)
    const turn = buildTurnContext(this.store)
    const result: SessionActionResult = {
      sequence: ++this.sequence,
      success: outcome.ok,
      error: outcome.ok ? undefined : outcome.error,
      events,
      financialDeltas: this.collectDeltas(),
      warnings: this.lastWarnings(),
      messages: [],
      state,
      turn,
      stateHash: calculateStateHash(state),
    }

    if (requestId) {
      this.requestResults.set(requestId, result)
      // 去重表只保留尾部，避免无界增长
      if (this.requestResults.size > 64) {
        const eldest = this.requestResults.keys().next().value
        if (eldest !== undefined) this.requestResults.delete(eldest)
      }
    }
    this.recordEvents(events)
    return result
  }

  /** 命中已提交的 requestId 时返回缓存结果（幂等） */
  lastResultFor(requestId?: string): SessionActionResult | null {
    if (!requestId) return null
    return this.requestResults.get(requestId) ?? null
  }

  private collectEvents(action: GameAction): GameEvent[] {
    const events: GameEvent[] = []
    if (action.type === 'roll_dice' && this.store.lastDiceValues.length > 0) {
      events.push({
        type: 'dice_rolled',
        timestamp: Date.now(),
        playerId: this.store.currentPlayer?.id ?? '',
        values: [...this.store.lastDiceValues],
        total: this.store.lastRoll,
      })
    }
    if (this._status === 'finished') {
      events.push({
        type: 'game_over',
        timestamp: Date.now(),
        reason: (this.store.gameEndReason ?? 'victory') as 'victory' | 'bankrupt' | 'retirement',
        winnerId: this.store.winnerId ?? undefined,
      })
    }
    return events
  }

  private collectDeltas(): Record<string, unknown> {
    const lar = this.store.lastActionResult
    if (!lar || !lar.delta) return {}
    const pid = this.store.currentPlayer?.id
    return pid ? { [pid]: lar.delta } : {}
  }

  private lastWarnings(): unknown[] {
    return this.store.lastActionResult?.warnings ?? []
  }

  private makeGameStartedEvent(): GameEvent {
    return {
      type: 'game_started',
      timestamp: Date.now(),
      config: this.store.config,
      playerCount: this.store.players.length,
    }
  }

  /** 把一批 GameEvent 记入 Room EventLog（Phase 7：Replay / 审计的数据源） */
  private recordEvents(events: GameEvent[]): void {
    for (const ev of events) {
      this.eventSequence++
      this.eventLog.push({
        id: `${this.id}-e${this.eventSequence}`,
        roomId: this.roomId,
        gameSessionId: this.id,
        sequence: this.eventSequence,
        type: ev.type,
        playerId: (ev as { playerId?: string }).playerId,
        payload: ev,
        timestamp: ev.timestamp ?? Date.now(),
      })
    }
  }

  // ==================== Phase 7：Replay / StateHash / action sequence / final result ====================

  /** 当前对局内已提交的 action 序列（副本，语义与 sequence 对齐） */
  getActionLog(): GameAction[] {
    return [...this.actionLog]
  }

  /** Room EventLog（副本）：seed + actions + events 可完整重建对局 */
  getEventLog(): GameEventRecord[] {
    return [...this.eventLog]
  }

  /** 对局初始状态（Replay 起点，与 seed 组合可确定重建全部后续状态） */
  getInitialState(): GameState {
    return deepCloneState(this.initialState)
  }

  /** 一局结束后的结果摘要：玩家最终财务 + 权威最终 StateHash */
  getFinalResult(): GameFinalResult {
    this.syncFinished()
    const snap = this.snapshot()
    const players = snap.state.players.map((p) => ({
      playerId: p.id,
      name: p.name,
      phase: p.phase,
      cash: p.cash,
      savings: p.savings,
      passiveIncome: p.passiveIncome,
      cashFlow: p.cashFlow,
      totalIncome: p.totalIncome,
      totalExpenses: p.totalExpenses,
      childrenCount: p.childrenCount,
      netWorth: computeNetWorth(p),
      isBankrupt: p.isBankrupt,
    }))
    return {
      winnerId: snap.state.winnerId ?? undefined,
      gameEndReason: (snap.state.gameEndReason as 'victory' | 'bankrupt' | 'retirement') ?? undefined,
      turnNumber: snap.session.turnNumber,
      stateHash: snap.stateHash,
      startedAt: this._startedAt,
      finishedAt: this._finishedAt ?? Date.now(),
      durationMs: (this._finishedAt ?? Date.now()) - this._startedAt,
      players,
    }
  }

  /** 导出 GameReplay（含 seed / initialState / actions / events / finalStateHash）与完整性哈希 */
  getReplay(): GameReplay & { replayHash: string; actionCount: number; eventCount: number } {
    const snap = this.snapshot()
    const replay: GameReplay = {
      version: this.version,
      seed: this.seed,
      initialState: this.getInitialState(),
      actions: this.getActionLog(),
      events: this.eventLog.map((r) => r.payload as GameEvent),
      finalStateHash: snap.stateHash,
    }
    return {
      ...replay,
      replayHash: calculateReplayHash(replay),
      actionCount: this.actionLog.length,
      eventCount: this.eventLog.length,
    }
  }

  /**
   * 回放完整性校验：以相同 seed 重建一个全新宿主，按记录顺序重放 actionLog，
   * 比较重建后的最终 StateHash 与当前会话是否一致（计划 §29/§30）。
   */
  verifyReplayIntegrity(): ReplayVerification {
    const expected = this.snapshot().stateHash
    const fresh = new GameSession(this.opts)
    for (const action of this.actionLog) {
      fresh.dispatch(action)
    }
    const actual = fresh.snapshot().stateHash
    return {
      passed: actual === expected,
      expectedHash: expected,
      actualHash: actual,
      error: actual === expected ? undefined : '回放重建状态与权威会话不一致',
    }
  }
}

// ==================== 本地辅助 ====================

/** 深拷贝 GameState（Replay 需要不变的 initialState） */
function deepCloneState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state))
}

/** 玩家净资产估算：现金 + 存款 + 资产成本 - 负债金额 */
function computeNetWorth(p: {
  cash: number
  savings: number
  assets: { cost: number; quantity?: number }[]
  liabilities: { amount: number }[]
}): number {
  const assets = p.assets.reduce((sum, a) => sum + a.cost * (a.quantity ?? 1), 0)
  const debts = p.liabilities.reduce((sum, l) => sum + l.amount, 0)
  return p.cash + p.savings + assets - debts
}