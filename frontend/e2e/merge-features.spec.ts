import { expect } from '@playwright/test'
import {
  expectNoA11yViolations,
  expectNoHorizontalScroll,
  snap,
  startAs,
  test,
  useDemoDate,
} from './helpers.ts'

/** Функции из единого макета команды и дизайна: «Истории», коллективные заявки, «Где я?», хроника, «Поделиться». */

test.describe('Новые экраны: адаптив, доступность, одна главная кнопка', () => {
  const SCREENS = [
    { url: '/archive', main: 'archive-new' },
    { url: '/archive/new', main: 'story-send' },
    { url: '/archive/ST01', main: 'story-tell-own' },
    { url: '/weekends/W01/group', main: 'group-send' },
    { url: '/chronicle', main: 'chronicle-tell' },
  ] as const

  for (const { url, main } of SCREENS) {
    test(`${url}: помещается по ширине, WCAG AA, одна главная кнопка`, async ({ page }) => {
      await useDemoDate(page)
      await startAs(page, 'family')
      await page.goto(url)
      await expect(page.getByTestId(main)).toBeVisible()
      await expect(page.locator('[data-main-action]')).toHaveCount(1)
      await expectNoHorizontalScroll(page)
      await expectNoA11yViolations(page)
    })
  }
})

test('«Истории»: семья рассказывает историю, краевед проверяет и подтверждает', async ({
  context,
}, testInfo) => {
  const family = await context.newPage()
  await startAs(family, 'family')
  await family.getByTestId('tab-stories').click()
  await expect(family.getByTestId('story-ST01')).toBeVisible()
  await snap(family, testInfo, 'merge-01-archive')

  await family.getByTestId('archive-new').click()
  await family.getByTestId('story-title').fill('Письмо прадеда')
  await family.getByTestId('story-place').fill('Кромской район')
  await family
    .getByTestId('story-body')
    .fill(
      'Прадед писал домой летом 1943 года, перед наступлением на Орёл. Письмо хранится в семье.',
    )
  await family.getByTestId('story-source').fill('Семейный архив: письмо, июль 1943')
  await family.getByTestId('story-author').fill('Семья Ивановых')
  await snap(family, testInfo, 'merge-02-new-story')
  await family.getByTestId('story-send').click()
  await expect(family.getByTestId('story-status')).toHaveText(/Ожидает проверки/)
  await snap(family, testInfo, 'merge-03-story-sent')

  // Краевед — на своём устройстве; в демо без бэкенда проверяет историю из демо-очереди
  const verifier = await context.newPage()
  await startAs(verifier, 'verifier')
  await expect(verifier).toHaveURL(/\/events$/)
  await verifier.getByTestId('events-archive').click()
  await expect(verifier).toHaveURL(/\/archive$/)
  await verifier.getByTestId('archive-review-next').click()
  await verifier.getByTestId('review-verify').click()
  await expect(verifier.getByTestId('review-blocker')).toContainText('Отметьте все пункты')
  for (const id of ['datePlace', 'source', 'archive'])
    await verifier.getByTestId(`review-check-${id}`).check()
  await expectNoA11yViolations(verifier)
  await snap(verifier, testInfo, 'merge-04-review')
  await verifier.getByTestId('review-verify').click()
  await expect(verifier.getByTestId('story-status')).toHaveText(/Подтверждено/)
  await snap(verifier, testInfo, 'merge-05-verified')
})

test('коллективная заявка: школа записывается на выезд, командир подтверждает', async ({
  page,
}, testInfo) => {
  await useDemoDate(page)
  await startAs(page, 'family')
  await page.getByTestId('tab-events').click()
  await page.getByTestId('events-weekends').click()
  await page.getByTestId('weekends-register').click()
  await page.getByTestId('trip-group').click()
  await page.getByTestId('group-organization').fill('Школа № 5, 7 «А» класс')
  await page.getByTestId('group-contact-name').fill('Мария Петровна')
  await page.getByTestId('group-contact').fill('+7 900 555-44-33')
  await page.getByTestId('group-comment').fill('8 детей и 2 взрослых, нужен гид')
  await snap(page, testInfo, 'merge-06-group-form')
  await page.getByTestId('group-consent').check()
  await page.getByTestId('group-send').click()
  await expect(page.getByTestId('group-sent')).toBeVisible()
  await page.getByRole('heading', { name: 'Мои заявки групп' }).scrollIntoViewIfNeeded()
  await snap(page, testInfo, 'merge-07-group-sent')

  await startAs(page, 'commander')
  await page.getByTestId('events-weekends').click()
  const card = page.getByTestId('group-G01')
  await card.scrollIntoViewIfNeeded()
  await expectNoA11yViolations(page)
  await snap(page, testInfo, 'merge-08-commander-groups')
  await card.getByTestId('group-confirm-G01').click()
  await expect(card).toContainText('Подтверждена')
})

test('«Где я?» на карте тропы: метка и расстояние до точки', async ({ page }, testInfo) => {
  await startAs(page, 'family')
  await page.goto('/trail')
  await page.getByTestId('trail-locate').click()
  await expect(page.getByTestId('marker-me')).toBeVisible()
  await expect(page.getByTestId('trail-distance')).toContainText('Рубеж десантников')
  // карта перестраивает кадр под новую метку — даём программному рендеру дорисовать маршрут
  await page.waitForTimeout(800)
  await snap(page, testInfo, 'merge-09-trail-locate')
})

test('хроника: события по годам, фильтр и выбор события на карте', async ({ page }, testInfo) => {
  await startAs(page, 'family')
  await page.getByTestId('tab-stories').click()
  await page.getByTestId('archive-chronicle').click()
  await expect(page.getByRole('heading', { level: 2, name: '1941 оборона' })).toBeVisible()
  await expect(page.getByTestId('chronicle-map')).toHaveAttribute('data-ready', 'true')
  await page.getByTestId('year-1943').click()
  await expect(page.getByRole('heading', { level: 2, name: '1941 оборона' })).toHaveCount(0)
  const marker = page.locator('[data-testid^="marker-"]').first()
  await marker.click()
  await expectNoA11yViolations(page)
  await page.waitForTimeout(800)
  await snap(page, testInfo, 'merge-10-chronicle')
})

test('«Поделиться» на карточке места: ссылка или системное меню', async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await startAs(page, 'volunteer')
  await page.goto('/last-battle/S01')
  await page.getByTestId('site-share').click()
  await expect(page.getByTestId('site-share-result')).toContainText('Ссылка скопирована')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/last-battle\/S01$/)
  await page.getByTestId('site-share').scrollIntoViewIfNeeded()
  await snap(page, testInfo, 'merge-11-share')
})
