import { useQuery } from '@tanstack/react-query'
import type { Grave, LastBattleSite } from '../../contract/schemas.ts'
import { isNotFound } from '../core/errors.ts'
import type { Loadable } from '../core/query.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { getPlace, listGraves, listPlaces } from './places.ts'

/** Все места гибели для карты и списка. */
export function usePlaces(): Loadable<LastBattleSite[]> {
  const deps = useDeps()
  return useQuery({ queryKey: qk.sites, queryFn: () => listPlaces(deps) })
}

/** Воинские захоронения — фоновый слой карты. */
export function useGraves(): Loadable<Grave[]> {
  const deps = useDeps()
  return useQuery({ queryKey: qk.graves, queryFn: () => listGraves(deps) })
}

/** Карточка места. `notFound` — места нет (404): экран показывает «не найдено», а не ошибку связи. */
export function usePlace(id: string): { place: Loadable<LastBattleSite>; notFound: boolean } {
  const deps = useDeps()
  const place = useQuery({
    queryKey: qk.site(id),
    queryFn: () => getPlace(deps, id),
    retry: (count, error) => !isNotFound(error) && count < 1,
  })
  return { place, notFound: place.isError && isNotFound(place.error) }
}
