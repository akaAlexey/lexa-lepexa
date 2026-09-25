import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('подвкладки входа и профиля', () => {
  it('«Вход» открывает форму без дополнительного нажатия', async () => {
    const { router } = renderApp('/events')
    await userEvent.click(screen.getByTestId('nav-role'))
    expect(router.state.location.search).toBe('?section=account')
    expect(screen.getByTestId('signin-form')).toBeInTheDocument()
  })

  it('после входа ссылка «Профиль» открывает профиль', async () => {
    const { router } = renderApp('/events')
    await userEvent.click(screen.getByTestId('nav-role'))
    await userEvent.type(screen.getByTestId('signin-login'), 'test@example.com')
    await userEvent.type(screen.getByTestId('signin-password'), 'examplepass')
    await userEvent.click(screen.getByTestId('signin-submit'))
    await userEvent.click(screen.getByTestId('nav-role'))
    expect(router.state.location.search).toBe('?section=profile')
    expect(screen.getByTestId('profile')).toBeInTheDocument()
  })

  it('прямой адрес профиля до входа показывает форму, затем возвращает в профиль', async () => {
    const { router } = renderApp('/other?section=profile')
    expect(screen.getByTestId('signin-form')).toBeInTheDocument()
    await userEvent.type(screen.getByTestId('signin-login'), 'test@example.com')
    await userEvent.type(screen.getByTestId('signin-password'), 'examplepass')
    await userEvent.click(screen.getByTestId('signin-submit'))
    expect(router.state.location.search).toBe('?section=profile')
    expect(screen.getByTestId('profile')).toBeInTheDocument()
  })
})
