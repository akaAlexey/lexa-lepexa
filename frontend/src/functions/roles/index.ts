/** Функция «Роли» (R1): роль без регистрации, запомненная на устройстве. */
export { chooseRole, forgetRole, isRoleId, ROLE_IDS, savedRole } from './roles.ts'
export { useRoleMemory } from './useRoleMemory.ts'
export type { RoleId } from '../core/permissions.ts'
