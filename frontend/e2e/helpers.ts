import { AxeBuilder } from '@axe-core/playwright'
import { test as base, expect, type Page, type TestInfo } from '@playwright/test'

/**
 * Скриншот для арбитра: e2e/screenshots/<вьюпорт>/<имя>.png.
 * Снимается видимая область — так, как экран видит человек (фиксированное меню на месте).
 */
export async function snap(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}/${name}.png` })
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
