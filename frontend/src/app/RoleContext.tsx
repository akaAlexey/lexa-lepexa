import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useRoleMemory } from '../functions/roles/index.ts'
import { roleById, type Role, type RoleId } from './roles.ts'

interface RoleState {
  role: Role | undefined
  setRole: (id: RoleId) => void
  /** Забыть роль (сброс демо). */
  clearRole: () => void
}

const RoleContext = createContext<RoleState | null>(null)

/** Роль без регистрации: выбирается одним нажатием и запоминается на устройстве. */
export function RoleProvider({ children }: { children: ReactNode }) {
  const { roleId, choose, forget } = useRoleMemory()
  const value = useMemo(
    () => ({ role: roleById(roleId), setRole: choose, clearRole: forget }),
    [roleId, choose, forget],
  )
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole(): RoleState {
  const state = useContext(RoleContext)
  if (!state) throw new Error('useRole вне RoleProvider')
  return state
}
