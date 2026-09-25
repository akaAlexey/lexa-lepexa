import type { Fundraiser } from '../../contract/schemas.ts'
import { formatRub } from '../../domain/format.ts'
import { DONATION_AMOUNTS, useDonate } from '../../functions/fundraising/index.ts'
import { Button } from '../../ui/Button.tsx'
import { ChoiceChips } from '../../ui/ChoiceChips.tsx'
import { Dialog } from '../../ui/Dialog.tsx'
import { Notice } from '../../ui/Notice.tsx'
import s from './search.module.css'

/** Пожертвование через ЮKassa (тестовый магазин): оплата на странице ЮKassa, деньги не списываются. */
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
      <Notice>
        Оплата через ЮKassa в тестовом режиме: реальные деньги не списываются. Для проверки — карта
        5555 5555 5555 4477, любой срок и CVC.
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
      {status === 'done' ? (
        <Notice tone="success" testID="donate-result">
          Спасибо! Тестовый платёж на {formatRub(amount)} прошёл, деньги не списаны.
        </Notice>
      ) : status === 'redirect' ? (
        <Notice testID="donate-redirect">Переходим на страницу оплаты ЮKassa…</Notice>
      ) : (
        <>
          <Button
            onClick={() => void confirm()}
            disabled={status === 'sending'}
            testID="donate-confirm"
          >
            {status === 'sending'
              ? 'Создаём платёж…'
              : `Оплатить ${formatRub(amount)} через ЮKassa`}
          </Button>
          <p className={s.caption} data-testid="donate-test-caption">
            Тестовый платёж — деньги не списываются
          </p>
        </>
      )}
      {status === 'error' && (
        <Notice tone="error" testID="donate-error">
          Не удалось начать оплату: сервер или ЮKassa сейчас не отвечают. Попробуйте ещё раз чуть
          позже.
        </Notice>
      )}
    </Dialog>
  )
}
