import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { VolunteerRequest } from '../../contract/schemas.ts'
import { memory } from '../core/deviceMemory.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { joinRequest, nextToJoin } from './helpRequests.ts'

/**
 * «Стать частью команды»: записи на этом устройстве, ближайшая открытая заявка и запись в неё.
 * `requests` — загруженная лента (пока не загружена — цели нет).
 */
export function useJoinRequest(requests: readonly VolunteerRequest[] | undefined): {
  joined: readonly string[]
  /** Заявка, в которую идёт запись. */
  joining: string | undefined
  failed: boolean
  /** Ближайшая открытая заявка — цель главной кнопки. */
  next: VolunteerRequest | undefined
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

  const next = requests && nextToJoin(deps, requests, joined)
  return { joined, joining, failed, next, join }
}
