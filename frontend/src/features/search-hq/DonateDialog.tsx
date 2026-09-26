import type { Fundraiser } from '../../contract/schemas.ts'
import { formatRub } from '../../domain/format.ts'
import { paths } from '../../functions/core/paths.ts'
import { DONATION_AMOUNTS, useDonateAmount } from '../../functions/fundraising/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { ChoiceChips } from '../../ui/ChoiceChips.tsx'
import { Dialog } from '../../ui/Dialog.tsx'
import { Notice } from '../../ui/Notice.tsx'
import s from './search.module.css'

/**
 * Пожертвование: выбор суммы и переход на страницу оплаты (касса). Оплата — условными токенами:
 * реальные деньги не списываются, сумма добавляется в сбор на сервере.
 */
export function DonateDialog({
  fundraiser,
  onClose,
}: {
  fundraiser: Fundraiser
  onClose: () => void
}) {
  const [amount, setAmount] = useDonateAmount()
  return (
    <Dialog title={fundraiser.title} onClose={onClose} testID={`donate-dialog-${fundraiser.id}`}>
      <Notice>
        Оплата условными токенами: реальные деньги не списываются, а сумма добавляется в сбор — так
        видно, как работает пожертвование.
      </Notice>
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
      <BigButton
        to={paths.checkout(fundraiser.id, String(amount))}
        icon="check"
        testID="donate-confirm"
      >
        Перейти к оплате {formatRub(amount)}
      </BigButton>
      <p className={s.caption} data-testid="donate-test-caption">
        Учебная оплата — деньги не списываются
      </p>
    </Dialog>
  )
}
