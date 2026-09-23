import type { SiteStatus } from '../contract/schemas.ts'
import type { IconName } from './Icon.tsx'

/** Подпись и иконка статуса: статус никогда не передаётся только цветом. */
export const SITE_STATUS_META: Record<SiteStatus, { label: string; icon: IconName }> = {
  found_needs_check: { label: 'Обнаружено место (требуется проверка)', icon: 'question' },
  archive_confirmed: { label: 'Подтверждено архивом', icon: 'archive' },
  remains_raised: { label: 'Останки подняты', icon: 'check' },
}
