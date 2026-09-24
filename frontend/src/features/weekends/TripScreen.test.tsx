import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('выезд «Выходные с поисковиком»', () => {
  it('карточка выезда как в прототипе и чек-лист новичка', async () => {
    renderApp('/weekends/W01', { role: 'volunteer' })
    expect(
      await screen.findByRole('heading', { level: 1, name: /Раскопки у д. Семенково/ }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('trip-date')).toHaveTextContent('3 октября, суббота')
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
    expect(screen.getByTestId('checklist-progress')).toHaveTextContent('Готово 0 из 4')
  })

  it('отметки чек-листа сохраняются на устройстве', async () => {
    const { platform } = renderApp('/weekends/W01', { role: 'volunteer' })
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Лопата' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Перчатки' }))
    expect(screen.getByTestId('checklist-progress')).toHaveTextContent('Готово 2 из 4')
    expect(platform.storage.get('checklist:W01')).toEqual(['shovel', 'gloves'])
  })

  it('«Записаться на выезд» — подтверждение и минус одно свободное место', async () => {
    renderApp('/weekends/W01', { role: 'volunteer' })
    expect(await screen.findByTestId('trip-spots')).toHaveTextContent('Свободно мест: 7 из 12')
    await userEvent.click(screen.getByTestId('trip-register'))
    expect(await screen.findByTestId('trip-registered')).toHaveTextContent('Вы записаны')
    expect(screen.getByTestId('trip-spots')).toHaveTextContent('Свободно мест: 6 из 12')
  })
})
