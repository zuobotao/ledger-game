import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

// Playwright E2E / Playtest configuration
// See https://playwright.dev/docs/test-configuration

export default defineConfig({
  testDir: './playtest/scenarios',
  testMatch: '**/*.spec.ts',
  timeout: 10 * 60 * 1000, // 10 min per test (game can be long)
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false, // Run games sequentially for stability
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'playtest/runs/playwright-results.json' }]],
  outputDir: 'playtest/runs/test-results',

  use: {
    baseURL: 'http://localhost:5173/ledger-game',
    trace: 'retain-on-failure',
    video: 'on',
    screenshot: 'only-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Dev server is started manually via `npm run dev`
  // For CI smoke tests, we'd add a webServer config here
})
