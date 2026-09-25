import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAccount } from '../../functions/account/useAccount.ts'
import { otherSection } from '../../functions/core/paths.ts'

/** «Живое фото» — только после входа: без профиля ведём на форму входа и возвращаем обратно. */
export function SignedInOnly({ children }: { children: ReactNode }) {
  const { account } = useAccount()
  const { pathname } = useLocation()
  if (account) return children
  return <Navigate to={otherSection('account', `next=${encodeURIComponent(pathname)}`)} replace />
}
