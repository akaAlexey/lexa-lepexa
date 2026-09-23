import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { distanceKm } from '../../domain/geo.ts'
import { renderApp } from '../../test/renderApp.tsx'

describe('демо-пульт: детали', () => {
  it('неверные координаты не применяются — понятная ошибка', async () => {
    const { platform } = renderApp('/demo')
    const lat = await screen.findByTestId('demo-lat')
    await userEvent.clear(lat)
    await userEvent.type(lat, 'abc')
    await userEvent.click(screen.getByTestId('demo-geo-apply'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Проверьте координаты')
    expect(await platform.geo.getPosition()).toEqual({ lat: 52.97, lon: 36.07 })
  })

  it('вброшенная точка — в 5 км к северу, помечена как демо, с источником', async () => {
    const { api } = renderApp('/demo')
    const before = (await api.listSites()).length
    await userEvent.click(await screen.findByTestId('demo-inject-site'))
    await screen.findByTestId('toast')
    const sites = await api.listSites()
    expect(sites).toHaveLength(before + 1)
    const site = sites.at(-1)!
    expect(distanceKm({ lat: 52.97, lon: 36.07 }, site)).toBeCloseTo(5, 1)
    expect(site).toMatchObject({ demo: true, fightersCount: 1, unit: 'Неизвестно' })
    expect(site.placeName).toContain('(демо)')
    expect(site.sources[0]?.kind).toBe('demo')
  })
})
