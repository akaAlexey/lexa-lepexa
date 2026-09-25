import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { collectPlaces } from '../../domain/mapHub.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useWhereAmI } from '../whereAmI/useWhereAmI.ts'

/**
 * Данные карты-хаба. Каждый слой грузится сам: без захоронений или хроники
 * карта всё равно показывает маршруты и места поиска. Маршруты — offlineFirst, как на «Тропе».
 */
export function useMapHub() {
  const { api } = useDeps()
  // Геопозицию запрашиваем только после явного действия пользователя на карте.
  const whereAmI = useWhereAmI()
  const routes = useQuery({
    queryKey: qk.routes,
    queryFn: api.listRoutes,
    networkMode: 'offlineFirst',
  })
  const sites = useQuery({ queryKey: qk.sites, queryFn: api.listSites })
  const graves = useQuery({ queryKey: qk.graves, queryFn: api.listGraves })
  const battles = useQuery({ queryKey: qk.battles, queryFn: api.listBattles })
  const places = useMemo(
    () =>
      collectPlaces({
        routes: routes.data,
        sites: sites.data,
        graves: graves.data,
        battles: battles.data,
      }),
    [routes.data, sites.data, graves.data, battles.data],
  )
  const pending = routes.isPending || sites.isPending
  const failed = routes.isError && sites.isError
  return {
    pending,
    failed,
    retry: () => {
      void routes.refetch()
      void sites.refetch()
    },
    places,
    routes: routes.data,
    sites: sites.data,
    battles: battles.data,
    position: whereAmI.me ?? null,
    locationFailed: whereAmI.failed,
    requestLocation: whereAmI.locate,
  }
}
