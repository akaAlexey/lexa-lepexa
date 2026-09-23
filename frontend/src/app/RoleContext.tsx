import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { roleById, type Role, type RoleId } from './roles.ts'
import { useServices } from './services.tsx'

const ROLE_KEY = 'role'

interface RoleState {
  role: Role | undefined
  setRole: (id: RoleId) => void
}

const RoleContext = createContext<RoleState | null>(null)

/** Роль без регистрации: выбирается одним нажатием и запоминается на устройстве. */
export function RoleProvider({ children }: { children: ReactNode }) {
  const { storage } = useServices().platform
  const [role, setRoleState] = useState(() => roleById(storage.get<string>(ROLE_KEY)))
  const setRole = useCallback(
    (id: RoleId) => {
      storage.set(ROLE_KEY, id)
      setRoleState(roleById(id))
    },
    [storage],
  )
  const value = useMemo(() => ({ role, setRole }), [role, setRole])
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole(): RoleState {
  const state = useContext(RoleContext)
  if (!state) throw new Error('useRole вне RoleProvider')
  return state
}
