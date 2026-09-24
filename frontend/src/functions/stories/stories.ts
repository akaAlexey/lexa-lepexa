import type { ArchiveStory } from '../../contract/schemas.ts'
import { ARCHIVE_STATUS_LABEL, isAwaitingReview } from '../../domain/archive.ts'
import type { Deps } from '../core/deps.ts'

/** Все истории: проверенные, ожидающие и отправленные с устройства (новые первыми). */
export function listStories({ api }: Deps): Promise<ArchiveStory[]> {
  return api.listStories()
}

/** История по id. Нет такой — ошибка 404 (`isNotFound` из core/errors). */
export function getStory({ api }: Deps, id: string): Promise<ArchiveStory> {
  return api.getStory({ id })
}

/** Очередь проверки: новые истории и истории, по которым автор прислал уточнение. */
export const awaitingReview = (stories: readonly ArchiveStory[]): ArchiveStory[] =>
  stories.filter(isAwaitingReview)

/** Проверенные истории — их видят все. */
export const publishedStories = (stories: readonly ArchiveStory[]): ArchiveStory[] =>
  stories.filter((x) => x.status === 'verified')

/** «Мои истории»: истории списка, отправленные с этого устройства. */
export const myStoriesIn = (
  stories: readonly ArchiveStory[],
  mine: readonly string[],
): ArchiveStory[] => stories.filter((x) => mine.includes(x.id))

/** Запомнить id отправленной истории: без повторов, новая — в конце. */
export const rememberStory = (mine: readonly string[], id: string): string[] => [
  ...mine.filter((x) => x !== id),
  id,
]

/** Тон плашки статуса: ждёт, нужно действие, готово. */
export type StoryTone = 'wait' | 'action' | 'done'

const TONE: Record<ArchiveStory['status'], StoryTone> = {
  pending: 'wait',
  clarify: 'action',
  verified: 'done',
  rejected: 'action',
}

/** Подпись и тон статуса истории — для плашки «Ожидает проверки», «Подтверждено» и т. п. */
export const storyState = (story: Pick<ArchiveStory, 'status'>) => ({
  label: ARCHIVE_STATUS_LABEL[story.status],
  tone: TONE[story.status],
})
