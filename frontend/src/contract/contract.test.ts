// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import openapiFile from '../../../docs/openapi.json'
import jury from '../api/fixtures/jury.generated.json'
import osm from '../api/fixtures/memorials.osm.json'
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

  it('памятники из OpenStreetMap проходят схему, лежат в Орловской области и ведут на OSM', () => {
    const memorials = z.array(s.Memorial).parse(osm.memorials)
    expect(memorials.length).toBeGreaterThan(50)
    for (const m of memorials) {
      expect(m.lat).toBeGreaterThan(51.9)
      expect(m.lat).toBeLessThan(53.7)
      expect(m.lon).toBeGreaterThan(34.7)
      expect(m.lon).toBeLessThan(38.2)
      expect(m.osmUrl).toMatch(/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/)
    }
    // Памятник морякам-тихоокеанцам из текста кейса
    expect(memorials.some((m) => /Тихоокеанского флота/.test(m.name))).toBe(true)
  })

  it('демо-контент проходит схемы, у каждого факта есть источник', () => {
    z.array(s.Route).parse(seed.routes)
    z.array(s.Trip).parse(seed.trips)
    z.array(s.Fundraiser).parse(seed.fundraisers)
    z.array(s.VolunteerRequest).parse(seed.requests)
    z.array(s.GroupApplication).parse(seed.groupApplications)
    z.array(s.LivePhoto).parse(seed.livePhotos)
    const stories = z.array(s.ArchiveStory).parse(seed.stories)
    // Подтверждённая история — всегда с источником
    for (const story of stories.filter((x) => x.status === 'verified'))
      expect(story.sourceText.trim()).not.toBe('')
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
