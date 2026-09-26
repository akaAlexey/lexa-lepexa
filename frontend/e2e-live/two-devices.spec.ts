import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * Связка сайта с общей базой: всё, что пользователь сделал на одном устройстве (профиль, роль,
 * запись в заявку, боец в семейном архиве), видно на другом после входа — данные на сервере,
 * а не в памяти браузера.
 */
const login = `live-${Date.now().toString(36)}@example.com`
const password = `pw-${Date.now().toString(36)}-check`

async function newDevice(browser: Browser): Promise<Page> {
  // Новый контекст — как другой телефон: ни localStorage, ни cookie
  const context = await browser.newContext()
  return context.newPage()
}

test('два устройства: профиль, роль, запись и семейный архив — в общей базе', async ({
  browser,
}) => {
  const phone = await newDevice(browser)
  await phone.goto('/other?section=account')
  await phone.getByTestId('register-tab').click()
  await phone.getByTestId('register-name').fill('Анна Проверкина')
  await phone.getByTestId('signin-login').fill(login)
  await phone.getByTestId('signin-password').fill(password)
  await phone.getByTestId('register-repeat').fill(password)
  await phone.getByTestId('register-terms').check()
  await phone.getByTestId('register-privacy').check()
  await phone.getByTestId('register-submit').click()
  await expect(phone.getByTestId('profile-storage')).toContainText('в вашем аккаунте')

  await phone.getByTestId('profile-edit').click()
  await phone.getByTestId('profile-city').fill('Орёл')
  await phone.getByTestId('profile-save').click()
  await expect(phone.getByTestId('profile-saved')).toBeVisible()

  await phone.goto('/roles')
  await phone.getByTestId('role-volunteer').click()

  await phone.goto('/events')
  await phone.getByTestId('request-join-R01').click()
  await phone.getByTestId('signup-fullName').fill('Проверкина Мария Ивановна')
  await phone.getByTestId('signup-phone').fill('+7 900 000-00-00')
  await phone.getByTestId('signup-agreed').check()
  await phone.getByTestId('signup-confirm').click()
  await expect(phone.getByTestId('signup-done')).toContainText('Вы записаны')

  await phone.goto('/other?section=archive&fighter=new')
  await phone.getByTestId('family-last-name').fill('Проверкин')
  await phone.getByTestId('family-birth-year').fill('1912')
  await phone.getByTestId('family-save').click()
  await expect(phone.getByTestId('family-card-name')).toHaveText('Проверкин')
  // синхронизация уходит с задержкой — даём ей отправиться
  await phone.waitForTimeout(1500)

  const laptop = await newDevice(browser)
  await laptop.goto('/other?section=account')
  await laptop.getByTestId('signin-login').fill(login)
  await laptop.getByTestId('signin-password').fill(password)
  await laptop.getByTestId('signin-submit').click()
  await expect(laptop.getByTestId('profile-city-value')).toContainText('Орёл')

  await laptop.goto('/events')
  await expect(laptop.getByTestId('request-joined-R01')).toContainText('Вы записаны')

  await laptop.goto('/other?section=archive')
  await expect(laptop.getByTestId('family-list')).toContainText('Проверкин')
  await expect(laptop.getByTestId('family-storage')).toContainText('в вашем аккаунте')

  // Выход на ноутбуке не трогает данные аккаунта: телефон по-прежнему видит всё
  await phone.goto('/other?section=archive')
  await expect(phone.getByTestId('family-list')).toContainText('Проверкин')
})
