import { expect } from '@playwright/test'
import {
  expectNoA11yViolations,
  expectNoHorizontalScroll,
  signInOnDevice,
  startAs,
  test,
} from './helpers.ts'

/**
 * Функции для показа жюри: AR-режим (телефон — камера и 3D-боец; компьютер — предпросмотр модели)
 * и оплата сбора условными токенами на странице кассы.
 */
test('AR-режим: на телефоне — камера, на компьютере — объяснение и 3D-модель бойца', async ({
  page,
}, testInfo) => {
  await signInOnDevice(page)
  await page.goto('/other?section=ar')
  await expect(page.getByTestId('ar-mvp-note')).toContainText('в реальном времени')
  if (testInfo.project.name === 'phone') {
    await expect(page.getByTestId('ar-camera-enable')).toBeVisible()
  } else {
    await expect(page.getByTestId('ar-unavailable')).toContainText('на телефоне')
    await expect(page.getByTestId('ar-model-preview').locator('canvas')).toBeVisible()
  }
  await expectNoHorizontalScroll(page)
  await expectNoA11yViolations(page)
})

test('пожертвование: сумма → касса → оплата токенами → чек, сбор вырос', async ({ page }) => {
  await startAs(page, 'volunteer')
  await page.goto('/events?show=fund')
  await page.getByTestId('donate-F03').click()
  await page.getByTestId('amount-500').click()
  await page.getByTestId('donate-confirm').click()
  await expect(page).toHaveURL(/\/payment\/checkout\?fundraiser=F03&amount=500$/)
  await expect(page.getByTestId('checkout-balance')).toContainText('10')
  await expectNoA11yViolations(page)
  await page.getByTestId('checkout-pay').click()
  await expect(page.getByTestId('checkout-receipt')).toContainText('Чек №')
  await expect(page.getByTestId('checkout-note')).toContainText('Реальные деньги не списывались')
  await expectNoHorizontalScroll(page)
  await expectNoA11yViolations(page)
  await page.getByTestId('checkout-done').click()
  await expect(page).toHaveURL(/\/events\?show=fund$/)
})
