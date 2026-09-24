import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { SiteStatus } from '../../contract/schemas.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { changeStatus, statusChangeProblem, type StatusChangeInput } from './changeStatus.ts'

/** Смена статуса места: проверка ссылки на документ, запрос, обновление карточки и списка. */
export function useChangeStatus(
  siteId: string,
  onDone: (status: SiteStatus) => void,
): {
  problem: string | undefined
  busy: boolean
  failed: boolean
  submit: (input: StatusChangeInput) => Promise<void>
} {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [problem, setProblem] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const submit = async (input: StatusChangeInput) => {
    const found = statusChangeProblem(input)
    setProblem(found)
    if (found) return
    setBusy(true)
    setFailed(false)
    try {
      const updated = await changeStatus(deps, siteId, input)
      queryClient.setQueryData(qk.site(siteId), updated)
      void queryClient.invalidateQueries({ queryKey: qk.sites, exact: true })
      onDone(updated.status)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return { problem, busy, failed, submit }
}
