// @vitest-environment node
import { describe, expect, it } from 'vitest'
import jury from '../api/fixtures/jury.generated.json'
import * as seed from '../api/fixtures/seed.ts'
import type { VolunteerRequest } from '../contract/schemas.ts'
import { ageLabel, buildFeed, filterFeed, volunteersNeeded } from './events.ts'

const feed = () =>
  buildFeed({
    requests: seed.requests,
    trips: seed.trips,
    fundraisers: seed.fundraisers,
    teams: jury.teams,
  })

describe('лента «Мероприятия»', () => {
  it('заявки, выезды и сборы одной лентой, новые сверху', () => {
    const items = feed()
    expect(items.map((i) => i.id)).toEqual(['W02', 'F02', 'F03', 'F04', 'W01', 'R01', 'F05'])
    const dates = items.map((i) => i.postedAt)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('сбор, привязанный к заявке, — в её карточке, а не отдельной строкой', () => {
    const items = feed()
    expect(items.some((i) => i.id === 'F01')).toBe(false)
    const r01 = items.find((i) => i.id === 'R01')
    expect(r01?.kind === 'request' && r01.fundraiser?.id).toBe('F01')
    expect(r01?.team?.name).toBe('Высота')
  })

  it('фильтр по типу и поиск по месту и отряду без учёта регистра и «ё»', () => {
    const items = feed()
    expect(filterFeed(items, 'trip', '').map((i) => i.id)).toEqual(['W02', 'W01'])
    expect(filterFeed(items, 'request', '').map((i) => i.id)).toEqual(['R01'])
    expect(filterFeed(items, 'fund', '').map((i) => i.id)).toEqual(['F02', 'F03', 'F04', 'F05'])
    expect(filterFeed(items, 'all', 'СЕМЕНКОВО').map((i) => i.id)).toEqual(['W01'])
    expect(filterFeed(items, 'all', 'высота').map((i) => i.id)).toEqual(['W01', 'R01'])
    expect(filterFeed(items, 'trip', 'нет такого')).toEqual([])
  })

  it('без даты публикации — в конце ленты', () => {
    const trips = seed.trips.map(({ createdAt: _omit, ...t }) => t)
    const items = buildFeed({ requests: seed.requests, trips, fundraisers: [], teams: [] })
    expect(items.map((i) => i.id)).toEqual(['R01', 'W01', 'W02'])
  })

  it('волонтёры считаются по всем ролям, возраст — «16+»', () => {
    const r = {
      roles: [
        { role: 'any', count: 3 },
        { role: 'cook', count: 1 },
      ],
    } as VolunteerRequest
    expect(volunteersNeeded(r)).toBe(4)
    expect(ageLabel(16)).toBe('16+')
    expect(ageLabel(undefined)).toBeUndefined()
  })
})
