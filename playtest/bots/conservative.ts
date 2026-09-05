import type { Page, BrowserContext } from '@playwright/test'
import { BaseBot } from './base'
import { PlaytestLogger } from '../utils/logger'
import { ScreenshotManager } from '../utils/screenshot'
import type { PlaytestAction } from '../resolver/playtest-action'
import type { RawGameState } from '../utils/state-reader'
import type { BotConfig } from '../types'

/**
 * ConservativeBot — 稳健策略。
 * 目标：保持现金储备、增加稳定现金流、控制负债、降低风险。
 * 优先放弃高风险机会；现金充足且正现金流时才考虑买入；不主动贷款。
 */
export class ConservativeBot extends BaseBot {
  constructor(
    page: Page,
    context: BrowserContext,
    config: BotConfig,
    logger: PlaytestLogger,
    screenshots: ScreenshotManager,
    gameId: string,
    baseURL: string = 'http://localhost:5173/ledger-game',
  ) {
    super(page, context, config, logger, screenshots, gameId, baseURL)
  }

  protected override async chooseAction(legal: PlaytestAction[], bridge: RawGameState): Promise<PlaytestAction | null> {
    return ruleBasedChoice(legal, bridge, 'conservative')
  }
}

/**
 * AggressiveBot — 激进策略。
 * 目标：最大化现金流、接受杠杆与风险、快速提升资产。
 * 优先买入/卖出/接受机会。
 */
export class AggressiveBot extends BaseBot {
  constructor(
    page: Page,
    context: BrowserContext,
    config: BotConfig,
    logger: PlaytestLogger,
    screenshots: ScreenshotManager,
    gameId: string,
    baseURL: string = 'http://localhost:5173/ledger-game',
  ) {
    super(page, context, config, logger, screenshots, gameId, baseURL)
  }

  protected override async chooseAction(legal: PlaytestAction[], bridge: RawGameState): Promise<PlaytestAction | null> {
    return ruleBasedChoice(legal, bridge, 'aggressive')
  }
}

function ruleBasedChoice(legal: PlaytestAction[], bridge: RawGameState, mode: 'conservative' | 'aggressive'): PlaytestAction | null {
  if (legal.length === 0) return null
  if (legal.length === 1) return legal[0]

  const player = bridge.players[bridge.currentPlayerIndex]
  const cash = player?.cash ?? 0
  const liabilities = player?.liabilities ?? 0
  const cashFlow = player?.cashFlow ?? 0

  const byType = (pred: (t: string) => boolean) => legal.filter((a) => pred(a.type))

  // 回合级动作总是执行
  const roll = byType((t) => t === 'roll-dice')
  if (roll.length) return roll[0]
  const endTurn = byType((t) => t === 'end-turn')
  if (endTurn.length) return endTurn[0]

  if (mode === 'conservative') {
    // 稳健：优先放弃；不主动贷款；现金低时绝不买
    const decline = byType((t) => t === 'opportunity-decline')
    if (decline.length) return decline[0]
    const loanDecline = byType((t) => t === 'loan-decline')
    if (loanDecline.length) return loanDecline[0]
    // 市场：若无负债压力，倾向持有（dismiss）；现金紧张时也可锁定收益
    const dismiss = byType((t) => t === 'market-dismiss')
    if (dismiss.length) return dismiss[0]
    // 现金充足且正现金流时才考虑买入/卖出
    const safeSell = byType((t) => t === 'market-sell')
    if (safeSell.length && cash > liabilities) return safeSell[0]
    const buy = byType((t) => t === 'opportunity-buy')
    if (buy.length && cash > 3000 && cashFlow > 0) return buy[0]
    // 有贷款机会时，取贷款
    const loanTake = byType((t) => t === 'loan-take')
    if (loanTake.length) return loanTake[0]
    const charity = byType((t) => t.startsWith('charity-decline'))
    if (charity.length) return charity[0]
    return legal[0]
  }

  // aggressive
  const buy = byType((t) => t === 'opportunity-buy')
  if (buy.length) return buy[0]
  const sell = byType((t) => t === 'market-sell' || t === 'opportunity-sell')
  if (sell.length) return sell[0]
  const loanTake = byType((t) => t === 'loan-take')
  if (loanTake.length) return loanTake[0]
  const charity = byType((t) => t.startsWith('charity-accept'))
  if (charity.length) return charity[0]
  // 只剩放弃/关闭类时，接受
  const decline = byType((t) => t === 'opportunity-decline' || t.startsWith('dismiss'))
  if (decline.length) return decline[0]
  return legal[0]
}