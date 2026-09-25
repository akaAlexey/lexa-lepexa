import { useState } from 'react'
import { memory } from '../core/deviceMemory.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { subscribeNearby } from './nearbyAlerts.ts'

/** Подписка на находки рядом одним нажатием: подписан ли, идёт ли запрос, не удалось ли. */
export function useNearbySubscription(): {
  subscribed: boolean
  busy: boolean
  failed: boolean
  subscribe: () => Promise<void>
} {
  const deps = useDeps()
  const [saved, setSaved] = useDeviceMemory(memory.subscription)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const subscribe = async () => {
    setBusy(true)
    setFailed(false)
    try {
      // запись через слот — все читатели подписки видят её сразу
      setSaved(await subscribeNearby(deps))
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return { subscribed: saved !== undefined, busy, failed, subscribe }
}
