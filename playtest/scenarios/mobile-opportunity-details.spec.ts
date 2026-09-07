import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/fasttrack-seed.json'), 'utf8'),
)

const STOCK_CARD = {
  id: 'stock-blue-20',
  size: 'small',
  type: 'stock',
  title: 'BLUE 股票 · $20 买入机会',
  description: '每股价格 $20，可低价买入，等待市场上涨后卖出获利。',
  cost: 20,
  cashFlow: 0,
  symbol: 'BLUE',
  maxQuantity: 2000,
  action: 'buy',
}

async function seedStockOpportunity(page: Page) {
  const seed = JSON.parse(JSON.stringify(FIXTURE))
  seed.phase = 'rat_race'
  seed.turnStatus = 'resolving'
  seed.pendingAction = {
    type: 'opportunity',
    card: STOCK_CARD,
    message: `小机会：${STOCK_CARD.title}`,
  }
  seed.marketEvent = null
  await page.addInitScript((state) => {
    localStorage.setItem('ledger101-game-state', JSON.stringify(state))
  }, seed)
}

test.describe('移动端机会交易信息', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('股票买入面板展示资产名称、用途和价格，且信息未被遮挡', async ({ page }) => {
    await seedStockOpportunity(page)
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('continue-game-btn').click()
    await page.waitForFunction(() => window.location.hash.includes('rat-race'))

    const summary = page.locator('.game-summary-overlay')
    if (await summary.isVisible().catch(() => false)) {
      await summary.locator('.close-btn').click()
    }

    const panel = page.getByTestId('pending-action-panel')
    const title = panel.getByText(STOCK_CARD.title, { exact: true })
    const description = panel.getByText(STOCK_CARD.description, { exact: true })
    await expect(title).toBeVisible()
    await expect(description).toBeVisible()
    await expect(panel.getByText('买入价 $20/股', { exact: true })).toBeVisible()
    await expect(panel.getByTestId('opportunity-stock-buy')).toBeVisible()

    const details = await title.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return {
        fullyInViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
        receivesPointer: hit === element || element.contains(hit),
      }
    })
    expect(details.fullyInViewport, '资产名称必须在移动端视口内完整可见').toBe(true)
    expect(details.receivesPointer, '资产名称不能被资格栏或棋盘层遮挡').toBe(true)
  })
})
