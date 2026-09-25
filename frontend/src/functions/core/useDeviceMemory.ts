import { useCallback, useEffect, useState } from 'react'
import type { StorageService } from '../../platform/index.ts'
import { forgetMemory, readMemory, writeMemory, type MemorySlot } from './deviceMemory.ts'
import { useDeps } from './useDeps.ts'

/** Подписчики слотов: все компоненты, читающие один слот, видят его изменение. */
const listeners = new WeakMap<StorageService, Map<string, Set<() => void>>>()

function subscribe(storage: StorageService, key: string, listener: () => void) {
  const byKey = listeners.get(storage) ?? new Map<string, Set<() => void>>()
  listeners.set(storage, byKey)
  const set = byKey.get(key) ?? new Set()
  byKey.set(key, set)
  set.add(listener)
  return () => void set.delete(listener)
}

function notify(storage: StorageService, key: string) {
  for (const listener of listeners.get(storage)?.get(key) ?? []) listener()
}

/**
 * Значение слота памяти на устройстве и его запись — как `useState`, но переживает перезагрузку.
 * Слот должен быть стабильным: из `memory` (слоты с id кэшируются) или вынесенный в модуль.
 */
export function useDeviceMemory<T>(slot: MemorySlot<T>): [T, (next: T | ((prev: T) => T)) => void] {
  const { storage } = useDeps().platform
  const [state, setState] = useState(() => ({ slot, value: readMemory(storage, slot) }))
  // Слот сменился (другой маршрут) — значение нового слота, пока он не изменится сам.
  const value = state.slot === slot ? state.value : readMemory(storage, slot)

  useEffect(
    () => subscribe(storage, slot.key, () => setState({ slot, value: readMemory(storage, slot) })),
    [storage, slot],
  )

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = readMemory(storage, slot)
      const updated = typeof next === 'function' ? (next as (prev: T) => T)(current) : next
      // undefined — «забыть»: в хранилище не остаётся строки 'undefined'
      if (updated === undefined) forgetMemory(storage, slot)
      else writeMemory(storage, slot, updated)
      notify(storage, slot.key)
    },
    [storage, slot],
  )
  return [value, set]
}
