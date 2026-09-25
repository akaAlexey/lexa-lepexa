/** Функция «Сборы» (H4): сборы отрядов, прогресс, пожертвование через ЮKassa (тестовый магазин). */
export {
  DEFAULT_DONATION,
  donate,
  DONATION_AMOUNTS,
  fundProgress,
  neediestFundraiserOfTeam,
  startPayment,
  type DonationResult,
} from './fundraising.ts'
export { useDonate, usePaymentReturn, type DonateStatus, type PaymentReturn } from './useDonate.ts'
export { useFundraisers } from './useFundraisers.ts'
