import { screen, within } from '@testing-library/react'
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

  it('в шапке нет надписи «Демо», а пометки у демо-данных в ленте остались', async () => {
    renderApp('/events', { role: 'volunteer' })
    const header = (await screen.findByTestId('mast-home')).closest('header')
    expect(header).not.toHaveTextContent(/демо/i)
    const card = await screen.findByTestId('request-card-R01')
    expect(within(card).getByText(/Демо/)).toBeInTheDocument()
  })

  it('выбор роли относится к разделу «Другое»', async () => {
    renderApp('/roles')
    await screen.findByTestId('role-family')
    expect(screen.getByTestId('tab-other')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('tab-events')).not.toHaveAttribute('aria-current')
  })
})
