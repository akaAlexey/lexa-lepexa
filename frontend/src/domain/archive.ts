/**
 * Народный архив «Живая память» (P1): любой предлагает событие, краевед или поисковый отряд подтверждает.
 * Доменная логика фиксируется тестами уже сейчас; сущность попадёт в контракт вместе с модулем.
 */
import type { LatLon } from '../contract/schemas.ts'
import { notImplemented } from './notImplemented.ts'

export type ArchiveStatus = 'pending' | 'verified' | 'rejected'

export interface ArchiveNote extends LatLon {
  id: string
  title: string
  status: ArchiveStatus
  verifiedBy?: string
}

export type ArchiveActor = 'family' | 'volunteer' | 'commander' | 'verifier'

/** Подтверждать могут краевед/учитель/музей и поисковый отряд (командир). */
export function canVerify(actor: ArchiveActor): boolean {
  return notImplemented(`canVerify(${actor})`)
}

/** Решение по заметке. Бросает ошибку, если прав нет или заметка уже рассмотрена. */
export function reviewNote(
  note: ArchiveNote,
  actor: ArchiveActor,
  decision: 'verified' | 'rejected',
  reviewer: string,
): ArchiveNote {
  return notImplemented(`reviewNote(${note.id}, ${actor}, ${decision}, ${reviewer})`)
}

/** Значок «Подтверждено» показывается только у проверенных заметок. */
export function hasConfirmedBadge(note: ArchiveNote): boolean {
  return notImplemented(`hasConfirmedBadge(${note.id})`)
}

/** «Помоги проверить»: непроверенные заметки рядом с точкой маршрута (по умолчанию 500 м), ближние первыми. */
export function notesToCheckNear(
  point: LatLon,
  notes: readonly ArchiveNote[],
  radiusKm = 0.5,
): ArchiveNote[] {
  return notImplemented(`notesToCheckNear(${point.lat}, ${notes.length}, ${radiusKm})`)
}
