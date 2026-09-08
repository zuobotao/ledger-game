import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

async function enterRatRace(page: any, baseURL: string) {
  await page.goto(`${baseURL}/`)
  await page.getByTestId('btn-start').or(page.locator('[data-dom-id="btn-start"]')).or(page.getByRole('button', { name: '开始游戏' })).first().click()
  await page.waitForFunction(() => window.location.hash.includes('setup'))
  await page.locator('#player-count').selectOption('1')
  await page.locator('[data-dom-id="btn-begin"]').or(page.getByRole('button', { name: '开始游戏' })).last().click()
  await page.waitForFunction(() => window.location.hash.includes('rat-race'))
  await page.waitForLoadState('networkidle')
}

test('移动端财务侧栏可独立滚动，棋盘格子保留可读语义', async ({ page, baseURL }) => {
  await enterRatRace(page, baseURL)

  const panel = page.getByTestId('player-sidebar-panel')
  await expect(panel).toBeVisible()

  const metrics = await panel.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }))
  expect(metrics.clientHeight, '财务侧栏不能被压缩为仅一行高度').toBeGreaterThan(240)
  expect(metrics.scrollHeight, '财务侧栏内容应超过面板高度并可滚动').toBeGreaterThan(metrics.clientHeight)

  const scrolled = await panel.evaluate((el) => {
    el.scrollTop = el.scrollHeight
    return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight }
  })
  expect(scrolled.scrollTop, '财务侧栏应能滚动到财报底部').toBeGreaterThan(0)

  await page.getByTestId('side-tab-history').click()
  await expect(panel.getByText('历史记录')).toBeVisible()
  await page.getByTestId('side-tab-stats').click()
  await expect(panel.getByText('财务统计')).toBeVisible()

  const cell = page.getByTestId('board-cell-0')
  await expect(cell).toHaveAttribute('aria-label', /小机会.*机会/)
  await expect(cell).toHaveAttribute('title', /小机会.*机会/)
  await expect(page.getByTestId('board-cell-1')).toHaveAttribute('aria-label', /历史故事.*历史故事/)
})
