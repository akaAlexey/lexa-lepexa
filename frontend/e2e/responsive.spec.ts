import { expect } from '@playwright/test'
import { expectNoA11yViolations, expectNoHorizontalScroll, test, useDemoDate } from './helpers.ts'

/** Каждый экран P0 и его главное действие (одна большая красная кнопка). */
const SCREENS = [
  { url: '/roles', main: 'role-family' },
  { url: '/trail', main: 'trail-start' },
  { url: '/trail/park-3km/point/rubezh', main: 'task-option-0' },
  { url: '/weekends/W01', main: 'trip-signin' },
  { url: '/last-battle', main: 'last-battle-subscribe' },
  { url: '/last-battle/S01', main: 'site-help' },
  // Разделы дизайна «Стол и газета» (ADR 0012)
  { url: '/map', main: 'hub-route-start' },
  { url: '/events', main: 'events-nearest-trip' },
  { url: '/archive', main: 'archive-chronicle' },
  { url: '/other?section=account', main: 'signin-submit' },
] as const

test.describe('Адаптив и доступность каждого экрана', () => {
  test.beforeEach(async ({ page }) => {
    await useDemoDate(page)
    await page.goto('/roles')
    await page.getByTestId('role-volunteer').click()
  })

  for (const { url, main } of SCREENS) {
    test(`${url}: помещается по ширине, главное действие доступно, WCAG AA`, async ({ page }) => {
      await page.goto(url)
      await expect(page.getByTestId(main)).toBeVisible()
      await expectNoHorizontalScroll(page)
      await expectNoA11yViolations(page)
    })
  }

  test('масштаб 200 %: ноутбук 1366 px превращается в 683 px — вёрстка не ломается', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'laptop', 'эквивалент масштаба 200 % на ноутбуке')
    await page.setViewportSize({ width: 683, height: 384 })
    for (const { url, main } of SCREENS) {
      await page.goto(url)
      await page.getByTestId(main).scrollIntoViewIfNeeded()
      await expect(page.getByTestId(main), url).toBeInViewport()
      await expectNoHorizontalScroll(page)
    }
  })

  test('на каждом экране ровно одна большая красная кнопка', async ({ page }) => {
    for (const { url } of SCREENS.slice(1)) {
      await page.goto(url)
      await expect(page.getByTestId('screen-not-implemented')).toHaveCount(0)
      await expect(page.locator('[data-main-action]'), url).toHaveCount(
        url === '/archive' || url === '/last-battle' ? 0 : 1,
      )
    }
  })

  test('поиск по карте объявляет список только когда он существует', async ({ page }) => {
    await page.goto('/map')
    const search = page.getByTestId('hub-search')
    await expect(search).not.toHaveAttribute('aria-controls', /.+/)
    await search.fill('несуществующее место')
    const listId = await search.getAttribute('aria-controls')
    expect(listId).toBeTruthy()
    await expect(page.locator(`[id="${listId}"]`)).toBeVisible()
  })

  test('если карта не загрузилась, точки остаются доступны списком', async ({ page }) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return getContext.call(this, type, ...args)
      } as typeof getContext
    })
    await page.goto('/map')
    await expect(page.getByTestId('hub-map-fallback')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('hub-route-start')).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('главное действие мероприятий зависит от роли', async ({ page }) => {
    // ADR 0013: роль выбирается на /roles, после выбора — «Мероприятия»
    await page.goto('/roles')
    await page.getByTestId('role-family').click()
    await expect(page).toHaveURL(/\/events$/)
    await expect(page.getByTestId('events-nearest-trip')).toContainText('Ближайший выезд')
    await expect(page.getByTestId('search-join')).toHaveCount(0)
    await page.goto('/roles')
    await page.getByTestId('role-verifier').click()
    await expect(page.getByTestId('events-archive')).toHaveText('Проверить истории')
    await page.goto('/roles')
    await page.getByTestId('role-commander').click()
    await expect(page.getByTestId('search-create-request')).toHaveText('Набрать волонтёров')
  })
})
