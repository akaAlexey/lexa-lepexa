import { expect } from '@playwright/test'
import { expectNoA11yViolations, snap, test } from './helpers.ts'

test('старт: главная — «Мероприятия»; роль — на /roles, «Назад» возвращает к ролям', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Мероприятия' })).toBeVisible()
  await expectNoA11yViolations(page)

  await page.goto('/roles')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Тропа памяти')
  await expectNoA11yViolations(page)
  await snap(page, testInfo, '01-roles')

  await page.getByTestId('role-family').click()
  await expect(page).toHaveURL(/\/events$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Мероприятия' })).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/roles$/)
  await expect(page.getByTestId('role-family')).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/trail')
  await expect(page.getByTestId('trail-map')).toHaveAttribute('data-ready', 'true')
  await expect(page.getByTestId('marker-rubezh')).toBeVisible()
  await expectNoA11yViolations(page)
  await snap(page, testInfo, '02-trail')
})

test('прямые ссылки открывают экраны, разделы доступны из меню', async ({ page }, testInfo) => {
  await page.goto('/last-battle')
  await expect(page.getByRole('heading', { level: 1, name: 'Последний бой' })).toBeVisible()
  await expect(page.getByTestId('status-found_needs_check')).toBeVisible()
  await snap(page, testInfo, '03-last-battle')

  // Четыре раздела ADR 0012: подписи видны всегда, «Последний бой» — внутри «Карты»
  await expect(page.getByTestId('tab-map')).toHaveAttribute('aria-current', 'page')
  await page.getByTestId('tab-events').click()
  await expect(page.getByTestId('week-news')).toContainText('Новости недели')
  await expect(page.getByTestId('request-card-R01')).toContainText('Высота')
  await expect(page.getByTestId('feed-trip-W01')).toContainText('3 октября, суббота')
  await expectNoA11yViolations(page)
  await snap(page, testInfo, '04-events')

  await page.getByTestId('events-search-hq').click()
  await expect(page.getByTestId('found-counter')).toContainText('Найдено бойцов за месяц')
  await expect(page.getByTestId('tab-events')).toHaveAttribute('aria-current', 'page')

  await page.getByTestId('tab-map').click()
  await expect(page.getByTestId('hub-map')).toHaveAttribute('data-ready', 'true')
  await snap(page, testInfo, '05-map')

  await page.getByTestId('tab-stories').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Книга памяти' })).toBeVisible()
  await page.getByTestId('tab-other').click()
  await expect(page.getByTestId('other-account')).toContainText('Вход')
})
