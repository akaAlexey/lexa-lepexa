import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useDemoClock } from '../../test/clock.ts'
import { renderApp } from '../../test/renderApp.tsx'

describe('новая заявка командира (user story 2)', () => {
  useDemoClock()

  it('форма заполнена заранее: отряд «Высота», дата «завтра», возраст 16+, место', async () => {
    renderApp('/search/requests/new', { role: 'commander', signedIn: true })
    expect(await screen.findByTestId('request-team')).toHaveTextContent('Высота')
    expect(screen.getByTestId('date-tomorrow')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('request-date-label')).toHaveTextContent('3 октября, суббота')
    expect(screen.getByTestId('age-16')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('request-place')).not.toHaveValue('')
  })

  it('выбрать 10 человек и опубликовать — заявка первой в ленте', async () => {
    const { router } = renderApp('/search/requests/new', { role: 'commander', signedIn: true })
    await userEvent.click(await screen.findByTestId('count-10'))
    expect(screen.getByTestId('count-10')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByTestId('request-publish'))

    // После публикации — в ленту «Мероприятия», новая заявка первой среди заявок (ADR 0012)
    expect(router.state.location.pathname).toBe('/events')
    expect(await screen.findByTestId('request-published')).toHaveTextContent('Заявка опубликована')
    const [first] = await screen.findAllByTestId(/^request-card-/)
    expect(first).toHaveTextContent('Высота')
    expect(first).toHaveTextContent('Требуются волонтёры: 10')
    expect(first).toHaveTextContent('16+')
    expect(first).toHaveTextContent('3 октября, суббота')
  })

  it('без места — ошибка рядом с полем, заявка не уходит', async () => {
    const { router, api } = renderApp('/search/requests/new', {
      role: 'commander',
      signedIn: true,
    })
    await userEvent.clear(await screen.findByTestId('request-place'))
    await userEvent.click(screen.getByTestId('request-publish'))
    expect(await screen.findByText('Укажите место сбора')).toBeInTheDocument()
    expect(screen.getByTestId('request-place')).toHaveAttribute('aria-invalid', 'true')
    expect(router.state.location.pathname).toBe('/search/requests/new')
    expect(await api.listRequests()).toHaveLength(1)
  })

  it('гость не может опубликовать заявку волонтёров', async () => {
    const { router } = renderApp('/search/requests/new', { role: 'commander' })
    expect(await screen.findByTestId('signin-form')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/other')
    expect(router.state.location.search).toBe('?section=account&next=%2Fsearch%2Frequests%2Fnew')
  })
})
