import { test, expect } from '@playwright/test'

async function assertDreamSelector(page: import('@playwright/test').Page) {
  await page.goto('/ledger-game/#/')
  await page.getByTestId('game-start').click()
  await page.waitForURL(/#\/setup/)

  await expect(page.locator('[data-testid^="open-dream-selector-"]')).toHaveCount(2)
  await expect(page.locator('[data-testid^="random-dream-"]:not([data-testid="random-dream-all"])')).toHaveCount(2)
  await expect(page.getByText('选择你的梦想')).toHaveCount(0)

  await page.getByTestId('open-dream-selector-0').click()
  await expect(page.getByRole('heading', { name: '选择梦想' })).toBeVisible()
  await page.getByTestId('dream-beach-house').click()
  await page.getByRole('button', { name: '确认选择' }).click()
  await expect(page.getByTestId('open-dream-selector-0')).toContainText('海边别墅')

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow, '设置页不应横向溢出').toBe(false)
}

test.describe('梦想下拉选择', () => {
  test('桌面端使用下拉选择且无平铺梦想区', async ({ page }) => {
    await assertDreamSelector(page)
  })

  test('手机端使用下拉选择且无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await assertDreamSelector(page)
  })
})
