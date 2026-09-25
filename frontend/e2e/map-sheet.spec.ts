import { expect, type Page } from '@playwright/test'
import { expectNoA11yViolations, expectNoHorizontalScroll, snap, test } from './helpers.ts'

/**
 * Шторка «Места / История края» (замечание #14, аудит P1-2 и P1-3): перетаскивание пальцем и мышью,
 * фиксация на 40, 50 и 82 % высоты экрана, клавиатура, прокрутка содержимого в каждом положении.
 * Проверяется на телефоне 360×780 и на 683×384 (ноутбук при масштабе 200 %).
 */

const SIZES = {
  phone: { width: 360, height: 780 },
  laptop: { width: 683, height: 384 },
} as const

async function openMap(page: Page, project: string) {
  await page.setViewportSize(SIZES[project as keyof typeof SIZES])
  await page.goto('/')
  await page.getByTestId('role-volunteer').click()
  await page.goto('/map')
  await expect(page.getByTestId('hub-route-start')).toBeVisible()
}

const sheet = (page: Page) => page.getByTestId('hub-sheet')
const handle = (page: Page) => page.getByTestId('hub-sheet-handle')

/** Где окажется верх шторки, если её видимая часть — `ratio` высоты экрана. */
async function topFor(page: Page, ratio: number) {
  return page.evaluate((r) => {
    const hub = document.querySelector('[data-testid="screen-map"]')!.getBoundingClientRect()
    return hub.bottom - r * window.innerHeight
  }, ratio)
}

