// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Trip, VolunteerRequest } from '../../contract/schemas.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import {
  ageStatus,
  EMPTY_CONSENT,
  moscowTime,
  normalizePhone,
  signUp,
  signupBody,
  signupRule,
  signupTerms,
  validateConsent,
  type AgeStatus,
} from './signup.ts'

const NOW = new Date('2026-10-02T09:00:00Z')
const PARENT = { fullName: '  Иванова   Мария Петровна ', phone: '8 (900) 123-45-67', agreed: true }
const ADULT: AgeStatus = { adultVerified: true, age: 30 }
const UNVERIFIED: AgeStatus = { adultVerified: false }

async function demo() {
  const deps = createTestDeps()
  const request = (await deps.api.listRequests()).find((r) => r.id === 'R01') as VolunteerRequest
  const trip = await deps.api.getTrip({ id: 'W01' })
  return { deps, request, trip }
}

describe('условия в окне записи', () => {
  it('заявка отряда: время, место сбора, что взять, возраст', async () => {
    const { request } = await demo()
    const terms = signupTerms({ kind: 'request', request })
    expect(terms).toMatchObject({
      kind: 'request',
      id: 'R01',
      date: '2026-10-03',
      meetingPoint: 'Мценск, площадь у автостанции (демо)',
      minAge: 16,
    })
    expect(moscowTime(terms.startsAt)).toBe('09:00')
    expect(moscowTime(terms.endsAt)).toBe('18:00')
    expect(terms.bring).toContain('Рабочие перчатки')
  })

  it('выезд: «что взять» — чек-лист новичка', async () => {
    const { trip } = await demo()
    const terms = signupTerms({ kind: 'trip', trip })
    expect(terms.bring).toEqual([
      'Лопата',
      'Щуп',
      'Перчатки',
      'Регистрация на сайте «Память народа»',
    ])
    expect(moscowTime(terms.startsAt)).toBe('10:00')
  })

  it('без места сбора и времени — место работ, время не выдумываем', async () => {
    const { trip } = await demo()
    const bare = {
      ...trip,
      meetingPoint: undefined,
      startsAt: undefined,
      endsAt: undefined,
    } as Trip
    const terms = signupTerms({ kind: 'trip', trip: bare })
    expect(terms.meetingPoint).toBe('д. Семенково')
    expect(moscowTime(terms.startsAt)).toBeUndefined()
  })
})

describe('кто может записаться', () => {
  it('подтверждённые 18+ — без согласия родителя', () => {
    expect(signupRule({ minAge: 16 }, ADULT)).toEqual({ kind: 'adult' })
  })

  it('возраст не подтверждён — нужно согласие родителя', () => {
    expect(signupRule({ minAge: 16 }, UNVERIFIED)).toEqual({ kind: 'parentConsent' })
    expect(signupRule({}, { adultVerified: false, age: 17 })).toEqual({ kind: 'parentConsent' })
  })

  it('известный возраст младше минимального — запись закрыта; ровно минимальный — можно', () => {
    expect(signupRule({ minAge: 16 }, { adultVerified: false, age: 15 })).toEqual({
      kind: 'tooYoung',
      minAge: 16,
    })
    expect(signupRule({ minAge: 16 }, { adultVerified: false, age: 16 }).kind).toBe('parentConsent')
  })

  it('без минимального возраста закрывать нечего', () => {
    expect(signupRule({}, { adultVerified: false, age: 10 }).kind).toBe('parentConsent')
  })

  it('возраст берётся из профиля; пока профиль его не подтвердил — не подтверждён', () => {
    expect(ageStatus(createTestDeps())).toEqual({ adultVerified: false })
    const deps = createTestDeps({ stored: { 'profile.age': { adultVerified: true, age: 19 } } })
    expect(ageStatus(deps)).toEqual({ adultVerified: true, age: 19 })
    const broken = createTestDeps({ stored: { 'profile.age': { adultVerified: 'да' } } })
    expect(ageStatus(broken)).toEqual({ adultVerified: false })
  })
})

