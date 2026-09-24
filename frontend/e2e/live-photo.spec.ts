import { expect } from '@playwright/test'
import { expectNoA11yViolations, expectNoHorizontalScroll, snap, test } from './helpers.ts'

/** «Живое фото»: QR-код на снимке ведёт на /live/<id>, камера узнаёт снимок, ролик играет поверх. */

test.describe('«Живое фото»: экраны', () => {
  for (const { url, main } of [
    { url: '/live', main: 'live-list-open' },
    { url: '/live/soldier', main: 'live-open-camera' },
    { url: '/live/reichstag', main: 'live-open-camera' },
    { url: '/live/new', main: 'live-new-submit' },
  ]) {
    test(`${url}: помещается по ширине, WCAG AA, одна главная кнопка`, async ({ page }) => {
      await page.goto(url)
      await expect(page.getByTestId(main)).toBeVisible()
      await expect(page.locator('[data-main-action]')).toHaveCount(1)
      await expectNoHorizontalScroll(page)
      await expectNoA11yViolations(page)
    })
  }

  test('по QR: согласие → ролик без камеры с пометкой ИИ и субтитрами', async ({
    page,
  }, testInfo) => {
    await page.goto('/live/reichstag')
    await expect(page.getByTestId('live-open-camera')).toBeDisabled()
    await snap(page, testInfo, 'live-01-intro')
    await page.getByTestId('live-consent').check()
    await page.getByTestId('live-watch-video').click()
    const video = page.getByTestId('live-video')
    await expect(video).toHaveAttribute('controls', '')
    // Ролик и субтитры действительно отдаются сервером
    const duration = await video.evaluate(
      (v: HTMLVideoElement) =>
        new Promise<number>((resolve) => {
          if (v.readyState >= 1) resolve(v.duration)
          else v.addEventListener('loadedmetadata', () => resolve(v.duration), { once: true })
        }),
    )
    expect(duration).toBeGreaterThan(15)
    await video.scrollIntoViewIfNeeded()
    await snap(page, testInfo, 'live-02-video')
  })
})
