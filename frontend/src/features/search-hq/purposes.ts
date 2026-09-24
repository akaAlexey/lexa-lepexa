import type { FundraiserPurpose } from '../../contract/schemas.ts'
import type { IconName } from '../../ui/Icon.tsx'

/** Целевые сборы из кейса: «Поднять бойца», «Экипировать отряд» и бензин на экспедицию. */
export const FUNDRAISER_PURPOSE: Record<FundraiserPurpose, { label: string; icon: IconName }> = {
  raise_fighter: { label: 'Поднять бойца', icon: 'grave' },
  equip: { label: 'Экипировать отряд', icon: 'shovel' },
  fuel: { label: 'Бензин на экспедицию', icon: 'route' },
}
