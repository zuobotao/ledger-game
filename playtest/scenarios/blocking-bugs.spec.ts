import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../fixtures/fasttrack-seed.json'), 'utf8'),
)

test('跨窗口打开首页时，继续游戏有反馈并进入有效存档', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await context.addInitScript((seed) => {
    localStorage.setItem('ledger101-game-state', JSON.stringify(seed))
  }, fixture)

  const gameWindow = await context.newPage()
  await gameWindow.goto(`${baseURL}/#/rat-race`)
  await gameWindow.waitForSelector('[data-testid="roll-dice"]')

  const homeWindow = await context.newPage()
  await homeWindow.goto(`${baseURL}/#/`)
  const continueButton = homeWindow.getByTestId('continue-game-btn')
  await expect(continueButton).toBeVisible()
  await continueButton.click()

  await homeWindow.waitForFunction(() => window.location.hash.includes('rat-race'))
  await expect(homeWindow.getByTestId('roll-dice')).toBeVisible()

  await context.close()
})

test.describe('资本游戏购买面板', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('股票购买信息保持可见，内容超高时在面板内滚动', async ({ page, baseURL }) => {
    const state = structuredClone(fixture)
    state.phase = 'fast_track'
    state.players[0].phase = 'fast_track'
    state.turnStatus = 'resolving'
    state.pendingAction = {
      type: 'fast_track_stock_trading',
      card: null,
      message: '股票交易：自由买卖股票，把握市场机会。',
    }

    await page.addInitScript((seed) => {
      localStorage.setItem('ledger101-game-state', JSON.stringify(seed))
    }, state)
    await page.goto(`${baseURL}/#/fast-track`)

    const panel = page.getByTestId('pending-action-scroll')
    await expect(panel).toBeVisible()
    await expect(panel).toHaveCSS('overflow-y', 'auto')
    await panel.getByRole('button', { name: /NOVA/ }).click()
    await expect(panel.getByText('数量：')).toBeVisible()
    await expect(panel.getByText('当前现金：')).toBeVisible()
    await expect(panel.getByText('NOVA')).toBeVisible()
  })
})

test.describe('资本游戏购买面板移动端', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('购买说明和数量控件在手机端可见', async ({ page, baseURL }) => {
    const state = structuredClone(fixture)
    state.phase = 'fast_track'
    state.players[0].phase = 'fast_track'
    state.turnStatus = 'resolving'
    state.pendingAction = {
      type: 'fast_track_stock_trading',
      card: null,
      message: '股票交易：自由买卖股票，把握市场机会。',
    }
    await page.addInitScript((seed) => {
      localStorage.setItem('ledger101-game-state', JSON.stringify(seed))
    }, state)
    await page.goto(`${baseURL}/#/fast-track`)

    const panel = page.getByTestId('pending-action-scroll')
    await expect(panel).toBeVisible()
    await panel.getByRole('button', { name: /NOVA/ }).click()
    await expect(panel.getByText('数量：')).toBeVisible()
    await expect(panel.getByText('当前现金：')).toBeVisible()
  })
})
