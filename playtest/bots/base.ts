import type { Page, BrowserContext } from '@playwright/test'
import { PlaytestLogger } from '../utils/logger'
import { ScreenshotManager } from '../utils/screenshot'
import { readGameState } from '../utils/state-reader'
import type { BotConfig, GameResult, ActionLog, UXIssue, GameStateSnapshot } from '../types'

/**
 * BaseBot — abstract base class for playtest bots.
 *
 * All bot interaction MUST go through the UI (click, fill, select, press).
 * Bots must NOT call gameStore methods directly.
 *
 * The bot reads state via window.gameStore (read-only) to make decisions,
 * but performs all actions through the DOM.
 */
export abstract class BaseBot {
  protected page: Page
  protected context: BrowserContext
  protected config: BotConfig
  protected logger: PlaytestLogger
  protected screenshots: ScreenshotManager
  protected gameId: string
  protected baseURL: string
  protected startTime = 0
  protected lastStateHash = ''
  protected noStateChangeCount = 0
  protected consoleErrors: string[] = []

  constructor(
    page: Page,
    context: BrowserContext,
    config: BotConfig,
    logger: PlaytestLogger,
    screenshots: ScreenshotManager,
    gameId: string,
    baseURL: string = 'http://localhost:5173',
  ) {
    this.page = page
    this.context = context
    this.config = config
    this.logger = logger
    this.screenshots = screenshots
    this.gameId = gameId
    this.baseURL = baseURL
  }

  /**
   * Run a full game. Returns the game result.
   */
  async run(): Promise<GameResult> {
    this.startTime = Date.now()
    this.setupConsoleCapture()

    try {
      // Navigate to home and start game
      await this.navigateToHome()
      await this.screenshots.capture(this.page, '01-home')
      this.logger.logEvent('Navigated to home page')

      await this.startGameFromHome()
      await this.logger.logEvent('Clicked start game')

      // Setup game (1 player, AI type based on bot config)
      await this.setupGame()
      await this.screenshots.capture(this.page, '02-game-start')
      this.logger.logEvent('Game setup complete, game started')

      // Play until game ends or max turns reached
      const result = await this.playGame()

      // Capture final state
      const finalState = await readGameState(this.page)
      if (finalState) {
        this.logger.logState(finalState)
      }

      const endTime = Date.now()
      const status = result.status

      if (status === 'victory') {
        await this.screenshots.capture(this.page, '07-victory')
      } else if (status === 'game-over') {
        await this.screenshots.capture(this.page, 'error-game-over')
      }

      const gameResult: GameResult = {
        gameId: this.gameId,
        botType: this.config.type,
        status,
        totalTurns: result.turns,
        totalTimeMs: endTime - this.startTime,
        totalActions: this.logger.getActions().filter((a) => a.result === 'success').length,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        finalState,
        actions: this.logger.getActions(),
        issues: this.logger.getIssues(),
        events: this.logger.getEvents(),
      }

      this.logger.flush()
      return gameResult
    } catch (error: any) {
      // Capture error state
      await this.screenshots.captureError(this.page, 0, 'fatal')
      this.logger.logIssue({
        turn: 0,
        type: 'js-exception',
        message: `Fatal error: ${error.message}`,
        timestamp: new Date().toISOString(),
      })

      const endTime = Date.now()
      const gameResult: GameResult = {
        gameId: this.gameId,
        botType: this.config.type,
        status: 'failed',
        totalTurns: 0,
        totalTimeMs: endTime - this.startTime,
        totalActions: 0,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        actions: this.logger.getActions(),
        issues: this.logger.getIssues(),
        events: this.logger.getEvents(),
        errorMessage: error.message,
      }

      this.logger.flush()
      return gameResult
    }
  }

