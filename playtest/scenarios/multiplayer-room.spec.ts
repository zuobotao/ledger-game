/**
 * 多人房间 E2E（Phase 6 验收：两个浏览器真实同局）
 *
 * 前置：vite dev server 运行在 5173（可设 VITE_DISABLE_DEVTOOLS=1 关闭 devtools 浮窗拦截）；
 * 本 spec 在 beforeAll 内自启动 Node RoomServer（8787）。
 *
 * 覆盖：
 * - A 创建房间，B 凭房间码加入
 * - 双方选职业/梦想/颜色 + Ready（新加入玩家默认未准备）
 * - 房主 Start，双方进入同一局
 * - A 掷骰，回合推进
 * - 移动端(390px)无横向溢出
 */

import { test, expect, chromium, type Page } from '@playwright/test'
import { createServer } from 'node:http'
import { RoomServer } from '../../server/RoomServer'

let roomServer: RoomServer

/** vite-plugin-vue-devtools 会注入浮窗面板并在底部拦截指针事件；自动化测试中移除它 */
async function dismissVueDevtools(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('#__vue-devtools-container__').forEach((el) => el.remove())
  })
}

test.beforeAll(async () => {
  const http = createServer()
  roomServer = new RoomServer(http)
  // 双栈绑定：同时接受 127.0.0.1 与 ::1 的 localhost 访问
  await new Promise<void>((resolve) => http.listen(8787, () => resolve()))
})

