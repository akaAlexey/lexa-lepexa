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

  it('музей края находится поиском, в карточке — «Как добраться» и источник OpenStreetMap', async () => {
    renderApp('/map')
    await userEvent.type(await screen.findByTestId('hub-search'), 'военно-исторический')
    const key = 'memorial-osm-way-73568977'
    await userEvent.click(await screen.findByTestId(`hub-result-${key}`))
    const card = await screen.findByTestId(`hub-card-${key}`)
    expect(card).toHaveTextContent('Орловский военно-исторический музей')
    expect(card).toHaveTextContent('Музей')
    expect(screen.getByTestId('hub-card-directions')).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/yandex\.ru\/maps\/\?rtext=~52\.95/),
    )
    expect(screen.getByTestId('hub-card-source')).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/way/73568977',
    )
  })

  it('в панели «Места» — список памятников и музеев из OpenStreetMap', async () => {
    renderApp('/map')
    const list = await screen.findByTestId('hub-memorials')
    expect(list.querySelectorAll('li').length).toBeGreaterThan(80)
    expect(screen.getByText(/музеев края/)).toBeInTheDocument()
  })
})
