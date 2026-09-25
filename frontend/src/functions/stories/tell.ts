import type { ArchiveStory, NewArchiveStory } from '../../contract/schemas.ts'
import { validateStory } from '../../domain/archive.ts'
import type { Deps } from '../core/deps.ts'
import type { FormSpec } from '../core/form.ts'

/** Поля формы «Рассказать историю» — как их вводит человек. */
export interface StoryValues {
  title: string
  place: string
  story: string
  sourceText: string
  author: string
}

/** Форма истории: поля в порядке на экране, обрезка пробелов, правила из domain/archive. */
export const storyForm: FormSpec<StoryValues, NewArchiveStory, void> = {
  order: ['title', 'place', 'story', 'sourceText', 'author'],
  initial: () => ({ title: '', place: '', story: '', sourceText: '', author: '' }),
  toRequest: (v) => ({
    title: v.title.trim(),
    place: v.place.trim(),
    story: v.story.trim(),
    sourceText: v.sourceText.trim(),
    author: v.author.trim(),
  }),
  validate: (request) => validateStory(request),
}

/** Рассказать историю: отправить на проверку. Возвращает созданную историю («Ожидает проверки»). */
export function tellStory({ api }: Deps, request: NewArchiveStory): Promise<ArchiveStory> {
  return api.createStory({ body: request })
}

/** Состояние перехода к истории после отправки — показать «Отправлено на проверку». */
export interface StorySentState {
  sent: true
}

export const sentState: StorySentState = { sent: true }

/** Пришли ли на экран истории сразу после отправки. */
export const wasSent = (state: unknown): boolean =>
  (state as Partial<StorySentState> | null)?.sent === true
