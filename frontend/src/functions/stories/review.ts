import type { ArchiveStory } from '../../contract/schemas.ts'
import { reviewBlocker, type ReviewCheckId } from '../../domain/archive.ts'
import type { Deps } from '../core/deps.ts'

export type ReviewDecision = 'verified' | 'clarify'

export interface ReviewInput {
  story: Pick<ArchiveStory, 'id' | 'sourceText'>
  decision: ReviewDecision
  /** Отмеченные пункты чек-листа. */
  checks: readonly ReviewCheckId[]
  /** Комментарий автору. */
  note: string
  /** Кто проверяет — подпись роли. */
  reviewer: string
}

export type ReviewResult = { ok: true; story: ArchiveStory } | { ok: false; reason: string }

export const REVIEW_FAILED = 'Не удалось сохранить решение. Проверьте связь и попробуйте ещё раз.'

/** Отметить пункт чек-листа или снять отметку. */
export const toggleCheck = (
  checks: readonly ReviewCheckId[],
  id: ReviewCheckId,
): ReviewCheckId[] => (checks.includes(id) ? checks.filter((x) => x !== id) : [...checks, id])

/**
 * Можно ли принять решение — правила из domain/archive: подтвердить — с источником и всем
 * чек-листом, уточнение — с комментарием. Возвращает причину отказа или undefined.
 */
export const reviewProblem = ({
  story,
  decision,
  checks,
  note,
}: Omit<ReviewInput, 'reviewer'>): string | undefined =>
  reviewBlocker(decision, { source: story.sourceText, checks, note })

/** Решение краеведа: проверка правил, затем запрос. Причина отказа или сбой связи — текст для человека. */
export async function reviewStory({ api }: Deps, input: ReviewInput): Promise<ReviewResult> {
  const blocker = reviewProblem(input)
  if (blocker) return { ok: false, reason: blocker }
  const { story, decision, note, reviewer } = input
  try {
    const updated = await api.reviewStory({
      id: story.id,
      body: { decision, reviewer, note: note.trim() },
    })
    return { ok: true, story: updated }
  } catch {
    return { ok: false, reason: REVIEW_FAILED }
  }
}
