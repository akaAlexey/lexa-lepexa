import type { Trip } from '../contract/schemas.ts'
import { notImplemented } from './notImplemented.ts'

type ChecklistItem = Trip['checklist'][number]

/** Отметить или снять пункт чек-листа. Возвращает новый список отмеченных id. */
export function toggleChecklistItem(checked: readonly string[], id: string): string[] {
  return notImplemented(`toggleChecklistItem(${checked.length}, ${id})`)
}

export interface ChecklistProgress {
  done: number
  total: number
  /** Все пункты отмечены — новичок готов к выезду. */
  ready: boolean
}

/** Неизвестные id (пункт убрали из чек-листа) не учитываются. */
export function checklistProgress(
  items: readonly ChecklistItem[],
  checked: readonly string[],
): ChecklistProgress {
  return notImplemented(`checklistProgress(${items.length}, ${checked.length})`)
}
