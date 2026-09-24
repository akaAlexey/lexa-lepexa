import type { Trip } from '../contract/schemas.ts'

type ChecklistItem = Trip['checklist'][number]

/**
 * Отметить или снять пункт чек-листа. Возвращает новый список отмеченных id:
 * исходный не меняется, порядок отметок сохраняется, новый пункт — в конец.
 */
export function toggleChecklistItem(checked: readonly string[], id: string): string[] {
  return checked.includes(id) ? checked.filter((c) => c !== id) : [...checked, id]
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
  const marked = new Set(checked)
  const done = items.filter((i) => marked.has(i.id)).length
  const total = items.length
  return { done, total, ready: total > 0 && done === total }
}
