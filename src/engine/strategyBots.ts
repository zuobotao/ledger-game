/**
 * StrategyBots — 策略 Bot 实现
 *
 * 四种策略风格：
 * - ConservativeBot: 保守型，优先现金储备和低负债
 * - CashFlowBot: 现金流型，优先被动收入和现金流
 * - AggressiveBot: 激进型，高杠杆高收益
 * - RandomBot: 随机型，随机选择合法操作
 *
 * 所有 Bot 都通过 GameStore 的公开方法操作游戏，
 * 不直接修改内部状态。
 */

import type { useGameStore } from '@/stores/game'
import type { OpportunityCard } from '@/types/game'
import { RandomSource } from './randomSource'

export type BotType = 'conservative' | 'cashflow' | 'aggressive' | 'random'

export interface BotStats {
  /** 购买资产次数 */
  assetBuys: number
  /** 贷款次数 */
  loanCount: number
  /** 还款次数 */
  repayCount: number
  /** 放弃机会次数 */
  declinedCount: number
}

export function createBotStats(): BotStats {
  return {
    assetBuys: 0,
    loanCount: 0,
    repayCount: 0,
    declinedCount: 0,
  }
}

/**
 * 策略 Bot 基类
 * 子类实现 decideAction 方法来决定每一步做什么
 */
export abstract class StrategyBot {
  abstract readonly type: BotType
  abstract readonly name: string

  protected random: RandomSource
  protected stats: BotStats = createBotStats()

  constructor(seed?: number) {
    this.random = new RandomSource(seed)
  }

  getStats(): BotStats {
    return { ...this.stats }
  }

  /**
   * 在当前状态下执行一步操作。
   * 返回 true 表示本回合还可以继续操作，返回 false 表示应该结束回合。
   */
  abstract takeStep(store: ReturnType<typeof useGameStore>): boolean

  // ====== 辅助方法 ======

  protected getPlayer(store: ReturnType<typeof useGameStore>) {
    return store.currentPlayer
  }

  protected getPendingCard(store: ReturnType<typeof useGameStore>): OpportunityCard | null {
    const card = store.pendingAction.card
    if (!card || typeof card !== 'object') return null
    return card as OpportunityCard
  }

  /** 计算现金储备能维持多少个月支出 */
  protected cashReserveMonths(store: ReturnType<typeof useGameStore>): number {
    const player = this.getPlayer(store)
    if (!player || player.totalExpenses <= 0) return 999
    return player.cash / player.totalExpenses
  }

  /** 计算资产的现金流回报率（现金流 / 首付） */
  protected cashOnCashReturn(card: OpportunityCard): number {
    const downPayment = card.downPayment ?? card.cost ?? 0
    const cashFlow = card.cashFlow ?? 0
    if (downPayment <= 0) return 0
    return cashFlow / downPayment
  }

  /** 判断是否是"好"的资产（正现金流且回报率合理） */
  protected isGoodDeal(card: OpportunityCard, minReturn = 0.02): boolean {
    if ((card.cashFlow ?? 0) <= 0) return false
    return this.cashOnCashReturn(card) >= minReturn
  }
}

// ==================== ConservativeBot ====================

/**
 * 保守型 Bot
 * 策略：
 * - 优先保证至少 6 个月的现金储备
 * - 只买"安全"的资产（低首付、低负债、正现金流）
 * - 尽量少贷款，尽快还清高息贷款
 * - 放弃风险高的机会
 */
export class ConservativeBot extends StrategyBot {
  readonly type = 'conservative' as const
  readonly name = '保守型'

