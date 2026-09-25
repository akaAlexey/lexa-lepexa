import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { helpRaise } from './places.ts'

/** «Я готов помочь в подъёме»: отклик, обновление карточки и списка мест. */
export function useHelpRaise(siteId: string): {
  done: boolean
  busy: boolean
  failed: boolean
  help: () => Promise<void>
} {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const help = async () => {
    setBusy(true)
    setFailed(false)
    try {
      const updated = await helpRaise(deps, siteId)
      queryClient.setQueryData(qk.site(siteId), updated)
      void queryClient.invalidateQueries({ queryKey: qk.sites, exact: true })
      setDone(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return { done, busy, failed, help }
}
