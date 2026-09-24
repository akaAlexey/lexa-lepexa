import type { Fundraiser } from '../../contract/schemas.ts'
import { formatRub } from '../../domain/format.ts'
import { DONATION_AMOUNTS, useDonate } from '../../functions/fundraising/index.ts'
import { Button } from '../../ui/Button.tsx'
import { ChoiceChips } from '../../ui/ChoiceChips.tsx'
import { Dialog } from '../../ui/Dialog.tsx'
import { Notice } from '../../ui/Notice.tsx'

/** Пожертвование только через тестовый режим платёжного провайдера: деньги не списываются. */
export function DonateDialog({
  fundraiser,
  onClose,
}: {
  fundraiser: Fundraiser
  onClose: () => void
}) {
  const { amount, setAmount, status, confirm } = useDonate(fundraiser.id)

  return (
    <Dialog title={fundraiser.title} onClose={onClose} testID={`donate-dialog-${fundraiser.id}`}>
      <Notice>Тестовый режим: деньги не списываются.</Notice>
      <ChoiceChips
        legend="Сумма"
        options={DONATION_AMOUNTS.map((a) => ({
          value: a,
          label: formatRub(a),
          testID: `amount-${a}`,
        }))}
        value={amount}
        onChange={setAmount}
      />
      {status === 'done' ? (
        <Notice tone="success" testID="donate-result">
          Спасибо! Тестовый платёж на {formatRub(amount)} прошёл, деньги не списаны.
        </Notice>
      ) : (
        <Button
          onClick={() => void confirm()}
          disabled={status === 'sending'}
          testID="donate-confirm"
        >
          Пожертвовать {formatRub(amount)} (тест)
        </Button>
      )}
      {status === 'error' && (
        <Notice tone="error">Тестовый платёж не прошёл. Попробуйте ещё раз.</Notice>
      )}
    </Dialog>
  )
}
