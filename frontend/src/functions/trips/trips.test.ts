// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Trip } from '../../contract/schemas.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import { isNotFound } from '../core/errors.ts'
import {
  freeSpots,
  getTrip,
  listTrips,
  nearestTrip,
  registerTrip,
  replaceTrip,
  spotsText,
} from './trips.ts'

const trip = (id: string, date: string, spotsTotal: number, spotsTaken: number): Trip => ({
  id,
  teamId: 'T01',
  date,
  title: `Выезд ${id}`,
  place: 'Орёл',
  lat: 53,
  lon: 36,
  spotsTotal,
  spotsTaken,
  checklist: [{ id: 'shovel', label: 'Лопата' }],
  demo: true,
})

// 2026-10-02 12:00 по Москве
const now = new Date('2026-10-02T09:00:00Z')

describe('выезды: загрузка', () => {
  it('список выездов и карточка по id', async () => {
    const deps = createTestDeps()
    const list = await listTrips(deps)
    expect(list.map((t) => t.id)).toEqual(['W01', 'W02'])
    expect((await getTrip(deps, 'W01')).title).toBe('Раскопки у д. Семенково')
  })

  it('нет такого выезда — ошибка 404, её узнаёт isNotFound', async () => {
    const error = await getTrip(createTestDeps(), 'NOPE').catch((e: unknown) => e)
    expect(isNotFound(error)).toBe(true)
  })
})

const ADULT = { termsAccepted: true, adultVerified: true, age: 30 } as const

describe('запись на выезд', () => {
  it('занимает одно место и возвращает обновлённый выезд', async () => {
    const deps = createTestDeps()
    const updated = await registerTrip(deps, 'W01', ADULT)
    expect(spotsText(updated)).toBe('Свободно мест: 6 из 12')
    expect((await getTrip(deps, 'W01')).spotsTaken).toBe(6)
  })

  it('мест нет — ошибка с текстом для экрана', async () => {
    const deps = createTestDeps()
    for (let i = 0; i < 7; i++) await registerTrip(deps, 'W01', ADULT)
    await expect(registerTrip(deps, 'W01', ADULT)).rejects.toThrow('Мест нет')
  })

  it('нет такого выезда — 404', async () => {
    const error = await registerTrip(createTestDeps(), 'NOPE', ADULT).catch((e: unknown) => e)
    expect(isNotFound(error)).toBe(true)
  })

  it('без подтверждённых 18+ и без согласия родителя — 422, место не занято', async () => {
    const deps = createTestDeps()
    const error = await registerTrip(deps, 'W01', {
      termsAccepted: true,
      adultVerified: false,
    }).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 422 })
    expect((await getTrip(deps, 'W01')).spotsTaken).toBe(5)
  })

  it('возраст младше минимального — 409 с понятным текстом', async () => {
    const error = await registerTrip(createTestDeps(), 'W01', {
      ...ADULT,
      adultVerified: false,
      age: 12,
      parentConsent: {
        fullName: 'Иванова Мария Петровна',
        phone: '+79001234567',
        agreedAt: '2026-10-01T10:00:00Z',
      },
    }).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 409, message: 'Участвовать можно с 14 лет' })
  })
})

describe('свободные места', () => {
  it('«Свободно мест: 7 из 12»; перебор не уходит в минус', () => {
    expect(freeSpots(trip('A', '2026-10-03', 12, 5))).toBe(7)
    expect(spotsText(trip('A', '2026-10-03', 12, 5))).toBe('Свободно мест: 7 из 12')
    expect(freeSpots(trip('A', '2026-10-03', 5, 9))).toBe(0)
  })
})

describe('ближайший выезд', () => {
  it('первый будущий выезд со свободными местами; прошедшие пропускаются', () => {
    const list = [
      trip('past', '2026-09-26', 10, 0),
      trip('full', '2026-10-03', 10, 10),
      trip('open', '2026-10-10', 10, 3),
    ]
    expect(nearestTrip(list, now)?.id).toBe('open')
  })

  it('сегодняшний выезд ещё ближайший', () => {
    expect(nearestTrip([trip('today', '2026-10-02', 10, 0)], now)?.id).toBe('today')
  })

  it('все будущие заняты — первый из них; будущих нет — ничего', () => {
    const full = [trip('a', '2026-10-03', 5, 5), trip('b', '2026-10-10', 5, 5)]
    expect(nearestTrip(full, now)?.id).toBe('a')
    expect(nearestTrip([trip('past', '2026-09-01', 5, 0)], now)).toBeUndefined()
    expect(nearestTrip([], now)).toBeUndefined()
  })
})

describe('кэш после записи', () => {
  it('в списке заменяется только обновлённый выезд', () => {
    const list = [trip('a', '2026-10-03', 5, 1), trip('b', '2026-10-10', 5, 1)]
    const updated = trip('a', '2026-10-03', 5, 2)
    const next = replaceTrip(list, updated)
    expect(next?.[0]).toBe(updated)
    expect(next?.[1]).toBe(list[1])
  })

  it('списка ещё нет в кэше — остаётся пустым', () => {
    expect(replaceTrip(undefined, trip('a', '2026-10-03', 5, 1))).toBeUndefined()
  })
})
