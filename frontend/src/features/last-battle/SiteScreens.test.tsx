import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('карточка места гибели', () => {
  it('карточка из прототипа: боец, год, место, источник, статус', async () => {
    renderApp('/last-battle/S01', { role: 'volunteer' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Овраг у д. Крупышино' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('site-fighters')).toHaveTextContent('Красноармеец Иванов И.И.')
    expect(screen.getByTestId('site-date')).toHaveTextContent('1943')
    expect(screen.getByTestId('site-sources')).toHaveTextContent(
      'Книга Памяти. Орловская область, т. 5',
    )
    expect(screen.getByTestId('status-found_needs_check')).toHaveTextContent('требуется проверка')
    expect(screen.getByTestId('site-need')).toHaveTextContent('Требуется подъём')
  })

  it('«Я готов помочь в подъёме» — благодарность и счётчик готовых помочь', async () => {
    renderApp('/last-battle/S01', { role: 'volunteer' })
    expect(await screen.findByTestId('site-volunteers')).toHaveTextContent('Готовы помочь: 3')
    await userEvent.click(screen.getByTestId('site-help'))
    expect(await screen.findByTestId('site-help-done')).toHaveTextContent('Спасибо!')
    expect(screen.getByTestId('site-volunteers')).toHaveTextContent('Готовы помочь: 4')
  })

  it('закрытые координаты: волонтёр видит только район, точные цифры скрыты', async () => {
    renderApp('/last-battle/S01', { role: 'volunteer' })
    expect(await screen.findByTestId('site-coords-closed')).toHaveTextContent('район ~500 м')
    expect(screen.queryByTestId('site-coords')).not.toBeInTheDocument()
  })

  it.each(['commander', 'verifier'] as const)(
    'закрытые координаты: %s видит точные координаты',
    async (role) => {
      renderApp('/last-battle/S01', { role })
      expect(await screen.findByTestId('site-coords')).toHaveTextContent(/^\d+\.\d{4}, \d+\.\d{4}$/)
      expect(screen.queryByTestId('site-coords-closed')).not.toBeInTheDocument()
    },
  )

  it('подтверждённое и поднятое место не просит подъёма', async () => {
    renderApp('/last-battle/S03', { role: 'volunteer' })
    expect(await screen.findByTestId('status-remains_raised')).toBeInTheDocument()
    expect(screen.queryByTestId('site-help')).not.toBeInTheDocument()
  })
})

describe('отметить место гибели (user story 3)', () => {
  it('форма заполнена шаблоном экспедиции и координатами устройства', async () => {
    renderApp('/last-battle/new', { role: 'commander' })
    expect(await screen.findByTestId('site-fighters-count')).toHaveValue(3)
    expect(screen.getByTestId('site-unit')).toHaveValue('9-я вдбр, 5-й ВДК')
    expect(screen.getByTestId('site-date-text')).toHaveValue('октябрь 1941')
    expect(screen.getByTestId('site-source')).toHaveValue('Полевой отчёт отряда «Высота»')
    expect(screen.getByTestId('site-lat')).toHaveValue(52.97)
    expect(screen.getByTestId('site-lon')).toHaveValue(36.07)
  })

  it('опубликовать — карточка нового места со статусом «требуется проверка» и числом уведомлённых', async () => {
    const { router } = renderApp('/last-battle/new', { role: 'commander' })
    await userEvent.type(await screen.findByTestId('site-place'), 'Опушка у р. Оптуха')
    await userEvent.click(screen.getByTestId('site-publish'))

    expect(router.state.location.pathname).toMatch(/^\/last-battle\/S-/)
    expect(await screen.findByTestId('status-found_needs_check')).toBeInTheDocument()
    expect(screen.getByTestId('site-fighters')).toHaveTextContent('3 бойца, имена не установлены')
    expect(screen.getByTestId('site-notified')).toHaveTextContent(
      /Уведомлено подписчиков в радиусе 20 км: [1-9]\d*/,
    )
  })

  it('без названия места — ошибка, публикации нет', async () => {
    const { router } = renderApp('/last-battle/new', { role: 'commander' })
    await userEvent.click(await screen.findByTestId('site-publish'))
    expect(
      await screen.findByText('Опишите место: овраг, опушка, ближайшая деревня'),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/last-battle/new')
  })
})

describe('«Последний бой» по ролям', () => {
  it('командир: главная кнопка «Отметить место гибели»', async () => {
    renderApp('/last-battle', { role: 'commander' })
    expect(await screen.findByTestId('last-battle-add')).toHaveAttribute('href', '/last-battle/new')
  })

  it('волонтёр: подписка на находки в радиусе 20 км одним нажатием', async () => {
    const { platform } = renderApp('/last-battle', { role: 'volunteer' })
    await userEvent.click(await screen.findByTestId('last-battle-subscribe'))
    expect(await screen.findByTestId('subscribe-done')).toHaveTextContent('в радиусе 20 км')
    expect(platform.storage.get('subscription')).toMatchObject({ radiusKm: 20 })
  })

  it('метка места на карте открывает карточку, из неё — страница места со своим адресом', async () => {
    const { router } = renderApp('/map', { role: 'volunteer' })
    await userEvent.click(await screen.findByTestId('marker-site-S02'))
    await userEvent.click(await screen.findByTestId('hub-card-open'))
    expect(router.state.location.pathname).toBe('/last-battle/S02')
  })

  it('краевед подтверждает место по архиву: без источника не пускает, с источником — новый статус', async () => {
    renderApp('/last-battle/S01', { role: 'verifier' })
    await userEvent.click(await screen.findByTestId('site-confirm-submit'))
    expect(screen.getByTestId('site-confirm-detail')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('status-found_needs_check')).toBeInTheDocument()

    await userEvent.type(screen.getByTestId('site-confirm-detail'), 'т. 5, с. 112')
    await userEvent.click(screen.getByTestId('site-confirm-submit'))
    expect(await screen.findByTestId('site-status-done')).toHaveTextContent('Подтверждено архивом')
    expect(screen.getByTestId('status-archive_confirmed')).toBeInTheDocument()
    expect(screen.getByTestId('site-sources')).toHaveTextContent(
      'Книга Памяти. Орловская область, т. 5, с. 112',
    )
  })

  it('командир отмечает подъём подтверждённого места — «Останки подняты», подъём больше не нужен', async () => {
    renderApp('/last-battle/S02', { role: 'commander' })
    await userEvent.type(
      await screen.findByTestId('site-raise-detail'),
      'акт № 14, братская могила д. Кромы',
    )
    await userEvent.click(screen.getByTestId('site-raise-submit'))
    expect(await screen.findByTestId('status-remains_raised')).toBeInTheDocument()
    expect(screen.queryByTestId('site-need')).not.toBeInTheDocument()
    expect(screen.getByTestId('site-sources')).toHaveTextContent('Акт подъёма: акт № 14')
  })

  it.each([
    ['volunteer', 'S01'],
    ['family', 'S02'],
    ['commander', 'S01'],
    ['verifier', 'S02'],
  ] as const)('%s на %s не меняет статус: шаг не его', async (role, id) => {
    renderApp(`/last-battle/${id}`, { role })
    expect(await screen.findByTestId('site-sources')).toBeInTheDocument()
    expect(screen.queryByTestId('site-confirm')).not.toBeInTheDocument()
    expect(screen.queryByTestId('site-raise')).not.toBeInTheDocument()
  })
})
