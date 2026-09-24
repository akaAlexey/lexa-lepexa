import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { DEFAULT_DONATION, donate } from './fundraising.ts'

export type DonateStatus = 'idle' | 'sending' | 'done' | 'error'

/** Тестовое пожертвование в сбор: выбранная сумма, ход платежа, обновление сборов после оплаты. */
export function useDonate(fundraiserId: string): {
  amount: number
  setAmount: (amount: number) => void
  status: DonateStatus
  confirm: () => Promise<void>
} {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState<number>(DEFAULT_DONATION)
  const [status, setStatus] = useState<DonateStatus>('idle')

  const confirm = async () => {
    setStatus('sending')
    try {
      await donate(deps, fundraiserId, amount)
      setStatus('done')
      void queryClient.invalidateQueries({ queryKey: qk.fundraisers })
    } catch {
      setStatus('error')
    }
  }
  return { amount, setAmount, status, confirm }
}
