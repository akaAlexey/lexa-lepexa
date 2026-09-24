import type { NewVolunteerRequest, Team, VolunteerRequest } from '../../contract/schemas.ts'
import { todayIso, tomorrowIso } from '../../domain/dates.ts'
import { validateNewRequest } from '../../domain/requests.ts'
import type { Deps } from '../core/deps.ts'
import type { FormSpec } from '../core/form.ts'

/** Готовые варианты «Сколько людей нужно» — одно нажатие вместо ввода. */
export const REQUEST_COUNTS = [5, 10, 20] as const

/** Минимальный возраст волонтёров (ADR 0012): в ленте «16+». Младше — только с родителями. */
export const REQUEST_AGES = [14, 16, 18] as const
export const DEFAULT_MIN_AGE = 16

/** Значения формы заявки как на экране: число — строкой из поля ввода. */
export interface RequestValues {
  date: string
  count: string
  /** Нужны всегда волонтёры (не «землекопы»): отряд указывает только возраст. */
  minAge: number
  place: string
  title: string
}

/** Контекст формы: отряд, прошлая заявка-шаблон и даты «сегодня/завтра» по Москве. */
export interface RequestFormContext {
  team: Team
  last: VolunteerRequest | undefined
  today: string
  tomorrow: string
}

/** «Сегодня» и «завтра» по Москве — варианты даты; по умолчанию «завтра». */
export function requestDates(now: Date): { today: string; tomorrow: string } {
  return { today: todayIso(now), tomorrow: tomorrowIso(now) }
}

/** Форма заявки командира: всё заполнено по прошлой заявке, остаётся выбрать, сколько людей. */
export const requestForm: FormSpec<RequestValues, NewVolunteerRequest, RequestFormContext> = {
  order: ['date', 'count', 'place', 'title'],
  initial: ({ team, last, tomorrow }) => ({
    date: tomorrow,
    count: '5',
    minAge: last?.minAge ?? DEFAULT_MIN_AGE,
    place: last?.place ?? '',
    title: last?.title ?? `Набор волонтёров — отряд «${team.name}»`,
  }),
  toRequest: (v, { team }) => ({
    teamId: team.id,
    title: v.title.trim(),
    date: v.date,
    place: v.place.trim(),
    roles: [{ role: 'any', count: v.count.trim() === '' ? 0 : Number(v.count) }],
    minAge: v.minAge,
  }),
  validate: (request, _values, { today }) => validateNewRequest(request, today),
}

/** Опубликовать проверенную заявку командира. */
export function publishRequest(
  { api }: Pick<Deps, 'api'>,
  request: NewVolunteerRequest,
): Promise<VolunteerRequest> {
  return api.createRequest({ body: request })
}

/** Новая заявка — первой в ленте, без дубля, если сервер уже вернул её в списке. */
export function withPublished(
  list: readonly VolunteerRequest[] | undefined,
  created: VolunteerRequest,
): VolunteerRequest[] {
  return [created, ...(list ?? []).filter((r) => r.id !== created.id)]
}

/** Признак, с которым форма заявки возвращает на ленту после публикации. */
export interface PublishedState {
  publishedId: string
}

export const publishedState = (publishedId: string): PublishedState => ({ publishedId })

export function isPublishedState(state: unknown): state is PublishedState {
  return typeof state === 'object' && state !== null && 'publishedId' in state
}
