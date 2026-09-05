import type { Page } from '@playwright/test'
import type { PlaytestAction } from '../resolver/playtest-action'

/**
 * v2.2 — Browser Driver
 *
 * 负责「怎么点击」。优先 data-testid，其次 role + 按钮名。
 * Bot 只提供动作，Driver 定位到真实 DOM 元素并点击。
 */
export async function clickAction(page: Page, action: PlaytestAction): Promise<{ ok: boolean; error?: string }> {
  try {
    let locator
    if (action.testid) {
      locator = page.getByTestId(action.testid).first()
    } else if (action.roleName) {
      locator = page.getByRole('button', { name: action.roleName }).first()
    } else {
      return { ok: false, error: 'no selector' }
    }

    await locator.waitFor({ state: 'visible', timeout: 5000 })
    if (!(await locator.isEnabled())) {
      return { ok: false, error: 'disabled' }
    }

    await locator.click()
    await page.waitForTimeout(400)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'click failed' }
  }
}