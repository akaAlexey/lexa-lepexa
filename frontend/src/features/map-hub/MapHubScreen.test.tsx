import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp.tsx'

vi.mock('../../map/MapView.tsx', () => ({
  MapView: ({
    testID,
    fitPadding,
    userPosition,
  }: {
    testID: string
    fitPadding?: unknown
    userPosition?: unknown
  }) => (
    <div
      data-testid={testID}
      data-padding={JSON.stringify(fitPadding)}
      data-user-position={JSON.stringify(userPosition)}
    />
  ),
}))

describe('карта-хаб', () => {
  it('сворачивание нижней панели не меняет отступ подгонки и масштаб карты', async () => {
    renderApp('/map')
    const map = await screen.findByTestId('hub-map')
    const padding = map.getAttribute('data-padding')

    await userEvent.click(screen.getByTestId('hub-sheet-toggle'))

    expect(screen.getByTestId('hub-map')).toHaveAttribute('data-padding', padding)
  })

  it('на карте нет отдельной кнопки показа местоположения', async () => {
    renderApp('/map')
    await screen.findByTestId('hub-map')
    expect(screen.queryByTestId('hub-locate')).not.toBeInTheDocument()
  })
})
