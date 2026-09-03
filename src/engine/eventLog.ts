/**
 * EventLogManager — 事件日志管理器
 *
 * 职责：
 * - 记录 GameEvent 事件
 * - 按玩家/事件类型/时间范围过滤查询
 * - 序列化/反序列化（持久化与恢复）
 * - 统计摘要（事件计数、玩家活动摘要）
 *
 * 原则：
 * - 纯数据管理，不包含游戏逻辑
 * - 事件为不可变记录，一旦写入不可修改
 * - 与 GameEngine 解耦，可独立使用
 */

import type {
  GameEvent,
  GameEventLog,
  GameStartedEvent,
  DiceRolledEvent,
  PlayerMovedEvent,
  CellResolvedEvent,
  PaydayReceivedEvent,
  CharityAcceptedEvent,
  OpportunityBoughtEvent,
  OpportunitySoldEvent,
  OpportunityDeclinedEvent,
  MarketEventAppliedEvent,
  DoodadPaidEvent,
  StoryResolvedEvent,
  BankLoanTakenEvent,
  BankLoanRepaidEvent,
  SavingsDepositedEvent,
  SavingsWithdrawnEvent,
  InsuranceBoughtEvent,
  ChildBornEvent,
  LaidOffEvent,
  RehiredEvent,
  BankruptcyDeclaredEvent,
  TurnEndedEvent,
  TurnStartedEvent,
  FastTrackEnteredEvent,
  CashFlowChangedEvent,
  AssetChangedEvent,
  LiabilityChangedEvent,
  GameOverEvent,
  GameResetEvent,
  StockSplitEvent,
  AgeRetiredEvent,
} from './contract'

// ==================== Filter Types ====================

export interface EventFilter {
  /** 按玩家 ID 过滤 */
  playerId?: string
  /** 按事件类型过滤 */
  eventTypes?: string[]
  /** 时间范围：起始时间戳（含） */
  fromTimestamp?: number
  /** 时间范围：结束时间戳（含） */
  toTimestamp?: number
  /** 事件序号范围：起始索引（含） */
  fromIndex?: number
  /** 事件序号范围：结束索引（含） */
  toIndex?: number
}

// ==================== Statistics Types ====================

export interface EventLogStats {
  /** 总事件数 */
  totalEvents: number
  /** 按事件类型统计 */
  byType: Record<string, number>
  /** 按玩家统计 */
  byPlayer: Record<string, number>
  /** 时间范围 */
  timeRange: {
    start: number
    end: number
  } | null
  /** 游戏时长（毫秒） */
  duration: number
}

export interface PlayerActivitySummary {
  playerId: string
  playerName?: string
  totalEvents: number
  totalMoves: number
  totalTransactions: number
  timesLayoff: number
  childrenCount: number
  declaredBankrupt: boolean
  enteredFastTrack: boolean
  finalCashFlow: number | null
}

// ==================== EventLogManager ====================

export class EventLogManager {
  readonly gameId: string
  readonly gameStartTime: number
  private events: GameEvent[] = []

  constructor(gameId: string, gameStartTime?: number) {
    this.gameId = gameId
    this.gameStartTime = gameStartTime ?? Date.now()
  }

  // ==================== Recording ====================

  /** 记录一个事件 */
  record(event: GameEvent): void {
    this.events.push(event)
  }

  /** 批量记录事件 */
  recordBatch(events: GameEvent[]): void {
    this.events.push(...events)
  }

  /** 获取所有事件 */
  getAll(): readonly GameEvent[] {
    return this.events
  }

  /** 获取事件总数 */
  get count(): number {
    return this.events.length
  }

  // ==================== Query ====================

  /** 按过滤器查询事件 */
  query(filter: EventFilter = {}): readonly GameEvent[] {
    return this.events.filter((event, index) => {
      if (filter.eventTypes && filter.eventTypes.length > 0) {
        if (!filter.eventTypes.includes(event.type)) return false
      }
      if (filter.fromIndex !== undefined && index < filter.fromIndex) return false
      if (filter.toIndex !== undefined && index > filter.toIndex) return false
      if (filter.fromTimestamp !== undefined && event.timestamp < filter.fromTimestamp) return false
      if (filter.toTimestamp !== undefined && event.timestamp > filter.toTimestamp) return false
      if (this.hasPlayerId(event) && filter.playerId !== undefined) {
        if (this.getPlayerId(event) !== filter.playerId) return false
      }
      return true
    })
  }

