import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { memory } from '../core/deviceMemory.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { joinRequest } from './helpRequests.ts'

/**
 * Запись в заявку отряда из её карточки: записи на этом устройстве и сама запись.
 * Кнопки «записаться на ближайшую» нет — человек выбирает заявку сам (решение команды 25.09).
 */
export function useJoinRequest(): {
  joined: readonly string[]
  /** Заявка, в которую идёт запись. */
  joining: string | undefined
  failed: boolean
  join: (id: string) => Promise<void>
} {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [joined, setJoined] = useDeviceMemory(memory.joinedRequests)
  const [joining, setJoining] = useState<string>()
  const [failed, setFailed] = useState(false)

  const join = async (id: string) => {
    setJoining(id)
    setFailed(false)
    try {
      // запись через слот — все читатели видят её сразу
      setJoined(await joinRequest(deps, id))
      void queryClient.invalidateQueries({ queryKey: qk.requests })
    } catch {
      setFailed(true)
    } finally {
      setJoining(undefined)
    }
  }

  return { joined, joining, failed, join }
}
