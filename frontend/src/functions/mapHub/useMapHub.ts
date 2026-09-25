import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { collectPlaces } from '../../domain/mapHub.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useCurrentPosition } from '../whereAmI/useWhereAmI.ts'

/**
 * Данные карты-хаба. Каждый слой грузится сам: без захоронений, памятников или хроники
 * карта всё равно показывает маршруты и места поиска. Маршруты — offlineFirst, как на «Тропе».
 */
export function useMapHub() {
  const { api } = useDeps()
  // При открытии карты браузер сам запрашивает доступ к геопозиции.
  const position = useCurrentPosition()
  const routes = useQuery({
    queryKey: qk.routes,
    queryFn: api.listRoutes,
    networkMode: 'offlineFirst',
  })
  const sites = useQuery({ queryKey: qk.sites, queryFn: api.listSites })
  const graves = useQuery({ queryKey: qk.graves, queryFn: api.listGraves })
  const battles = useQuery({ queryKey: qk.battles, queryFn: api.listBattles })
  const memorials = useQuery({ queryKey: qk.memorials, queryFn: api.listMemorials })
  const places = useMemo(
    () =>
      collectPlaces({
        routes: routes.data,
        sites: sites.data,
        graves: graves.data,
        battles: battles.data,
        memorials: memorials.data,
      }),
    [routes.data, sites.data, graves.data, battles.data, memorials.data],
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
    position: position ?? null,
  }
}
