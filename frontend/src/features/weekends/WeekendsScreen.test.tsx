import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('список выездов «Выходные с поисковиком»', () => {
  it('даты выездов ссылками, свободные места и кнопка на ближайший выезд', async () => {
    renderApp('/weekends', { role: 'volunteer' })
    const card = await screen.findByTestId('trip-W01')
    expect(within(card).getByRole('link')).toHaveTextContent(
      '3 октября, суббота. Раскопки у д. Семенково',
    )
    expect(within(card).getByRole('link')).toHaveAttribute('href', '/weekends/W01')
    expect(card).toHaveTextContent('Свободно мест: 7 из 12')
    expect(screen.getByTestId('weekends-register')).toHaveAttribute('href', '/weekends/W01')
    expect(screen.queryByText(/следующей итерации/)).not.toBeInTheDocument()
  })

  it('несуществующий выезд — «Выезд не найден» и ссылка к списку', async () => {
    renderApp('/weekends/NOPE', { role: 'volunteer' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Выезд не найден' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'К списку выездов' }))
    expect(await screen.findByTestId('trip-W01')).toBeInTheDocument()
  })

  it('все пункты отмечены — «Вы готовы к выезду»', async () => {
    renderApp('/weekends/W01', { role: 'volunteer' })
    for (const box of await screen.findAllByRole('checkbox')) await userEvent.click(box)
    expect(screen.getByTestId('checklist-progress')).toHaveTextContent('Готово 4 из 4')
    expect(screen.getByTestId('checklist-ready')).toHaveTextContent('Вы готовы к выезду')
  })
})
