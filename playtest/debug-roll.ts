import { chromium } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  await page.goto('http://localhost:5173/ledger-game/')
  await page.waitForLoadState('networkidle')
  console.log('Home page loaded')

  // Click start game
  const startBtn = page.getByRole('button', { name: '开始游戏' })
  await startBtn.click()
  await page.waitForFunction(() => window.location.hash.includes('setup'))
  console.log('Setup page loaded')

  // Set 1 player
  await page.locator('#player-count').selectOption('1')
  console.log('Set 1 player')

  // Click begin game
  const beginBtn = page.getByRole('button', { name: '开始游戏' })
  await beginBtn.click()
  await page.waitForFunction(() => window.location.hash.includes('rat-race'))
  await page.waitForTimeout(2000)
  console.log('Game started')

  // Check turn status
  const state = await page.evaluate(() => {
    const s = (window as any).gameStore
    return s ? { turn: s.turn, status: s.turnStatus, phase: s.phase } : null
  })
  console.log('Game state:', state)

  // Try finding roll dice button various ways
  console.log('\nTrying to find roll dice button:')

  // 1. data-testid
  try {
    const btn1 = page.getByTestId('roll-dice')
    await btn1.waitFor({ state: 'visible', timeout: 3000 })
    console.log('1. getByTestId(roll-dice): FOUND')
    console.log('   enabled:', await btn1.isEnabled())
  } catch (e: any) {
    console.log('1. getByTestId(roll-dice): NOT FOUND -', e.message.substring(0, 100))
  }

  // 2. text
  try {
    const btn2 = page.getByRole('button', { name: '掷骰子' })
    await btn2.waitFor({ state: 'visible', timeout: 3000 })
    console.log('2. getByRole(button, name=掷骰子): FOUND')
    console.log('   enabled:', await btn2.isEnabled())
    // Try clicking it
    await btn2.click()
    console.log('   Clicked successfully')
  } catch (e: any) {
    console.log('2. getByRole(button, name=掷骰子): NOT FOUND -', e.message.substring(0, 100))
  }

  await page.waitForTimeout(3000)

  // Check state after click
  const state2 = await page.evaluate(() => {
    const s = (window as any).gameStore
    return s ? { turn: s.turn, status: s.turnStatus, pending: s.pendingAction?.type || null } : null
  })
  console.log('\nState after click:', state2)

  // Check pending action buttons
  if (state2?.pending) {
    console.log('\nPending action:', state2.pending)
    // Try to find buttons
    const allButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      return btns.map(b => ({ text: b.textContent?.trim(), disabled: b.disabled }))
    })
    console.log('All visible buttons:', allButtons.filter(b => b.text).slice(0, 20))
  }

  await browser.close()
}

main().catch(console.error)
