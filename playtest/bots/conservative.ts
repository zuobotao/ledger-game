import type { Page, BrowserContext } from '@playwright/test'
import { RandomBot } from './random'
import { PlaytestLogger } from '../utils/logger'
import { ScreenshotManager } from '../utils/screenshot'
import { readGameState } from '../utils/state-reader'
import type { BotConfig } from '../types'

/**
 * ConservativeBot — prefers low-risk, cash reserves, stable cash flow, low debt.
 *
 * Strategy:
 * - Declines most high-risk opportunities
 * - Buys only low-cost, cash-flow positive assets
 * - Repays loans aggressively
 * - Maintains high cash reserves
 * - Rarely takes loans
 */
export class ConservativeBot extends RandomBot {
  constructor(
    page: Page,
    context: BrowserContext,
    config: BotConfig,
    logger: PlaytestLogger,
    screenshots: ScreenshotManager,
    gameId: string,
  ) {
    super(page, context, config, logger, screenshots, gameId)
  }

  protected override async handlePendingAction(): Promise<boolean> {
    const pending = await this.getPendingAction()
    const turn = await this.getCurrentTurn()
    const player = await this.getCurrentPlayer()

    if (!pending) return false

    const state = await readGameState(this.page)
    const currentPlayerState = state?.players.find((p) => p.name === state.currentPlayer)
    const cash = currentPlayerState?.cash ?? 0

    // Conservative: prefer to decline most things
    // Only buy if cost is very low relative to cash (< 10% of cash)
    // We can't easily read the exact cost from UI, so we use heuristics

    // For stock/card type opportunities, try to figure out if it's affordable
    const rand = Math.random()

    // 20% chance to buy (conservative)
    if (rand < 0.2 && cash > 5000) {
      const buyBtn = this.page
        .getByRole('button', { name: /买入|支付首付|确认买|购买/ })
        .first()

      try {
        await buyBtn.waitFor({ state: 'visible', timeout: 2000 })
        if (await buyBtn.isEnabled()) {
          await buyBtn.click()
          await this.recordAction(turn, player, 'buy', `conservative-${pending}`, 'success')
          await this.page.waitForTimeout(500)
          return true
        }
      } catch {
        // not found
      }
    }

    // 10% chance to sell (lock in gains)
    if (rand >= 0.2 && rand < 0.3) {
      const sellBtn = this.page
        .getByRole('button', { name: /卖出|出售/ })
        .first()

      try {
        await sellBtn.waitFor({ state: 'visible', timeout: 2000 })
        if (await sellBtn.isEnabled()) {
          await sellBtn.click()
          await this.recordAction(turn, player, 'sell', `conservative-${pending}`, 'success')
          await this.page.waitForTimeout(500)
          return true
        }
      } catch {
        // not found
      }
    }

    // Default: decline
    const declineBtn = this.page
      .getByRole('button', { name: /放弃|拒绝|跳过|不买/ })
      .first()

    try {
      await declineBtn.waitFor({ state: 'visible', timeout: 2000 })
      if (await declineBtn.isEnabled()) {
        await declineBtn.click()
        await this.recordAction(turn, player, 'decline', `conservative-${pending}`, 'success')
        await this.page.waitForTimeout(500)
        return true
      }
    } catch {
      // not found
    }

    return false
  }

