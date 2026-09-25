import type { ApiClient } from '../../api/index.ts'
import type { Deps } from '../core/deps.ts'

/** Суммы пожертвования в одно нажатие, ₽. */
export const DONATION_AMOUNTS = [100, 300, 500, 1000] as const
/** Сумма, выбранная при открытии. */
export const DEFAULT_DONATION = 300

export type DonationResult = Awaited<ReturnType<ApiClient['donate']>>

/**
 * Пожертвование через ЮKassa (только тестовый магазин): сервер создаёт платёж и возвращает ссылку
 * на страницу оплаты. После оплаты ЮKassa возвращает на /payment — адрес задаёт сервер.
 */
export function startPayment({ api }: Pick<Deps, 'api'>, fundraiserId: string, amountRub: number) {
  return api.startPayment({ body: { fundraiserId, amountRub } })
}

/** Опрос статуса после возврата с ЮKassa: каждые 2 с, не дольше минуты. */
export const PAYMENT_POLL_MS = 2000
export const PAYMENT_POLL_LIMIT = 30

/** Мгновенный тестовый платёж без ЮKassa (демо-эндпоинт /donations). */
export function donate(
  { api }: Pick<Deps, 'api'>,
  fundraiserId: string,
  amountRub: number,
): Promise<DonationResult> {
  return api.donate({ body: { fundraiserId, amountRub } })
}
