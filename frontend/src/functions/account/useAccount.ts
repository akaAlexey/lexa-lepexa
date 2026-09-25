import { useCallback } from 'react'
import { memory } from '../core/deviceMemory.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'
import {
  accountId,
  loginKind,
  maskLogin,
  register,
  validateProfile,
  type ProfileValues,
  signIn,
  type RegisterValues,
  type SignInResult,
  type SignInValues,
} from './account.ts'

/** Вход на этом устройстве: «Вход» в меню превращается в «Профиль». */
export function useAccount() {
  const { now } = useDeps()
  const [account, setAccount] = useDeviceMemory(memory.account)
  const [profiles, setProfiles] = useDeviceMemory(memory.profiles)
  const remember = useCallback(
    (result: SignInResult) => {
      if (!result.ok) return
      const saved = result.account.id ? profiles[result.account.id] : undefined
      setAccount({ ...result.account, ...saved })
    },
    [profiles, setAccount],
  )
  const submit = useCallback(
    (values: SignInValues): SignInResult => {
      const result = signIn(values, now())
      remember(result)
      return result
    },
    [now, remember],
  )
  const signUp = useCallback(
    (values: RegisterValues): SignInResult => {
      const result = register(values, now())
      if (result.ok) {
        const profile = {
          name: result.account.name ?? '',
          city: '',
          bio: '',
          since: result.account.since,
        }
        const key = result.account.id!
        const saved = profiles[key]
        setAccount({ ...result.account, ...saved })
        if (!saved) setProfiles((prev) => ({ ...prev, [key]: profile }))
      }
      return result
    },
    [now, profiles, setAccount, setProfiles],
  )
  const signOut = useCallback(() => setAccount(undefined), [setAccount])
  const saveProfile = (values: ProfileValues, login?: string) => {
    const errors = { ...validateProfile(values) }
    if (
      account &&
      !account.id &&
      (!login || !loginKind(login) || maskLogin(login) !== account.login)
    )
      errors.login = 'Укажите телефон или почту, с которыми вы вошли'
    if (!account || Object.keys(errors).length) return { ok: false as const, errors }
    const profile = {
      name: values.name.trim(),
      city: values.city.trim(),
      bio: values.bio.trim(),
      since: account.since,
    }
    const id = account.id ?? accountId(login!)
    setProfiles((prev) => ({ ...prev, [id]: profile }))
    setAccount({ ...account, id, ...profile })
    return { ok: true as const }
  }
  return { account, signIn: submit, signUp, signOut, saveProfile }
}
