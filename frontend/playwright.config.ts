import { defineConfig, devices } from '@playwright/test'

// Свой порт у каждого параллельного агента: reuseExistingServer иначе подхватит чужую сборку.
const PORT = Number(process.env.E2E_PORT ?? 4173)
// Скриншоты для документации — с настоящей подложкой (E2E_TILES=openfreemap), тесты — без сети.
const TILES = process.env.E2E_TILES ?? 'none'

/**
 * E2E в двух вьюпортах: телефон 360 px (mobile-first) и ноутбук 1366 px.
 * Сборка e2e (.env.e2e): mock-API без задержек и без внешних тайлов — тесты не зависят от сети.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  // История 3 — две вкладки, три проверки axe и скриншоты: на телефоне под нагрузкой 30 с мало
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] },
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 360, height: 780 },
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'laptop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
  ],
  webServer: {
    command: `VITE_TILES=${TILES} npm run build:e2e -- --outDir dist-e2e-${PORT} && npx vite preview --outDir dist-e2e-${PORT} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
