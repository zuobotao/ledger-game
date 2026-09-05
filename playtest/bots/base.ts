import type { Page, BrowserContext } from '@playwright/test'
import * as fs from 'node:fs'
import { PlaytestLogger } from '../utils/logger'
import { ScreenshotManager } from '../utils/screenshot'
import { readGameState, readStateBridge, type RawGameState } from '../utils/state-reader'
import { resolveActions } from '../resolver/action-resolver'
import { ActionGuard, GuardError } from '../resolver/action-guard'
import { clickAction } from '../utils/driver'
import { buildDecisionResult, buildStateDiff } from '../utils/state-diff'
import type { PlaytestAction } from '../resolver/playtest-action'
import type { BotConfig, GameResult, ActionLog, UXIssue, GameStateSnapshot } from '../types'

/**
 * BaseBot — Resolver 驱动的基础机器人。
 *
 * 职责分离（v2.2）：
 * - Resolver：判断「当前能做什么」（playtest/resolver/）
 * - ActionGuard：防死循环（重复点击/状态卡死/回合上限）
 * - Browser Driver：负责「怎么点击」（playtest/utils/driver.ts）
 * - Bot Strategy（子类 chooseAction）：决定「做什么」
 *
 * 所有交互必须通过真实 UI（data-testid → click），禁止调用 store 方法。
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
  /** 确定性 LCG：设置 seed 时复现相同决策序列 */
  private _seed: number
  private _s: number

  constructor(
    page: Page,
    context: BrowserContext,
    config: BotConfig,
    logger: PlaytestLogger,
    screenshots: ScreenshotManager,
    gameId: string,
    baseURL: string = 'http://localhost:5173/ledger-game',
  ) {
    this.page = page
    this.context = context
    this.config = config
    this.logger = logger
    this.screenshots = screenshots
    this.gameId = gameId
    this.baseURL = baseURL
    this._seed = config.seed ?? Date.now()
    this._s = this._seed % 2147483647
  }

  /** 确定性随机数（0..1）。带 seed 时完全可复现，否则用时间种子。 */
  protected rng(): number {
    // Park–Miller 最小标准 LCG
    this._s = (this._s * 48271) % 2147483647
    return this._s / 2147483647
  }

  async run(): Promise<GameResult> {
    this.startTime = Date.now()
    this.setupConsoleCapture()

    try {
      await this.navigateToHome()
      await this.screenshots.capture(this.page, '01-home')
      this.logger.logEvent('Navigated to home page')

      await this.startGameFromHome()
      this.logger.logEvent('Clicked start game')

      await this.setupGame()
      await this.screenshots.capture(this.page, '02-game-start')
      this.logger.logEvent('Game setup complete, game started')

      const result = await this.playGame()

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

  // === Navigation ===

  protected async navigateToHome() {
    await this.page.goto(`${this.baseURL}/`)
    await this.page.waitForLoadState('networkidle')
  }

  protected async startGameFromHome() {
    const startBtn = this.page.getByTestId('btn-start')
      .or(this.page.locator('[data-dom-id="btn-start"]'))
      .or(this.page.getByRole('button', { name: '开始游戏' }))
    await startBtn.click()
    await this.page.waitForFunction(() => window.location.hash.includes('setup'))
    await this.page.waitForLoadState('networkidle')
  }

  /** 统一单人局设置（人类玩家，由 Bot 通过 UI 操作） */
  protected async setupGame() {
    const turn = 0
    const player = 'setup'
    const playerCountSelect = this.page.locator('#player-count')
    await playerCountSelect.selectOption('1')
    await this.recordAction(turn, player, 'select', 'player-count-1', 'success')
    const beginBtn = this.page
      .locator('[data-dom-id="btn-begin"]')
      .or(this.page.getByRole('button', { name: '开始游戏' }))
    await beginBtn.click()
    await this.recordAction(turn, player, 'click', 'begin-game', 'success')
    await this.page.waitForFunction(() => window.location.hash.includes('rat-race'))
    await this.page.waitForLoadState('networkidle')
    await this.page.waitForTimeout(1500)
  }

  // === Resolver-driven main loop ===

  protected async playGame(): Promise<{ status: 'completed' | 'victory' | 'game-over' | 'failed' | 'timeout'; turns: number }> {
    const start = Date.now()
    const guard = new ActionGuard(this.config.maxTurns, this.config.gameTimeoutMs, start)
    let turns = 0
    let lastTurn = -1
    let lastRebasedTurn = -1
    let fastTrackLogged = false

    try {
      while (true) {
        guard.checkTimeout()
        if (this.isVictoryScreen()) return { status: 'victory', turns }
        if (this.isGameOverScreen()) return { status: 'game-over', turns }

        const bridge = await readStateBridge(this.page)
        if (!bridge) {
          await this.page.waitForTimeout(800)
          continue
        }

        // Turn changed → reset per-turn counters + snapshot + milestone
        if (bridge.turn !== lastTurn) {
          lastTurn = bridge.turn
          turns = bridge.turn
          guard.beginTurn()
          guard.checkTurns(bridge.turn)
          this.logger.logUIState(`turn=${bridge.turn} status=${bridge.turnStatus} pending=${bridge.pendingAction}`)
          await this.snapshotState()
          if (bridge.turn === 5) await this.screenshots.capture(this.page, '04-decision')
          if (bridge.turn === 10) await this.screenshots.capture(this.page, '05-after-decision')
          if (bridge.turn === 20) await this.screenshots.capture(this.page, '06-mid-game')
        }

        // Fast Track 里程碑（UX Funnel）
        if (bridge.phase === 'fast_track' && !fastTrackLogged) {
          fastTrackLogged = true
          await this.screenshots.capture(this.page, 'ft-enter')
          this.logger.logEvent(`Entered fast track at turn ${bridge.turn}`)
        }

        const key = `${bridge.turn}|${bridge.turnStatus}|${bridge.pendingAction}`
        guard.observeState(key, bridge.turn)

        let legal = await resolveActions(this.page, bridge)

        if (legal.length === 0) {
          // 卡片弹层常有一小段渲染延迟：先短暂重试几次，避免把「还没渲染完」误报为无动作
          for (let i = 0; i < 3 && legal.length === 0; i++) {
            await this.page.waitForTimeout(600)
            legal = await resolveActions(this.page, bridge)
          }

          if (legal.length === 0) {
            await this.recordIssue(bridge.turn, 'no-actionable-element', `No legal action: status=${bridge.turnStatus} pending=${bridge.pendingAction}`)
            await this.screenshots.captureError(this.page, bridge.turn, `pending-${bridge.pendingAction}`)
            await this.page.waitForTimeout(1000)
            continue
          }
        }

        await this.page.waitForTimeout(this.config.thinkDelayMs)

        const action = await this.chooseAction(legal, bridge)
        if (!action) {
          await this.page.waitForTimeout(800)
          continue
        }

        guard.recordAction()
        const before = bridge
        await this.recordAction(bridge.turn, bridge.currentPlayer, action.type, action.target, 'success')

        const outcome = await clickAction(this.page, action)
        if (!outcome.ok) {
          guard.actionFailed(action, bridge.turn)
          await this.recordIssue(bridge.turn, 'button-unclickable', `Click failed ${action.type}: ${outcome.error}`)
          await this.screenshots.captureError(this.page, bridge.turn, `click-${action.type.replace(/\W/g, '-')}`)
          continue
        }

        await this.page.waitForTimeout(500)

        const after = await readStateBridge(this.page)
        if (after) {
          this.logger.logDecision(buildDecisionResult(bridge.turn, bridge.currentPlayer, action.type, action.target, before, after))
          this.logger.logDiff(buildStateDiff(before, after))
        }

        // 回合回退保护：若回合号异常（少回合），重设以记录
        if (after && after.turn === lastTurn && (lastRebasedTurn !== after.turn || true)) {
          lastRebasedTurn = after.turn
        }
      }
    } catch (err) {
      if (err instanceof GuardError) {
        const turn = Math.max(0, err.turn >= 0 ? err.turn : lastTurn)
        await this.recordIssue(turn, this.mapGuardToIssue(err.outcome), err.message)
        await this.screenshots.captureError(this.page, turn, err.outcome)
        this.logger.logEvent(`Guard stopped game: ${err.outcome} (${err.message})`)
        if (err.outcome === 'max-turns') {
          return { status: 'completed', turns }
        }
        return { status: 'failed', turns }
      }
      throw err
    }
  }

  /** 由具体 Bot 策略决定执行哪个合法动作，返回 null 表示本轮暂不动 */
  protected abstract chooseAction(legal: PlaytestAction[], bridge: RawGameState): Promise<PlaytestAction | null>

  private mapGuardToIssue(outcome: string): UXIssue['type'] {
    switch (outcome) {
      case 'action-failure':
        return 'button-unclickable'
      case 'stuck-ui':
        return 'stuck-turn'
      case 'state-transition-failure':
        return 'state-stopped'
      case 'stuck-turn':
        return 'stuck-turn'
      case 'timeout':
        return 'timeout'
      default:
        return 'state-stopped'
    }
  }

  // === Logging helpers ===

  protected async recordAction(
    turn: number,
    player: string,
    action: string,
    target: string,
    result: 'success' | 'failed' | 'skipped',
    detail?: string,
  ) {
    const log: ActionLog = { turn, player, action, target, timestamp: new Date().toISOString(), result, detail }
    this.logger.logAction(log)
  }

  protected async recordIssue(turn: number, type: UXIssue['type'], message: string, screenshotPath?: string) {
    this.logger.logIssue({ turn, type, message, timestamp: new Date().toISOString(), screenshot: screenshotPath })
  }

  protected async snapshotState(): Promise<GameStateSnapshot | null> {
    const state = await readGameState(this.page)
    if (state) this.logger.logState(state)
    return state
  }

  // === Screen detection ===
  // 注意：这些方法必须是「同步 boolean」，因为在循环里用 `if (this.isXxxScreen())`
  // 直接判断。若改成 async，if 收到的是 Promise（恒为 truthy）→ 会误判终止。

  protected isVictoryScreen(): boolean {
    try {
      return this.page.url().includes('victory')
    } catch {
      return false
    }
  }

  protected isGameOverScreen(): boolean {
    try {
      return this.page.url().includes('game-over')
    } catch {
      return false
    }
  }
}