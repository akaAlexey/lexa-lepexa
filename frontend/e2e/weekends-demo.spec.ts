import { expect } from '@playwright/test'
import { expectNoA11yViolations, snap, startAs, test, useDemoDate } from './helpers.ts'

test.describe('Выходные с поисковиком', () => {
  test.beforeEach(async ({ page }) => useDemoDate(page))

  test('список дат → карточка выезда → чек-лист → запись', async ({ page }, testInfo) => {
    await startAs(page, 'volunteer')
    await page.getByTestId('tab-events').click()
    await page.getByTestId('feed-trip-open-W01').click()
    await expect(page).toHaveURL(/\/weekends\/W01$/)
    await expect(page.getByTestId('trip-date')).toHaveText('3 октября, суббота')
    await page.getByRole('checkbox', { name: 'Лопата' }).check()
    await page.getByRole('checkbox', { name: 'Щуп' }).check()
    await expect(page.getByTestId('checklist-progress')).toHaveText(/Готово 2 из 4/)
    await expectNoA11yViolations(page)
    await snap(page, testInfo, 'weekends-01-trip')
    await page.getByTestId('trip-register').click()
    // запись — через окно с условиями; без подтверждённых 18+ — с согласием родителя
    const dialog = page.getByTestId('signup-dialog')
    await expect(dialog).toContainText('Орёл, ж/д вокзал, у главного входа (демо)')
    await page.getByTestId('signup-fullName').fill('Петров Иван Сергеевич')
    await page.getByTestId('signup-phone').fill('89001234567')
    await page.getByTestId('signup-agreed').check()
    await dialog.getByTestId('signup-confirm').click()
    await expect(page.getByTestId('signup-done')).toBeVisible()
    await dialog.getByTestId('dialog-close').click()
    await expect(page.getByTestId('trip-registered')).toContainText('Вы записаны')
  })
})

test.describe('Скрытый демо-пульт', () => {
  test('не в меню; «вбросить» точку — уведомление; сброс — снова выбор роли', async ({
    page,
  }, testInfo) => {
    await startAs(page, 'family')
    await expect(page.locator('nav')).not.toContainText(/пульт/i)

    await page.goto('/demo')
    await expect(page.getByTestId('demo-build')).toHaveText(/Сборка: \S+/)
    await page.getByTestId('demo-inject-site').click()
    await expect(page.getByTestId('toast')).toContainText(
      'В 5 км от вас обнаружено место гибели бойца',
    )
    await snap(page, testInfo, 'demo-01-console')

    await page.getByTestId('demo-reset').click()
    await expect(page.getByTestId('demo-reset-done')).toContainText('Данные сброшены')
    await page.goto('/roles')
    await expect(page.getByTestId('role-family')).toHaveAttribute('aria-pressed', 'false')
  })
})
