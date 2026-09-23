// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { NewVolunteerRequest } from '../contract/schemas.ts'
import { todayIso, tomorrowIso } from './dates.ts'
import { pluralRu } from './plural.ts'
import { describeRoles, validateNewRequest } from './requests.ts'

describe('заявка командира (user story 2)', () => {
  it('«на завтра» считается по московскому времени', () => {
    // 23:30 по Москве 2 октября = 20:30 UTC: завтра — 3 октября
    expect(tomorrowIso(new Date('2026-10-02T20:30:00Z'))).toBe('2026-10-03')
    // 00:30 по Москве 3 октября = 21:30 UTC 2 октября: завтра — уже 4 октября
    expect(tomorrowIso(new Date('2026-10-02T21:30:00Z'))).toBe('2026-10-04')
    expect(todayIso(new Date('2026-10-02T21:30:00Z'))).toBe('2026-10-03')
    // переход через конец месяца и года
    expect(tomorrowIso(new Date('2026-12-31T09:00:00Z'))).toBe('2027-01-01')
  })

  it('русские формы числа', () => {
    const forms = ['землекоп', 'землекопа', 'землекопов'] as const
    expect(pluralRu(1, forms)).toBe('1 землекоп')
    expect(pluralRu(3, forms)).toBe('3 землекопа')
    expect(pluralRu(10, forms)).toBe('10 землекопов')
    expect(pluralRu(11, forms)).toBe('11 землекопов')
    expect(pluralRu(21, forms)).toBe('21 землекоп')
    expect(pluralRu(112, forms)).toBe('112 землекопов')
  })

  it('кого ищем — по-человечески', () => {
    expect(describeRoles([{ role: 'digger', count: 10 }])).toBe('10 землекопов')
    expect(describeRoles([{ role: 'digger', count: 5 }])).toBe('5 землекопов')
    expect(
      describeRoles([
        { role: 'cook', count: 1 },
        { role: 'driver', count: 2 },
      ]),
    ).toBe('1 повар и 2 водителя')
  })

  const valid: NewVolunteerRequest = {
    teamId: 'T01',
    title: 'Набор на раскопки',
    date: '2026-10-03',
    place: 'Мценский р-н',
    roles: [{ role: 'digger', count: 10 }],
  }

  it('корректная заявка без ошибок', () => {
    expect(validateNewRequest(valid, '2026-10-02')).toEqual({})
  })

  it('ошибки: дата в прошлом, пустое место, ноль людей', () => {
    const errors = validateNewRequest(
      { ...valid, date: '2026-10-01', place: '  ', roles: [{ role: 'digger', count: 0 }] },
      '2026-10-02',
    )
    expect(Object.keys(errors).sort()).toEqual(['count', 'date', 'place'])
    expect(errors.date).toMatch(/прошл/)
  })
})
