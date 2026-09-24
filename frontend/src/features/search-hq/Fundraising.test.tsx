import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('целевые сборы и карта потребностей', () => {
  it('сборы из кейса: «Поднять бойца» и «Экипировать отряд» с прогрессом', async () => {
    renderApp('/search', { role: 'volunteer' })
    const raise = await screen.findByTestId('fundraiser-F03')
    expect(raise).toHaveTextContent('Поднять бойца')
    expect(raise).toHaveTextContent('Собрано 21 000 ₽ из 30 000 ₽')
    expect(screen.getByTestId('fundraiser-F02')).toHaveTextContent('Экипировать отряд')
  })

  it('«Поддержать сбор» открывает тестовый платёж этого сбора', async () => {
    renderApp('/search', { role: 'volunteer' })
    await userEvent.click(await screen.findByTestId('fundraiser-donate-F03'))
    const dialog = screen.getByTestId('donate-dialog-F03')
    expect(dialog).toHaveTextContent('деньги не списываются')
    await userEvent.click(within(dialog).getByTestId('donate-confirm'))
    expect(await screen.findByTestId('donate-result')).toHaveTextContent('Спасибо!')
  })

  it('у каждого отряда с дефицитом — «Пожертвовать отряду» в его сбор', async () => {
    renderApp('/search', { role: 'volunteer' })
    for (const team of ['T01', 'T02', 'T03', 'T04', 'T05'])
      expect(await screen.findByTestId(`team-donate-${team}`)).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('team-donate-T04'))
    expect(screen.getByTestId('donate-dialog-F03')).toBeInTheDocument()
  })

  it('«На карте»: люди и деньги метками, выбранный сбор — карточкой; список дублирует карту', async () => {
    renderApp('/search', { role: 'volunteer' })
    await userEvent.click(await screen.findByTestId('needs-view-map'))
    const map = await screen.findByTestId('needs-map')
    expect(
      within(map).getByRole('button', { name: /^Нужны люди: Вахта Памяти/ }),
    ).toBeInTheDocument()
    expect(within(map).getAllByRole('button', { name: /^Выезд/ }).length).toBeGreaterThan(0)
    await userEvent.click(within(map).getByRole('button', { name: /Поднять бойца/ }))
    expect(screen.getByTestId('fundraiser-F03')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Потребности на карте списком' })
    expect(within(list).getAllByRole('button').length).toBe(
      within(map).getAllByRole('button').length,
    )
    // Лента заявок в режиме карты не дублируется
    expect(screen.queryByRole('list', { name: 'Заявки отрядов' })).not.toBeInTheDocument()
  })
})
