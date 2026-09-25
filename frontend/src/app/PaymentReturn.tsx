import { formatRub } from '../domain/format.ts'
import { usePaymentReturn } from '../functions/fundraising/index.ts'
import { Icon } from '../ui/Icon.tsx'
import { Notice } from '../ui/Notice.tsx'
import s from './layout.module.css'

/** После возврата со страницы оплаты ЮKassa: итог платежа сверху страницы. */
export function PaymentReturn() {
  const { result, close } = usePaymentReturn()
  if (result.state === 'none') return null
  const text =
    result.state === 'checking'
      ? 'Проверяем оплату…'
      : result.state === 'succeeded'
        ? `Спасибо! Пожертвование ${formatRub(result.amountRub)} получено — сбор обновлён.`
        : result.state === 'pending'
          ? `Платёж ${formatRub(result.amountRub)} ещё обрабатывается. Сбор обновится, когда ЮKassa его подтвердит.`
          : result.state === 'canceled'
            ? `Платёж ${formatRub(result.amountRub)} отменён, деньги не списаны.`
            : 'Не удалось узнать статус платежа. Проверьте связь.'
  const tone =
    result.state === 'succeeded' ? 'success' : result.state === 'error' ? 'error' : undefined
  return (
    <div className={s.payment} data-testid="payment-return">
      <Notice tone={tone}>{text}</Notice>
      {result.state !== 'checking' && (
        <button type="button" className={s.paymentClose} onClick={close}>
          <Icon name="close" size={1} label="Закрыть" />
        </button>
      )}
    </div>
  )
}
