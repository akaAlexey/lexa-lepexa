import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../test/renderApp.tsx'

describe('уведомления внутри приложения', () => {
  it('подписчик в 20 км видит тост и переходит к месту', async () => {
    const { api, router } = renderApp('/events', { role: 'volunteer' })
    await api.subscribe({ body: { lat: 52.97, lon: 36.07, topics: ['search'] } })
    const { site } = await api.createSite({
      body: {
        lat: 53.05,
        lon: 36.1,
        placeName: 'Опушка (тест)',
        fightersCount: 3,
        fighters: [],
        unit: '9-я вдбр, 5-й ВДК',
        dateText: 'октябрь 1941',
        circumstances: '',
        sources: [{ kind: 'demo', title: 'тест' }],
      },
    })
    expect(await screen.findByTestId('toast')).toHaveTextContent(
      'В 9 км от вас обнаружено место гибели бойца',
    )
    await userEvent.click(screen.getByRole('link', { name: 'Открыть место' }))
    expect(router.state.location.pathname).toBe(`/last-battle/${site.id}`)
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument()
  })
})
