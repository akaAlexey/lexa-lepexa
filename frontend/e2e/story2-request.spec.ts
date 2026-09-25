import { expect } from '@playwright/test'
import { expectNoA11yViolations, snap, startAs, test, useDemoDate } from './helpers.ts'

/**
 * User story 2. Командир отряда «Высота» создаёт заявку на набор 10 волонтёров на завтра.
 * Главный сценарий от домашнего экрана командира: «Набрать волонтёров» → «10» → «Опубликовать» (3 нажатия).
 */
test.describe('История 2: заявка на 10 волонтёров на завтра', () => {
  test.beforeEach(async ({ page }) => useDemoDate(page))

  test('три нажатия от домашнего экрана командира', async ({ page }, testInfo) => {
    await startAs(page, 'commander')
    await expect(page).toHaveURL(/\/events$/)
    await snap(page, testInfo, 'story2-01-events-commander')

    await page.getByTestId('search-create-request').click() // 1
    await expect(page).toHaveURL(/\/search\/requests\/new$/)
    await expect(page.getByTestId('request-team')).toContainText('Высота')
    await expect(page.getByTestId('date-tomorrow')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('request-date-label')).toHaveText(/3 октября, суббота/)
    await expectNoA11yViolations(page)
    await snap(page, testInfo, 'story2-02-form')

    await page.getByTestId('count-10').click() // 2
    await page.getByTestId('request-publish').click() // 3

    await expect(page).toHaveURL(/\/events$/)
    await expect(page.getByTestId('request-published')).toContainText('Заявка опубликована')
    const card = page.getByTestId(/^request-card-/).first()
    await expect(card).toContainText('Высота')
    await expect(card).toContainText('Требуются волонтёры: 10')
    await expect(card).toContainText('16+')
    await expect(card).toContainText('3 октября, суббота')
    await snap(page, testInfo, 'story2-03-published')
  })

  test('заявку видит волонтёр в ленте и записывается из её карточки', async ({ page }) => {
    await startAs(page, 'volunteer')
    const card = page.getByTestId('request-card-R01')
    await expect(card).toContainText('Вахта Памяти (Орловская обл.)')
    await expect(card).toContainText(/Собрано: 15\s000 из 50\s000 ₽/)
    await expect(page.getByTestId('week-news')).toContainText('Новости недели')
    await expect(page.getByTestId('search-join')).toHaveCount(0)
    await card.getByTestId('request-join-R01').click()
    const dialog = page.getByTestId('signup-dialog')
    await page.getByTestId('signup-fullName').fill('Иванова Мария Петровна')
    await page.getByTestId('signup-phone').fill('+7 900 123-45-67')
    await page.getByTestId('signup-agreed').check()
    await dialog.getByTestId('signup-confirm').click()
    await dialog.getByTestId('dialog-close').click()
    await expect(page.getByTestId('request-joined-R01')).toContainText('Вы записаны')
  })

  test('только клавиатура: от «Мероприятий» до опубликованной заявки', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'клавиатурный проход проверяем на ноутбуке')
    await page.goto('/roles')
    await page.getByTestId('role-commander').focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/events$/)

    const tabTo = async (testId: string) => {
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab')
        const current = await page.evaluate(() =>
          document.activeElement?.getAttribute('data-testid'),
        )
        if (current === testId) return
      }
      throw new Error(`Фокус с клавиатуры не дошёл до ${testId}`)
    }
    await tabTo('search-create-request')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/search\/requests\/new$/)
    await tabTo('count-10')
    await page.keyboard.press('Space')
    await tabTo('request-publish')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('request-published')).toBeVisible()
  })
})
