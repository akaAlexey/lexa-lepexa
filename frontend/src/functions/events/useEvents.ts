import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { Trip, VolunteerRequest } from '../../contract/schemas.ts'
import { buildFeed, type FeedItem } from '../../domain/events.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { weekNews } from './weekNews.ts'

export type FeedState =
  | { status: 'pending' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; items: FeedItem[]; requests: VolunteerRequest[]; trips: Trip[] }

/**
 * Лента «Мероприятия»: заявки, выезды, сборы и отряды одним списком (ADR 0012).
 * Заявки и выезды обязательны; без сборов и отрядов лента всё равно показывается.
 * Запись в заявку — только из карточки: пользователь сам выбирает, куда идти.
 */
export function useEventsFeed(): FeedState {
  const { api } = useDeps()
  const requests = useQuery({ queryKey: qk.requests, queryFn: api.listRequests })
  const trips = useQuery({ queryKey: qk.trips, queryFn: api.listTrips })
  const fundraisers = useQuery({ queryKey: qk.fundraisers, queryFn: api.listFundraisers })
  const teams = useQuery({ queryKey: qk.teams, queryFn: api.listTeams })
  const items = useMemo(
    () =>
      requests.data && trips.data
        ? buildFeed({
            requests: requests.data,
            trips: trips.data,
            fundraisers: fundraisers.data ?? [],
            teams: teams.data ?? [],
          })
        : undefined,
    [requests.data, trips.data, fundraisers.data, teams.data],
  )
  if (requests.isError || trips.isError) {
    return {
      status: 'error',
      retry: () => {
        void requests.refetch()
        void trips.refetch()
      },
    }
  }
  // Сборы и отряды дополняют карточки: ждём их, но не дольше их собственной ошибки
  const extrasPending = fundraisers.isPending || teams.isPending
  if (!items || !requests.data || !trips.data || extrasPending) return { status: 'pending' }
  return { status: 'ready', items, requests: requests.data, trips: trips.data }
}

export function useWeekNews() {
  const { now } = useDeps()
  const [news] = useState(() => weekNews(now()))
  return news
}
