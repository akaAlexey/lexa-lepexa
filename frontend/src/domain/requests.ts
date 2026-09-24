import type { NewVolunteerRequest, VolunteerRequest, VolunteerRole } from '../contract/schemas.ts'
import { pluralRu } from './plural.ts'

/** Формы слова для каждой роли: [1, 2–4, 5–20]. */
export const ROLE_FORMS: Record<VolunteerRole, readonly [string, string, string]> = {
  digger: ['землекоп', 'землекопа', 'землекопов'],
  prober: ['щуповой', 'щуповых', 'щуповых'],
  cook: ['повар', 'повара', 'поваров'],
  driver: ['водитель', 'водителя', 'водителей'],
  medic: ['медик', 'медика', 'медиков'],
  any: ['волонтёр', 'волонтёра', 'волонтёров'],
}

/** Подписи ролей для выбора в форме. */
export const ROLE_LABELS: Record<VolunteerRole, string> = {
  digger: 'Землекопы',
  prober: 'Щуповые',
  cook: 'Повара',
  driver: 'Водители',
  medic: 'Медики',
  any: 'Любые волонтёры',
}

/** «10 землекопов», «1 повар и 2 водителя», «1 повар, 2 водителя и 3 медика». */
export function describeRoles(roles: VolunteerRequest['roles']): string {
  const parts = roles.map(({ role, count }) => pluralRu(count, ROLE_FORMS[role]))
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} и ${parts[parts.length - 1]}`
}

export type RequestErrors = Partial<Record<'count' | 'date' | 'place' | 'title', string>>

/** Проверка формы заявки: люди ≥ 1, дата не в прошлом, место и название не пустые. */
export function validateNewRequest(input: NewVolunteerRequest, today: string): RequestErrors {
  const errors: RequestErrors = {}
  const counts = input.roles.map((r) => r.count)
  if (counts.length === 0 || counts.some((c) => !Number.isInteger(c) || c < 1))
    errors.count = 'Нужен хотя бы один человек'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.date = 'Выберите дату'
  else if (input.date < today) errors.date = 'Эта дата в прошлом — выберите сегодня или позже'
  if (!input.place.trim()) errors.place = 'Укажите место сбора'
  if (!input.title.trim()) errors.title = 'Укажите название заявки'
  return errors
}
