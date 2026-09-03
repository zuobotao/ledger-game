/**
 * ReplayEngine — 回放引擎
 *
 * 职责：
 * - 从 GameEventLog 重建游戏状态
 * - 支持逐步回放（step forward / backward）
 * - 支持跳转到指定事件索引
 * - 支持获取任意时刻的游戏状态快照
 *
 * 原则：
 * - 回放过程不修改原始事件日志
 * - 使用 GameEngine 的 dispatch 方法重建状态
 * - 支持快进/跳转以快速定位关键事件
 */

import type { GameState, Player } from '@/types/game'
import type { GameEvent, GameEventLog, GameResult } from './contract'
import { GameEngine } from './gameEngine'
import { EventLogManager } from './eventLog'
import { recalcPlayerFinancials } from './financialEngine'

// ==================== ReplayState ====================

export interface ReplayState {
  /** 当前回放的事件索引（-1 表示未开始） */
  currentIndex: number
  /** 当前事件总数 */
  totalEvents: number
  /** 当前游戏状态 */
  gameState: GameState | null
  /** 是否已回放完毕 */
  isFinished: boolean
  /** 是否在起始位置 */
  isAtStart: boolean
}

// ==================== ReplayEventDetail ====================

export interface ReplayEventDetail {
  index: number
  event: GameEvent
  /** 事件发生前的状态快照 */
  stateBefore: GameState | null
  /** 事件发生后的状态快照 */
  stateAfter: GameState | null
  /** 关联的玩家名称 */
  playerName?: string
}

// ==================== ReplayEngine ====================

export class ReplayEngine {
  readonly eventLog: EventLogManager
  readonly engine: GameEngine
  readonly initialState: GameState

  private currentIndex: number = -1
  private currentState: GameState | null = null

  /**
   * @param eventLog 事件日志
   * @param initialState 初始游戏状态
   * @param engine 用于重建状态的 GameEngine（可选，默认创建新实例）
   */
  constructor(
    eventLog: EventLogManager,
    initialState: GameState,
    engine?: GameEngine,
  ) {
    this.eventLog = eventLog
    this.initialState = deepCloneState(initialState)
    this.currentState = deepCloneState(initialState)
    this.engine = engine ?? new GameEngine()
  }

  // ==================== State ====================

  getState(): ReplayState {
    return {
      currentIndex: this.currentIndex,
      totalEvents: this.eventLog.count,
      gameState: this.currentState
        ? deepCloneState(this.currentState)
        : null,
      isFinished: this.currentIndex >= this.eventLog.count - 1,
      isAtStart: this.currentIndex < 0,
    }
  }

  getCurrentState(): GameState | null {
    return this.currentState ? deepCloneState(this.currentState) : null
  }

  // ==================== Navigation ====================

  /** 重置到初始状态 */
  reset(): ReplayState {
    this.currentIndex = -1
    this.currentState = deepCloneState(this.initialState)
    return this.getState()
  }

  /** 前进一步（回放下一个事件） */
  stepForward(): ReplayState {
    const nextIndex = this.currentIndex + 1
    if (nextIndex >= this.eventLog.count) {
      return this.getState()
    }

    const event = this.eventLog.at(nextIndex)
    if (!event) return this.getState()

    this.applyEvent(event)
    this.currentIndex = nextIndex
    return this.getState()
  }

  /** 后退一步 */
  stepBackward(): ReplayState {
    if (this.currentIndex < 0) return this.getState()

    // 从头重建到 currentIndex - 1
    this.rebuildTo(this.currentIndex - 1)
    return this.getState()
  }

  /** 跳转到指定事件索引 */
  jumpTo(index: number): ReplayState {
    if (index < -1) index = -1
    if (index >= this.eventLog.count) index = this.eventLog.count - 1

    this.rebuildTo(index)
    return this.getState()
  }

  /** 快进到结尾 */
  skipToEnd(): ReplayState {
    this.rebuildTo(this.eventLog.count - 1)
    return this.getState()
  }

  /** 快进到指定事件类型 */
  skipToEventType(eventType: string): ReplayState {
    const startIndex = this.currentIndex + 1
    for (let i = startIndex; i < this.eventLog.count; i++) {
      const event = this.eventLog.at(i)
      if (event && event.type === eventType) {
        this.rebuildTo(i)
        return this.getState()
      }
    }
    // 没找到，跳到末尾
    return this.skipToEnd()
  }

  /** 快进到指定玩家回合 */
  skipToPlayerTurn(playerId: string): ReplayState {
    const startIndex = this.currentIndex + 1
    for (let i = startIndex; i < this.eventLog.count; i++) {
      const event = this.eventLog.at(i)
      if (event && 'playerId' in event && event.playerId === playerId) {
        this.rebuildTo(i)
        return this.getState()
      }
    }
    return this.skipToEnd()
  }

  // ==================== Detail Access ====================

