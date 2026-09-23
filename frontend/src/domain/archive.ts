/**
 * Народный архив «Живая память» (P1): любой предлагает событие, краевед или поисковый отряд подтверждает.
 * Доменная логика фиксируется тестами уже сейчас; сущность попадёт в контракт вместе с модулем.
 */
import type { LatLon } from '../contract/schemas.ts'
import { distanceKm } from './geo.ts'

export type ArchiveStatus = 'pending' | 'verified' | 'rejected'

export interface ArchiveNote extends LatLon {
  id: string
  title: string
  status: ArchiveStatus
  verifiedBy?: string
}

export type ArchiveActor = 'family' | 'volunteer' | 'commander' | 'verifier'

const VERIFIERS: ReadonlySet<ArchiveActor> = new Set(['verifier', 'commander'])

/** Подтверждать могут краевед/учитель/музей и поисковый отряд (командир). */
export function canVerify(actor: ArchiveActor): boolean {
  return VERIFIERS.has(actor)
}

/** Решение по заметке. Бросает ошибку, если прав нет или заметка уже рассмотрена. Исходную не меняет. */
export function reviewNote(
  note: ArchiveNote,
  actor: ArchiveActor,
  decision: 'verified' | 'rejected',
  reviewer: string,
): ArchiveNote {
  if (!canVerify(actor)) {
    throw new Error('Нет прав на проверку: подтверждают краевед или поисковый отряд')
  }
  if (note.status !== 'pending') throw new Error('Заметка уже рассмотрена')
  return { ...note, status: decision, verifiedBy: reviewer }
}

/** Значок «Подтверждено» показывается только у проверенных заметок. */
export function hasConfirmedBadge(note: ArchiveNote): boolean {
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