describe('согласие родителя', () => {
  it.each([
    ['8 (900) 123-45-67', '+79001234567'],
    ['+7 900 123 45 67', '+79001234567'],
    ['9001234567', '+79001234567'],
    ['12345', undefined],
    ['+1 900 123 45 67 8', undefined],
  ])('телефон %s → %s', (raw, phone) => {
    expect(normalizePhone(raw)).toBe(phone)
  })

  it('все три поля обязательны, ошибки — по-русски и у своих полей', () => {
    expect(Object.keys(validateConsent(EMPTY_CONSENT)).sort()).toEqual([
      'agreed',
      'fullName',
      'phone',
    ])
    expect(validateConsent({ ...PARENT, fullName: 'Мама' }).fullName).toMatch(/фамилию и имя/)
    expect(validateConsent(PARENT)).toEqual({})
  })
})

describe('тело запроса записи', () => {
  it('18+: только принятые условия и возраст, согласие не собирается', () => {
    expect(signupBody({ kind: 'adult' }, ADULT, EMPTY_CONSENT, NOW)).toEqual({
      ok: true,
      body: { termsAccepted: true, adultVerified: true, age: 30 },
    })
  })

  it('без 18+: согласие очищено, телефон нормализован, время согласия записано', () => {
    const result = signupBody({ kind: 'parentConsent' }, UNVERIFIED, PARENT, NOW)
    expect(result).toEqual({
      ok: true,
      body: {
        termsAccepted: true,
        adultVerified: false,
        age: undefined,
        parentConsent: {
          fullName: 'Иванова Мария Петровна',
          phone: '+79001234567',
          agreedAt: '2026-10-02T09:00:00.000Z',
        },
      },
    })
  })

  it('без 18+ и без согласия — ошибки формы, запрос не собирается', () => {
    const result = signupBody({ kind: 'parentConsent' }, UNVERIFIED, EMPTY_CONSENT, NOW)
    expect(result.ok).toBe(false)
  })
})

describe('запись', () => {
  it('в заявку: место в команде занято, запись запомнена на устройстве', async () => {
    const { deps, request } = await demo()
    const result = await signUp(
      deps,
      { kind: 'request', request },
      {
        termsAccepted: true,
        adultVerified: true,
      },
    )
    expect(result).toEqual({ kind: 'request', joined: ['R01'] })
    expect(deps.platform.storage.get('search.joinedRequests')).toEqual(['R01'])
  })

  it('на выезд: меньше свободных мест, запись запомнена без дублей', async () => {
    const { deps, trip } = await demo()
    const body = { termsAccepted: true, adultVerified: true } as const
    const first = await signUp(deps, { kind: 'trip', trip }, body)
    expect(first).toMatchObject({ kind: 'trip', trip: { spotsTaken: 6 }, registered: ['W01'] })
    await signUp(deps, { kind: 'trip', trip }, body)
    expect(deps.platform.storage.get('trips.registered')).toEqual(['W01'])
  })

  it('сервер отказал (нет согласия) — на устройстве ничего не запомнено', async () => {
    const { deps, trip } = await demo()
    await expect(
      signUp(deps, { kind: 'trip', trip }, { termsAccepted: true, adultVerified: false }),
    ).rejects.toMatchObject({ status: 422 })
    expect(deps.platform.storage.get('trips.registered')).toBeUndefined()
  })

  it('ошибка сети — запись не запоминается', async () => {
    const { deps, request } = await demo()
    vi.spyOn(deps.api, 'joinRequest').mockRejectedValue(new Error('сеть'))
    await expect(
      signUp(deps, { kind: 'request', request }, { termsAccepted: true, adultVerified: true }),
    ).rejects.toThrow('сеть')
    expect(deps.platform.storage.get('search.joinedRequests')).toBeUndefined()
  })
})