/** Мышью: зажать ручку, медленно довести до нужной высоты и отпустить (без броска). */
async function dragTo(page: Page, ratio: number) {
  const box = (await handle(page).boundingBox())!
  const x = box.x + box.width / 2
  await page.mouse.move(x, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(x, (await topFor(page, ratio)) + 1, { steps: 12 })
  await page.waitForTimeout(200)
  // последнее движение медленное: скорость отпускания почти нулевая
  await page.mouse.move(x, await topFor(page, ratio), { steps: 1 })
  await page.mouse.up()
}

async function expectSnap(page: Page, value: string, label: string) {
  await expect(sheet(page)).toHaveAttribute('data-snap', value)
  await expect(page.getByRole('status').filter({ hasText: 'Панель:' })).toHaveText(label)
}

/** Содержимое доступно: прокрутка тела шторки доводит последний элемент до видимой области. */
async function expectContentReachable(page: Page) {
  const body = page.getByTestId('hub-sheet-body')
  await body.evaluate((el) => el.scrollTo({ top: el.scrollHeight }))
  const last = body.locator(':scope > *').last()
  await expect(last).toBeInViewport()
  await expect(page.getByTestId('hub-search')).toBeInViewport()
}

test.describe('Шторка карты', () => {
  test('по умолчанию 40 %, мышь: 45 % → 50 %, 70 % → 82 %, 44 % → 40 %', async ({
    page,
  }, testInfo) => {
    await openMap(page, testInfo.project.name)
    await expectSnap(page, '0.4', 'Панель: 40 % экрана')

    await dragTo(page, 0.45)
    await expectSnap(page, '0.5', 'Панель: 50 % экрана')

    await dragTo(page, 0.7)
    await expectSnap(page, '0.82', 'Панель: 82 % экрана')

    await dragTo(page, 0.44)
    await expectSnap(page, '0.4', 'Панель: 40 % экрана')
    await expectNoHorizontalScroll(page)
  })

  test('быстрый бросок вверх — к следующей точке, даже если отпустили у нижней', async ({
    page,
  }, testInfo) => {
    await openMap(page, testInfo.project.name)
    const box = (await handle(page).boundingBox())!
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    // рывок на 30 px за одно движение: до 50 % не дотянули, но скорость большая
    await page.mouse.move(x, y - 10)
    await page.mouse.move(x, y - 30)
    await page.mouse.up()
    await expectSnap(page, '0.5', 'Панель: 50 % экрана')
  })

  test('клавиатура: ↑ ↓ Home End переключают все три точки', async ({ page }, testInfo) => {
    await openMap(page, testInfo.project.name)
    await handle(page).focus()
    await expect(handle(page)).toHaveAccessibleName('Изменить высоту панели')
    await page.keyboard.press('ArrowUp')
    await expectSnap(page, '0.5', 'Панель: 50 % экрана')
    await page.keyboard.press('ArrowUp')
    await expectSnap(page, '0.82', 'Панель: 82 % экрана')
    await page.keyboard.press('ArrowUp')
    await expectSnap(page, '0.82', 'Панель: 82 % экрана')
    await page.keyboard.press('Home')
    await expectSnap(page, '0.4', 'Панель: 40 % экрана')
    await page.keyboard.press('End')
    await expectSnap(page, '0.82', 'Панель: 82 % экрана')
    await page.keyboard.press('ArrowDown')
    await expectSnap(page, '0.5', 'Панель: 50 % экрана')
    await page.keyboard.press('Enter')
    await expectSnap(page, '0.82', 'Панель: 82 % экрана')
  })

  test('во всех трёх положениях содержимое доступно прокруткой, поиск не закрыт, axe чист', async ({
    page,
  }, testInfo) => {
    await openMap(page, testInfo.project.name)
    const shots = ['40', '50', '82']
    for (const [i, value] of ['0.4', '0.5', '0.82'].entries()) {
      if (i > 0) await handle(page).press('ArrowUp')
      await expect(sheet(page)).toHaveAttribute('data-snap', value)
      await page.waitForTimeout(300) // доводка шторки
      await expectContentReachable(page)
      await expectNoA11yViolations(page)
      await snap(page, testInfo, `map-sheet-${testInfo.project.name === 'phone' ? '360' : '683'}-${shots[i]}`)
    }
  })

  test('карта получает нижний отступ по фактической высоте шторки', async ({ page }, testInfo) => {
    await openMap(page, testInfo.project.name)
    for (const key of ['ArrowUp', 'ArrowUp'] as const) {
      await handle(page).press(key)
      await page.waitForTimeout(300)
      const { visible, expected } = await page.evaluate(() => {
        const hub = document.querySelector('[data-testid="screen-map"]')!.getBoundingClientRect()
        const el = document.querySelector('[data-testid="hub-sheet"]')!
        const snapValue = Number(el.getAttribute('data-snap'))
        return {
          visible: hub.bottom - el.getBoundingClientRect().top,
          expected: Math.min(snapValue * window.innerHeight, hub.height),
        }
      })
      // шторка может быть ниже доли экрана, только если упёрлась в поле поиска
      expect(visible).toBeLessThanOrEqual(expected + 1)
      expect(visible).toBeGreaterThan(0)
    }
  })
})

test('палец: перетаскивание касанием поднимает шторку', async ({ page, browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone' || browserName !== 'chromium', 'касания — на телефоне')
  await openMap(page, 'phone')
  const box = (await handle(page).boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const target = await topFor(page, 0.8)
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: string, ty?: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: ty === undefined ? [] : [{ x, y: ty }],
    })
  await touch('touchStart', y)
  for (let i = 1; i <= 10; i++) await touch('touchMove', y + ((target - y) * i) / 10)
  await page.waitForTimeout(200)
  await touch('touchMove', target + 1)
  await touch('touchEnd')
  await expectSnap(page, '0.82', 'Панель: 82 % экрана')
})

test('ноутбук: боковая панель без ручки и перетаскивания', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop', 'широкий экран')
  await page.goto('/')
  await page.getByTestId('role-volunteer').click()
  await page.goto('/map')
  await expect(page.getByTestId('hub-route-start')).toBeVisible()
  await expect(handle(page)).toHaveCount(0)
  await expect(sheet(page)).not.toHaveAttribute('data-snap')
})
