import { expect } from '@playwright/test'
import {
  expectNoA11yViolations,
  expectNoHorizontalScroll,
  signInOnDevice,
  startAs,
  test,
  useDemoDate,
} from './helpers.ts'

/** Доработки по аудиту ТЗ: статусы мест, сборы и карта потребностей, памятники, своё «живое фото». */

test('краевед подтверждает место по «Книге Памяти» — статус и источник в карточке', async ({
  page,
}) => {
  await useDemoDate(page)
  await startAs(page, 'verifier')
  await page.goto('/last-battle/S01')
  await expect(page.locator('[data-main-action]')).toHaveCount(1)
  await page.getByTestId('site-confirm-detail').fill('т. 5, с. 112')
  await page.getByTestId('site-confirm-submit').click()
  await expect(page.getByTestId('site-status-done')).toContainText('Подтверждено архивом')
  await expect(page.getByTestId('site-sources')).toContainText('т. 5, с. 112')
  await expectNoA11yViolations(page)
})

test('целевые сборы из кейса — в ленте «Мероприятий»: по ширине, WCAG AA, одна главная кнопка', async ({
  page,
}) => {
  await useDemoDate(page)
  await startAs(page, 'volunteer')
  await page.getByTestId('events-filter-fund').click()
  const raise = page.getByTestId('feed-fund-F03')
  await expect(raise).toContainText('Поднять бойца')
  await expect(page.getByTestId('feed-fund-F02')).toContainText('Экипировать отряд')
  await expect(page.locator('[data-main-action]')).toHaveCount(1)
  await expectNoHorizontalScroll(page)
  await expectNoA11yViolations(page)
  await raise.getByTestId('donate-F03').click()
  await expect(page.getByTestId('donate-dialog-F03')).toContainText('деньги не списываются')
  await expectNoA11yViolations(page)
})

test('хроника: памятник из OpenStreetMap открывается карточкой с источником', async ({ page }) => {
  await useDemoDate(page)
  await startAs(page, 'family')
  await page.goto('/chronicle')
  await page.getByTestId('memorial-list').locator('summary').click()
  await expect(page.getByTestId('memorial-list')).toContainText('Тихоокеанского флота')
  await expectNoHorizontalScroll(page)
  await expectNoA11yViolations(page)
})

test('«Оживить своё фото»: снимок, согласие → фраза из кейса и пример ролика с пометкой ИИ', async ({
  page,
}) => {
  await useDemoDate(page)
  await signInOnDevice(page)
  await startAs(page, 'family')
  await page.goto('/live/new')
  // 1×1 PNG — настоящая картинка, чтобы браузер уменьшил её через canvas
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  await page
    .getByTestId('live-new-file')
    .setInputFiles({ name: 'ded.png', mimeType: 'image/png', buffer: png })
  // Снимок уменьшается через canvas — под нагрузкой полного прогона это дольше 5 с
  await expect(page.getByTestId('live-new-preview')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('live-new-consent').check()
  await page.getByTestId('live-new-submit').click()
  // Этапы генерации идут около 9 с, затем — ролик
  await expect(page.getByTestId('live-gen-step')).toBeVisible()
  await expectNoA11yViolations(page)
  await expect(page.getByTestId('live-new-speech')).toContainText('голубое небо', {
    timeout: 20_000,
  })
  await expect(page.getByTestId('live-new-example')).toBeVisible()
  await expect(page.locator('[data-main-action]')).toHaveCount(1)
  await expectNoA11yViolations(page)
})
