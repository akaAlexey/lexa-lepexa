/** Функция «Сборы» (H4): сборы отрядов, пожертвование через ЮKassa (тестовый магазин). */
export {
  DEFAULT_DONATION,
  donate,
  DONATION_AMOUNTS,
  PAYMENT_POLL_LIMIT,
  PAYMENT_POLL_MS,
  startPayment,
  type DonationResult,
} from './fundraising.ts'
export { useDonate, usePaymentResult, type DonateStatus, type PaymentResult } from './useDonate.ts'
export { useDonateAmount } from './useDonateAmount.ts'
export { useTokenCheckout, type CheckoutResult, type Receipt } from './useTokenCheckout.ts'
