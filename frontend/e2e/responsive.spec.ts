import { expect } from '@playwright/test'
import { expectNoA11yViolations, expectNoHorizontalScroll, test, useDemoDate } from './helpers.ts'

/** Каждый экран P0 и его главное действие (одна большая красная кнопка). */
const SCREENS = [
  { url: '/', main: 'role-family' },
  { url: '/trail', main: 'trail-start' },
  { url: '/trail/park-3km/point/rubezh', main: 'task-option-0' },
  { url: '/search', main: 'search-join' },
  { url: '/weekends', main: 'weekends-register' },
  { url: '/weekends/W01', main: 'trip-register' },
  { url: '/last-battle', main: 'last-battle-subscribe' },
  { url: '/last-battle/S01', main: 'site-help' },
  // Разделы дизайна «Стол и газета» (ADR 0012)
  { url: '/map', main: 'hub-route-start' },
  { url: '/events', main: 'search-join' },
  { url: '/archive', main: 'archive-new' },
  { url: '/other?section=account', main: 'signin-submit' },
] as const

test.describe('Адаптив и доступность каждого экрана', () => {
  test.beforeEach(async ({ page }) => {
    await useDemoDate(page)
    await page.goto('/')
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
      await expect(page.locator('[data-main-action]'), url).toHaveCount(1)
    }
  })
})
