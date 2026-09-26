import { defineConfig, devices } from '@playwright/test'

/**
 * Сквозная проверка связки «сайт → API → база» (e2e-live): сайт собран в живом режиме
 * (VITE_API_MODE=live), API и база подняты заранее — локально или в CI (задача «Связка»).
 *
 *   LIVE_SITE_URL=http://127.0.0.1:4195 npx playwright test -c playwright.live.config.ts
 */
export default defineConfig({
  testDir: './e2e-live',
  outputDir: './test-results-live',
  timeout: 120_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.LIVE_SITE_URL ?? 'http://127.0.0.1:4195',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } },
    },
  ],
})
