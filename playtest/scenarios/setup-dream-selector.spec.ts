import { test, expect } from '@playwright/test'

async function assertDreamSelector(page: import('@playwright/test').Page) {
  await page.goto('/ledger-game/#/')
  await page.getByTestId('game-start').click()
  await page.waitForURL(/#\/setup/)

  const firstPlayer = page.getByTestId('player-setup-0')
  await expect(firstPlayer.locator('label')).toHaveText(['姓名', '职业', '梦想', '玩家类型', '颜色'])
  await expect(page.locator('[data-testid^="random-name-"]')).toHaveCount(2)
  await expect(page.locator('[data-testid^="career-info-"]')).toHaveCount(2)
  await expect(page.locator('[data-testid^="dream-info-"]')).toHaveCount(2)
  await expect(page.locator('[data-testid^="random-career-"]')).toHaveCount(2)
  await expect(page.locator('[data-testid^="random-dream-"]:not([data-testid="random-dream-all"])')).toHaveCount(2)
  await expect(page.locator('[data-testid^="random-color-"]')).toHaveCount(2)
  await expect(page.getByTestId('dream-info-0')).toBeDisabled()
  const initialName = await page.locator('#player-name-0').inputValue()
  await page.getByTestId('random-name-0').click()
  await expect(page.locator('#player-name-0')).not.toHaveValue(initialName)
  await expect(page.locator('[data-testid^="open-dream-selector-"]')).toHaveCount(2)
  await expect(page.locator('[data-testid^="random-dream-"]:not([data-testid="random-dream-all"])')).toHaveCount(2)
  await expect(page.getByText('选择你的梦想')).toHaveCount(0)
  await expect(page.getByText('失业时保留工资收入，减少现金流中断')).toBeVisible()
  await expect(page.getByText('孩子上限从 3 个提高到 6 个，家庭支出也会增加')).toBeVisible()
  await expect(page.getByText('住房贷款月供提高 50%，增加开局负担')).toBeVisible()
  await expect(page.getByText('用总收入作为起始现金，跳过储蓄积累阶段')).toBeVisible()

  await page.getByTestId('open-dream-selector-0').click()
  await expect(page.getByRole('heading', { name: '选择梦想' })).toBeVisible()
  await page.getByTestId('dream-detail-beach-house').click()
  await expect(page.getByTestId('dream-detail-modal')).toContainText('拥有一座面朝大海')
  await expect(page.getByTestId('dream-detail-modal')).toContainText('推开窗就是蔚蓝大海')
  await page.getByRole('button', { name: '关闭梦想详情' }).click()
  await page.getByTestId('dream-beach-house').click()
  await page.getByRole('button', { name: '确认选择' }).click()
  await expect(page.getByTestId('open-dream-selector-0')).toContainText('海边别墅')
  await expect(page.getByTestId('dream-info-0')).toBeEnabled()
  await page.getByTestId('dream-info-0').click()
  await expect(page.getByTestId('dream-detail-modal')).toContainText('拥有一座面朝大海')
  await page.getByRole('button', { name: '关闭梦想详情' }).click()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow, '设置页不应横向溢出').toBe(false)
}

test.describe('梦想下拉选择', () => {
  test('桌面端使用下拉选择且无平铺梦想区', async ({ page }) => {
    await assertDreamSelector(page)
  })

  test('手机端使用下拉选择且无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await assertDreamSelector(page)
  })
})
