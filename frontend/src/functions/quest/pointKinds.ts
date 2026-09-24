import type { PointKind } from '../../contract/schemas.ts'
import type { IconName } from '../../ui/Icon.tsx'

/** Иконки точек из прототипа: Звезда — бой, Шлем — окоп, Книга — штаб. */
export const POINT_ICON: Record<PointKind, { icon: IconName; label: string }> = {
  battle: { icon: 'star', label: 'Бой' },
  trench: { icon: 'helmet', label: 'Окоп' },
  hq: { icon: 'book', label: 'Штаб' },
}
