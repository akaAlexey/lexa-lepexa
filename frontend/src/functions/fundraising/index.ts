/** Функция «Сборы» (H4): сборы отрядов, пожертвование через ЮKassa (тестовый магазин). */
export {
  DEFAULT_DONATION,
  donate,
  DONATION_AMOUNTS,
  startPayment,
  type DonationResult,
} from './fundraising.ts'
export { useDonate, usePaymentReturn, type DonateStatus, type PaymentReturn } from './useDonate.ts'
