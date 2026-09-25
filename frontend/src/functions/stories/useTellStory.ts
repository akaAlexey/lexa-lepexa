import { useQueryClient } from '@tanstack/react-query'
import type { ArchiveStory } from '../../contract/schemas.ts'
import { memory } from '../core/deviceMemory.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { useForm, type FormState } from '../core/useForm.ts'
import { rememberStory } from './stories.ts'
import { storyForm, tellStory, type StoryValues } from './tell.ts'

/**
 * Форма «Рассказать историю»: проверка, отправка, «Мои истории» на устройстве и кэш.
 * После отправки вызывает `onSent` — переход делает экран.
 */
export function useTellStory(onSent: (story: ArchiveStory) => void): FormState<StoryValues> {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [, setMine] = useDeviceMemory(memory.myStories)
  return useForm(storyForm, undefined, async (request) => {
    const created = await tellStory(deps, request)
    setMine((prev) => rememberStory(prev, created.id))
    queryClient.setQueryData<ArchiveStory[]>(qk.stories, (old) => [created, ...(old ?? [])])
    queryClient.setQueryData(qk.story(created.id), created)
    onSent(created)
  })
}
