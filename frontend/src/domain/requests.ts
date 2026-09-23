import type { NewVolunteerRequest, VolunteerRequest } from '../contract/schemas.ts'
import { notImplemented } from './notImplemented.ts'

/** «10 землекопов», «1 повар и 2 водителя» — для карточки заявки. */
export function describeRoles(roles: VolunteerRequest['roles']): string {
  return notImplemented(`describeRoles(${roles.length})`)
}

export type RequestErrors = Partial<Record<'count' | 'date' | 'place' | 'title', string>>

/** Проверка формы заявки: люди ≥ 1, дата не в прошлом, место и название не пустые. */
export function validateNewRequest(input: NewVolunteerRequest, today: string): RequestErrors {
  return notImplemented(`validateNewRequest(${input.teamId}, ${today})`)
}
