import { expect, type Page } from '@playwright/test'
import { snap, test } from './helpers.ts'

/**
 * Настоящее распознавание: вместо камеры — видеопоток со снимком (LIVE_AR_CAMERA=путь к .y4m,
 * собрать: python scripts/live-photo/fake_camera.py public/live/soldier.jpg soldier.y4m).
 * Нужна сеть (MindAR и three.js с jsDelivr), поэтому в обычном verify не запускается.
 */
const camera = process.env.LIVE_AR_CAMERA
const photoId = process.env.LIVE_AR_PHOTO ?? 'soldier'
test.skip(!camera, 'нужен LIVE_AR_CAMERA — видеопоток со снимком')
test.use({
  // Service worker сайта сам запрашивает цель .mind — перехват page.route его не видит,
  // и сценарий «цель не загрузилась» не воспроизводится. В этих тестах он не нужен.
  serviceWorkers: 'block',
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

/** Запоминаем все потоки камеры, чтобы проверить, что после уборки они погашены. */
async function watchCamera(page: Page) {
  await page.addInitScript(() => {
    const streams: MediaStream[] = []
    ;(window as unknown as { tropaCameraStates: () => string[] }).tropaCameraStates = () =>
      streams.flatMap((s) => s.getTracks().map((t) => t.readyState))
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints)
      streams.push(stream)
      return stream
    }
  })
  return () =>
    page.evaluate(() =>
      (window as unknown as { tropaCameraStates: () => string[] }).tropaCameraStates(),
    )
}

async function openCamera(page: Page) {
  await page.goto(`/live/${photoId}`)
  await page.getByTestId('live-consent').check()
  await page.getByTestId('live-open-camera').click()
}

test('снимок в кадре — ролик играет поверх, пометка ИИ видна; «Закрыть» гасит камеру', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  const cameraStates = await watchCamera(page)
  await openCamera(page)
  const status = page.getByTestId('live-ar-status')
  // Камера включилась и узнала снимок — ролик играет поверх него
  await expect(status).toContainText('Снимок ожил', { timeout: 60_000 })
  await expect(page.getByTestId('live-ai-label')).toBeVisible()
  expect(await page.getByTestId('live-video').evaluate((v: HTMLVideoElement) => !v.paused)).toBe(
    true,
  )
  await page.waitForTimeout(1500)
  await snap(page, testInfo, `live-03-ar-${photoId}`)

  expect(await cameraStates()).toContain('live')
  await page.getByTestId('live-ar-close').click()
  await expect.poll(cameraStates).not.toContain('live')
  expect(await page.getByTestId('live-video').evaluate((v: HTMLVideoElement) => v.paused)).toBe(
    true,
  )
})

test('цель камеры не загрузилась — через 20 с ролик без камеры, камера погашена', async ({
  page,
  consoleErrors,
}) => {
  test.setTimeout(90_000)
  const cameraStates = await watchCamera(page)
  await page.route('**/*.mind', (route) => route.fulfill({ status: 404, body: 'нет' }))
  await openCamera(page)
  await expect(page.getByTestId('live-ar-status')).toContainText('Не удалось включить камеру', {
    timeout: 30_000,
  })
  await expect.poll(cameraStates).not.toContain('live')
  await page.getByTestId('live-ar-fallback').click()
  await expect(page.getByTestId('live-video')).toHaveAttribute('controls', '')
  await expect(page.getByTestId('live-video-ai-label')).toBeVisible()
  // Ожидаемые ошибки сценария: 404 на цель и исключение внутри MindAR, из-за которого его запуск
  // не завершается сам (поэтому и нужен таймаут). Остальные ошибки консоли по-прежнему валят тест
  const expected = /status of 404|byte\(s\) found at buffer/
  const unexpected = consoleErrors.filter((e) => !expected.test(e))
  consoleErrors.splice(0, consoleErrors.length, ...unexpected)
})

test('вкладку свернули — камера гаснет', async ({ page }) => {
  test.setTimeout(90_000)
  const cameraStates = await watchCamera(page)
  await openCamera(page)
  await expect(page.getByTestId('live-ar-status')).toContainText('Снимок ожил', {
    timeout: 60_000,
  })
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(cameraStates).not.toContain('live')
  await expect(page.getByTestId('live-ar-retry')).toBeVisible()
})
