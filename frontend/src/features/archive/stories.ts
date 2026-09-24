import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useRole } from '../../app/RoleContext.tsx'
import { useServices } from '../../app/services.tsx'
import type { ArchiveStory } from '../../contract/schemas.ts'
import { ARCHIVE_STATUS_LABEL, canVerify } from '../../domain/archive.ts'
import type { StateTone } from '../../ui/StatePill.tsx'

export const qk = {
  stories: ['stories'] as const,
  story: (id: string) => ['stories', id] as const,
}

/** Id историй, отправленных с этого устройства: без регистрации автор видит свои истории и их статус. */
export const MY_STORIES_KEY = 'archive:mine'

export const storyUrl = (id: string) => `/archive/${id}`

const TONE: Record<ArchiveStory['status'], StateTone> = {
  pending: 'wait',
  clarify: 'action',
  verified: 'done',
  rejected: 'action',
}

export const storyState = (story: ArchiveStory) => ({
  label: ARCHIVE_STATUS_LABEL[story.status],
  tone: TONE[story.status],
})

export function useStories() {
  const { api } = useServices()
  return useQuery({ queryKey: qk.stories, queryFn: api.listStories })
}

/** Может ли текущая роль проверять истории (краевед, учитель, музей или командир отряда). */
export function useCanVerify(): boolean {
  const { role } = useRole()
  return role !== undefined && canVerify(role.id)
}

/** Мои истории на устройстве. */
export function useMyStories() {
  const { platform } = useServices()
  const [ids, setIds] = useState<string[]>(
    () => platform.storage.get<string[]>(MY_STORIES_KEY) ?? [],
  )
  const add = (id: string) => {
    const next = [...ids.filter((x) => x !== id), id]
    platform.storage.set(MY_STORIES_KEY, next)
    setIds(next)
  }
  return { ids, add }
}
