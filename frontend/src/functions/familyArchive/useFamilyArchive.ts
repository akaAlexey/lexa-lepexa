import { useCallback } from 'react'
import {
  makeFighter,
  makeRecord,
  type Errors,
  type FighterValues,
  type RecordValues,
} from '../../domain/familyArchive.ts'
import { memory } from '../core/deviceMemory.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'

export type ArchiveResult = { ok: true; id: string } | { ok: false; errors: Errors }

/** `F-…` и `R-…`: время плюс случайный хвост — два бойца в одну миллисекунду не совпадут. */
const newId = (prefix: 'F' | 'R', now: Date) =>
  `${prefix}-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/**
 * Семейный архив владельца (A7) на этом устройстве: бойцы и найденные записи.
 * Правила — в domain/familyArchive, здесь только хранение.
 */
export function useFamilyArchive(owner: string) {
  const { now } = useDeps()
  const [fighters, setFighters] = useDeviceMemory(memory.family(owner))

  const save = useCallback(
    (values: FighterValues, id?: string): ArchiveResult => {
      const previous = id ? fighters.find((f) => f.id === id) : undefined
      if (id && !previous) return { ok: false, errors: { lastName: 'Боец не найден в архиве' } }
      const at = now()
      const made = makeFighter(values, {
        id: newId('F', at),
        createdAt: at.toISOString(),
        previous,
      })
      if (!made.ok) return made
      const fighter = made.value
      setFighters((prev) =>
        previous ? prev.map((f) => (f.id === fighter.id ? fighter : f)) : [...prev, fighter],
      )
      return { ok: true, id: fighter.id }
    },
    [fighters, now, setFighters],
  )

  const remove = useCallback(
    (id: string) => setFighters((prev) => prev.filter((f) => f.id !== id)),
    [setFighters],
  )

  const addRecord = useCallback(
    (fighterId: string, values: RecordValues): ArchiveResult => {
      const fighter = fighters.find((f) => f.id === fighterId)
      if (!fighter) return { ok: false, errors: { url: 'Боец не найден в архиве' } }
      const made = makeRecord(values, { id: newId('R', now()), existing: fighter.records })
      if (!made.ok) return made
      const record = made.value
      setFighters((prev) =>
        prev.map((f) => (f.id === fighterId ? { ...f, records: [...f.records, record] } : f)),
      )
      return { ok: true, id: record.id }
    },
    [fighters, now, setFighters],
  )

  const removeRecord = useCallback(
    (fighterId: string, recordId: string) =>
      setFighters((prev) =>
        prev.map((f) =>
          f.id === fighterId ? { ...f, records: f.records.filter((r) => r.id !== recordId) } : f,
        ),
      ),
    [setFighters],
  )

  return { fighters, save, remove, addRecord, removeRecord }
}
