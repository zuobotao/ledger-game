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