  takeStep(store: ReturnType<typeof useGameStore>): boolean {
    const player = this.getPlayer(store)
    if (!player) return false

    const pendingType = store.pendingAction.type

    // 0. 检查是否可以进入快车道
    if (player.phase === 'rat_race' && store.canCurrentPlayerEnterFastTrack) {
      store.enterFastTrack()
      return true
    }

    // 1. 有挂起的机会卡 → 决定买不买
    if (pendingType === 'opportunity') {
      const card = this.getPendingCard(store)
      if (card && card.action !== 'sell') {
        const cashCost = this.calcCashCost(card)
        const reserveAfter = (player.cash - cashCost) / Math.max(player.totalExpenses, 1)

        // 保守策略：买完后至少留 3 个月现金，且必须是正现金流
        if (
          reserveAfter >= 3
          && (card.cashFlow ?? 0) > 0
          && this.cashOnCashReturn(card) >= 0.02
          && (card.downPayment !== undefined ? card.downPayment / (card.totalValue ?? 1) >= 0.2 : true)
        ) {
          store.buyOpportunity(1)
          this.stats.assetBuys++
          return true
        } else {
          store.declineOpportunity()
          this.stats.declinedCount++
          return true
        }
      } else if (card && card.action === 'sell') {
        // 有卖出机会：保守型一般持有，除非现金紧张
        if (this.cashReserveMonths(store) < 3) {
          store.buyOpportunity(1) // sell action
          return true
        } else {
          store.declineOpportunity()
          this.stats.declinedCount++
          return true
        }
      }
    }

    // 2. 市场事件
    if (pendingType === 'market') {
      store.dismissMarketEvent()
      return true
    }

    // 3. 生活支出 / 慈善 / 其他 → 确认
    if (pendingType === 'doodad' || pendingType === 'charity') {
      store.acknowledgeMessage()
      return true
    }

    // 4. 有银行贷款且现金充足 → 还款
    const bankLoans = player.liabilities.filter((l) => l.category === 'bank_loan')
    if (bankLoans.length > 0 && this.cashReserveMonths(store) > 6) {
      const loan = bankLoans[0]!
      const repayAmount = Math.min(player.cash * 0.3, loan.amount)
      if (repayAmount >= 1000) {
        store.repayBankLoan(loan.id, Math.round(repayAmount / 1000) * 1000)
        this.stats.repayCount++
        return true
      }
    }

    // 5. 回合处于 idle → 掷骰
    if (store.turnStatus === 'idle') {
      store.ratRaceRollDice()
      return true
    }

    // 6. resolving 状态 → 结束回合
    return false
  }

  private calcCashCost(card: OpportunityCard): number {
    if (card.downPayment !== undefined) return card.downPayment
    return card.cost ?? 0
  }
}

// ==================== CashFlowBot ====================

/**
 * 现金流型 Bot
 * 策略：
 * - 核心目标：最大化被动收入，尽快实现财务自由
 * - 买入所有正现金流资产（只要付得起首付）
 * - 适度使用贷款杠杆
 * - 保留 3 个月现金储备即可
 */
export class CashFlowBot extends StrategyBot {
  readonly type = 'cashflow' as const
  readonly name = '现金流型'

