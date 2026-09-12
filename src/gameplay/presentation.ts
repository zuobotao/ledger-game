/**
 * 共享玩法 UI 的纯投影工具（v2.4.3 §9）
 *
 * 所有 Shared 组件只依赖本模块 + GameplayViewModel，
 * 禁止 import useGameStore / useMultiplayerStore。
 */

import { BANK_CONFIG } from '@/types/game'
import type {
  Asset,
  MarketEventCard,
  OpportunityCard,
  Player,
  StoryCard,
} from '@/types/game'
import type {
  GameplayViewModel,
  PendingActionPresentation,
} from '@/gameplay/types'
import { getDreamPassiveIncomeRequirement } from '@/data/dreams'

export function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`
}

export function capitalGoalOf(p: Player) {
  const dream = p.dream
  const passiveRequired = dream ? getDreamPassiveIncomeRequirement(dream) : 0
  return {
    dream,
    cash: p.cash,
    cashRequired: dream?.price ?? 0,
    passiveIncome: p.passiveIncome,
    passiveRequired,
    cashPercent: dream?.price ? Math.min(100, (p.cash / dream.price) * 100) : 0,
    passivePercent: passiveRequired ? Math.min(100, (p.passiveIncome / passiveRequired) * 100) : 0,
  }
}

export function netWorthOf(p: Player): number {
  const assets = (p.assets ?? []).reduce((a, x) => a + (x.marketPrice ?? x.cost) * (x.quantity || 1), 0)
  const liabs = (p.liabilities ?? []).reduce((a, x) => a + (x.amount || 0), 0)
  return p.cash + p.savings + assets - liabs
}

export function totalBankLoanAmount(p: Player): number {
  return (p.liabilities ?? [])
    .filter((l) => l.category === 'bank_loan')
    .reduce((a, l) => a + (l.amount || 0), 0)
}

export function maxBankLoan(p: Player): number {
  const base = p.totalIncome * BANK_CONFIG.maxLoanMultiple
  const available = Math.max(0, base - totalBankLoanAmount(p))
  return Math.floor(available / BANK_CONFIG.loanStep) * BANK_CONFIG.loanStep
}

export function unitLabel(assetType: string): string {
  switch (assetType) {
    case 'stock': return '股'
    case 'real_estate': return '套'
    case 'business': return '家'
    default: return '份'
  }
}

export function assetPnL(asset: Asset): number {
  const marketValue = (asset.marketPrice ?? asset.cost) * asset.quantity
  const costValue = asset.cost * asset.quantity
  return marketValue - costValue
}

export function assetPnLPercent(asset: Asset): number {
  const costValue = asset.cost * asset.quantity
  if (costValue === 0) return 0
  return (assetPnL(asset) / costValue) * 100
}

/** 市场事件中某资产的卖出单价 */
export function marketPriceFor(asset: Asset, card: MarketEventCard | null): number {
  if (!card) return asset.cost
  if (card.targetType === 'stock' && card.targetSymbol && asset.symbol === card.targetSymbol) {
    return card.fixedPrice ?? asset.cost
  }
  return asset.cost * card.multiplier
}

/** 骰子明细：多人快照缺省时回退为 [lastRoll] */
export function diceValuesOf(vm: GameplayViewModel): number[] {
  const s = vm.gameState
  if (s.lastDiceValues && s.lastDiceValues.length > 0) return s.lastDiceValues
  return s.lastRoll > 0 ? [s.lastRoll] : []
}

/** 市场事件当前回应者（responderIndex 权威） */
export function marketResponderOf(vm: GameplayViewModel): Player | null {
  const state = vm.gameState.marketEventState
  if (!state) return null
  return vm.gameState.players[state.responderIndex] ?? null
}

/** 股票卖出机会的持有资产（symbol 由 pendingAction.card 提供） */
export function stockSellAssetOf(vm: GameplayViewModel, symbol: string | undefined): Asset | null {
  if (!symbol) return null
  return vm.viewingPlayer.assets.find((a) => a.type === 'stock' && a.symbol === symbol) ?? null
}

function oppName(card: OpportunityCard | null | undefined): string {
  return card?.title ?? '机会'
}

/**
 * 把当前 pendingAction 投影为统一信息模型（§9 字段）：
 * name/type/description/price/quantity/cost/income/cashflowImpact/netWorthImpact/risk/beforeCash/afterCash
 */
export function projectPendingAction(vm: GameplayViewModel): PendingActionPresentation | null {
  const pa = vm.pendingAction
  const player = vm.viewingPlayer
  if (!pa) return null
  const card = pa.card as OpportunityCard | MarketEventCard | StoryCard | null | undefined

  const base = {
    name: '',
    type: pa.type,
    description: pa.message || '',
    price: null as number | null,
    quantity: null as number | null,
    cost: null as number | null,
    income: null as number | null,
    cashflowImpact: null as number | null,
    netWorthImpact: null as number | null,
    risk: null as string | null,
    beforeCash: player.cash,
    afterCash: null as number | null,
    card: pa.card,
  }

  switch (pa.type) {
    case 'opportunity': {
      const c = card as OpportunityCard | undefined
      if (!c) return base
      const unitCost = c.downPayment ?? c.cost
      return {
        ...base,
        name: oppName(c),
        description: c.description ?? pa.message,
        price: c.downPayment !== undefined && c.totalValue !== undefined ? c.totalValue : c.cost,
        quantity: c.type === 'stock' ? (c.maxQuantity ?? null) : (c.maxQuantity ?? null),
        cost: unitCost,
        income: c.cashFlow ?? null,
        cashflowImpact: c.cashFlow ?? null,
        netWorthImpact: c.totalValue ?? c.cost,
        risk: c.size === 'big' ? '大机会' : c.type === 'stock' ? '股票波动' : null,
        afterCash: player.cash - unitCost,
      }
    }
    case 'stock_sell_opportunity': {
      const c = card as OpportunityCard | undefined
      if (!c) return base
      return {
        ...base,
        name: c.title ?? `${c.symbol ?? ''} 卖出机会`,
        description: c.description ?? pa.message,
        price: c.cost,
        quantity: null,
        cost: c.cost,
        income: null,
        cashflowImpact: null,
        netWorthImpact: c.cost,
        risk: null,
        afterCash: player.cash + c.cost,
      }
    }
    case 'market': {
      const c = card as MarketEventCard | undefined
      if (!c) return base
      return {
        ...base,
        name: c.title ?? '市场风云',
        description: c.description ?? pa.message,
        price: c.fixedPrice ?? null,
        quantity: null,
        cost: null,
        income: null,
        cashflowImpact: null,
        netWorthImpact: c.fixedPrice ?? null,
        risk: '市场波动',
        afterCash: null,
      }
    }
    case 'doodad': {
      const c = card as { title?: string; cost?: number } | undefined
      const cost = c?.cost ?? 0
      return {
        ...base,
        name: c?.title ?? '生活意外',
        cost,
        afterCash: player.cash - cost,
        risk: '意外支出',
      }
    }
    case 'charity': {
      const cost = Math.round(player.totalIncome * 0.1)
      return {
        ...base,
        name: '慈善捐赠',
        description: pa.message || '捐赠 10% 总收入，换取好运（下次失业免疫）。',
        cost,
        afterCash: player.cash - cost,
        risk: '捐赠后 10 回合内失业免疫',
      }
    }
    case 'child_gift': {
      const amount = Number(pa.meta?.giftAmount ?? 100)
      return {
        ...base,
        name: '添丁随礼',
        description: pa.message || `其他玩家可选择随礼 ${formatMoney(amount)}，表达心意。`,
        cost: amount,
        risk: '随礼会减少现金，但不会改变月现金流',
        afterCash: player.cash - amount,
      }
    }
    case 'layoff':
      return { ...base, name: '失业', risk: '失去工作收入' }
    case 'need_loan':
      return { ...base, name: '需要贷款', risk: '贷款利率较高' }
    case 'story': {
      const c = card as StoryCard | undefined
      return { ...base, name: c?.title ?? '故事', description: c?.story ?? pa.message }
    }
    case 'bankrupt':
      return { ...base, name: '破产重整', risk: '清空资产并重新开始' }
    case 'fast_track_opportunity': {
      const c = card as OpportunityCard | undefined
      if (!c) return base
      const unitCost = c.downPayment ?? c.cost
      return {
        ...base,
        name: oppName(c),
        description: c.description ?? pa.message,
        price: c.downPayment !== undefined && c.totalValue !== undefined ? c.totalValue : c.cost,
        quantity: c.maxQuantity ?? null,
        cost: unitCost,
        income: c.cashFlow ?? null,
        cashflowImpact: c.cashFlow ?? null,
        netWorthImpact: c.totalValue ?? c.cost,
        risk: c.size === 'big' ? '大机会' : null,
        afterCash: player.cash - unitCost,
      }
    }
    case 'fast_track_dream': {
      const price = player.dream?.price ?? 0
      return {
        ...base,
        name: player.dream?.name ?? '梦想',
        description: pa.message || `购买梦想：${player.dream?.name ?? ''}`,
        price,
        cost: price,
        afterCash: player.cash - price,
        risk: '一次性大额支出',
      }
    }
    case 'fast_track_stock_trading':
      return { ...base, name: '股票交易', description: pa.message || '自由买卖股票' }
    default:
      return base
  }
}
