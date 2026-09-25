import type { SignupRequest, Trip, VolunteerRequest } from '../../contract/schemas.ts'
import type { Deps } from '../core/deps.ts'
import { memory, readMemory, updateMemory } from '../core/deviceMemory.ts'
import type { FieldErrors } from '../core/form.ts'
import { joinRequest } from '../helpRequests/index.ts'
import { registerTrip } from '../trips/index.ts'

/**
 * Запись на заявку отряда или выезд через окно с условиями (решение команды 25.09).
 * Человек сначала видит, когда начало и конец, где сбор, что взять и с какого возраста,
 * и только потом подтверждает. Без подтверждённого возраста 18+ — только с согласием родителя.
 */
export type SignupTarget =
  { kind: 'request'; request: VolunteerRequest } | { kind: 'trip'; trip: Trip }

/** Условия для окна записи — одинаково для заявки и выезда. */
export interface SignupTerms {
  kind: SignupTarget['kind']
  id: string
  title: string
  /** Дата YYYY-MM-DD. */
  date: string
  startsAt?: string
  endsAt?: string
  /** Где собираются участники: место сбора, а если его нет — место работ. */
  meetingPoint: string
  bring: readonly string[]
  minAge?: number
}

export function signupTerms(target: SignupTarget): SignupTerms {
  if (target.kind === 'request') {
    const r = target.request
    return {
      kind: 'request',
      id: r.id,
      title: r.title,
      date: r.date,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      meetingPoint: r.meetingPoint ?? r.place,
      bring: r.bring ?? [],
      minAge: r.minAge,
    }
  }
  const t = target.trip
  return {
    kind: 'trip',
    id: t.id,
    title: t.title,
    date: t.date,
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    meetingPoint: t.meetingPoint ?? t.place,
    bring: t.checklist.map((c) => c.label),
    minAge: t.minAge,
  }
}

const time = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
})

/** «09:00» по Москве; без времени — undefined. */
export const moscowTime = (iso: string | undefined) =>
  iso === undefined ? undefined : time.format(new Date(iso))

/**
 * Возраст из профиля. Пишет профиль («Подтвердить 18+ через Госуслуги»), здесь только читаем:
 * пока профиль не подтвердил 18+, возраст считается неподтверждённым.
 */
export interface AgeStatus {
  adultVerified: boolean
  /** Полных лет, если известно из профиля. */
  age?: number
}

export function ageStatus({ platform }: Pick<Deps, 'platform'>): AgeStatus {
  return readMemory(platform.storage, memory.ageStatus)
}

/** Что нужно для записи: ничего (18+), согласие родителя или запись закрыта по возрасту. */
export type SignupRule =
  { kind: 'adult' } | { kind: 'parentConsent' } | { kind: 'tooYoung'; minAge: number }

export function signupRule(terms: Pick<SignupTerms, 'minAge'>, age: AgeStatus): SignupRule {
  if (terms.minAge !== undefined && age.age !== undefined && age.age < terms.minAge)
    return { kind: 'tooYoung', minAge: terms.minAge }
  return age.adultVerified ? { kind: 'adult' } : { kind: 'parentConsent' }
}

/** Согласие родителя в окне записи. В хранилище и адрес не попадает — только в запрос. */
export interface ConsentValues {
  fullName: string
  phone: string
  agreed: boolean
}

export const EMPTY_CONSENT: ConsentValues = { fullName: '', phone: '', agreed: false }

/** «8 (900) 123-45-67», «+7 900 1234567», «9001234567» → «+79001234567»; не телефон — undefined. */
export function normalizePhone(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+7${digits}`
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8')))
    return `+7${digits.slice(1)}`
  return undefined
}

export function validateConsent(values: ConsentValues): FieldErrors {
  const errors: Record<string, string> = {}
  const name = values.fullName.trim()
  if (name.split(/\s+/).length < 2 || name.length < 5)
    errors.fullName = 'Укажите фамилию и имя родителя, например «Иванова Мария Петровна»'
  if (!normalizePhone(values.phone))
    errors.phone = 'Телефон — 10 или 11 цифр, например +7 900 123-45-67'
  if (!values.agreed) errors.agreed = 'Отметьте, что родитель согласен на участие'
  return errors
}

export type SignupBodyResult =
  { ok: true; body: SignupRequest } | { ok: false; errors: FieldErrors }

/** Тело запроса записи. Согласие нужно и проверяется только без подтверждённых 18+. */
export function signupBody(
  rule: SignupRule,
  age: AgeStatus,
  consent: ConsentValues,
  now: Date,
): SignupBodyResult {
  if (rule.kind === 'tooYoung') return { ok: false, errors: {} }
  const base = { termsAccepted: true as const, adultVerified: age.adultVerified, age: age.age }
  if (rule.kind === 'adult') return { ok: true, body: base }
  const errors = validateConsent(consent)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    body: {
      ...base,
      parentConsent: {
        fullName: consent.fullName.trim().replace(/\s+/g, ' '),
        phone: normalizePhone(consent.phone) ?? '',
        agreedAt: now.toISOString(),
      },
    },
  }
}

export type SignupResult =
  { kind: 'request'; joined: string[] } | { kind: 'trip'; trip: Trip; registered: string[] }

/**
 * Записаться: заявка — через «Помочь поисковикам», выезд — через «Выезды».
 * Запись запоминается на устройстве; при ошибке сети память не меняется.
 */
export async function signUp(
  deps: Pick<Deps, 'api' | 'platform'>,
  target: SignupTarget,
  body: SignupRequest,
): Promise<SignupResult> {
  if (target.kind === 'request')
    return { kind: 'request', joined: await joinRequest(deps, target.request.id, body) }
  const trip = await registerTrip(deps, target.trip.id, body)
  const registered = updateMemory(deps.platform.storage, memory.registeredTrips, (prev) => [
    ...prev.filter((id) => id !== trip.id),
    trip.id,
  ])
  return { kind: 'trip', trip, registered }
}
