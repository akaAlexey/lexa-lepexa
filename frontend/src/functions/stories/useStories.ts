import { useQuery } from '@tanstack/react-query'
import type { ArchiveStory } from '../../contract/schemas.ts'
import { memory } from '../core/deviceMemory.ts'
import { isNotFound } from '../core/errors.ts'
import type { Loadable } from '../core/query.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { getStory, listStories } from './stories.ts'

/** Все истории — для `QueryState`. */
export function useStories(): Loadable<ArchiveStory[]> {
  const deps = useDeps()
  return useQuery({ queryKey: qk.stories, queryFn: () => listStories(deps) })
}

/** История по id. На 404 не повторяет запрос: экран покажет «История не найдена». */
export function useStory(id: string): Loadable<ArchiveStory> {
  const deps = useDeps()
  return useQuery({
    queryKey: qk.story(id),
    queryFn: () => getStory(deps, id),
    retry: (count, e) => !isNotFound(e) && count < 1,
  })
}

/** Id историй, отправленных с этого устройства: без регистрации автор видит свои истории. */
export function useMyStories(): readonly string[] {
  const [ids] = useDeviceMemory(memory.myStories)
  return ids
}
