import { useCallback } from 'react'
import type { Trip } from '../../contract/schemas.ts'
import { toggleChecklistItem } from '../../domain/checklist.ts'
import { memory } from '../core/deviceMemory.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { checklistOf, type ChecklistProgress } from './checklist.ts'

export interface ChecklistState {
  isChecked(itemId: string): boolean
  toggle(itemId: string): void
  progress: ChecklistProgress
}

/** Чек-лист новичка: отметки живут на устройстве и переживают перезагрузку. */
export function useChecklist(trip: Trip): ChecklistState {
  const [checked, setChecked] = useDeviceMemory(memory.checklist(trip.id))
  const toggle = useCallback(
    (itemId: string) => setChecked((prev) => toggleChecklistItem(prev, itemId)),
    [setChecked],
  )
  return {
    isChecked: (itemId) => checked.includes(itemId),
    toggle,
    progress: checklistOf(trip, checked),
  }
}
