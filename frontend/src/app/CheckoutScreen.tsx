import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { formatRub } from '../domain/format.ts'
import { tokensLabel, WALLET_TOP_UP } from '../domain/tokens.ts'
import { paths } from '../functions/core/paths.ts'
import { useTokenCheckout, type CheckoutResult } from '../functions/fundraising/index.ts'
import { BigButton } from '../ui/BigButton.tsx'
import { Button } from '../ui/Button.tsx'
import { Notice } from '../ui/Notice.tsx'
import { Screen } from '../ui/Screen.tsx'
import s from './checkout.module.css'

const paidAt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
})

/**
 * Касса: страница оплаты пожертвования, как у платёжного сервиса. Оплата — условными токенами из
 * кошелька аккаунта: реальные деньги не списываются, сумма уходит в сбор на сервере.
 * Настоящая касса ЮKassa включается ключами магазина на сервере (backend/DEPLOY-F.md).
 */
export function CheckoutScreen() {
  const [params] = useSearchParams()
  const amount = Number(params.get('amount'))
  const { fundraiser, loading, balance, busy, pay, topUp } = useTokenCheckout(
    params.get('fundraiser') ?? '',
  )
  const [result, setResult] = useState<CheckoutResult>()

  if (loading)
    return (
      <Screen title="Оплата" testID="screen-checkout">
        <p role="status">Открываем кассу…</p>
      </Screen>
    )
  if (!fundraiser || !Number.isInteger(amount) || amount < 1)
    return (
      <Screen title="Оплата" testID="screen-checkout">
        <Notice tone="error" testID="checkout-invalid">
          Не нашли сбор или сумму для оплаты. Выберите сбор и сумму ещё раз.
        </Notice>
        <BigButton to={paths.events('fund')} testID="checkout-to-fundraisers">
          К сборам
        </BigButton>
      </Screen>
    )

  if (result?.ok) {
    const { receipt } = result
    return (
      <Screen title="Оплата прошла" testID="screen-checkout">
        <section className={s.receipt} aria-label="Чек" data-testid="checkout-receipt">
          <p className={s.kick}>Чек № {receipt.paymentId}</p>
          <p className={s.sum}>{formatRub(receipt.amount)}</p>
          <p>
            В сбор «{receipt.fundraiser.title}». Собрано{' '}
            {formatRub(receipt.fundraiser.collectedRub)} из {formatRub(receipt.fundraiser.goalRub)}.
          </p>
          <p className={s.muted}>{paidAt.format(new Date(receipt.paidAt))}</p>
          <p data-testid="checkout-balance-after">
            Списано {tokensLabel(receipt.amount)}, в кошельке {tokensLabel(balance)}.
          </p>
        </section>
        <Notice testID="checkout-note">
          Реальные деньги не списывались: это учебная оплата условными токенами. Она показывает, как
          пожертвование доходит до сбора. Платёжная касса ЮKassa подключается ключами магазина на
          сервере — без изменений сайта.
        </Notice>
        <BigButton to={paths.events('fund')} testID="checkout-done">
          К сборам
        </BigButton>
      </Screen>
    )
  }

  const short = amount > balance
  return (
    <Screen title="Оплата" testID="screen-checkout">
      <section className={s.card} aria-label="Касса «Тропы памяти»">
        <p className={s.kick}>Касса «Тропы памяти» · учебная оплата</p>
        <p className={s.sum} data-testid="checkout-amount">
          {formatRub(amount)}
        </p>
        <p data-testid="checkout-fundraiser">Пожертвование в сбор «{fundraiser.title}»</p>
        <div className={s.wallet} data-testid="checkout-wallet">
          <span>Кошелёк условных токенов</span>
          <strong data-testid="checkout-balance">{tokensLabel(balance)}</strong>
          <span className={s.muted}>1 токен = 1 ₽ условно. Реальные деньги не участвуют.</span>
        </div>
      </section>
      {short && (
        <Notice tone="error" testID="checkout-short">
          Не хватает токенов: нужно {tokensLabel(amount)}, в кошельке {tokensLabel(balance)}.
        </Notice>
      )}
      {result && !result.ok && result.reason === 'server' && (
        <Notice tone="error" testID="checkout-error">
          Сервер не ответил — токены не списаны. Проверьте связь и попробуйте ещё раз.
        </Notice>
      )}
      <BigButton
        onClick={() => void pay(amount).then(setResult)}
        disabled={busy || short}
        icon="check"
        testID="checkout-pay"
      >
        {busy ? 'Проводим оплату…' : `Оплатить ${tokensLabel(amount)}`}
      </BigButton>
      <div className={s.actions}>
        {short && (
          <Button onClick={topUp} testID="checkout-top-up">
            Пополнить на {tokensLabel(WALLET_TOP_UP)}
          </Button>
        )}
        <BigButton to={paths.events('fund')} testID="checkout-cancel">
          Отменить
        </BigButton>
      </div>
    </Screen>
  )
}
