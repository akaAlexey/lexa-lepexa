import { expect } from '@playwright/test'
import { expectNoA11yViolations, snap, test } from './helpers.ts'

test('старт: выбор роли → «Тропа», «Назад» возвращает к ролям', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Тропа памяти')
  await expectNoA11yViolations(page)
  await snap(page, testInfo, '01-roles')

  await page.getByTestId('role-family').click()
  await expect(page).toHaveURL(/\/trail$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Тропа' })).toBeVisible()
  await expect(page.getByTestId('trail-map')).toHaveAttribute('data-ready', 'true')
  await expect(page.getByTestId('marker-rubezh')).toBeVisible()
  await expectNoA11yViolations(page)
  await snap(page, testInfo, '02-trail')

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('role-family')).toHaveAttribute('aria-pressed', 'true')
})

test('прямые ссылки открывают экраны, разделы доступны из меню', async ({ page }, testInfo) => {
  await page.goto('/last-battle')
  await expect(page.getByRole('heading', { level: 1, name: 'Последний бой' })).toBeVisible()
  await expect(page.getByTestId('status-found_needs_check')).toBeVisible()
  await snap(page, testInfo, '03-last-battle')

  await page.getByTestId('tab-search').click()
  await expect(page.getByTestId('found-counter')).toContainText('Найдено бойцов за месяц')
  await expect(page.getByTestId('team-T01')).toContainText('Высота')
  await expectNoA11yViolations(page)
  await snap(page, testInfo, '04-search')

  await page.getByTestId('tab-weekends').click()
  await expect(page.getByTestId('trip-W01')).toContainText('3 октября, суббота')
  await snap(page, testInfo, '05-weekends')
})
