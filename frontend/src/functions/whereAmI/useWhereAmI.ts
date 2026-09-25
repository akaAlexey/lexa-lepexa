import { useCallback, useEffect, useState } from 'react'
import type { LatLon } from '../../contract/schemas.ts'
import { useDeps } from '../core/useDeps.ts'
import { locate, locateOrNull } from './whereAmI.ts'

/** «Где я?» по нажатию: позиция, ошибка доступа и само действие. */
export function useWhereAmI(): { me: LatLon | undefined; failed: boolean; locate: () => void } {
  const deps = useDeps()
  const [me, setMe] = useState<LatLon>()
  const [failed, setFailed] = useState(false)
  const run = useCallback(() => {
    setFailed(false)
    locate(deps).then(setMe, () => setFailed(true))
  }, [deps])
  return { me, failed, locate: run }
}

/**
 * Позиция при открытии экрана: `undefined` — ещё определяем, `null` — узнать не удалось.
 * Экран уже закрыт — ответ игнорируется.
 */
export function useCurrentPosition(): LatLon | null | undefined {
  const deps = useDeps()
  const [position, setPosition] = useState<LatLon | null | undefined>(undefined)
  useEffect(() => {
    let active = true
    void locateOrNull(deps).then((p) => active && setPosition(p))
    return () => {
      active = false
    }
  }, [deps])
  return position
}
