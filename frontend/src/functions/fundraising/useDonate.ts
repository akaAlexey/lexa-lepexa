import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { Fundraiser } from '../../contract/schemas.ts'
import { memory } from '../core/deviceMemory.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import {
  DEFAULT_DONATION,
  PAYMENT_POLL_LIMIT,
  PAYMENT_POLL_MS,
  startPayment,
} from './fundraising.ts'

export type DonateStatus = 'idle' | 'sending' | 'redirect' | 'done' | 'error'

/**
 * Пожертвование в сбор через ЮKassa (тестовый магазин). С сервером — переход на страницу оплаты
 * ЮKassa, после возврата на /payment статус проверяет `usePaymentResult`. Без сервера (mock) — платёж имитируется.
 */
export function useDonate(fundraiserId: string): {
  amount: number
  setAmount: (amount: number) => void
  status: DonateStatus
  confirm: () => Promise<void>
} {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [, setPending] = useDeviceMemory(memory.pendingPayment)
  const [amount, setAmount] = useState<number>(DEFAULT_DONATION)
  const [status, setStatus] = useState<DonateStatus>('idle')

  const confirm = async () => {
    setStatus('sending')
    try {
      const started = await startPayment(deps, fundraiserId, amount)
      if (started.confirmationUrl) {
        setPending({ id: started.paymentId, fundraiserId, amountRub: amount })
        setStatus('redirect')
        window.location.assign(started.confirmationUrl)
        return
      }
      setStatus('done')
      void queryClient.invalidateQueries({ queryKey: qk.fundraisers })
    } catch {
      setStatus('error')
    }
  }
  return { amount, setAmount, status, confirm }
}

export type PaymentResult =
  | { state: 'none' }
  | { state: 'checking' }
  | { state: 'succeeded'; amountRub: number; fundraiser?: Fundraiser }
  /** ЮKassa ещё не подтвердила платёж за минуту опроса. */
  | { state: 'waiting'; amountRub: number }
  | { state: 'canceled'; amountRub: number }
  /** Сервер или ЮKassa не ответили. */
  | { state: 'error' }

/**
 * Страница результата (/payment): опрашивает статус платежа, пока ЮKassa его не подтвердит или не отменит.
 * Незавершённый платёж остаётся в памяти устройства — обновление страницы проверит его снова.
 * «Проверить ещё раз» — новый экземпляр компонента (key), опрос начинается заново.
 */
export function usePaymentResult(): PaymentResult {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [pending, setPending] = useDeviceMemory(memory.pendingPayment)
  const [outcome, setOutcome] = useState<PaymentResult>()

  useEffect(() => {
    if (!pending) return
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let polls = 0
    const check = async () => {
      let p
      try {
        p = await deps.api.paymentStatus({ id: pending.id })
      } catch {
        if (active) setOutcome({ state: 'error' })
        return
      }
      if (!active) return
      const amountRub = p.amountRub ?? pending.amountRub
      if (p.status === 'succeeded') {
        setOutcome({ state: 'succeeded', amountRub, fundraiser: p.fundraiser ?? undefined })
        setPending(undefined)
        void queryClient.invalidateQueries({ queryKey: qk.fundraisers })
      } else if (p.status === 'canceled') {
        setOutcome({ state: 'canceled', amountRub })
        setPending(undefined)
      } else if (++polls >= PAYMENT_POLL_LIMIT) {
        setOutcome({ state: 'waiting', amountRub })
      } else {
        timer = setTimeout(() => void check(), PAYMENT_POLL_MS)
      }
    }
    void check()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [pending, deps.api, queryClient, setPending])

  return outcome ?? (pending ? { state: 'checking' } : { state: 'none' })
}
