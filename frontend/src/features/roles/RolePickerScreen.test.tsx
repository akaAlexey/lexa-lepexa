import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('выбор роли', () => {
  it('четыре роли — кнопки с понятными подписями', async () => {
    renderApp('/')
    for (const name of [/Семья/, /Волонтёр/, /Командир отряда/, /Краевед/]) {
      expect(await screen.findByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('роль «Семья» ведёт на «Тропу» одним нажатием и запоминается', async () => {
    const { router, platform } = renderApp('/')
    await userEvent.click(await screen.findByTestId('role-family'))
    expect(router.state.location.pathname).toBe('/trail')
    expect(await screen.findByRole('heading', { level: 1, name: 'Тропа' })).toBeInTheDocument()
    expect(platform.storage.get('role')).toBe('family')
    expect(screen.getByTestId('nav-role')).toHaveTextContent('Роль: Семья')
  })
})
