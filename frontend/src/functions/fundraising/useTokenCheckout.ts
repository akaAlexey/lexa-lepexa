import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import type { Fundraiser } from '../../contract/schemas.ts'
import { payWithTokens, WALLET_TOP_UP } from '../../domain/tokens.ts'
import { memory } from '../core/deviceMemory.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { donate } from './fundraising.ts'

export interface Receipt {
  paymentId: string
  amount: number
  paidAt: string
  fundraiser: Fundraiser
}

export type CheckoutResult =
  { ok: true; receipt: Receipt } | { ok: false; reason: 'amount' | 'balance' | 'server' }

/**
 * Касса учебной оплаты: токены списываются с кошелька, сумма уходит в сбор на сервере (/donations) —
 * сбор растёт у всех посетителей. Если сервер не ответил, токены не списываются.
 */
export function useTokenCheckout(fundraiserId: string) {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const fundraisers = useQuery({ queryKey: qk.fundraisers, queryFn: deps.api.listFundraisers })
  const fundraiser = fundraisers.data?.find((f) => f.id === fundraiserId)
  const [balance, setBalance] = useDeviceMemory(memory.wallet)
  const [busy, setBusy] = useState(false)

  const pay = useCallback(
    async (amount: number): Promise<CheckoutResult> => {
      const check = payWithTokens(balance, amount)
      if (!check.ok) return check
      setBusy(true)
      try {
        const done = await donate(deps, fundraiserId, amount)
        setBalance((prev) => Math.max(0, prev - amount))
        void queryClient.invalidateQueries({ queryKey: qk.fundraisers })
        return {
          ok: true,
          receipt: {
            paymentId: done.paymentId,
            amount,
            paidAt: deps.now().toISOString(),
            fundraiser: done.fundraiser,
          },
        }
      } catch {
        return { ok: false, reason: 'server' }
      } finally {
        setBusy(false)
      }
    },
    [balance, deps, fundraiserId, queryClient, setBalance],
  )

  const topUp = useCallback(() => setBalance((prev) => prev + WALLET_TOP_UP), [setBalance])

  return { fundraiser, loading: fundraisers.isPending, balance, busy, pay, topUp }
}
