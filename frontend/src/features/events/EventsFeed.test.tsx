import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('лента «Мероприятий»: фильтр и адреса', () => {
  it('в разделе нет ссылок на удалённые страницы выездов и отрядов', async () => {
    renderApp('/events', { role: 'volunteer' })
    await screen.findByTestId('request-card-R01')
    expect(screen.queryByText('Все выезды и заявки групп')).not.toBeInTheDocument()
    expect(screen.queryByText('Отряды и находки за месяц')).not.toBeInTheDocument()
    expect(screen.queryByTestId('events-weekends')).not.toBeInTheDocument()
    expect(screen.queryByTestId('events-search-hq')).not.toBeInTheDocument()
  })

  it('фильтр живёт в адресе: ссылкой /events?show=trip открываются только выезды', async () => {
    renderApp('/events?show=trip', { role: 'volunteer' })
    expect(await screen.findByTestId('feed-trip-W01')).toBeInTheDocument()
    expect(screen.getByTestId('events-filter-trip')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('request-card-R01')).not.toBeInTheDocument()
  })

  it('выбор фильтра меняет адрес, «Все» убирает его из адреса', async () => {
    const { router } = renderApp('/events', { role: 'volunteer' })
    await userEvent.click(await screen.findByTestId('events-filter-fund'))
    expect(router.state.location.search).toBe('?show=fund')
    expect(await screen.findByTestId('feed-fund-F03')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('events-filter-all'))
    expect(router.state.location.search).toBe('')
  })

  it('непонятный фильтр в адресе — показываем всё', async () => {
    renderApp('/events?show=nonsense', { role: 'volunteer' })
    expect(await screen.findByTestId('request-card-R01')).toBeInTheDocument()
    expect(screen.getByTestId('events-filter-all')).toHaveAttribute('aria-pressed', 'true')
  })

  it.each([
    ['/weekends', '?show=trip', 'feed-trip-W01'],
    ['/search', '?show=request', 'request-card-R01'],
  ])('старый адрес %s ведёт в ленту с нужным фильтром', async (url, search, card) => {
    const { router } = renderApp(url, { role: 'volunteer' })
    expect(await screen.findByTestId(card)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/events')
    expect(router.state.location.search).toBe(search)
  })
})

describe('лента «Мероприятий»: карточки', () => {
  it('волонтёр видит заявку из прототипа с возрастом и сбором', async () => {
    renderApp('/events', { role: 'volunteer' })
    const card = await screen.findByTestId('request-card-R01')
    expect(card).toHaveTextContent('Вахта Памяти (Орловская обл.)')
    expect(card).toHaveTextContent('Требуются волонтёры: 5')
    expect(card).toHaveTextContent('16+')
    expect(card).toHaveTextContent(/Собрано: 15\s000 из 50\s000 ₽/)
  })

  it('целевые сборы из кейса — в ленте: «Поднять бойца» и «Экипировать отряд»', async () => {
    renderApp('/events?show=fund', { role: 'volunteer' })
    expect(await screen.findByTestId('feed-fund-F03')).toHaveTextContent('Поднять бойца')
    expect(screen.getByTestId('feed-fund-F02')).toHaveTextContent('Экипировать отряд')
  })

  it('«Пожертвовать» — оплата через ЮKassa в тестовом режиме с явным предупреждением', async () => {
    renderApp('/events?show=fund', { role: 'volunteer' })
    const card = await screen.findByTestId('feed-fund-F03')
    await userEvent.click(within(card).getByTestId('donate-F03'))
    const dialog = screen.getByTestId('donate-dialog-F03')
    expect(dialog).toHaveTextContent('реальные деньги не списываются')
    expect(within(dialog).getByTestId('donate-confirm')).toHaveTextContent('через ЮKassa')
    expect(within(dialog).getByTestId('donate-test-caption')).toHaveTextContent(
      'Тестовый платёж — деньги не списываются',
    )
  })

  it('командир видит на карточке выезда, что заявки групп ждут решения', async () => {
    renderApp('/events?show=trip', { role: 'commander' })
    const card = await screen.findByTestId('feed-trip-W01')
    const link = await within(card).findByTestId('feed-trip-groups-W01')
    expect(link).toHaveTextContent('Заявки групп ждут решения: 1')
    expect(link).toHaveAttribute('href', '/weekends/W01')
  })

  it('волонтёр чужих заявок групп не видит', async () => {
    renderApp('/events?show=trip', { role: 'volunteer' })
    await screen.findByTestId('feed-trip-W01')
    expect(screen.queryByTestId('feed-trip-groups-W01')).not.toBeInTheDocument()
  })
})
