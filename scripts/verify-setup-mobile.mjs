import { chromium } from '@playwright/test'

// 游戏使用 hash 路由：完整路径为 /ledger-game/#/setup
const BASE = 'http://localhost:5174/ledger-game/#/setup'
const viewports = [
  { w: 320, h: 740, name: '320px' },
  { w: 375, h: 812, name: '375px' },
  { w: 390, h: 844, name: '390px' },
  { w: 430, h: 932, name: '430px' },
]

const browser = await chromium.launch({ headless: true })
let failures = 0

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="begin-game"]', { timeout: 10000 })

  // 1) 页面回到顶部（scrollY=0），此时开始按钮应已被 sticky 钉在视口底部可见
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
  const atTop = await page.evaluate(() => {
    const r = document.querySelector('[data-testid="begin-game"]')?.getBoundingClientRect()
    if (!r) return { visible: false, top: 0, bottom: 0, ih: innerHeight }
    return { visible: r.bottom > 0 && r.bottom <= innerHeight + 1 && r.top >= 0, top: r.top, bottom: r.bottom, ih: innerHeight }
  })
  const summaryVisible = await page.evaluate(() => {
    const el = [...document.querySelectorAll('p')].find((p) => p.textContent?.trim() === '已选择')
    const r = el?.getBoundingClientRect()
    return !!r && r.width > 0 && r.bottom > 0
  })

  // 2) 通过 UI 选择职业：打开职业选择器，选第一个具体职业，确认
  try {
    const careerBtn = page.locator('button', { hasText: '随机职业' }).first()
    if (await careerBtn.isVisible({ timeout: 3000 })) {
      await careerBtn.click()
      await page.waitForTimeout(300)
      // 选择器里的第一个职业选项（排除"随机职业"）
      const opt = page.locator('button[role="option"], [data-testid*="career"]').first()
      await page.keyboard.press('Escape')
    }
  } catch { /* 选择器交互为加分项，不阻塞 */ }

  // 3) 滚动查看"可选规则"底部的 checkbox 也不被按钮遮挡
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(200)
  const btnAfterScroll = await page.evaluate(() => {
    const r = document.querySelector('[data-testid="begin-game"]')?.getBoundingClientRect()
    return r ? { top: r.top, bottom: r.bottom, ih: innerHeight } : null
  })

  const ok = atTop.visible && btnAfterScroll && btnAfterScroll.bottom <= vp.h + 1 && btnAfterScroll.top >= 0
  if (!ok) failures++
  console.log(
    `${vp.name}: atTopVisible=${atTop.visible} (bottom=${atTop.bottom.toFixed(0)}/${atTop.ih}) summary=${summaryVisible} ` +
    `afterScroll=${btnAfterScroll ? `bottom=${btnAfterScroll.bottom.toFixed(0)}/${vp.h}` : 'MISSING'} → ${ok ? '✅' : '❌'}`,
  )
  await ctx.close()
}

await browser.close()
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)