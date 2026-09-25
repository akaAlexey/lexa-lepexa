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

  for (const { url, main } of SCREENS.filter((screen) =>
    ['/map', '/search', '/archive', '/last-battle', '/events'].includes(screen.url),
  )) {
    test(`${url}: главное действие видно сразу`, async ({ page }) => {
      await page.goto(url)
      await expect(page.getByTestId(main)).toBeInViewport()
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
    const fallback = page.getByTestId('hub-map-fallback')
    await expect(fallback).toBeVisible({ timeout: 15_000 })
    const [fallbackBox, searchBox] = await Promise.all([
      fallback.boundingBox(),
      page.getByTestId('hub-search').boundingBox(),
    ])
    expect(fallbackBox).not.toBeNull()
    expect(searchBox).not.toBeNull()
    expect(fallbackBox!.y).toBeGreaterThanOrEqual(searchBox!.y + searchBox!.height)
    await expect(page.getByTestId('hub-route-start')).toBeVisible()
    await expectNoA11yViolations(page)
  })

  test('главное действие мероприятий зависит от роли', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('role-family').click()
    await page.goto('/events')
    await expect(page.getByTestId('search-join')).toHaveText('Посмотреть выезды')
    await page.goto('/')
    await page.getByTestId('role-verifier').click()
    await page.goto('/events')
    await expect(page.getByTestId('events-archive')).toHaveText('Проверить истории')
  })

  test('волонтёр может записаться, командир может открыть создание заявки', async ({ page }) => {
    await page.goto('/events')
    await expect(page.getByTestId('search-join')).toHaveText('Стать частью команды')
    await page.goto('/')
    await page.getByTestId('role-commander').click()
    await page.goto('/events')
    await expect(page.getByTestId('search-create-request')).toHaveAttribute(
      'href',
      '/search/requests/new',
    )
  })

  test('переход ставит видимый фокус на заголовок, поиск карты имеет имя', async ({ page }) => {
    await page.goto('/events')
    const heading = page.getByRole('heading', { level: 1, name: 'Мероприятия' })
    await expect(heading).toBeFocused()
    expect(await heading.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
      'none',
    )
    await page.goto('/map')
    await expect(page.getByRole('searchbox', { name: 'Поиск по карте' })).toBeFocused()
  })

  test('вымышленные новости помечены рядом с каждым пунктом', async ({ page }) => {
    await page.goto('/events')
    const news = page.getByTestId('week-news')
    await expect(news.getByRole('heading', { name: /Новости недели.*Демо-данные/ })).toBeVisible()
    const items = news.locator('[class*="weekItem"]')
    const count = await items.count()
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index++) {
      await expect(items.nth(index).getByText('Демо-данные')).toBeVisible()
    }
  })

  test('демо-вход предупреждает до ввода данных и не обещает регистрацию', async ({ page }) => {
    await page.goto('/other?section=account')
    const form = page.getByTestId('signin-form')
    await expect(form.getByRole('status')).toContainText('Не вводите свой настоящий пароль')
    await expect(form.getByRole('textbox', { name: 'Телефон или почта' })).toBeVisible()
    await expect(form.getByRole('button', { name: 'Зарегистрироваться' })).toHaveCount(0)
  })

  test('пустой результат поиска мероприятий предлагает вернуться к ленте', async ({ page }) => {
    await page.goto('/events')
    await page.getByTestId('events-search').fill('несуществующий запрос')
    await expect(page.getByTestId('events-empty')).toContainText('Ничего не нашли')
    await page
      .getByTestId('events-empty')
      .getByRole('button', { name: 'покажите все мероприятия' })
      .click()
    await expect(page.getByTestId('events-search')).toHaveValue('')
    await expect(page.getByTestId('events-empty')).toHaveCount(0)
  })
})
