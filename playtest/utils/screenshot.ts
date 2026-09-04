import type { Page } from '@playwright/test'
import { PlaytestLogger } from './logger'

/**
 * Screenshot manager — captures screenshots at key game moments
 * and saves them with sequential naming.
 */
export class ScreenshotManager {
  private logger: PlaytestLogger
  private screenshotCount = 0

  constructor(logger: PlaytestLogger) {
    this.logger = logger
  }

  async capture(page: Page, name: string): Promise<string> {
    this.screenshotCount++
    const paddedNum = String(this.screenshotCount).padStart(2, '0')
    const fileName = `${paddedNum}-${name}`
    const filePath = this.logger.getScreenshotPath(fileName)

    await page.screenshot({
      path: filePath,
      fullPage: false,
      type: 'png',
    })

    return filePath
  }

  async captureError(page: Page, turn: number, description: string): Promise<string> {
    const fileName = `error-turn-${turn}-${description}`
    const filePath = this.logger.getScreenshotPath(fileName)

    await page.screenshot({
      path: filePath,
      fullPage: true,
      type: 'png',
    })

    return filePath
  }

  getCount(): number {
    return this.screenshotCount
  }
}
