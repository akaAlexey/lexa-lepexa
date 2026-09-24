import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { buildFeed, type FeedItem } from '../../domain/events.ts'
import { memory } from '../core/deviceMemory.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { weekNews } from './weekNews.ts'

export type FeedState =
  | { status: 'pending' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; items: FeedItem[] }

/**
 * Лента «Мероприятия»: заявки, выезды, сборы и отряды одним списком.
 * Заявки и выезды обязательны; без сборов и отрядов лента всё равно показывается.
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
  if (!items || extrasPending) return { status: 'pending' }
  return { status: 'ready', items }
}

export function useWeekNews() {
  const { now } = useDeps()
  const [news] = useState(() => weekNews(now()))
  return news
}

/** «Записаться» в заявку отряда: отметка на устройстве и счётчик на сервере. */
export function useJoinRequest() {
  const { api } = useDeps()
  const queryClient = useQueryClient()
  const [joined, setJoined] = useDeviceMemory(memory.joinedRequests)
  const [joining, setJoining] = useState<string>()
  const [failed, setFailed] = useState(false)
  const join = useCallback(
    async (id: string) => {
      setJoining(id)
      setFailed(false)
      try {
        await api.joinRequest({ id })
        setJoined((prev) => [...prev.filter((j) => j !== id), id])
        void queryClient.invalidateQueries({ queryKey: qk.requests })
      } catch {
        setFailed(true)
      } finally {
        setJoining(undefined)
      }
    },
    [api, queryClient, setJoined],
  )
  return { joined, joining, failed, join }
}
