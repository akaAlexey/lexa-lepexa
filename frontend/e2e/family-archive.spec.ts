import { expect, type Page, type TestInfo } from '@playwright/test'
import {
  expectNoA11yViolations,
  expectNoHorizontalScroll,
  signInOnDevice,
  snap,
  test,
} from './helpers.ts'

/** Каждый экран архива: одна главная кнопка, без прокрутки вбок, без нарушений axe, скриншот. */
async function checkScreen(page: Page, testInfo: TestInfo, name: string) {
  await expect(page.locator('[data-main-action]')).toHaveCount(1)
  await expectNoHorizontalScroll(page)
  await expectNoA11yViolations(page)
  await snap(page, testInfo, name)
}

test('семейный архив: боец, поиск в базах, найденная запись, после перезагрузки всё на месте', async ({
  page,
}, testInfo) => {
  // три экрана с axe и скриншотом и перезагрузка в одном сценарии: 60 с под нагрузкой мало
  test.setTimeout(90_000)
  await signInOnDevice(page)
  await page.goto('/other')
  await expect(page.getByTestId('other-archive')).toContainText('Бойцы семьи и поиск')
  await page.getByTestId('other-archive').click()
  await expect(page.getByTestId('family-empty')).toBeVisible()
  await expect(page.getByTestId('other-family-story')).toBeVisible()
  await checkScreen(page, testInfo, 'family-01-empty')

  await page.getByTestId('family-add').click()
  await expect(page).toHaveURL(/section=archive&fighter=new$/)
  await page.getByTestId('family-save').click()
  await expect(page.getByTestId('family-last-name')).toHaveAttribute('aria-invalid', 'true')
  await page.getByTestId('family-last-name').fill('Иванов')
  await page.getByTestId('family-first-name').fill('Пётр')
  await page.getByTestId('family-middle-name').fill('Сергеевич')
  await page.getByTestId('family-birth-year').fill('1912')
  await page.getByTestId('family-relation').fill('прадед по маме')
  await page
    .getByTestId('family-note')
    .fill('Ушёл на фронт в 1941 году.\nПоследнее письмо — из-под Орла, июль 1943.')
  await checkScreen(page, testInfo, 'family-02-form')

  await page.getByTestId('family-save').click()
  await expect(page).toHaveURL(/section=archive&fighter=F-[^&]+$/)
  await expect(page.getByTestId('family-card-name')).toHaveText('Иванов Пётр Сергеевич')
  await expect(page.getByTestId('other-back')).toHaveText(/К семейному архиву/)

  const pamyat = new URL((await page.getByTestId('family-search-pamyat').getAttribute('href'))!)
  expect(pamyat.hostname).toBe('pamyat-naroda.ru')
  expect(pamyat.searchParams.get('last_name')).toBe('Иванов')
  expect(pamyat.searchParams.get('first_name')).toBe('Пётр')
  expect(pamyat.searchParams.get('date_birth_from')).toBe('1912')
  const obd = new URL((await page.getByTestId('family-search-obd').getAttribute('href'))!)
  expect(obd.hostname).toBe('obd-memorial.ru')
  expect(obd.searchParams.get('f')).toBe('P~Иванов')
  expect(obd.searchParams.get('bd')).toBe('P~1912')
  await expect(page.getByTestId('family-search-pamyat')).toHaveAttribute('target', '_blank')

  await page.getByTestId('family-record-url').fill('https://example.com/pamyat-naroda.ru')
  await page.getByTestId('family-record-add').click()
  await expect(page.getByTestId('family-record-url')).toHaveAttribute('aria-invalid', 'true')
  await page
    .getByTestId('family-record-url')
    .fill('https://pamyat-naroda.ru/heroes/memorial-chelovek_donesenie51500413/')
  await page.getByTestId('family-record-title').fill('Донесение о безвозвратных потерях')
  await page.getByTestId('family-record-add').click()
  await expect(page.getByTestId('family-record-added')).toBeVisible()
  await expect(page.getByTestId('family-records')).toContainText(
    'Донесение о безвозвратных потерях',
  )
  // снимок карточки сверху: имя, заметка и ссылки поиска
  await page.evaluate(() => window.scrollTo(0, 0))
  await checkScreen(page, testInfo, 'family-03-card')

  await page.reload()
  await expect(page.getByTestId('family-card-name')).toHaveText('Иванов Пётр Сергеевич')
  await expect(page.getByTestId('family-records')).toContainText(
    'Донесение о безвозвратных потерях',
  )
  await page.getByTestId('other-back').click()
  await expect(page).toHaveURL(/\/other\?section=archive$/)
  await expect(page.getByTestId('family-list')).toContainText('Иванов Пётр Сергеевич')
  await expect(page.getByTestId('family-list')).toContainText('1912 г. р. · 1 запись')
  // скриншот списка — в следующем тесте: на ноутбуке каждый снимок ждёт фоновую карту
  await expect(page.locator('[data-main-action]')).toHaveCount(1)
  await expectNoHorizontalScroll(page)
  await expectNoA11yViolations(page)
})

/** Архив в памяти браузера до загрузки страницы — ключ владельца при signInOnDevice. */
async function seedArchive(page: Page) {
  await page.addInitScript(
    (fighters) => {
      localStorage.setItem('tropa:family:+7 ··· ···-45-67', JSON.stringify(fighters))
    },
    [
      {
        id: 'F-1',
        lastName: 'Иванов',
        firstName: 'Пётр',
        middleName: 'Сергеевич',
        birthYear: 1912,
        relation: 'прадед по маме',
        note: 'Ушёл на фронт в 1941 году.',
        records: [
          {
            id: 'R-1',
            url: 'https://pamyat-naroda.ru/heroes/memorial-chelovek_donesenie51500413/',
            title: 'Донесение о безвозвратных потерях',
          },
        ],
        createdAt: '2026-09-25T09:00:00Z',
      },
    ],
  )
}

test('семейный архив: список и удаление только после подтверждения', async ({ page }, testInfo) => {
  await signInOnDevice(page)
  await seedArchive(page)
  await page.goto('/other?section=archive')
  await expect(page.getByTestId('family-fighter-F-1')).toContainText(
    'прадед по маме · 1912 г. р. · 1 запись',
  )
  await checkScreen(page, testInfo, 'family-04-list')

  await page.getByTestId('family-fighter-F-1').click()
  await page.getByTestId('family-remove').click()
  await expect(page.getByTestId('family-remove-confirm')).toBeVisible()
  await checkScreen(page, testInfo, 'family-05-remove-confirm')
  await page.getByTestId('family-remove-confirm').click()
  await expect(page).toHaveURL(/\/other\?section=archive$/)
  await expect(page.getByTestId('family-empty')).toBeVisible()
})

test('семейный архив: неизвестный боец', async ({ page }, testInfo) => {
  await signInOnDevice(page)
  await seedArchive(page)
  await page.goto('/other?section=archive&fighter=F-unknown')
  await expect(page.getByTestId('family-missing')).toBeVisible()
  await checkScreen(page, testInfo, 'family-06-missing')
  await page.getByTestId('family-to-list').click()
  await expect(page.getByTestId('family-fighter-F-1')).toBeVisible()
})
