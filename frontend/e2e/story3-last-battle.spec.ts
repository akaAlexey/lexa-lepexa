import { expect } from '@playwright/test'
import { expectNoA11yViolations, snap, startAs, test } from './helpers.ts'

/**
 * User story 3. Командир «Высоты» добавляет место гибели трёх десантников 9-й бригады (5-й ВДК, октябрь 1941).
 * Подписчики в радиусе 20 км получают уведомление «В N км от вас обнаружено место гибели бойца…».
 * Главный сценарий от домашнего экрана командира: «Карта» → «Отметить место гибели» → «Опубликовать».
 */
test.describe('История 3: место гибели и уведомление подписчикам', () => {
  test('командир публикует находку — волонтёр во второй вкладке получает уведомление', async ({
    context,
  }, testInfo) => {
    // Волонтёр подписан на поиск рядом (демо-геопозиция — Орёл)
    const volunteer = await context.newPage()
    await startAs(volunteer, 'volunteer')
    await volunteer.getByTestId('tab-map').click() // места поиска и подписка — в шторке карты
    await volunteer.getByTestId('last-battle-subscribe').click()
    await expect(volunteer.getByTestId('subscribe-done')).toContainText('в радиусе 20 км')

    // Командир в соседней вкладке
    const commander = await context.newPage()
    await startAs(commander, 'commander')
    await commander.getByTestId('tab-map').click() // 1 — на карте у командира главная кнопка «Отметить место гибели»
    await snap(commander, testInfo, 'story3-01-map-commander')
    await commander.getByTestId('last-battle-add').click() // 2
    await expect(commander).toHaveURL(/\/last-battle\/new$/)
    await expect(commander.getByTestId('site-fighters-count')).toHaveValue('3')
    await expect(commander.getByTestId('site-unit')).toHaveValue('9-я вдбр, 5-й ВДК')
    await expect(commander.getByTestId('site-date-text')).toHaveValue('октябрь 1941')
    await commander.getByTestId('site-place').fill('Опушка у р. Оптуха')
    await commander.getByTestId('site-lat').fill('53.05')
    await commander.getByTestId('site-lon').fill('36.10')
    await expectNoA11yViolations(commander)
    await snap(commander, testInfo, 'story3-02-form')
    await commander.getByTestId('site-publish').click() // 3

    await expect(commander).toHaveURL(/\/last-battle\/S-/)
    await expect(commander.getByTestId('status-found_needs_check')).toBeVisible()
    await expect(commander.getByTestId('site-fighters')).toHaveText('3 бойца, имена не установлены')
    await expect(commander.getByTestId('site-notified')).toHaveText(
      /Уведомлено подписчиков в радиусе 20 км: [1-9]\d*/,
    )
    await snap(commander, testInfo, 'story3-03-site-created')

    const toast = volunteer.getByTestId('toast')
    await expect(toast).toContainText(
      'В 9 км от вас обнаружено место гибели бойца. Требуется помощь в идентификации',
    )
    await snap(volunteer, testInfo, 'story3-04-volunteer-notified')
    await toast.getByRole('link', { name: 'Открыть место' }).click()
    await expect(volunteer).toHaveURL(/\/last-battle\/S-/)
    await expect(volunteer.getByRole('heading', { level: 1 })).toHaveText('Опушка у р. Оптуха')
  })

  test('карта статусов и карточка из прототипа с кнопкой «Я готов помочь в подъёме»', async ({
    page,
  }, testInfo) => {
    await startAs(page, 'volunteer')
    await page.getByTestId('tab-map').click()
    await expect(page.getByTestId('marker-site-S01')).toHaveAttribute(
      'aria-label',
      /требуется проверка/,
    )
    await expect(page.getByTestId('marker-site-S02')).toHaveAttribute(
      'aria-label',
      /Подтверждено архивом/,
    )
    await expect(page.getByTestId('marker-site-S03')).toHaveAttribute(
      'aria-label',
      /Останки подняты/,
    )

    // метка открывает карточку места в шторке, из неё — страница места
    await page.getByTestId('marker-site-S01').click()
    await page.getByTestId('hub-card-open').click()
    await expect(page).toHaveURL(/\/last-battle\/S01$/)
    await expect(page.getByTestId('site-fighters')).toHaveText('Красноармеец Иванов И.И.')
    await expect(page.getByTestId('site-sources')).toContainText('Книга Памяти')
    await expectNoA11yViolations(page)
    await snap(page, testInfo, 'story3-05-site-card')
    await page.getByTestId('site-help').click()
    await expect(page.getByTestId('site-help-done')).toContainText('Спасибо!')
  })

  test('подписчик дальше 20 км уведомление не получает', async ({ context }) => {
    const volunteer = await context.newPage()
    await volunteer.goto('/demo')
    await volunteer.getByTestId('demo-lat').fill('53.40') // ~48 км к северу от места находки
    await volunteer.getByTestId('demo-lon').fill('36.10')
    await volunteer.getByTestId('demo-geo-apply').click()
    await volunteer.goto('/last-battle')
    await volunteer.getByTestId('last-battle-subscribe').click()

    const commander = await context.newPage()
    await startAs(commander, 'commander')
    await commander.goto('/last-battle/new')
    await commander.getByTestId('site-place').fill('Поле у д. Семенково (демо)')
    await commander.getByTestId('site-lat').fill('52.97')
    await commander.getByTestId('site-lon').fill('36.10')
    await commander.getByTestId('site-publish').click()
    await expect(commander.getByTestId('site-notified')).toBeVisible()

    await volunteer.waitForTimeout(1000)
    await expect(volunteer.getByTestId('toast')).toHaveCount(0)
  })
})