  /** 获取指定索引的事件 */
  at(index: number): GameEvent | undefined {
    return this.events[index]
  }

  /** 获取最后一个事件 */
  last(): GameEvent | undefined {
    return this.events[this.events.length - 1]
  }

  /** 获取第一个事件 */
  first(): GameEvent | undefined {
    return this.events[0]
  }

  // ==================== Serialization ====================

  /** 导出为 GameEventLog */
  toEventLog(): GameEventLog {
    return {
      gameId: this.gameId,
      gameStartTime: this.gameStartTime,
      events: [...this.events],
    }
  }

  /** 导出为 JSON 字符串 */
  toJSON(): string {
    return JSON.stringify(this.toEventLog())
  }

  /** 从 GameEventLog 恢复 */
  static fromEventLog(log: GameEventLog): EventLogManager {
    const manager = new EventLogManager(log.gameId, log.gameStartTime)
    manager.events = [...log.events]
    return manager
  }

  /** 从 JSON 字符串恢复 */
  static fromJSON(json: string): EventLogManager {
    const log = JSON.parse(json) as GameEventLog
    return EventLogManager.fromEventLog(log)
  }

  // ==================== Statistics ====================

  /** 获取事件日志统计摘要 */
  getStats(): EventLogStats {
    const byType: Record<string, number> = {}
    const byPlayer: Record<string, number> = {}

    for (const event of this.events) {
      byType[event.type] = (byType[event.type] ?? 0) + 1
      if (this.hasPlayerId(event)) {
        const pid = this.getPlayerId(event)
        byPlayer[pid] = (byPlayer[pid] ?? 0) + 1
      }
    }

    const firstTs = this.events[0]?.timestamp ?? 0
    const lastTs = this.events[this.events.length - 1]?.timestamp ?? 0

    return {
      totalEvents: this.events.length,
      byType,
      byPlayer,
      timeRange: this.events.length > 0 ? { start: firstTs, end: lastTs } : null,
      duration: lastTs - firstTs,
    }
  }

  /** 获取玩家活动摘要（从事件日志推演） */
  getPlayerActivitySummary(playerId: string): PlayerActivitySummary {
    const playerEvents = this.query({ playerId })
    const summary: PlayerActivitySummary = {
      playerId,
      totalEvents: playerEvents.length,
      totalMoves: 0,
      totalTransactions: 0,
      timesLayoff: 0,
      childrenCount: 0,
      declaredBankrupt: false,
      enteredFastTrack: false,
      finalCashFlow: null,
    }

    for (const event of playerEvents) {
      switch (event.type) {
        case 'player_moved':
          summary.totalMoves++
          break
        case 'cash_flow_changed':
          summary.finalCashFlow = event.after
          summary.totalTransactions++
          break
        case 'laid_off':
          summary.timesLayoff++
          break
        case 'child_born':
          summary.childrenCount = event.childrenCount
          break
        case 'bankruptcy_declared':
          summary.declaredBankrupt = true
          break
        case 'fast_track_entered':
          summary.enteredFastTrack = true
          break
        case 'opportunity_bought':
        case 'opportunity_sold':
        case 'bank_loan_taken':
        case 'bank_loan_repaid':
        case 'savings_deposited':
        case 'savings_withdrawn':
        case 'doodad_paid':
        case 'charity_accepted':
        case 'payday_received':
        case 'market_event_applied':
        case 'story_resolved':
        case 'insurance_bought':
          summary.totalTransactions++
          break
      }
    }

    return summary
  }

  // ==================== Private Helpers ====================

  /**
   * 检查事件是否包含 playerId 字段
   */
  private hasPlayerId(event: GameEvent): event is GameEvent & { playerId: string } {
    return 'playerId' in event
  }

  /**
   * 获取事件的 playerId
   */
  private getPlayerId(event: GameEvent & { playerId: string }): string {
    return event.playerId
  }
}

// ==================== Factory ====================

export function createEventLogManager(
  gameId: string,
  gameStartTime?: number,
): EventLogManager {
  return new EventLogManager(gameId, gameStartTime)
}