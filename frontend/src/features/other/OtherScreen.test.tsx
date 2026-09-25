import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

const login = async (email = 'anna@example.com') => {
  await userEvent.type(await screen.findByTestId('signin-login'), email)
  await userEvent.type(screen.getByTestId('signin-password'), 'example-password')
  await userEvent.click(screen.getByTestId('signin-submit'))
}

describe('Другое, профиль и личные функции', () => {
  it.each(['ar', 'archive', 'photo'])(
    'гость не видит %s, прямой адрес ведёт на вход',
    async (section) => {
      const { router } = renderApp(`/other?section=${section}`)
      expect(await screen.findByTestId('signin-form')).toBeInTheDocument()
      expect(screen.queryByTestId(`other-${section}`)).not.toBeInTheDocument()
      expect(router.state.location.search).toBe('?section=account')
      expect(screen.getByTestId('other-back')).toHaveAttribute('href', '/other')
      expect(screen.queryByTestId('other-last-battle')).not.toBeInTheDocument()
    },
  )

  it('выбранный раздел открывается отдельно и возвращается к списку кнопкой Назад', async () => {
    renderApp('/other')
    await userEvent.click(screen.getByTestId('other-account'))
    expect(await screen.findByTestId('signin-form')).toBeVisible()
    expect(screen.getByTestId('other-back')).toHaveAttribute('href', '/other')
    expect(screen.queryByTestId('other-last-battle')).not.toBeInTheDocument()

    await login()
    expect(screen.getByTestId('profile')).toBeVisible()
    expect(screen.queryByTestId('other-role')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('other-back'))
    for (const id of ['ar', 'archive', 'photo']) {
      expect(screen.getByTestId(`other-${id}`)).toBeVisible()
    }

    await userEvent.click(screen.getByTestId('other-ar'))
    expect(screen.getByTestId('other-panel-ar')).toBeVisible()
    expect(screen.queryByTestId('other-account')).not.toBeInTheDocument()
  })

  it('профиль сохраняется после повторного входа и не смешивается с таким же скрытым логином', async () => {
    const { platform, router } = renderApp('/other?section=account')
    await login()
    await userEvent.type(screen.getByTestId('profile-name-input'), 'Анна Иванова')
    await userEvent.type(screen.getByTestId('profile-city'), 'Орёл')
    await userEvent.type(screen.getByTestId('profile-bio'), 'Изучаю историю семьи')
    await userEvent.click(screen.getByTestId('profile-save'))
    expect(screen.getByTestId('profile-saved')).toBeVisible()
    await act(async () => {
      await router.navigate('/events')
      await router.navigate('/other?section=account')
    })
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Анна Иванова')
    await userEvent.click(screen.getByTestId('profile-signout'))
    await login('alex@example.com')
    expect(screen.getByTestId('profile-name-input')).toHaveValue('')
    await userEvent.click(screen.getByTestId('profile-signout'))
    await login('ANNA@example.com')
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Анна Иванова')
    expect(screen.getByTestId('profile-city-value')).toHaveTextContent('Орёл')
    expect(screen.getByTestId('profile-bio-value')).toHaveTextContent('Изучаю историю семьи')
    expect(JSON.stringify(platform.storage.get('account'))).not.toContain('example-password')
  })

  it('старый вход привязывает профиль к полному логину без потери после выхода', async () => {
    renderApp('/other?section=account', { signedIn: true })
    await userEvent.type(screen.getByTestId('profile-name-input'), 'Иван Иванов')
    await userEvent.type(screen.getByTestId('profile-legacy-login'), '+7 900 123-45-67')
    await userEvent.click(screen.getByTestId('profile-save'))
    await userEvent.click(screen.getByTestId('profile-signout'))
    await login('89001234567')
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Иван Иванов')
  })

  it('пустое имя не сохраняется, отмена редактирования сохраняет прежнее имя', async () => {
    renderApp('/other?section=account')
    await login()
    await userEvent.click(screen.getByTestId('profile-save'))
    expect(screen.getByText('Укажите имя: от 2 до 80 символов')).toBeVisible()
    await userEvent.type(screen.getByTestId('profile-name-input'), 'Анна')
    await userEvent.click(screen.getByTestId('profile-save'))
    await userEvent.click(screen.getByTestId('profile-edit'))
    await userEvent.clear(screen.getByTestId('profile-name-input'))
    await userEvent.click(screen.getByTestId('profile-cancel'))
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Анна')
  })

  it('Последний бой открывается из Другого и фильтрует места по статусу', async () => {
    const { router } = renderApp('/other')
    await userEvent.click(screen.getByTestId('other-last-battle'))
    expect(await screen.findByTestId('last-battle-site-S01')).toBeVisible()
    expect(router.state.location.pathname).toBe('/last-battle')
    await userEvent.selectOptions(screen.getByTestId('last-battle-filter'), 'archive_confirmed')
    expect(screen.queryByTestId('last-battle-site-S01')).not.toBeInTheDocument()
    await userEvent.click(screen.getByTestId('last-battle-site-S02'))
    expect(router.state.location.pathname).toBe('/last-battle/S02')
  })
  it('AR запрашивает камеру по кнопке и показывает превью после разрешения', async () => {
    const stop = vi.fn()
    const openCamera = vi.fn(async () => ({ stop }))
    renderApp('/other?section=ar', {
      signedIn: true,
      platform: {
        ar: {
          openCamera,
          trackImage: () => Promise.reject(new Error('не используется')),
        },
      },
    })

    expect(screen.getByTestId('ar-camera')).not.toBeVisible()
    await userEvent.click(screen.getByTestId('ar-camera-enable'))
    expect(openCamera).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('ar-camera')).toBeVisible()
  })

})
