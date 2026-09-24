import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { Route, RoutePoint } from '../../contract/schemas.ts'
import { memory } from '../core/deviceMemory.ts'
import type { Loadable } from '../core/query.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { answer, listRoutes, restart, type QuestProgress } from './quest.ts'

/** Маршруты кэшируются под одним ключом: карточки точек открываются и без сети. */
export function useRoutes(): Loadable<Route[]> {
  const deps = useDeps()
  return useQuery({
    queryKey: qk.routes,
    queryFn: () => listRoutes(deps),
    networkMode: 'offlineFirst',
  })
}

/** Прогресс квеста на устройстве: переживает перезагрузку, все экраны видят изменения сразу. */
export function useQuestProgress(routeId: string): {
  progress: QuestProgress
  /** Пройденные точки. */
  done: ReadonlySet<string>
  /** Ответ на задание: верный — точка пройдена. Возвращает, верен ли ответ. */
  answer: (point: RoutePoint, optionIndex: number) => boolean
  /** Начать заново: прогресс сброшен; возвращает адрес первой точки. */
  restart: (route: Route) => string | undefined
} {
  const [progress, setProgress] = useDeviceMemory(memory.quest(routeId))
  const done = useMemo(() => new Set(progress.donePointIds), [progress])
  const choose = useCallback(
    (point: RoutePoint, optionIndex: number) => {
      const { correct } = answer(progress, point, optionIndex)
      if (correct) setProgress((prev) => answer(prev, point, optionIndex).progress)
      return correct
    },
    [progress, setProgress],
  )
  const again = useCallback(
    (route: Route) => {
      const next = restart(route)
      setProgress(next.progress)
      return next.to
    },
    [setProgress],
  )
  return { progress, done, answer: choose, restart: again }
}
