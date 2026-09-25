// @vitest-environment node
import { describe, expect, it } from 'vitest'
import jury from '../api/fixtures/jury.generated.json'
import osm from '../api/fixtures/memorials.osm.json'
import * as seed from '../api/fixtures/seed.ts'
import type { Memorial } from '../contract/schemas.ts'
import { collectPlaces, searchPlaces } from './mapHub.ts'

const places = () =>
  collectPlaces({
    routes: seed.routes,
    sites: seed.sites,
    graves: jury.graves,
    battles: jury.battles,
    memorials: osm.memorials as Memorial[],
  })

describe('карта-хаб: места и поиск', () => {
  it('точки маршрута, места поиска, захоронения и бои с уникальными ключами', () => {
    const all = places()
    const keys = all.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(all.filter((p) => p.kind === 'point')).toHaveLength(4)
    expect(all.filter((p) => p.kind === 'site')).toHaveLength(seed.sites.length)
    expect(all.filter((p) => p.kind === 'grave')).toHaveLength(jury.graves.length)
    expect(all.find((p) => p.key === 'point-okop')).toMatchObject({
      title: 'Окоп у дороги',
      routeId: 'park-3km',
    })
  })

  it('поиск без учёта регистра и «ё», сначала совпадение в начале названия', () => {
    const found = searchPlaces(places(), 'окоп')
    expect(found[0]?.key).toBe('point-okop')
    expect(searchPlaces(places(), 'ОРЁЛ').length).toBeGreaterThan(0)
  })

  it('короткий запрос ничего не ищет, результатов не больше лимита', () => {
    expect(searchPlaces(places(), 'о')).toEqual([])
    expect(searchPlaces(places(), 'ди', 3).length).toBeLessThanOrEqual(3)
  })

  it('поиск по виду места: «захоронение»', () => {
    const found = searchPlaces(places(), 'захоронение')
    expect(found.length).toBeGreaterThan(0)
    expect(
      found.every(
        (p) => p.kind === 'grave' || (p.kind === 'memorial' && p.memorialKind === 'grave'),
      ),
    ).toBe(true)
  })

  it('настоящие памятники и музеи из OpenStreetMap — на карте, с источником', () => {
    const memorials = places().filter((p) => p.kind === 'memorial')
    expect(memorials).toHaveLength(osm.memorials.length)
    expect(memorials.every((p) => p.sourceUrl?.startsWith('https://www.openstreetmap.org/'))).toBe(
      true,
    )
    expect(memorials.every((p) => !p.demo)).toBe(true)
    const museums = memorials.filter((p) => p.memorialKind === 'museum')
    expect(museums.length).toBeGreaterThanOrEqual(15)
    expect(museums.every((p) => p.subtitle === 'Музей')).toBe(true)
    expect(searchPlaces(places(), 'военно-исторический')[0]).toMatchObject({
      kind: 'memorial',
      memorialKind: 'museum',
    })
  })
})
