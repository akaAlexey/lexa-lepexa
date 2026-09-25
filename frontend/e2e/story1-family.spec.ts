import { expect } from '@playwright/test'
import { expectNoA11yViolations, snap, startAs, test } from './helpers.ts'

/**
 * User story 1. Мама с ребёнком 10 лет проходит ~3 км по парку и видит 4 интерактивные точки с заданиями.
 * Главный сценарий: роль «Семья» → «Начать тропу» → первая точка (2 нажатия).
 */
test.describe('История 1: семейная тропа', () => {
  test('маршрут ≈3 км, 4 точки, задания для ребёнка, финиш без «очков»', async ({
    page,
  }, testInfo) => {
    await startAs(page, 'family')
    await expect(page).toHaveURL(/\/events$/)
    await page.goto('/trail')
    await expect(page.getByTestId('trail-map')).toHaveAttribute('data-ready', 'true')
    await expect(page.getByText(/3 км/).first()).toBeVisible()
    for (const id of ['rubezh', 'okop', 'shtab', 'salut']) {
      await expect(page.getByTestId(`marker-${id}`)).toBeVisible()
    }
    await expect(page.getByTestId('trail-progress')).toHaveText(/Пройдено 0 из 4/)
    await snap(page, testInfo, 'story1-01-trail')

    await page.getByTestId('trail-start').click()
    await expect(page).toHaveURL(/\/trail\/park-3km\/point\/rubezh$/)

    const answers = [1, 1, 0, 1] // верные варианты демо-маршрута
    for (const [i, answer] of answers.entries()) {
      await expect(page.getByTestId('point-step')).toHaveText(`Точка ${i + 1} из 4`)
      await expect(page.getByTestId('point-story')).toBeVisible()
      await expect(page.getByTestId('point-sources')).not.toBeEmpty()
      if (i === 0) {
        await page.getByTestId('task-option-0').click()
        await expect(page.getByTestId('task-feedback')).toContainText('Попробуй ещё раз')
        await expectNoA11yViolations(page)
        await snap(page, testInfo, 'story1-02-point-wrong')
      }
      await page.getByTestId(`task-option-${answer}`).click()
      await expect(page.getByTestId('task-feedback')).toContainText('Верно!')
      if (i === 0) await snap(page, testInfo, 'story1-03-point-right')
      await page.getByTestId('point-next').click()
    }

    await expect(page).toHaveURL(/\/trail\/park-3km\/finish$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Тропа пройдена!')
    await expect(page.getByTestId('finish-stamps')).toHaveText(/4 из 4/)
    await expect(page.locator('main')).not.toContainText(/очк/i)
    await expectNoA11yViolations(page)
    await snap(page, testInfo, 'story1-04-finish')
  })

  test('у каждой точки свой адрес: метка открывает карточку, «Назад» возвращает к карте', async ({
    page,
  }) => {
    await startAs(page, 'family')
    await page.goto('/trail')
    await page.getByTestId('marker-shtab').click()
    await expect(page).toHaveURL(/\/trail\/park-3km\/point\/shtab$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Полевой штаб')
    await page.goBack()
    await expect(page).toHaveURL(/\/trail$/)

    await page.goto('/trail/park-3km/point/okop')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Окоп у дороги')
  })

  test('без сети после загрузки метки и карточки продолжают работать', async ({
    page,
    context,
  }) => {
    await startAs(page, 'family')
    await page.goto('/trail')
    await expect(page.getByTestId('trail-map')).toHaveAttribute('data-ready', 'true')
    await context.setOffline(true)
    await page.getByTestId('marker-okop').click()
    await expect(page.getByTestId('point-story')).toContainText('Окоп полного профиля')
    await page.getByTestId('task-option-1').click()
    await expect(page.getByTestId('task-feedback')).toContainText('Верно!')
    await context.setOffline(false)
  })

  test('прогресс сохраняется: после перезагрузки «Продолжить тропу» ведёт ко второй точке', async ({
    page,
  }) => {
    await page.goto('/trail/park-3km/point/rubezh')
    await page.getByTestId('task-option-1').click()
    await page.goto('/trail')
    await expect(page.getByTestId('trail-progress')).toHaveText(/Пройдено 1 из 4/)
    await page.getByTestId('trail-start').click()
    await expect(page).toHaveURL(/\/point\/okop$/)
  })
})
