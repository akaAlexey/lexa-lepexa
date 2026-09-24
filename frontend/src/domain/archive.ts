/**
 * Народный архив «Живая память» (P1): любой предлагает событие, краевед или поисковый отряд подтверждает.
 * Истории людей (экраны «Истории») проходят ту же проверку, что и заметки у маршрута.
 */
import type { LatLon } from '../contract/schemas.ts'
import { distanceKm } from './geo.ts'

/** pending — ждёт проверки, clarify — проверяющий попросил уточнить, verified — подтверждено. */
export type ArchiveStatus = 'pending' | 'clarify' | 'verified' | 'rejected'

export const ARCHIVE_STATUS_LABEL: Record<ArchiveStatus, string> = {
  pending: 'Ожидает проверки',
  clarify: 'Нужно уточнение',
  verified: 'Подтверждено',
  rejected: 'Отклонено',
}

/** Всё, что можно проверить: заметка у маршрута или история человека. */
export interface Reviewable {
  status: ArchiveStatus
  verifiedBy?: string
}

export interface ArchiveNote extends LatLon, Reviewable {
  id: string
  title: string
}

export type ArchiveActor = 'family' | 'volunteer' | 'commander' | 'verifier'

const VERIFIERS: ReadonlySet<ArchiveActor> = new Set(['verifier', 'commander'])

/** Подтверждать могут краевед/учитель/музей и поисковый отряд (командир). */
export function canVerify(actor: ArchiveActor): boolean {
  return VERIFIERS.has(actor)
}

/** Рассмотреть можно новую запись и запись, по которой автор прислал уточнение. */
export function isAwaitingReview(item: Reviewable): boolean {
  return item.status === 'pending' || item.status === 'clarify'
}

/** Решение по записи. Бросает ошибку, если прав нет или запись уже рассмотрена. Исходную не меняет. */
export function reviewNote<T extends Reviewable>(
  note: T,
  actor: ArchiveActor,
  decision: 'verified' | 'rejected' | 'clarify',
  reviewer: string,
): T {
  if (!canVerify(actor)) {
    throw new Error('Нет прав на проверку: подтверждают краевед или поисковый отряд')
  }
  if (!isAwaitingReview(note)) throw new Error('Запись уже рассмотрена')
  return { ...note, status: decision, verifiedBy: reviewer }
}

/** Значок «Подтверждено» показывается только у проверенных заметок. */
export function hasConfirmedBadge(note: Reviewable): boolean {
  return note.status === 'verified'
}

/** «Помоги проверить»: непроверенные заметки рядом с точкой маршрута (по умолчанию 500 м), ближние первыми. */
export function notesToCheckNear(
  point: LatLon,
  notes: readonly ArchiveNote[],
  radiusKm = 0.5,
): ArchiveNote[] {
  return notes
    .filter((n) => n.status === 'pending')
    .map((n) => ({ note: n, km: distanceKm(point, n) }))
    .filter(({ km }) => km <= radiusKm)
    .sort((a, b) => a.km - b.km)
    .map(({ note }) => note)
}

/* ---------- Истории людей ---------- */

/** Чек-лист проверяющего: подтвердить можно, только когда отмечены все пункты. */
export const REVIEW_CHECKS = [
  { id: 'datePlace', label: 'Совпадают дата и место' },
  { id: 'source', label: 'Источник можно проверить' },
  { id: 'archive', label: 'Нет противоречий с архивом' },
] as const

export type ReviewCheckId = (typeof REVIEW_CHECKS)[number]['id']

export interface StoryDraft {
  title: string
  place: string
  story: string
  author: string
}

export type StoryErrors = Partial<Record<keyof StoryDraft, string>>

export const STORY_MIN_LENGTH = 30

/** Проверка формы истории: название, место, подпись автора и сам рассказ не короче 30 символов. */
export function validateStory(draft: StoryDraft): StoryErrors {
  const errors: StoryErrors = {}
  if (draft.title.trim().length < 4) errors.title = 'Назовите историю — хотя бы 4 буквы'
  if (draft.place.trim().length < 2) errors.place = 'Укажите населённый пункт или район'
  if (draft.story.trim().length < STORY_MIN_LENGTH)
    errors.story = `Расскажите подробнее — не короче ${STORY_MIN_LENGTH} символов`
  if (draft.author.trim().length < 2) errors.author = 'Как подписать историю?'
  return errors
}

/**
 * Можно ли принять решение. Подтвердить — только с источником и всеми пунктами чек-листа;
 * попросить уточнение — только с комментарием автору. Возвращает текст причины или undefined.
 */
export function reviewBlocker(
  decision: 'verified' | 'clarify',
  { source, checks, note }: { source: string; checks: readonly ReviewCheckId[]; note: string },
): string | undefined {
  if (decision === 'clarify') {
    return note.trim() ? undefined : 'Напишите автору, что нужно уточнить'
  }
  if (!source.trim()) return 'Без источника подтвердить нельзя — попросите автора уточнить'
  if (REVIEW_CHECKS.some((c) => !checks.includes(c.id))) return 'Отметьте все пункты проверки'
  return undefined
}

/**
 * Годы войны, о которых история, — для списка «Книги памяти» (ADR 0012).
 * Из названия и рассказа берутся годы 1939–1945: один год — «1942», несколько — «1941–1943».
 */
export function storyYears(story: { title: string; story: string }): string | undefined {
  const years = [...`${story.title} ${story.story}`.matchAll(/\b(19(?:39|4[0-5]))\b/g)]
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b)
  const first = years[0]
  const last = years[years.length - 1]
  if (first === undefined || last === undefined) return undefined
  return first === last ? String(first) : `${first}–${last}`
}