  private setupConsoleCapture() {
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        this.consoleErrors.push(text)
        this.logger.logIssue({
          turn: 0,
          type: 'console-error',
          message: text,
          timestamp: new Date().toISOString(),
        })
      }
    })

    this.page.on('pageerror', (err) => {
      this.logger.logIssue({
        turn: 0,
        type: 'js-exception',
        message: err.message,
        timestamp: new Date().toISOString(),
      })
    })
  }

  // === Navigation helpers ===

  protected async navigateToHome() {
    await this.page.goto(this.baseURL + '/')
    await this.page.waitForLoadState('networkidle')
  }

  protected async startGameFromHome() {
    // Try data-dom-id first, fall back to text
    const startBtn = this.page.getByTestId('btn-start')
      .or(this.page.locator('[data-dom-id="btn-start"]'))
      .or(this.page.getByRole('button', { name: '开始游戏' }))
    await startBtn.click()
    await this.page.waitForFunction(() => window.location.hash.includes('setup'))
    await this.page.waitForLoadState('networkidle')
  }

  protected abstract setupGame(): Promise<void>

  protected abstract playGame(): Promise<{ status: 'completed' | 'victory' | 'game-over' | 'failed' | 'timeout'; turns: number }>

  // === Action helpers ===

  protected async recordAction(
    turn: number,
    player: string,
    action: string,
    target: string,
    result: 'success' | 'failed' | 'skipped',
    detail?: string,
  ) {
    const log: ActionLog = {
      turn,
      player,
      action,
      target,
      timestamp: new Date().toISOString(),
      result,
      detail,
    }
    this.logger.logAction(log)
  }

  protected async recordIssue(
    turn: number,
    type: UXIssue['type'],
    message: string,
    screenshotPath?: string,
  ) {
    this.logger.logIssue({
      turn,
      type,
      message,
      timestamp: new Date().toISOString(),
      screenshot: screenshotPath,
    })
  }

  protected async snapshotState(): Promise<GameStateSnapshot | null> {
    const state = await readGameState(this.page)
    if (state) {
      this.logger.logState(state)
    }
    return state
  }

  protected async waitForStateChange(timeoutMs = 5000): Promise<boolean> {
    const startTime = Date.now()
    const initialHash = this.lastStateHash

    while (Date.now() - startTime < timeoutMs) {
      const state = await readGameState(this.page)
      if (state) {
        const hash = `${state.turn}-${state.phase}-${state.turnStatus}-${state.currentPlayer}-${state.pendingAction}`
        if (hash !== initialHash) {
          this.lastStateHash = hash
          this.noStateChangeCount = 0
          return true
        }
      }
      await this.page.waitForTimeout(200)
    }

    this.noStateChangeCount++
    return false
  }

  /**
   * Wait until a clickable button with the given text appears.
   * Returns the locator if found, null if timeout.
   */
  protected async waitForClickable(text: string, timeoutMs = 5000) {
    try {
      const locator = this.page.getByRole('button', { name: text })
      await locator.waitFor({ state: 'visible', timeout: timeoutMs })
      const isEnabled = await locator.isEnabled()
      return isEnabled ? locator : null
    } catch {
      return null
    }
  }

  /**
   * Check if we're on the victory screen.
   */
  protected async isVictoryScreen(): Promise<boolean> {
    try {
      const url = this.page.url()
      return url.includes('victory')
    } catch {
      return false
    }
  }

  /**
   * Check if we're on the game over screen.
   */
  protected async isGameOverScreen(): Promise<boolean> {
    try {
      const url = this.page.url()
      return url.includes('game-over')
    } catch {
      return false
    }
  }

  /**
   * Get current turn number from game state.
   */
  protected async getCurrentTurn(): Promise<number> {
    const state = await readGameState(this.page)
    return state?.turn ?? 0
  }

  protected async getCurrentPlayer(): Promise<string> {
    const state = await readGameState(this.page)
    return state?.currentPlayer ?? 'unknown'
  }

  protected async getTurnStatus(): Promise<string> {
    const state = await readGameState(this.page)
    return state?.turnStatus ?? 'unknown'
  }

  protected async getPendingAction(): Promise<string | null> {
    const state = await readGameState(this.page)
    return state?.pendingAction ?? null
  }

  /**
   * Find and click the roll dice button.
   */
  protected async clickRollDice(): Promise<boolean> {
    try {
      // Try data-testid first, fall back to text
      const rollBtn = this.page
        .getByTestId('roll-dice')
        .or(this.page.getByRole('button', { name: /掷骰/ }).first())

      await rollBtn.waitFor({ state: 'visible', timeout: 5000 })
      const isEnabled = await rollBtn.isEnabled()
      if (!isEnabled) return false

      await rollBtn.click()
      await this.page.waitForTimeout(1000) // Let dice animation start
      return true
    } catch {
      return false
    }
  }

  /**
   * Find and click the end turn button.
   */
  protected async clickEndTurn(): Promise<boolean> {
    try {
      const endBtn = this.page
        .getByTestId('end-turn')
        .or(this.page.getByRole('button', { name: /结束回合/ }).first())

      await endBtn.waitFor({ state: 'visible', timeout: 3000 })
      const isEnabled = await endBtn.isEnabled()
      if (!isEnabled) return false

      await endBtn.click()
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if there's a pending opportunity/deal and handle it.
   * Returns true if an opportunity was handled.
   */
  protected abstract handlePendingAction(): Promise<boolean>

  /**
   * Wait for dice animation to finish and next action to appear.
   */
  protected async waitForDiceResult(timeoutMs = 10000): Promise<boolean> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getTurnStatus()
      const pending = await this.getPendingAction()
      // After rolling, either we have a pending action or turn is resolving
      if (pending || status === 'resolving' || status === 'waiting_action') {
        return true
      }
      await this.page.waitForTimeout(300)
    }
    return false
  }

  /**
   * Try to dismiss a card/modal by finding common acknowledgment buttons.
   * Returns true if a dismiss button was found and clicked.
   */
  protected async tryDismissCard(): Promise<boolean> {
    const dismissTexts = [
      '知道了',
      '继续',
      '好的',
      '确定',
      '确认',
      '下一位玩家',
      '结束',
      '明白了',
      '我知道了',
      '收下',
      '领取',
      '完成',
    ]

    for (const text of dismissTexts) {
      try {
        const btns = this.page.getByRole('button', { name: text })
        const count = await btns.count()
        for (let i = 0; i < count; i++) {
          const btn = btns.nth(i)
          const isVisible = await btn.isVisible()
          const isEnabled = await btn.isEnabled()
          if (isVisible && isEnabled) {
            await btn.click()
            await this.page.waitForTimeout(300)
            return true
          }
        }
      } catch {
        // Not found
      }
    }

    // Also try clicking overlay to close modals
    try {
      const overlay = this.page.locator('[data-overlay="true"]')
      const count = await overlay.count()
      if (count > 0) {
        await overlay.first().click({ position: { x: 10, y: 10 } })
        await this.page.waitForTimeout(300)
        return true
      }
    } catch {
      // ignore
    }

    return false
  }
}
