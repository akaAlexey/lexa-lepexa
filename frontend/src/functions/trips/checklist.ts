import type { Trip } from '../../contract/schemas.ts'
import {
  checklistProgress,
  toggleChecklistItem,
  type ChecklistProgress,
} from '../../domain/checklist.ts'
import type { Deps } from '../core/deps.ts'
import { memory, readMemory, updateMemory } from '../core/deviceMemory.ts'

export type { ChecklistProgress } from '../../domain/checklist.ts'

/** Отмеченные пункты чек-листа выезда на этом устройстве (испорченные данные — пустой список). */
export function savedChecklist({ platform }: Pick<Deps, 'platform'>, tripId: string): string[] {
  return readMemory(platform.storage, memory.checklist(tripId))
}

/** Отметить или снять пункт и запомнить на устройстве; возвращает новый список отмеченных. */
export function toggleChecklist(
  { platform }: Pick<Deps, 'platform'>,
  tripId: string,
  itemId: string,
): string[] {
  return updateMemory(platform.storage, memory.checklist(tripId), (checked) =>
    toggleChecklistItem(checked, itemId),
  )
}

/** «Готово N из M» по пунктам выезда. */
export function checklistOf(trip: Trip, checked: readonly string[]): ChecklistProgress {
  return checklistProgress(trip.checklist, checked)
}
