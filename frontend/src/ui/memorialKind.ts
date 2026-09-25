import type { MemorialKind } from '../contract/schemas.ts'
import { MEMORIAL_KIND_LABEL } from '../domain/mapHub.ts'
import type { IconName } from './Icon.tsx'

/** Подпись и иконка памятного места: вид не передаётся только цветом. */
export const MEMORIAL_META: Record<MemorialKind, { label: string; icon: IconName }> = {
  grave: { label: MEMORIAL_KIND_LABEL.grave, icon: 'grave' },
  flame: { label: MEMORIAL_KIND_LABEL.flame, icon: 'star' },
  vehicle: { label: MEMORIAL_KIND_LABEL.vehicle, icon: 'helmet' },
  monument: { label: MEMORIAL_KIND_LABEL.monument, icon: 'flag' },
  museum: { label: MEMORIAL_KIND_LABEL.museum, icon: 'archive' },
}
