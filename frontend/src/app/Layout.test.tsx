import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'

describe('шапка и меню', () => {
  it.each(['/archive', '/other', '/weekends/W01'])(
    'заголовок «Тропа памяти» на %s открывает «Мероприятия»',
    async (url) => {
      const { router } = renderApp(url, { role: 'volunteer' })
      const title = await screen.findByTestId('mast-home')
      expect(title).toHaveTextContent('Тропа памяти')
      await userEvent.click(title)
      expect(router.state.location.pathname).toBe('/events')
    },
  )

  it('логотип в меню открывает «Мероприятия» — и с полноэкранной карты тоже', async () => {
    const { router } = renderApp('/map', { role: 'volunteer' })
    const logo = await screen.findByTestId('nav-home')
    expect(logo).toHaveAttribute('href', '/events')
    expect(logo).toHaveAccessibleName(/мероприятия/i)
    await userEvent.click(logo)
    expect(router.state.location.pathname).toBe('/events')
  })

  it('ни в шапке, ни в ленте нет пометок «Демо» (решение команды), признак demo в данных остался', async () => {
    const { api } = renderApp('/events', { role: 'volunteer' })
    const header = (await screen.findByTestId('mast-home')).closest('header')
    expect(header).not.toHaveTextContent(/демо/i)
    await screen.findByTestId('request-card-R01')
    expect(document.body).not.toHaveTextContent(/демо/i)
    expect((await api.listRequests()).find((r) => r.id === 'R01')?.demo).toBe(true)
  })

  it('выбор роли относится к разделу «Другое»', async () => {
    renderApp('/roles')
    await screen.findByTestId('role-family')
    expect(screen.getByTestId('tab-other')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('tab-events')).not.toHaveAttribute('aria-current')
  })

  it('в шапке: гость — «Войти», вошедший — имя; под ним роль отдельной строкой, без наслаивания', async () => {
    const guest = renderApp('/events', { role: 'volunteer' })
    expect(await screen.findByTestId('nav-account-name')).toHaveTextContent('Войти')
    expect(screen.getByTestId('nav-account-role')).toHaveTextContent('Волонтёр')
    guest.unmount()

    const name = 'Анастасия Константиновна Верховская'
    renderApp('/events', {
      role: 'volunteer',
      stored: { account: { login: 'anna@example.com', name, since: '2026-09-25T09:00:00Z' } },
    })
    expect(await screen.findByTestId('nav-account-name')).toHaveTextContent(name)
    expect(screen.getByTestId('nav-account-role')).toHaveTextContent('Волонтёр')
    expect(screen.getByTestId('nav-role')).toHaveAttribute('title', `${name} · Волонтёр`)
    expect(screen.getByTestId('nav-role')).not.toHaveTextContent('Профиль')
  })

  it('без выбранной роли — только имя', async () => {
    renderApp('/events')
    expect(await screen.findByTestId('nav-account-name')).toHaveTextContent('Войти')
    expect(screen.queryByTestId('nav-account-role')).not.toBeInTheDocument()
  })

  it('приложение без связи с сервером — плашка «Сервер недоступен» и «Повторить»', async () => {
    renderApp('/events', { api: { offline: true } })
    expect(await screen.findByTestId('offline-banner')).toHaveTextContent('Сервер недоступен')
    expect(screen.getByTestId('offline-retry')).toHaveTextContent('Повторить')
  })

  it('со связью плашки нет', async () => {
    renderApp('/events')
    await screen.findByTestId('nav-role')
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
  })
})
