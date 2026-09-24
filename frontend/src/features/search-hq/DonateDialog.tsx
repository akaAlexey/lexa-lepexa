import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useApi } from '../../app/services.tsx'
import type { Fundraiser } from '../../contract/schemas.ts'
import { formatRub } from '../../domain/format.ts'
import { Button } from '../../ui/Button.tsx'
import { ChoiceChips } from '../../ui/ChoiceChips.tsx'
import { Dialog } from '../../ui/Dialog.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { qk } from './queries.ts'

const AMOUNTS = [100, 300, 500, 1000] as const

/** Пожертвование только через тестовый режим платёжного провайдера: деньги не списываются. */
export function DonateDialog({
  fundraiser,
  onClose,
}: {
  fundraiser: Fundraiser
  onClose: () => void
}) {
  const api = useApi()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState<number>(300)
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const donate = async () => {
    setState('sending')
    try {
      await api.donate({ body: { fundraiserId: fundraiser.id, amountRub: amount } })
      setState('done')
      void queryClient.invalidateQueries({ queryKey: qk.fundraisers })
    } catch {
      setState('error')
    }
  }

  return (
    <Dialog title={fundraiser.title} onClose={onClose} testID={`donate-dialog-${fundraiser.id}`}>
      <Notice>Тестовый режим: деньги не списываются.</Notice>
      <ChoiceChips
        legend="Сумма"
        options={AMOUNTS.map((a) => ({ value: a, label: formatRub(a), testID: `amount-${a}` }))}
        value={amount}
        onChange={setAmount}
      />
      {state === 'done' ? (
        <Notice tone="success" testID="donate-result">
          Спасибо! Тестовый платёж на {formatRub(amount)} прошёл, деньги не списаны.
        </Notice>
      ) : (
        <Button
          onClick={() => void donate()}
          disabled={state === 'sending'}
          testID="donate-confirm"
        >
          Пожертвовать {formatRub(amount)} (тест)
        </Button>
      )}
      {state === 'error' && (
        <Notice tone="error">Тестовый платёж не прошёл. Попробуйте ещё раз.</Notice>
      )}
    </Dialog>
  )
}
