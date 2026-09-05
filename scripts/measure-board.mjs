/**
 * 临时诊断：测量 Rat Race 棋盘在各种视口下的实际宽高比例，定位「棋盘被压扁」根因。
 * 真实 UI 建局：home → #/setup（默认 2 人随机职业，名字已预填）→ 开始游戏 → rat-race。
 */
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.SEED_BASE_URL ?? 'http://localhost:5173/ledger-game'
const OUT = path.resolve(__dirname, '../playtest/runs/board-measure.html')
const samples = []

async function measure(browser, { w, h, name }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  try {
    await page.goto(`${BASE}/#/setup`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="begin-game"]', { timeout: 10000 })
    const dis = await page.getAttribute('[data-testid="begin-game"]', 'disabled')
    if (dis) {
      console.log(`[${name}] begin-game disabled, cannot start`)
      await ctx.close()
      return
    }
    await page.click('[data-testid="begin-game"]')
    await page.waitForFunction(() => window.location.hash.includes('rat-race'), { timeout: 10000 })
    await page.waitForTimeout(1200)

    const r = await page.evaluate(() => {
      const board = document.querySelector('.rat-race-board')
      const grid = document.querySelector('.board-grid')
      const section = document.querySelector('section[class*="order-1"]')
      const cell = document.querySelector('.board-cell')
      const gb = (el) => {
        const r = el.getBoundingClientRect()
        return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1) }
      }
      const boardClip = board ? { top: -board.getBoundingClientRect().top, bottom: board.getBoundingClientRect().bottom - innerHeight, overflowed: board.getBoundingClientRect().bottom > innerHeight || board.getBoundingClientRect().top < 0 } : null
      return {
        vw: innerWidth,
        vh: innerHeight,
        board: board && gb(board),
        boardViewportOverflow: boardClip,
        section: section && gb(section),
        cell: cell && gb(cell),
        cellsInViewport: board ? ((document.querySelectorAll('.board-cell').length)) : 0,
        visibleCellsTopBelow0: board ? 0 : 0,
      }
    })
    r.name = name
    r.errors = errors
    console.log(
      `[${name}] vw=${r.vw} vh=${r.vh} | board ${r.board?.w}x${r.board?.h} (ratio ${r.board ? (r.board.w / r.board.h).toFixed(2) : 'n/a'}) ` +
        `| section ${r.section?.w}x${r.section?.h} | cell ${r.cell?.w}x${r.cell?.h} (ratio ${r.cell ? (r.cell.w / r.cell.h).toFixed(2) : 'n/a'})`,
    )
    await page.screenshot({ path: path.resolve(__dirname, `../playtest/runs/board-${name}.png`) })
    samples.push(r)
  } finally {
    await ctx.close()
  }
}

const browser = await chromium.launch({ headless: true })
for (const vp of [
  { w: 1366, h: 768, name: '1366x768' },
  { w: 1280, h: 800, name: '1280x800' },
  { w: 1100, h: 600, name: '1100x600' },
  { w: 1600, h: 400, name: '1600x400' },
  { w: 1366, h: 450, name: '1366x450' },
  { w: 1500, h: 380, name: '1500x380' },
  { w: 1440, h: 620, name: '1440x620' },
  { w: 1024, h: 600, name: '1024x600' },
  { w: 768, h: 1024, name: 'ipad' },
  { w: 430, h: 932, name: '430x932' },
  { w: 390, h: 844, name: '390x844' },
  { w: 375, h: 812, name: '375x812' },
  { w: 320, h: 740, name: '320x740' },
]) {
  await measure(browser, vp)
}
await browser.close()

fs.writeFileSync(OUT, `<pre>${JSON.stringify(samples, null, 2)}</pre>`)
console.log(`\nWrote ${OUT}`)