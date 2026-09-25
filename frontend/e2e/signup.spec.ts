import { expect, type Page } from '@playwright/test'
import {
  expectNoA11yViolations,
  expectNoHorizontalScroll,
  snap,
  signInOnDevice,
  startAs,
  test,
  useDemoDate,
} from './helpers.ts'

/**
 * Запись через окно с условиями (спринт v3.2): сначала время, место сбора, что взять и возраст,
 * потом подтверждение. Без подтверждённого возраста 18+ — только с согласием родителя.
 */
async function fillParent(page: Page) {
  await page.getByTestId('signup-fullName').fill('Иванова Мария Петровна')
  await page.getByTestId('signup-phone').fill('+7 900 123-45-67')
  await page.getByTestId('signup-agreed').check()
}

test.describe('Запись с условиями и согласием родителя', () => {
  test.beforeEach(async ({ page }) => useDemoDate(page))

  test('заявка отряда: условия → без согласия нельзя → с согласием «Вы записаны»', async ({
    page,
  }, testInfo) => {
    await signInOnDevice(page)
    await startAs(page, 'volunteer')
    await page.getByTestId('request-join-R01').click()
    const dialog = page.getByTestId('signup-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId('signup-starts')).toHaveText('09:00')
    await expect(dialog.getByTestId('signup-ends')).toHaveText('18:00')
    await expect(dialog).toContainText('Мценск, площадь у автостанции')
    await expect(dialog.getByTestId('signup-consent')).toContainText('Согласие родителя')
    await expectNoHorizontalScroll(page)
    await expectNoA11yViolations(page)
    await snap(page, testInfo, 'signup-01-terms')

    await dialog.getByTestId('signup-confirm').click()
    await expect(page.getByTestId('signup-fullName')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByTestId('signup-fullName')).toBeFocused()
    await expectNoA11yViolations(page)

    await fillParent(page)
    await dialog.getByTestId('signup-confirm').click()
    await expect(page.getByTestId('signup-done')).toContainText('Вы записаны')
    await snap(page, testInfo, 'signup-02-done')
    await dialog.getByTestId('dialog-close').click()
    await expect(page.getByTestId('request-joined-R01')).toContainText('Вы записаны')

    // запись помнится после перезагрузки
    await page.reload()
    await expect(page.getByTestId('request-joined-R01')).toContainText('Вы записаны')
  })

  test('возраст 18+ подтверждён в профиле — согласие родителя не спрашиваем', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('tropa:profile.age', JSON.stringify({ adultVerified: true, age: 25 })),
    )
    await signInOnDevice(page)
    await startAs(page, 'volunteer')
    await page.getByTestId('events-nearest-trip').click()
    await page.getByTestId('trip-register').click()
    const dialog = page.getByTestId('signup-dialog')
    await expect(dialog.getByTestId('signup-adult')).toBeVisible()
    await expect(dialog.getByTestId('signup-consent')).toHaveCount(0)
    await dialog.getByTestId('signup-confirm').click()
    await expect(page.getByTestId('signup-done')).toBeVisible()
    await dialog.getByTestId('dialog-close').click()
    await expect(page.getByTestId('trip-register')).toBeDisabled()
    await expect(page.getByTestId('trip-spots')).toHaveText('Свободно мест: 6 из 12')
  })

  test('только клавиатура: окно держит фокус, Escape закрывает и возвращает фокус', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'клавиатурный проход проверяем на ноутбуке')
    await signInOnDevice(page)
    await startAs(page, 'volunteer')
    const join = page.getByTestId('request-join-R01')
    await join.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('signup-dialog')).toBeFocused()
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[data-testid="signup-dialog"]')),
      )
      expect(inside, 'фокус не уходит из окна').toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('signup-dialog')).toHaveCount(0)
    await expect(join).toBeFocused()
  })
})
