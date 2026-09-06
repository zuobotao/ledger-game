import { test, expect } from '@playwright/test'

const routes = [
  { path: '/ledger-game/#/', text: '财商教育模拟游戏' },
  { path: '/ledger-game/#/rules', text: '游戏规则' },
  { path: '/ledger-game/#/guide', text: '新手简介' },
  { path: '/ledger-game/#/setup', text: '创建新游戏' },
  { path: '/ledger-game/#/history', text: '历史对局' },
  { path: '/ledger-game/#/multiplayer', text: '多人房间' },
  { path: '/ledger-game/#/test', text: 'AI 玩家自动化测试' },
]

async function assertRoutes(page: import('@playwright/test').Page) {
  for (const route of routes) {
    await page.goto(route.path)
    await expect(page.getByText(route.text, { exact: false }).first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow, `${route.path} 不应横向溢出`).toBe(false)
  }
}

test.describe('入口与页面导航冒烟', () => {
  test('PC 端入口页面均可访问', async ({ page }) => {
    await assertRoutes(page)
  })

  test('手机端入口页面均可访问且不横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await assertRoutes(page)
  })
})
