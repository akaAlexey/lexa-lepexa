import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useServices } from '../../app/services.tsx'
import type { GroupApplication } from '../../contract/schemas.ts'
import { GROUP_STATUS_LABEL } from '../../domain/groupApplications.ts'
import type { StateTone } from '../../ui/StatePill.tsx'

export const groupsKey = ['group-applications'] as const

/** Id заявок, поданных с этого устройства: без регистрации руководитель группы видит их статус. */
export const MY_GROUPS_KEY = 'groups:mine'

export const groupUrl = (tripId: string) => `/weekends/${tripId}/group`

const TONE: Record<GroupApplication['status'], StateTone> = {
  pending: 'wait',
  clarify: 'action',
  confirmed: 'done',
}

export const groupState = (a: GroupApplication) => ({
  label: GROUP_STATUS_LABEL[a.status],
  tone: TONE[a.status],
})

export function useGroupApplications() {
  const { api } = useServices()
  return useQuery({ queryKey: groupsKey, queryFn: api.listGroupApplications })
}

export function useMyGroups() {
  const { platform } = useServices()
  const [ids, setIds] = useState<string[]>(
    () => platform.storage.get<string[]>(MY_GROUPS_KEY) ?? [],
  )
  const add = (id: string) => {
    const next = [...ids.filter((x) => x !== id), id]
    platform.storage.set(MY_GROUPS_KEY, next)
    setIds(next)
  }
  return { ids, add }
}
