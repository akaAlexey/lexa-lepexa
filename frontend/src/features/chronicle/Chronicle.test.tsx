import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('хроника боёв', () => {
  it('события по годам с подписями, у каждого — архивный источник', async () => {
    renderApp('/chronicle', { role: 'family' })
    expect(await screen.findByRole('heading', { level: 2, name: '1941 оборона' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: '1943 освобождение' })).toBeVisible()
    const y1941 = screen.getByRole('list', { name: 'События 1941 года' })
    expect(within(y1941).getAllByRole('listitem')).toHaveLength(4)
    expect(within(y1941).getAllByRole('link', { name: /Архивный источник/ })).toHaveLength(4)
    // В 1942 году событий нет — предложение рассказать историю
    expect(screen.getByTestId('year-empty-1942')).toHaveTextContent('Расскажите, что знаете')
  })

  it('фильтр «1943» оставляет только освобождение; метки на карте — только этого года', async () => {
    renderApp('/chronicle', { role: 'family' })
    await userEvent.click(await screen.findByTestId('year-1943'))
    expect(
      screen.queryByRole('heading', { level: 2, name: '1941 оборона' }),
    ).not.toBeInTheDocument()
    const map = screen.getByTestId('chronicle-map')
    expect(within(map).getAllByRole('button')).toHaveLength(4)
    expect(within(map).getAllByRole('button')[0]).toHaveAccessibleName(/1943/)
  })

  it('метка на карте выделяет событие в ленте', async () => {
    renderApp('/chronicle', { role: 'family' })
    const map = await screen.findByTestId('chronicle-map')
    const first = within(map).getAllByRole('button')[0]!
    await userEvent.click(first)
    const selected = document.querySelector('[class*="eventSelected"]')
    expect(selected).not.toBeNull()
  })

  it('из «Историй» есть переход к хронике', async () => {
    renderApp('/archive', { role: 'family' })
    expect(await screen.findByTestId('archive-chronicle')).toHaveAttribute('href', '/chronicle')
  })
})

describe('«Поделиться»', () => {
  it('на карточке точки: ссылка скопирована — понятное сообщение', async () => {
    const shared: string[] = []
    renderApp('/trail/park-3km/point/rubezh', {
      role: 'family',
      platform: {
        share: {
          share: async ({ url }) => {
            shared.push(url)
            return 'copied'
          },
        },
      },
    })
    await userEvent.click(await screen.findByTestId('point-share'))
    expect(await screen.findByTestId('point-share-result')).toHaveTextContent('Ссылка скопирована')
    expect(shared).toHaveLength(1)
  })

  it('есть на месте гибели, выезде и проверенной истории; у непроверенной — нет', async () => {
    const { router } = renderApp('/last-battle/S01', { role: 'volunteer' })
    expect(await screen.findByTestId('site-share')).toBeInTheDocument()
    await router.navigate('/weekends/W01')
    expect(await screen.findByTestId('trip-share')).toBeInTheDocument()
    await router.navigate('/archive/ST01')
    expect(await screen.findByTestId('story-share')).toBeInTheDocument()
    await router.navigate('/archive/ST02')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Землянка у оврага (демо)' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Ожидает проверки')).toBeInTheDocument()
    expect(screen.queryByTestId('story-share')).not.toBeInTheDocument()
  })
})
