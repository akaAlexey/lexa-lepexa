import { useState } from 'react'
import { DEFAULT_DONATION } from './fundraising.ts'

/** Сумма пожертвования в диалоге (по умолчанию — средняя из предложенных). */
export function useDonateAmount() {
  return useState<number>(DEFAULT_DONATION)
}
