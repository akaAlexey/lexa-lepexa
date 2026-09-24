import { useCallback } from 'react'
import { memory } from '../core/deviceMemory.ts'
import type { RoleId } from '../core/permissions.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { isRoleId } from './roles.ts'

/** Роль на устройстве: текущая, выбрать, забыть. Все читатели видят смену сразу. */
export function useRoleMemory(): {
  roleId: RoleId | undefined
  choose: (id: RoleId) => void
  forget: () => void
} {
  const [saved, setSaved] = useDeviceMemory(memory.role)
  const choose = useCallback((id: RoleId) => setSaved(id), [setSaved])
  const forget = useCallback(() => setSaved(undefined), [setSaved])
  return { roleId: isRoleId(saved) ? saved : undefined, choose, forget }
}