  takeStep(store: ReturnType<typeof useGameStore>): boolean {
    const player = this.getPlayer(store)
    if (!player) return false

    const pendingType = store.pendingAction.type

    // 0. 检查是否可以进入快车道
    if (player.phase === 'rat_race' && store.canCurrentPlayerEnterFastTrack) {
      store.enterFastTrack()
      return true
    }

    // 1. 有挂起的机会卡 → 能买就买
    if (pendingType === 'opportunity') {
      const card = this.getPendingCard(store)
      if (card && card.action !== 'sell') {
        const cashCost = this.calcCashCost(card)
        const canAfford = player.cash >= cashCost
        const goodCashFlow = (card.cashFlow ?? 0) > 0
        const reserveAfter = (player.cash - cashCost) / Math.max(player.totalExpenses, 1)

        // 现金流策略：正现金流 + 买完至少留 2 个月现金
        if (canAfford && goodCashFlow && reserveAfter >= 2) {
          store.buyOpportunity(1)
          this.stats.assetBuys++
          return true
        } else if (canAfford && goodCashFlow && this.cashOnCashReturn(card) >= 0.05) {
          // 高回报率的话，甚至可以牺牲一些现金储备
          store.buyOpportunity(1)
          this.stats.assetBuys++
          return true
        } else {
          store.declineOpportunity()
          this.stats.declinedCount++
          return true
        }
      } else if (card && card.action === 'sell') {
        // 卖出机会：现金流策略通常持有资产，除非价格很好
        const price = card.cost ?? 0
        const cost = card.cost ?? 0
        if (price >= cost * 1.5) {
          store.buyOpportunity(1) // sell
          return true
        } else {
          store.declineOpportunity()
          this.stats.declinedCount++
          return true
        }
      }
    }

    // 2. 市场事件
    if (pendingType === 'market') {
      store.dismissMarketEvent()
      return true
    }

    // 3. 生活支出 / 慈善 / 其他 → 确认
    if (pendingType === 'doodad' || pendingType === 'charity') {
      store.acknowledgeMessage()
      return true
    }

    // 4. 需要钱买好资产时 → 贷款（仅当有正现金流资产在面前时）
    // 简化：如果现金 < 首付要求且有好机会，考虑贷款
    // 实际中机会卡已经在 pending 里了，这里主要处理预防性贷款

    // 5. 有银行贷款且现金充足（> 6 个月）→ 还一部分
    const bankLoans = player.liabilities.filter((l) => l.category === 'bank_loan')
    if (bankLoans.length > 0 && this.cashReserveMonths(store) > 6) {
      const loan = bankLoans[0]!
      const repayAmount = Math.min(player.cash * 0.2, loan.amount)
      if (repayAmount >= 1000) {
        store.repayBankLoan(loan.id, Math.round(repayAmount / 1000) * 1000)
        this.stats.repayCount++
        return true
      }
    }

    // 6. 回合处于 idle → 掷骰
    if (store.turnStatus === 'idle') {
      store.ratRaceRollDice()
      return true
    }

    // 7. resolving 状态 → 结束回合
    return false
  }

  private calcCashCost(card: OpportunityCard): number {
    if (card.downPayment !== undefined) return card.downPayment
    return card.cost ?? 0
  }
}

// ==================== AggressiveBot ====================

/**
 * 激进型 Bot
 * 策略：
 * - 高杠杆、高收益
 * - 尽可能买入所有资产
 * - 频繁使用贷款
 * - 现金储备很少（1-2 个月即可）
 * - 追求快速资产积累
 */
export class AggressiveBot extends StrategyBot {
  readonly type = 'aggressive' as const
  readonly name = '激进型'

  takeStep(store: ReturnType<typeof useGameStore>): boolean {
    const player = this.getPlayer(store)
    if (!player) return false

    const pendingType = store.pendingAction.type

    // 0. 检查是否可以进入快车道
    if (player.phase === 'rat_race' && store.canCurrentPlayerEnterFastTrack) {
      store.enterFastTrack()
      return true
    }

    // 1. 有挂起的机会卡 → 尽量买
    if (pendingType === 'opportunity') {
      const card = this.getPendingCard(store)
      if (card && card.action !== 'sell') {
        const cashCost = this.calcCashCost(card)
        let canAfford = player.cash >= cashCost

        // 激进策略：钱不够就贷款
        if (!canAfford) {
          const shortfall = cashCost - player.cash
          const maxLoan = store.maxBankLoanAmount(player!)
          if (maxLoan >= shortfall && shortfall > 0) {
            const loanAmount = Math.ceil(shortfall / 1000) * 1000
            store.takeBankLoan(Math.min(loanAmount, maxLoan))
            this.stats.loanCount++
            canAfford = player.cash >= cashCost
          }
        }

        // 只要能负担且不是明显亏损，就买
        const reserveAfter = (player.cash - cashCost) / Math.max(player.totalExpenses, 1)
        if (canAfford && reserveAfter >= 0.5) {
          store.buyOpportunity(1)
          this.stats.assetBuys++
          return true
        } else {
          store.declineOpportunity()
          this.stats.declinedCount++
          return true
        }
      } else if (card && card.action === 'sell') {
        // 卖出机会：激进型可能卖出以获取现金再投资
        store.buyOpportunity(1) // sell
        return true
      }
    }

    // 2. 市场事件
    if (pendingType === 'market') {
      store.dismissMarketEvent()
      return true
    }

    // 3. 生活支出 / 慈善 / 其他 → 确认
    if (pendingType === 'doodad' || pendingType === 'charity') {
      store.acknowledgeMessage()
      return true
    }

    // 4. 现金很少且还有贷款额度 → 预防性贷款
    if (
      this.cashReserveMonths(store) < 1
      && store.maxBankLoanAmount(player!) > 0
      && this.random.next() < 0.4
    ) {
      const loanAmount = Math.min(5000, store.maxBankLoanAmount(player!))
      store.takeBankLoan(loanAmount)
      this.stats.loanCount++
      return true
    }

    // 5. 回合处于 idle → 掷骰
    if (store.turnStatus === 'idle') {
      store.ratRaceRollDice()
      return true
    }

    // 6. resolving 状态 → 结束回合
    return false
  }

