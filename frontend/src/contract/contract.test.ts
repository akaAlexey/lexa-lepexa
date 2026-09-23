// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import openapiFile from '../../../docs/openapi.json'
import jury from '../api/fixtures/jury.generated.json'
import * as seed from '../api/fixtures/seed.ts'
import { pathLengthKm } from '../domain/geo.ts'
import { buildOpenApi } from './openapi.ts'
import * as s from './schemas.ts'

describe('контракт и фикстуры', () => {
  it('данные жюри проходят схемы и помечены как демо', () => {
    expect(
      z
        .array(s.Grave)
        .parse(jury.graves)
        .every((g) => g.demo),
    ).toBe(true)
    expect(z.array(s.Battle).parse(jury.battles)).toHaveLength(8)
    expect(
      z
        .array(s.Team)
        .parse(jury.teams)
        .map((t) => t.name),
    ).toContain('Высота')
  })

  it('демо-контент проходит схемы, у каждого факта есть источник', () => {
    z.array(s.Route).parse(seed.routes)
    z.array(s.Trip).parse(seed.trips)
    z.array(s.Fundraiser).parse(seed.fundraisers)
    z.array(s.VolunteerRequest).parse(seed.requests)
    const sites = z.array(s.LastBattleSite).parse(seed.sites)
    for (const site of sites) expect(site.sources.length).toBeGreaterThan(0)
  })

  it('семейный маршрут: ≈3 км и 4 точки', () => {
    const route = seed.routes[0]!
    expect(pathLengthKm(route.path)).toBeGreaterThan(2.7)
    expect(pathLengthKm(route.path)).toBeLessThan(3.3)
    expect(route.points).toHaveLength(4)
  })

  it('docs/openapi.json совпадает с контрактом (иначе: npm run contract)', () => {
    expect(openapiFile).toEqual(JSON.parse(JSON.stringify(buildOpenApi())))
  })
})
