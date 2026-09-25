import { useState } from 'react'
import { formatRub } from '../domain/format.ts'
import { paths } from '../functions/core/paths.ts'
import { usePaymentResult } from '../functions/fundraising/index.ts'
import { BigButton } from '../ui/BigButton.tsx'
import { Button } from '../ui/Button.tsx'
import { Notice } from '../ui/Notice.tsx'
import { Screen } from '../ui/Screen.tsx'

/**
 * Страница результата оплаты: сюда ЮKassa возвращает после тестового платежа (YOOKASSA_RETURN_URL).
 * Статус подписан текстом; главная кнопка одна — назад к сборам.
 */
export function PaymentScreen() {
  const [round, setRound] = useState(0)
  return (
    <Screen title="Оплата" testID="screen-payment">
      <PaymentStatus key={round} onRetry={() => setRound((n) => n + 1)} />
      <p>Тестовый режим ЮKassa: реальные деньги не списываются.</p>
      <BigButton to={paths.events('fund')} testID="payment-to-fundraisers">
        К сборам
      </BigButton>
    </Screen>
  )
}

function PaymentStatus({ onRetry }: { onRetry: () => void }) {
  const result = usePaymentResult()
  return (
    <>
      {result.state === 'checking' && <Notice testID="payment-checking">Проверяем оплату…</Notice>}
      {result.state === 'succeeded' && (
        <Notice tone="success" testID="payment-succeeded">
          <p>Спасибо! Тестовый платёж прошёл: {formatRub(result.amountRub)} добавлено в сбор.</p>
          {result.fundraiser && (
            <p data-testid="payment-fundraiser">
              «{result.fundraiser.title}»: собрано {formatRub(result.fundraiser.collectedRub)} из{' '}
              {formatRub(result.fundraiser.goalRub)}.
            </p>
          )}
        </Notice>
      )}
      {result.state === 'canceled' && (
        <Notice tone="error" testID="payment-canceled">
          Платёж отменён. Деньги не списаны, сбор не изменился.
        </Notice>
      )}
      {result.state === 'waiting' && (
        <Notice testID="payment-waiting">
          ЮKassa ещё не подтвердила платёж на {formatRub(result.amountRub)}. Сбор обновится, как
          только она его подтвердит.
        </Notice>
      )}
      {result.state === 'error' && (
        <Notice tone="error" testID="payment-error">
          Не удалось проверить оплату: сервер или ЮKassa сейчас не отвечают. Проверьте связь и
          попробуйте ещё раз.
        </Notice>
      )}
      {result.state === 'none' && (
        <p data-testid="payment-none">На этом устройстве нет платежей, ожидающих проверки.</p>
      )}
      {(result.state === 'waiting' || result.state === 'error') && (
        <Button onClick={onRetry} icon="refresh" testID="payment-retry">
          Проверить ещё раз
        </Button>
      )}
    </>
  )
}
