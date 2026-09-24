import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

describe('«Где я?» на карте тропы', () => {
  it('метка положения и расстояние до следующей точки', async () => {
    renderApp('/trail', { role: 'family' })
    await userEvent.click(await screen.findByTestId('trail-locate'))
    expect(await screen.findByTestId('marker-me')).toBeInTheDocument()
    expect(screen.getByTestId('trail-distance')).toHaveTextContent(
      /До точки «Рубеж десантников» \d[\d,]* (м|км) по прямой/,
    )
  })

  it('без доступа к геопозиции — понятная ошибка, метки нет', async () => {
    renderApp('/trail', {
      role: 'family',
      platform: {
        geo: { source: 'device', getPosition: () => Promise.reject(new Error('denied')) },
      },
    })
    await userEvent.click(await screen.findByTestId('trail-locate'))
    expect(await screen.findByTestId('trail-locate-error')).toHaveTextContent('геопозиции')
    expect(screen.queryByTestId('marker-me')).not.toBeInTheDocument()
  })
})
