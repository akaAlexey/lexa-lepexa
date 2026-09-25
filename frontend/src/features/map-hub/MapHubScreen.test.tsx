import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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

  it('геопозиция запрашивается только по кнопке и затем передаётся карте', async () => {
    const getPosition = vi.fn<() => Promise<{ lat: number; lon: number }>>(async () => ({
      lat: 52.971,
      lon: 36.071,
    }))
    renderApp('/map', {
      platform: {
        geo: { source: 'device', getPosition },
      },
    })

    expect(getPosition).not.toHaveBeenCalled()
    await userEvent.click(await screen.findByTestId('hub-locate'))
    expect(getPosition).toHaveBeenCalledTimes(1)
    expect(await screen.findByTestId('hub-map')).toHaveAttribute(
      'data-user-position',
      JSON.stringify({ lat: 52.971, lon: 36.071 }),
    )
    expect(screen.queryByTestId('hub-locate')).not.toBeInTheDocument()
  })
})
