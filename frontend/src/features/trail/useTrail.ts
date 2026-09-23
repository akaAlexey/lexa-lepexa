import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useServices } from '../../app/services.tsx'
import { emptyProgress, markPointDone, type QuestProgress } from '../../domain/trail.ts'

/** Маршруты кэшируются под одним ключом: карточки точек открываются и без сети. */
export function useRoutes() {
  const { api } = useServices()
  return useQuery({ queryKey: ['routes'], queryFn: api.listRoutes, networkMode: 'offlineFirst' })
}

export const questKey = (routeId: string) => `quest:${routeId}`

/** Прогресс квеста на устройстве: переживает перезагрузку. */
export function useQuestProgress(routeId: string) {
  const { platform } = useServices()
  const [progress, setProgress] = useState<QuestProgress>(
    () => platform.storage.get<QuestProgress>(questKey(routeId)) ?? emptyProgress(routeId),
  )
  const markDone = (pointId: string) => {
    const next = markPointDone(progress, pointId)
    platform.storage.set(questKey(routeId), next)
    setProgress(next)
  }
  const reset = () => {
    platform.storage.remove(questKey(routeId))
    setProgress(emptyProgress(routeId))
  }
  return { progress, markDone, reset }
}

export const pointUrl = (routeId: string, pointId: string) => `/trail/${routeId}/point/${pointId}`
export const finishUrl = (routeId: string) => `/trail/${routeId}/finish`