  /**
   * Conservative bot also tries to repay loans when possible.
   * Override playGame to occasionally open bank and repay.
   */
  protected override async playGame(): Promise<{
    status: 'completed' | 'victory' | 'game-over' | 'failed' | 'timeout'
    turns: number
  }> {
    let turns = 0
    const maxTurns = this.config.maxTurns
    const gameStartTime = Date.now()

    await this.screenshots.capture(this.page, '03-first-turn')

    while (turns < maxTurns) {
      if (Date.now() - gameStartTime > this.config.gameTimeoutMs) {
        await this.recordIssue(turns, 'timeout', `Game timeout after ${this.config.gameTimeoutMs}ms`)
        return { status: 'timeout', turns }
      }

      if (await this.isVictoryScreen()) return { status: 'victory', turns }
      if (await this.isGameOverScreen()) return { status: 'game-over', turns }

      const turnNum = await this.getCurrentTurn()
      const turnStatus = await this.getTurnStatus()
      const pendingAction = await this.getPendingAction()
      const currentPlayer = await this.getCurrentPlayer()

      await this.page.waitForTimeout(this.config.thinkDelayMs)

      if (pendingAction) {
        if (turnNum !== turns) {
          turns = turnNum
          await this.snapshotState()
          if (turns === 5) await this.screenshots.capture(this.page, '04-decision')
          if (turns === 10) await this.screenshots.capture(this.page, '05-after-decision')
          if (turns === 20) await this.screenshots.capture(this.page, '06-mid-game')
        }

        const handled = await this.handlePendingAction()
        if (!handled) {
          const dismissed = await this.tryDismissCard()
          if (!dismissed) {
            await this.recordIssue(turns, 'no-actionable-element', `Cannot handle pending action: ${pendingAction}`)
            await this.screenshots.captureError(this.page, turns, `pending-${pendingAction}`)
            await this.clickEndTurn()
          }
        }
        continue
      }

      // Conservative: occasionally try to repay loans during idle
      if (turnStatus === 'idle' && Math.random() < 0.15) {
        await this.tryRepayLoans(turns, currentPlayer)
      }

      if (turnStatus === 'idle' || turnStatus === 'waiting_roll') {
        const rolled = await this.clickRollDice()
        if (rolled) {
          if (turnNum !== turns) {
            turns = turnNum
            await this.snapshotState()
          }
          await this.recordAction(turns, currentPlayer, 'roll', 'dice', 'success')
          await this.waitForDiceResult(15000)
        } else {
          await this.recordIssue(turns, 'button-unclickable', 'Roll dice button not clickable')
          await this.page.waitForTimeout(1000)
        }
        continue
      }

      if (turnStatus === 'resolving' || turnStatus === 'waiting_end_turn') {
        const ended = await this.clickEndTurn()
        if (ended) {
          await this.recordAction(turns, currentPlayer, 'endTurn', 'end-turn', 'success')
          await this.waitForStateChange(5000)
        } else {
          const dismissed = await this.tryDismissCard()
          if (!dismissed) {
            await this.recordIssue(turns, 'stuck-turn', `Cannot end turn, status: ${turnStatus}`)
            await this.page.waitForTimeout(1000)
          }
        }
        continue
      }

      await this.page.waitForTimeout(1000)
      const changed = await this.waitForStateChange(3000)
      if (!changed && this.noStateChangeCount > 5) {
        await this.recordIssue(turns, 'state-stopped', `Game state stopped changing`)
        await this.tryDismissCard()
        this.noStateChangeCount = 0
      }
    }

    return { status: 'completed', turns }
  }

  private async tryRepayLoans(turn: number, player: string) {
    try {
      // Open bank using data-testid
      const bankBtn = this.page.getByTestId('bank-button')
      await bankBtn.click()
      await this.page.waitForTimeout(500)

      // Click "还款" tab
      const repayTab = this.page.getByRole('button', { name: '还款' })
      await repayTab.click()
      await this.page.waitForTimeout(300)

      // Try to repay some amount
      const repayBtn = this.page.getByRole('button', { name: /偿还银行贷款/ })
      if (await repayBtn.isEnabled()) {
        // Click a quick amount first
        const quickAmount = this.page.getByRole('button', { name: '$500' })
        try {
          await quickAmount.click()
        } catch {
          // ignore
        }
        await repayBtn.click()
        await this.recordAction(turn, player, 'repay', 'bank-loan', 'success')
      }

      // Close bank modal by clicking overlay
      await this.closeModal()
      await this.page.waitForTimeout(300)
    } catch {
      // Bank operations failed, close and ignore
      await this.closeModal()
    }
  }

  private async closeModal() {
    try {
      const overlay = this.page.locator('[data-overlay="true"]')
      const count = await overlay.count()
      if (count > 0) {
        await overlay.first().click({ position: { x: 10, y: 10 } })
        await this.page.waitForTimeout(300)
      }
    } catch {
      // ignore
    }
  }
}
