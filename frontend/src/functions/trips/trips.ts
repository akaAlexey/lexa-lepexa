import type { LatLon, Trip } from '../../contract/schemas.ts'
import { todayIso } from '../../domain/dates.ts'
import { distanceKm } from '../../domain/geo.ts'

/** «Ближайший выезд» ищем не дальше этого расстояния от пользователя, км. */
export const NEAR_TRIP_RADIUS_KM = 50
import type { Deps } from '../core/deps.ts'

/** Все выезды «Выходных с поисковиком», по дате. */
export function listTrips({ api }: Pick<Deps, 'api'>): Promise<Trip[]> {
  return api.listTrips()
}

/** Карточка выезда. Нет такого — `ApiError` 404 (`isNotFound` из core/errors). */
export function getTrip({ api }: Pick<Deps, 'api'>, tripId: string): Promise<Trip> {
  return api.getTrip({ id: tripId })
}

/** Записаться на выезд: сервер возвращает выезд с занятым местом. Мест нет — ошибка 409. */
export function registerTrip({ api }: Pick<Deps, 'api'>, tripId: string): Promise<Trip> {
  return api.registerTrip({ id: tripId })
}

export const freeSpots = (t: Trip) => Math.max(0, t.spotsTotal - t.spotsTaken)

/** «Свободно мест: 7 из 12» — как в прототипе. */
export const spotsText = (t: Trip) => `Свободно мест: ${freeSpots(t)} из ${t.spotsTotal}`

/**
 * Ближайший выезд, на который ещё можно записаться (список отсортирован по дате).
 * Все ближайшие заняты — первый из них; прошедшие не предлагаются.
 */
export function nearestTrip(
  list: readonly Trip[],
  now: Date,
  /** Где пользователь; не известно — без ограничения по расстоянию. */
  near?: LatLon | null,
  radiusKm = NEAR_TRIP_RADIUS_KM,
): Trip | undefined {
  const today = todayIso(now)
  const upcoming = list.filter((t) => t.date >= today && (!near || distanceKm(near, t) <= radiusKm))
  return upcoming.find((t) => freeSpots(t) > 0) ?? upcoming[0]
}

/** Обновлённый выезд в списке; остальные не меняются, списка ещё нет — `undefined`. */
export function replaceTrip(list: readonly Trip[] | undefined, updated: Trip): Trip[] | undefined {
  return list?.map((t) => (t.id === updated.id ? updated : t))
}
