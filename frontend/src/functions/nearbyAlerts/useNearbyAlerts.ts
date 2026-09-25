import { useCallback, useEffect, useState } from 'react'
import type { AppNotification } from '../../contract/schemas.ts'
import { useDeps } from '../core/useDeps.ts'
import { listenNearby, restoreSubscription } from './nearbyAlerts.ts'

/** Сколько последних уведомлений держим: на экране одно, остальные — счётчиком. */
const KEEP = 10

/** Уведомления о находках рядом для оболочки: свежие первыми, восстановление подписки при старте. */
export function useNearbyAlerts(): { items: AppNotification[]; dismiss: (id: string) => void } {
  const { api, platform, own } = useDeps()
  const [items, setItems] = useState<AppNotification[]>([])

  useEffect(
    () =>
      listenNearby({ api, platform, own }, (n) => setItems((prev) => [n, ...prev].slice(0, KEEP))),
    [api, platform, own],
  )

  useEffect(() => {
    void restoreSubscription({ api, platform })
  }, [api, platform])

  const dismiss = useCallback(
    (id: string) => setItems((prev) => prev.filter((i) => i.id !== id)),
    [],
  )
  return { items, dismiss }
}
