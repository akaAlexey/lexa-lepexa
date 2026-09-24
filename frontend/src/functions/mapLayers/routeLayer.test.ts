// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Route } from '../../contract/schemas.ts'
import { tokens } from '../../theme/tokens.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import { routeMarkers } from './routeLayer.ts'

async function familyRoute(): Promise<Route> {
  const route = (await createTestDeps().api.listRoutes()).find((r) => r.id === 'park-3km')
  if (!route) throw new Error('нет демо-маршрута park-3km')
  return route
}

describe('слой «Маршрут»', () => {
  it('метка на каждую точку по порядку с иконкой вида и подписью', async () => {
    const route = await familyRoute()
    const markers = routeMarkers(route, new Set())
    expect(markers.map((m) => m.id)).toEqual(route.points.map((p) => p.id))
    expect(markers[0]).toMatchObject({
      icon: 'star',
      label: 'Точка 1: Рубеж десантников (Бой)',
      color: tokens.color.point.battle,
    })
  })

  it('пройденная точка — галочка, цвет «пройдено», пометка в подписи', async () => {
    const [first, second] = routeMarkers(await familyRoute(), new Set(['rubezh']))
    expect(first).toMatchObject({ icon: 'check', color: tokens.color.point.done })
    expect(first?.label).toMatch(/, пройдена$/)
    expect(second?.label).not.toMatch(/пройдена/)
  })

  it('«Вы здесь» — последней, не кнопка; без позиции метки нет', async () => {
    const route = await familyRoute()
    expect(routeMarkers(route, new Set()).some((m) => m.id === 'me')).toBe(false)
    const markers = routeMarkers(route, new Set(), { lat: 52.97, lon: 36.07 })
    expect(markers.at(-1)).toEqual({
      id: 'me',
      lat: 52.97,
      lon: 36.07,
      icon: 'locate',
      label: 'Вы здесь',
      color: tokens.color.map.me,
      interactive: false,
    })
  })
})
