import { forgetMemory, memory, readMemory, writeMemory } from '../core/deviceMemory.ts'
import type { Deps } from '../core/deps.ts'
import type { RoleId } from '../core/permissions.ts'

/** Роли без регистрации (демо). Порядок — как на экране выбора. */
export const ROLE_IDS: readonly RoleId[] = ['family', 'volunteer', 'commander', 'verifier']

export const isRoleId = (value: unknown): value is RoleId =>
  typeof value === 'string' && (ROLE_IDS as readonly string[]).includes(value)

/** Роль, запомненная на устройстве; неизвестное значение — «роль не выбрана». */
export function savedRole({ platform }: Deps): RoleId | undefined {
  const id = readMemory(platform.storage, memory.role)
  return isRoleId(id) ? id : undefined
}

/** Выбрать роль одним нажатием и запомнить на устройстве. */
export function chooseRole({ platform }: Deps, id: RoleId): void {
  writeMemory(platform.storage, memory.role, id)
}

/** Забыть роль (сброс демо). */
export function forgetRole({ platform }: Deps): void {
  forgetMemory(platform.storage, memory.role)
}
