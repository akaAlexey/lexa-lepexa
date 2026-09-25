import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { memory } from '../core/deviceMemory.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { DEFAULT_DONATION, startPayment } from './fundraising.ts'

export type DonateStatus = 'idle' | 'sending' | 'redirect' | 'done' | 'error'

/**
 * Пожертвование в сбор через ЮKassa (тестовый магазин). С сервером — переход на страницу оплаты
 * ЮKassa, после возврата статус проверяет `usePaymentReturn`. Без сервера (mock) — платёж имитируется.
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
      const returnPath = window.location.pathname + window.location.search
      const started = await startPayment(deps, fundraiserId, amount, returnPath)
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

export type PaymentReturn =
  | { state: 'none' }
  | { state: 'checking' }
  | { state: 'succeeded'; amountRub: number }
  | { state: 'pending'; amountRub: number }
  | { state: 'canceled'; amountRub: number }
  | { state: 'error' }

/** Вернулись со страницы оплаты ЮKassa: узнаём статус платежа и обновляем сборы. */
export function usePaymentReturn(): { result: PaymentReturn; close: () => void } {
  const deps = useDeps()
  const queryClient = useQueryClient()
  const [pending, setPending] = useDeviceMemory(memory.pendingPayment)
  // Итог приходит из ответа ЮKassa; пока его нет, а платёж ждёт проверки — «проверяем»
  const [outcome, setResult] = useState<PaymentReturn>()
  const result: PaymentReturn = outcome ?? (pending ? { state: 'checking' } : { state: 'none' })

  useEffect(() => {
    if (!pending) return
    let active = true
    deps.api.paymentStatus({ id: pending.id }).then(
      (p) => {
        if (!active) return
        if (p.status === 'succeeded') {
          setResult({ state: 'succeeded', amountRub: pending.amountRub })
          setPending(undefined)
          void queryClient.invalidateQueries({ queryKey: qk.fundraisers })
        } else if (p.status === 'canceled') {
          setResult({ state: 'canceled', amountRub: pending.amountRub })
          setPending(undefined)
        } else {
          setResult({ state: 'pending', amountRub: pending.amountRub })
        }
      },
      () => active && setResult({ state: 'error' }),
    )
    return () => {
      active = false
    }
  }, [pending, deps.api, queryClient, setPending])

  const close = useCallback(() => {
    setResult({ state: 'none' })
    setPending(undefined)
  }, [setPending])
  return { result, close }
}
