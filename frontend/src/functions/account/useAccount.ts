import { useCallback } from 'react'
import { memory } from '../core/deviceMemory.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import { signIn, type SignInResult, type SignInValues } from './account.ts'

/** Вход на этом устройстве: «Вход» в меню превращается в «Профиль». */
export function useAccount() {
  const { now } = useDeps()
  const [account, setAccount] = useDeviceMemory(memory.account)
  const submit = useCallback(
    (values: SignInValues): SignInResult => {
      const result = signIn(values, now())
      if (result.ok) setAccount(result.account)
      return result
    },
    [now, setAccount],
  )
  const signOut = useCallback(() => setAccount(undefined), [setAccount])
  return { account, signIn: submit, signOut }
}
