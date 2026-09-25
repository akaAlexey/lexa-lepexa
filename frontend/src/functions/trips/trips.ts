import type { SignupRequest, Trip } from '../../contract/schemas.ts'
import { todayIso } from '../../domain/dates.ts'
import type { Deps } from '../core/deps.ts'

/** Все выезды «Выходных с поисковиком», по дате. */
export function listTrips({ api }: Pick<Deps, 'api'>): Promise<Trip[]> {
  return api.listTrips()
}

/** Карточка выезда. Нет такого — `ApiError` 404 (`isNotFound` из core/errors). */
export function getTrip({ api }: Pick<Deps, 'api'>, tripId: string): Promise<Trip> {
  return api.getTrip({ id: tripId })
}

/**
 * Записаться на выезд после окна с условиями: сервер возвращает выезд с занятым местом.
 * Мест нет или возраст младше минимального — 409; без согласия родителя до 18+ — 422.
 */
export function registerTrip(
  { api }: Pick<Deps, 'api'>,
  tripId: string,
  body: SignupRequest,
): Promise<Trip> {
  return api.registerTrip({ id: tripId, body })
}

export const freeSpots = (t: Trip) => Math.max(0, t.spotsTotal - t.spotsTaken)

/** «Свободно мест: 7 из 12» — как в прототипе. */
export const spotsText = (t: Trip) => `Свободно мест: ${freeSpots(t)} из ${t.spotsTotal}`

/**
 * Ближайший выезд, на который ещё можно записаться (список отсортирован по дате).
 * Все ближайшие заняты — первый из них; прошедшие не предлагаются.
 */
export function nearestTrip(list: readonly Trip[], now: Date): Trip | undefined {
  const today = todayIso(now)
  const upcoming = list.filter((t) => t.date >= today)
  return upcoming.find((t) => freeSpots(t) > 0) ?? upcoming[0]
}

/** Обновлённый выезд в списке; остальные не меняются, списка ещё нет — `undefined`. */
export function replaceTrip(list: readonly Trip[] | undefined, updated: Trip): Trip[] | undefined {
  return list?.map((t) => (t.id === updated.id ? updated : t))
}
