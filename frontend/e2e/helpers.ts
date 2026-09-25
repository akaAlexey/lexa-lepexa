import { AxeBuilder } from '@axe-core/playwright'
import { test as base, expect, type Page, type TestInfo } from '@playwright/test'

/**
 * Скриншот для арбитра: e2e/screenshots/<вьюпорт>/<имя>.png.
 * Снимается видимая область — так, как экран видит человек (фиксированное меню на месте).
 */
export async function snap(page: Page, testInfo: TestInfo, name: string) {
  const dir = process.env.SHOTS_DIR ?? 'e2e/screenshots'
  // Снимок — только после загрузки карты: иначе на скриншоте пустая рамка без меток
  await expect(page.locator('[data-ready="false"]')).toHaveCount(0, { timeout: 15_000 })
  if (process.env.E2E_TILES === 'openfreemap') {
    // для документации ждём, пока догрузится подложка карты
    await page.waitForLoadState('networkidle').catch(() => undefined)
  }
  await page.screenshot({ path: `${dir}/${testInfo.project.name}/${name}.png` })
}

/** Автоматическая проверка доступности (WCAG 2.1 AA) на текущем экране. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.maplibregl-canvas')
    .analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([])
}

/** test, который падает при любой ошибке в консоли браузера или необработанном исключении. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      page.on('pageerror', (e) => errors.push(e.message))
      await use(errors)
      expect(errors, 'ошибки в консоли браузера').toEqual([])
    },
    { auto: true },
  ],
})

/** Демо-«сегодня»: пятница 2 октября 2026, 12:00 по Москве. «Завтра» — суббота 3 октября. */
export async function useDemoDate(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-02T09:00:00Z'))
}

type Role = 'family' | 'volunteer' | 'commander' | 'verifier'

/** Старт сценария: выбор роли (/roles) — первое нажатие; дальше открываются «Мероприятия». */
export async function startAs(page: Page, role: Role) {
  await page.goto('/roles')
  await page.getByTestId(`role-${role}`).click()
}

/** Нет горизонтальной прокрутки: вёрстка помещается в ширину экрана. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'горизонтальная прокрутка, px').toBeLessThanOrEqual(0)
}
