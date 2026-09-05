import type { Page, BrowserContext } from '@playwright/test'
import { BaseBot } from './base'
import { PlaytestLogger } from '../utils/logger'
import { ScreenshotManager } from '../utils/screenshot'
import type { PlaytestAction } from '../resolver/playtest-action'
import type { RawGameState } from '../utils/state-reader'
import type { BotConfig } from '../types'

/**
 * RandomBot — 只选择合法动作，随机决策。
 * 目标：测试系统稳定性。
 */
export class RandomBot extends BaseBot {
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

  protected override async chooseAction(legal: PlaytestAction[], _bridge: RawGameState): Promise<PlaytestAction | null> {
    // 只有一个合法动作时直接执行
    if (legal.length === 1) return legal[0]
    // 随机但不越界；使用确定性 rng 时可用 seed 复现
    const idx = Math.floor(this.rng() * legal.length)
    return legal[idx] ?? null
  }
}