import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('главная и выбор роли', () => {
  it('главная страница — «Мероприятия», и роль для этого не нужна', async () => {
    const { router } = renderApp('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Мероприятия' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/events')
  })

  it('«/» заменяется «Мероприятиями»: «Назад» не возвращает на пустой адрес', async () => {
    const { router } = renderApp('/')
    await screen.findByTestId('screen-events')
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('выбор роли живёт на своём адресе: четыре роли — кнопки с понятными подписями', async () => {
    renderApp('/roles')
    for (const name of [/Пользователь/, /Волонтёр/, /Командир отряда/, /Краевед/]) {
      expect(await screen.findByRole('button', { name })).toBeInTheDocument()
    }
  })

  it.each(['family', 'volunteer', 'commander', 'verifier'] as const)(
    'роль %s открывает «Мероприятия» одним нажатием и запоминается',
    async (role) => {
      const { router, platform } = renderApp('/roles')
      await userEvent.click(await screen.findByTestId(`role-${role}`))
      expect(router.state.location.pathname).toBe('/events')
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Мероприятия' }),
      ).toBeInTheDocument()
      expect(platform.storage.get('role')).toBe(role)
    },
  )

  it('сменить роль можно из «Другого»', async () => {
    renderApp('/other?section=role', { role: 'volunteer' })
    expect(await screen.findByTestId('other-role-switch')).toHaveAttribute('href', '/roles')
  })

  it('с неизвестного адреса можно выбрать роль заново', async () => {
    renderApp('/nowhere')
    expect(await screen.findByRole('link', { name: 'Выбрать роль заново' })).toHaveAttribute(
      'href',
      '/roles',
    )
  })
})
