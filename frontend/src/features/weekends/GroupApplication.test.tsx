import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('коллективные заявки на выезд', () => {
  it('карточка выезда ведёт к заявке группы', async () => {
    renderApp('/weekends/W01', { role: 'family' })
    expect(await screen.findByTestId('trip-group')).toHaveAttribute('href', '/weekends/W01/group')
  })

  it('школа подаёт заявку — статус «На рассмотрении» в «Моих заявках групп»', async () => {
    const { router } = renderApp('/weekends/W01/group', { role: 'family' })
    expect(await screen.findByTestId('group-trip')).toHaveTextContent('Раскопки у д. Семенково')
    await userEvent.type(screen.getByTestId('group-organization'), 'Школа № 5, 7 «А»')
    await userEvent.type(screen.getByTestId('group-contact-name'), 'Мария Петровна')
    await userEvent.type(screen.getByTestId('group-contact'), '+7 900 555-44-33')
    await userEvent.click(screen.getByTestId('group-consent'))
    await userEvent.click(screen.getByTestId('group-send'))

    expect(await screen.findByTestId('group-sent')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/weekends')
    const mine = screen.getByRole('list', { name: 'Мои заявки групп' })
    expect(within(mine).getByText('Школа № 5, 7 «А»')).toBeInTheDocument()
    expect(within(mine).getByText('На рассмотрении')).toBeInTheDocument()
    expect(within(mine).getByText(/10 человек/)).toBeInTheDocument()
  })

  it('больше 100 человек — ошибка, заявка не уходит', async () => {
    const { router } = renderApp('/weekends/W01/group', { role: 'family' })
    const count = await screen.findByTestId('group-count')
    await userEvent.clear(count)
    await userEvent.type(count, '150')
    await userEvent.click(screen.getByTestId('group-consent'))
    await userEvent.click(screen.getByTestId('group-send'))
    expect(await screen.findByText(/Не больше 100 человек/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/weekends/W01/group')
  })

  it('командир видит заявки групп с контактами и подтверждает', async () => {
    renderApp('/weekends', { role: 'commander' })
    const card = await screen.findByTestId('group-G01')
    expect(card).toHaveTextContent('+7 900 000-00-00')
    await userEvent.click(within(card).getByTestId('group-confirm-G01'))
    expect(await within(card).findByText('Подтверждена')).toBeInTheDocument()
    expect(within(card).queryByTestId('group-confirm-G01')).not.toBeInTheDocument()
  })

  it('чужие заявки и контакты волонтёр не видит', async () => {
    renderApp('/weekends', { role: 'volunteer' })
    expect(await screen.findByTestId('trip-W01')).toBeInTheDocument()
    expect(screen.queryByTestId('group-G01')).not.toBeInTheDocument()
  })
})
