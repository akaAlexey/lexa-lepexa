import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { RoleId } from '../../app/roles.ts'
import { renderApp } from '../../test/renderApp.tsx'

const mainAction = () => document.querySelectorAll('[data-main-action]')

describe('«Мероприятия»: главная кнопка по роли', () => {
  it('командир набирает волонтёров', async () => {
    renderApp('/events', { role: 'commander' })
    expect(await screen.findByTestId('search-create-request')).toHaveAttribute(
      'href',
      '/search/requests/new',
    )
    expect(mainAction()).toHaveLength(1)
  })

  it('краевед идёт проверять истории', async () => {
    renderApp('/events', { role: 'verifier' })
    expect(await screen.findByTestId('events-archive')).toHaveAttribute('href', '/archive')
    expect(mainAction()).toHaveLength(1)
  })

  it.each<RoleId | undefined>(['volunteer', 'family', undefined])(
    '%s видит ближайший выезд — кнопка открывает его карточку, а не записывает',
    async (role) => {
      const { api } = renderApp('/events', { role })
      const nearest = await screen.findByRole('link', { name: /Ближайший выезд/ })
      expect(nearest).toHaveAttribute('data-testid', 'events-nearest-trip')
      expect(nearest).toHaveTextContent(/Ближайший выезд\s*3 октября, суббота/)
      expect(nearest).toHaveAttribute('href', '/weekends/W01')
      expect(mainAction()).toHaveLength(1)
      const before = (await api.getTrip({ id: 'W01' })).spotsTaken
      await userEvent.click(nearest)
      expect((await api.getTrip({ id: 'W01' })).spotsTaken).toBe(before)
    },
  )

  it.each<RoleId | undefined>(['volunteer', 'family', 'commander', 'verifier', undefined])(
    'нет кнопки, которая записывает «в команду» без выбора заявки (%s)',
    async (role) => {
      renderApp('/events', { role })
      await screen.findByTestId('request-card-R01')
      expect(screen.queryByTestId('search-join')).not.toBeInTheDocument()
      expect(screen.queryByText('Стать частью команды')).not.toBeInTheDocument()
      expect(screen.queryByText('Вы в команде')).not.toBeInTheDocument()
    },
  )

  it('записаться можно только из карточки заявки', async () => {
    renderApp('/events', { role: 'volunteer' })
    const card = await screen.findByTestId('request-card-R01')
    expect(within(card).getByTestId('request-join-R01')).toHaveTextContent('Записаться')
  })
})
