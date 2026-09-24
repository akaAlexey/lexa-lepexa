import type { SiteStatus } from '../../contract/schemas.ts'
import { can, type RoleId } from '../../functions/core/permissions.ts'

export type StatusAction = 'confirm' | 'raise'

/**
 * Какой шаг статуса доступен роли: краевед подтверждает место по архиву,
 * командир отряда отмечает подъём. Статусы идут только вперёд и по одному шагу.
 */
export function statusActionFor(
  role: RoleId | undefined,
  status: SiteStatus,
): StatusAction | undefined {
  if (status === 'found_needs_check' && can(role, 'place.confirmArchive')) return 'confirm'
  if (status === 'archive_confirmed' && can(role, 'place.markRaised')) return 'raise'
  return undefined
}
