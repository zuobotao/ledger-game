import type { Page, BrowserContext } from '@playwright/test'
import { BaseBot } from './base'
import { PlaytestLogger } from '../utils/logger'
import { ScreenshotManager } from '../utils/screenshot'
import type { BotConfig } from '../types'

/**
 * RandomBot — picks random legal actions.
 *
 * Purpose: test game stability by doing random but valid operations.
 * Strategy:
 * - Always roll dice when possible
 * - For pending actions, randomly choose between buy/sell/decline
 * - Occasionally open bank and do random operations
 * - End turn when no other actions are available
 */
export class RandomBot extends BaseBot {
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

  protected async setupGame() {
    const turn = 0
    const player = 'setup'

    // Set 1 player
    const playerCountSelect = this.page.locator('#player-count')
    await playerCountSelect.selectOption('1')
    await this.recordAction(turn, player, 'select', 'player-count-1', 'success')

    // Set player type to AI hard (so game auto-progresses for single player)
    // Actually, for playtest we want human player controlled by bot
    // Keep as human, the bot plays through UI

    // Start game
    const beginBtn = this.page
      .locator('[data-dom-id="btn-begin"]')
      .or(this.page.getByRole('button', { name: '开始游戏' }))
    await beginBtn.click()
    await this.recordAction(turn, player, 'click', 'begin-game', 'success')

    // Wait for game to start
    await this.page.waitForFunction(() => window.location.hash.includes('rat-race'))
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(2000)
  }

  protected async playGame(): Promise<{
    status: 'completed' | 'victory' | 'game-over' | 'failed' | 'timeout'
    turns: number
  }> {
    let turns = 0
    const maxTurns = this.config.maxTurns
    const gameStartTime = Date.now()

    await this.screenshots.capture(this.page, '03-first-turn')

    while (turns < maxTurns) {
      // Check timeout
      if (Date.now() - gameStartTime > this.config.gameTimeoutMs) {
        await this.recordIssue(turns, 'timeout', `Game timeout after ${this.config.gameTimeoutMs}ms`)
        return { status: 'timeout', turns }
      }

      // Check for game end screens
      if (await this.isVictoryScreen()) {
        return { status: 'victory', turns }
      }
      if (await this.isGameOverScreen()) {
        return { status: 'game-over', turns }
      }

      const turnNum = await this.getCurrentTurn()
      const turnStatus = await this.getTurnStatus()
      const pendingAction = await this.getPendingAction()
      const currentPlayer = await this.getCurrentPlayer()

      // Think delay
      await this.page.waitForTimeout(this.config.thinkDelayMs)

      // Handle pending actions first (opportunity cards, market events, etc.)
      if (pendingAction) {
        if (turns === 0 || turnNum !== turns) {
          turns = turnNum
          await this.snapshotState()
          if (turns === 5) {
            await this.screenshots.capture(this.page, '04-decision')
          }
          if (turns === 10) {
            await this.screenshots.capture(this.page, '05-after-decision')
          }
          if (turns === 20) {
            await this.screenshots.capture(this.page, '06-mid-game')
          }
        }

        const handled = await this.handlePendingAction()
        if (!handled) {
          // Try to find a "知道了" or "继续" button to dismiss
          const dismissed = await this.tryDismissCard()
          if (!dismissed) {
            await this.recordIssue(turns, 'no-actionable-element', `Cannot handle pending action: ${pendingAction}`)
            await this.screenshots.captureError(this.page, turns, `pending-${pendingAction}`)
            // Try ending turn to unstick
            await this.clickEndTurn()
          }
        }
        continue
      }

      // Idle state: roll dice
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

      // Resolving state: try ending turn
      if (turnStatus === 'resolving' || turnStatus === 'waiting_end_turn') {
        const ended = await this.clickEndTurn()
        if (ended) {
          await this.recordAction(turns, currentPlayer, 'endTurn', 'end-turn', 'success')
          await this.waitForStateChange(5000)
        } else {
          // Maybe there's still a pending card we missed
          const dismissed = await this.tryDismissCard()
          if (!dismissed) {
            await this.recordIssue(turns, 'stuck-turn', `Cannot end turn, status: ${turnStatus}`)
            await this.page.waitForTimeout(1000)
          }
        }
        continue
      }

      // Unknown state: wait a bit
      await this.page.waitForTimeout(1000)

      // Check for no state change
      const changed = await this.waitForStateChange(3000)
      if (!changed && this.noStateChangeCount > 5) {
        await this.recordIssue(turns, 'state-stopped', `Game state stopped changing for ${this.noStateChangeCount} checks`)
        // Try clicking around to unstick
        await this.tryDismissCard()
        this.noStateChangeCount = 0
      }
    }

    return { status: 'completed', turns }
  }

  protected async handlePendingAction(): Promise<boolean> {
    const pending = await this.getPendingAction()
    const turn = await this.getCurrentTurn()
    const player = await this.getCurrentPlayer()

    if (!pending) return false

    // First, check if there are buy/sell/decline buttons (opportunity cards)
    const hasBuyBtn = await this.hasButton(/买入|支付首付|确认买|购买/)
    const hasSellBtn = await this.hasButton(/卖出|出售/)
    const hasDeclineBtn = await this.hasButton(/放弃|拒绝|跳过|不买/)

    // If it's an opportunity-type card with buy/sell/decline options
    if (hasBuyBtn || hasSellBtn || hasDeclineBtn) {
      const rand = Math.random()

      // Try buy
      if (hasBuyBtn && rand < 0.5) {
        const buyBtn = this.page.getByRole('button', { name: /买入|支付首付|确认买|购买/ }).first()
        try {
          if (await buyBtn.isEnabled()) {
            await buyBtn.click()
            await this.recordAction(turn, player, 'buy', pending, 'success')
            await this.page.waitForTimeout(500)
            return true
          }
        } catch { /* ignore */ }
      }

      // Try sell
      if (hasSellBtn && rand >= 0.5 && rand < 0.7) {
        const sellBtn = this.page.getByRole('button', { name: /卖出|出售/ }).first()
        try {
          if (await sellBtn.isEnabled()) {
            await sellBtn.click()
            await this.recordAction(turn, player, 'sell', pending, 'success')
            await this.page.waitForTimeout(500)
            return true
          }
        } catch { /* ignore */ }
      }

      // Default: decline
      if (hasDeclineBtn) {
        const declineBtn = this.page.getByRole('button', { name: /放弃|拒绝|跳过|不买/ }).first()
        try {
          if (await declineBtn.isEnabled()) {
            await declineBtn.click()
            await this.recordAction(turn, player, 'decline', pending, 'success')
            await this.page.waitForTimeout(500)
            return true
          }
        } catch { /* ignore */ }
      }
    }

    // For non-opportunity pending actions (story, doodad, charity, layoff, etc.)
    // try to dismiss with common buttons
    const dismissed = await this.tryDismissCard()
    if (dismissed) {
      await this.recordAction(turn, player, 'dismiss', pending, 'success')
      return true
    }

    return false
  }

  private async hasButton(nameRegex: RegExp): Promise<boolean> {
    try {
      const btn = this.page.getByRole('button', { name: nameRegex }).first()
      await btn.waitFor({ state: 'visible', timeout: 1500 })
      return true
    } catch {
      return false
    }
  }
}