  private calcCashCost(card: OpportunityCard): number {
    if (card.downPayment !== undefined) return card.downPayment
    return card.cost ?? 0
  }
}

// ==================== RandomBot ====================

/**
 * 随机型 Bot
 * 策略：完全随机选择合法操作
 * 用作基准线和压力测试
 */
export class RandomBot extends StrategyBot {
  readonly type = 'random' as const
  readonly name = '随机型'

  takeStep(store: ReturnType<typeof useGameStore>): boolean {
    const player = this.getPlayer(store)
    if (!player) return false

    const pendingType = store.pendingAction.type

    // 0. 检查是否可以进入快车道
    if (player.phase === 'rat_race' && store.canCurrentPlayerEnterFastTrack) {
      store.enterFastTrack()
      return true
    }

    // 1. 有挂起的操作 → 随机选择接受或拒绝
    if (pendingType === 'opportunity') {
      const card = this.getPendingCard(store)
      if (card) {
        const cashCost = card.downPayment ?? card.cost ?? 0
        const canAfford = player.cash >= cashCost

        if (canAfford && this.random.next() < 0.5) {
          store.buyOpportunity(1)
          this.stats.assetBuys++
          return true
        } else {
          store.declineOpportunity()
          this.stats.declinedCount++
          return true
        }
      }
    }

    // 2. 市场事件
    if (pendingType === 'market') {
      store.dismissMarketEvent()
      return true
    }

    // 3. 生活支出 / 慈善 / 其他 → 确认
    if (pendingType === 'doodad' || pendingType === 'charity') {
      store.acknowledgeMessage()
      return true
    }

    // 4. 随机贷款（10% 概率）
    if (this.random.next() < 0.1 && store.maxBankLoanAmount(player!) > 0) {
      const amount = (Math.floor(this.random.next() * 5) + 1) * 1000
      store.takeBankLoan(Math.min(amount, store.maxBankLoanAmount(player!)))
      this.stats.loanCount++
      return true
    }

    // 5. 随机还款（10% 概率）
    const bankLoans = player.liabilities.filter((l) => l.category === 'bank_loan')
    if (bankLoans.length > 0 && this.random.next() < 0.1) {
      const loan = bankLoans[Math.floor(this.random.next() * bankLoans.length)]!
      const amount = Math.min(player.cash * 0.5, loan.amount)
      if (amount >= 1000) {
        store.repayBankLoan(loan.id, Math.round(amount / 1000) * 1000)
        this.stats.repayCount++
        return true
      }
    }

    // 6. 回合处于 idle → 掷骰
    if (store.turnStatus === 'idle') {
      store.ratRaceRollDice()
      return true
    }

    // 7. resolving 状态 → 结束回合
    return false
  }
}

/**
 * 创建指定类型的 Bot
 */
export function createBot(type: BotType, seed?: number): StrategyBot {
  switch (type) {
    case 'conservative':
      return new ConservativeBot(seed)
    case 'cashflow':
      return new CashFlowBot(seed)
    case 'aggressive':
      return new AggressiveBot(seed)
    case 'random':
      return new RandomBot(seed)
  }
}
