import { useQuery } from '@tanstack/react-query'
import type { Trip } from '../../contract/schemas.ts'
import { isNotFound } from '../core/errors.ts'
import type { Loadable } from '../core/query.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { getTrip, listTrips } from './trips.ts'

/** Список выездов для `QueryState`. */
export function useTrips(): Loadable<Trip[]> {
  const deps = useDeps()
  return useQuery({ queryKey: qk.trips, queryFn: () => listTrips(deps) })
}

/**
 * Карточка выезда для `QueryState`. `notFoundIsFinal` — «не найдено» не повторять:
 * экран сразу скажет «нет такого выезда».
 */
export function useTrip(tripId: string, { notFoundIsFinal = false } = {}): Loadable<Trip> {
  const deps = useDeps()
  return useQuery({
    queryKey: qk.trip(tripId),
    queryFn: () => getTrip(deps, tripId),
    ...(notFoundIsFinal && {
      retry: (count: number, e: Error) => !isNotFound(e) && count < 1,
    }),
  })
}