test.describe('多人房间 E2E', () => {
  test('两个浏览器创建/加入/开局/掷骰同局 + 移动端无溢出', async () => {
    // 本机可能配置了系统代理；--no-proxy-server 让浏览器对全部 localhost 直连（含房间服务器）
    const browser = await chromium.launch({ args: ['--no-proxy-server'] })
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    // A 打开多人入口并创建房间
    await pageA.goto('/ledger-game/#/multiplayer')
    await pageA.waitForSelector('[data-testid="mp-nickname"]')
    await pageA.fill('[data-testid="mp-nickname"]', '小明')
    await pageA.click('[data-testid="mp-create-btn"]')
    await pageA.waitForSelector('[data-testid="lobby-copy-code"]', { timeout: 15_000 })
    const code = ((await pageA.textContent('[data-testid="lobby-copy-code"]')) ?? '').trim()
    expect(code).toHaveLength(6)

    // B 通过房间码加入
    await pageB.goto('/ledger-game/#/multiplayer')
    await pageB.waitForSelector('[data-testid="mp-nickname"]')
    await pageB.fill('[data-testid="mp-nickname"]', '小红')
    await pageB.fill('[data-testid="mp-code"]', code)
    await pageB.click('[data-testid="mp-join-btn"]')
    await pageB.waitForSelector('[data-testid="lobby-player"]', { timeout: 15_000 })

    // 双方都看到 2 名玩家
    await expect(pageA.locator('[data-testid="lobby-player"]')).toHaveCount(2, { timeout: 15_000 })
    await expect(pageB.locator('[data-testid="lobby-player"]')).toHaveCount(2, { timeout: 15_000 })
    await expect(pageA.getByText('已准备 1 / 2')).toBeVisible()
    await expect(pageA.locator('p.mt-1').filter({ hasText: '等待' })).toContainText('小红')

    // 随机按钮必须直接设置对应字段，且不能把职业和梦想按钮放错行。
    const careerRow = pageA.locator('[data-testid="career-setup-row"]')
    const dreamRow = pageA.locator('[data-testid="dream-setup-row"]')
    await expect(careerRow.locator('[data-testid="random-career"]')).toHaveCount(1)
    await expect(careerRow.locator('[data-testid="random-dream"]')).toHaveCount(0)
    await expect(dreamRow.locator('[data-testid="random-career"]')).toHaveCount(0)
    await expect(dreamRow.locator('[data-testid="random-dream"]')).toHaveCount(1)
    await pageA.click('[data-testid="random-career"]')
    await expect(pageA.locator('[data-testid="open-career-selector"]')).not.toContainText('请选择职业')
    await pageA.click('[data-testid="random-dream"]')
    await expect(pageA.locator('[data-testid="open-dream-selector"]')).not.toContainText('请选择梦想')

    // 双方选职业/梦想/颜色（Phase 8：平铺列表改为模态框，先打开再选择，autoConfirm 自动关闭）
    await pageA.click('[data-testid="open-career-selector"]')
    await pageA.click('[data-testid="career-software-engineer"]')
    await pageA.click('[data-testid="open-dream-selector"]')
    await pageA.getByTestId('dream-detail-beach-house').click()
    await expect(pageA.getByTestId('dream-detail-modal')).toContainText('推开窗就是蔚蓝大海')
    await pageA.getByRole('button', { name: '关闭梦想详情' }).click()
    await pageA.click('[data-testid="dream-beach-house"]')
    await pageA.click('[data-testid="color-blue"]')
    await pageB.click('[data-testid="open-career-selector"]')
    await pageB.click('[data-testid="career-doctor"]')
    await pageB.click('[data-testid="open-dream-selector"]')
    await pageB.click('[data-testid="dream-charity-foundation"]')
    await pageB.click('[data-testid="color-red"]')

    // B（非房主）初始未准备，点击后变为已准备
    await dismissVueDevtools(pageB)
    await expect(pageB.locator('[data-testid="lobby-ready"]')).toContainText('准备')
    await pageB.click('[data-testid="lobby-ready"]')
    await expect(pageA.getByText('已准备 2 / 2')).toBeVisible({ timeout: 15_000 })
    await expect(pageA.locator('p').filter({ hasText: '全部玩家已准备' })).toBeVisible({ timeout: 15_000 })

    // 房主 Start：等待按钮可点后点击
    await dismissVueDevtools(pageA)
    const startBtn = pageA.locator('[data-testid="lobby-start"]')
    await startBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await pageA.waitForFunction(() => {
      const el = document.querySelector('[data-testid="lobby-start"]') as HTMLButtonElement | null
      return !!el && !el.disabled
    })
    await startBtn.click()

    // 双方进入游戏视图（v2.4.3：多人视图挂载共享 RatRaceGame，锚点为主操作按钮 roll-dice）
    await pageA.waitForSelector('[data-testid="roll-dice"]', { timeout: 15_000 })
    await pageB.waitForSelector('[data-testid="roll-dice"]', { timeout: 15_000 })

    // A 掷骰：轮到 A（房主为 0 号玩家），应出现掷骰按钮
    await dismissVueDevtools(pageA)
    const rollBtn = pageA.locator('[data-testid="roll-dice"]')
    await rollBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await rollBtn.click()
    await pageA.waitForTimeout(600)
    // 掷骰后回合推进：要么出现「结束回合」，要么出现待定动作面板，操作区始终存在
    await expect(
      pageA.locator('[data-testid="end-turn"], [data-testid="pending-action-panel"]').first(),
    ).toBeVisible({ timeout: 15_000 })

    // Phase 7 验收：权威动作广播后，两个客户端显示相同的 StateHash（三端同步质量核心指标）
    const readHash = (p: Page) => p.evaluate(() => (window as any).multiplayerStore?.stateHash ?? '')
    await pageA.waitForFunction(
      () => {
        const s = (window as any).multiplayerStore
        return !!(s && s.stateHash && s.stateHash.trim().length === 8)
      },
      { timeout: 15_000 },
    )
    await pageB.waitForFunction(
      () => {
        const s = (window as any).multiplayerStore
        return !!(s && s.stateHash && s.stateHash.trim().length === 8)
      },
      { timeout: 15_000 },
    )
    const hashA = await readHash(pageA)
    const hashB = await readHash(pageB)
    expect(hashA).toHaveLength(8)
    expect(hashA).toBe(hashB)

    // 移动端无横向溢出（独立视口打开大厅）
    const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const pageM = await ctxM.newPage()
    await pageM.goto('/ledger-game/#/multiplayer')
    await pageM.waitForSelector('[data-testid="mp-nickname"]')
    const overflow = await pageM.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow, '移动端不应横向溢出').toBe(false)

    await ctxA.close()
    await ctxB.close()
    await ctxM.close()
  })
})