  /** 获取当前事件的详细信息 */
  getCurrentEventDetail(): ReplayEventDetail | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.eventLog.count) {
      return null
    }

    const event = this.eventLog.at(this.currentIndex)
    if (!event) return null

    // 获取事件前的状态
    const stateBefore = this.currentState

    // 应用事件获取事件后的状态
    const stateAfter = stateBefore ? deepCloneState(stateBefore) : null
    if (stateAfter && event) {
      this.applyEventToState(event, stateAfter)
    }

    const playerName = this.getPlayerName(event)

    return {
      index: this.currentIndex,
      event,
      stateBefore,
      stateAfter,
      playerName,
    }
  }

  /** 获取指定索引的事件详情 */
  getEventDetailAt(index: number): ReplayEventDetail | null {
    const savedIndex = this.currentIndex
    const savedState = this.currentState
      ? deepCloneState(this.currentState)
      : null

    this.rebuildTo(index - 1)
    const detail = this.getCurrentEventDetail()

    // 恢复
    this.currentIndex = savedIndex
    this.currentState = savedState

    return detail
  }

  // ==================== Private ====================

  /** 从头重建状态到指定索引 */
  private rebuildTo(targetIndex: number): void {
    this.currentState = deepCloneState(this.initialState)
    this.currentIndex = -1

    for (let i = 0; i <= targetIndex && i < this.eventLog.count; i++) {
      const event = this.eventLog.at(i)
      if (event && this.currentState) {
        this.applyEventToState(event, this.currentState)
        this.currentIndex = i
      }
    }
  }

  /** 应用事件到当前状态 */
  private applyEvent(event: GameEvent): void {
    if (!this.currentState) return
    this.applyEventToState(event, this.currentState)
  }

  /** 将事件应用到指定状态（纯函数风格，但会修改 state 引用） */
  private applyEventToState(event: GameEvent, state: GameState): void {
    const player = this.findPlayerByEvent(state, event)

    switch (event.type) {
      case 'game_started':
        // 已经在初始状态中处理
        break

      case 'dice_rolled':
        if (player) {
          state.lastRoll = event.total
        }
        break

      case 'player_moved':
        if (player) {
          if (event.phase === 'rat_race') {
            player.ratRacePosition = event.toIndex
          } else {
            player.fastTrackPosition = event.toIndex
          }
        }
        break

      case 'payday_received':
        if (player) {
          player.cash = event.cashAfter
        }
        break

      case 'charity_accepted':
        if (player) {
          player.cash -= event.cost
          player.charityProtection = true
        }
        break

      case 'opportunity_bought':
        if (player) {
          player.cash -= event.cost * event.quantity
          // 资产由外部 store 管理，这里记录现金变化
          recalcPlayerFinancials(player)
        }
        break

      case 'opportunity_sold':
        if (player) {
          player.cash += event.totalRevenue
          recalcPlayerFinancials(player)
        }
        break

      case 'bank_loan_taken':
        if (player) {
          player.cash += event.amount
          recalcPlayerFinancials(player)
        }
        break

      case 'bank_loan_repaid':
        if (player) {
          player.cash -= event.amount
          recalcPlayerFinancials(player)
        }
        break

      case 'savings_deposited':
        if (player) {
          player.cash -= event.amount
          player.savings = event.newBalance
        }
        break

      case 'savings_withdrawn':
        if (player) {
          player.cash += event.amount
          player.savings = event.newBalance
        }
        break

      case 'insurance_bought':
        if (player) {
          if (event.insuranceType === 'health') {
            player.hasInsurance = true
          } else {
            player.hasUnemploymentInsurance = true
          }
        }
        break

      case 'child_born':
        if (player) {
          player.childrenCount = event.childrenCount
          recalcPlayerFinancials(player)
        }
        break

      case 'laid_off':
        if (player) {
          player.isUnemployed = true
          player.unemploymentTurns = event.turns
          recalcPlayerFinancials(player)
        }
        break

      case 'rehired':
        if (player) {
          player.isUnemployed = false
          player.unemploymentTurns = 0
          recalcPlayerFinancials(player)
        }
        break

      case 'bankruptcy_declared':
        if (player) {
          player.isBankrupt = true
        }
        break

      case 'fast_track_entered':
        if (player) {
          player.phase = 'fast_track'
        }
        break

      case 'cash_flow_changed':
        // 现金流变化已反映在 player 的 recalc 中
        break

      case 'age_retired':
        // 年龄退休已记录
        break

      case 'game_over':
        state.winnerId = event.winnerId ?? null
        state.gameEndReason = event.reason
        state.phase = 'finished'
        break

      case 'game_reset':
        // 重置在 rebuildTo 中处理
        break

      // 以下事件类型主要影响 UI 展示，已在状态中反映
      case 'cell_resolved':
      case 'opportunity_declined':
      case 'market_event_applied':
      case 'doodad_paid':
      case 'story_resolved':
      case 'asset_changed':
      case 'liability_changed':
      case 'turn_ended':
      case 'turn_started':
      case 'stock_split':
        // 这些事件的影响已在 dispatch 中处理
        break
    }
  }

  /** 根据事件查找关联玩家 */
  private findPlayerByEvent(state: GameState, event: GameEvent): Player | undefined {
    if ('playerId' in event) {
      return state.players.find((p) => p.id === event.playerId)
    }
    return undefined
  }

  /** 获取事件的玩家名称 */
  private getPlayerName(event: GameEvent): string | undefined {
    if ('playerId' in event) {
      return event.playerId
    }
    return undefined
  }
}

// ==================== Helpers ====================

/** 深拷贝游戏状态 */
function deepCloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state))
}

// ==================== Factory ====================

export function createReplayEngine(
  eventLog: EventLogManager,
  initialState: GameState,
  engine?: GameEngine,
): ReplayEngine {
  return new ReplayEngine(eventLog, initialState, engine)
}