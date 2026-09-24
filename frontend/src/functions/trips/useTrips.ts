import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Trip } from '../../contract/schemas.ts'
import { isNotFound } from '../core/errors.ts'
import type { Loadable } from '../core/query.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { getTrip, listTrips, registerTrip, replaceTrip } from './trips.ts'

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

/**
 * Запись на выезд. После успеха выезд обновляется в карточке и в списке (свободных мест меньше).
 * Экран смотрит `isSuccess` («Вы записаны»), `isPending`, `isError` и `error.message`.
 */
export function useRegisterTrip(tripId: string) {
  const deps = useDeps()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => registerTrip(deps, tripId),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.trip(tripId), updated)
      queryClient.setQueryData<Trip[]>(qk.trips, (list) => replaceTrip(list, updated))
    },
  })
}
