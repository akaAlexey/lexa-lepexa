import { expect } from '@playwright/test'
import { snap, test } from './helpers.ts'

/**
 * Настоящее распознавание: вместо камеры — видеопоток со снимком (LIVE_AR_CAMERA=путь к .y4m).
 * Нужна сеть (MindAR и three.js с jsDelivr), поэтому в обычном verify не запускается.
 */
const camera = process.env.LIVE_AR_CAMERA
const photoId = process.env.LIVE_AR_PHOTO ?? 'soldier'
test.skip(!camera, 'нужен LIVE_AR_CAMERA — видеопоток со снимком')
test.use({
  permissions: ['camera'],
  launchOptions: {
    args: [
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${camera ?? ''}`,
    ],
  },
})

test('снимок в кадре — ролик начинает играть поверх него', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.goto(`/live/${photoId}`)
  await page.getByTestId('live-consent').check()
  await page.getByTestId('live-open-camera').click()
  const status = page.getByTestId('live-ar-status')
  // Камера включилась и узнала снимок — ролик играет поверх него
  await expect(status).toContainText('Снимок ожил', { timeout: 60_000 })
  await expect(page.getByTestId('live-ai-label')).toBeVisible()
  expect(await page.getByTestId('live-video').evaluate((v: HTMLVideoElement) => !v.paused)).toBe(
    true,
  )
  await page.waitForTimeout(1500)
  await snap(page, testInfo, `live-03-ar-${photoId}`)
})
