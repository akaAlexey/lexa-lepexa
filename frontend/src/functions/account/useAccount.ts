import { useCallback, useEffect } from 'react'
import { ApiError } from '../../api/client.ts'
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
  const { api, now } = useDeps()
  const [account, setAccount] = useDeviceMemory(memory.account)
  const [profiles, setProfiles] = useDeviceMemory(memory.profiles)

  useEffect(() => {
    if (!api.auth) return
    let alive = true
    void api.auth
      .me()
      .then((remote) => {
        if (!alive) return
        if (!remote) {
          setAccount(undefined)
          return
        }
        const saved = profiles[remote.id]
        setAccount({
          id: remote.id,
          login: maskLogin(remote.login),
          since: remote.since,
          name: remote.name,
          ...saved,
        })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [api, profiles, setAccount])
  const remember = useCallback(
    (result: SignInResult) => {
      if (!result.ok) return
      const saved = result.account.id ? profiles[result.account.id] : undefined
      setAccount({ ...result.account, ...saved })
    },
    [profiles, setAccount],
  )
  const submit = useCallback(
    async (values: SignInValues): Promise<SignInResult> => {
      const local = signIn(values, now())
      if (!local.ok || !api.auth) {
        remember(local)
        return local
      }
      try {
        const remote = await api.auth.login(values)
        const result: SignInResult = {
          ok: true,
          account: {
            id: remote.id,
            login: maskLogin(remote.login),
            since: remote.since,
            name: remote.name,
          },
        }
        remember(result)
        return result
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Не удалось выполнить вход'
        return { ok: false, errors: { login: message } }
      }
    },
    [api, now, remember],
  )
  const signUp = useCallback(
    async (values: RegisterValues): Promise<SignInResult> => {
      const local = register(values, now())
      if (!local.ok) return local
      let result = local
      if (api.auth) {
        try {
          const remote = await api.auth.register({
            login: values.login,
            password: values.password,
            name: values.name.trim(),
            terms: values.terms,
            privacy: values.privacy,
          })
          result = {
            ok: true,
            account: {
              id: remote.id,
              login: maskLogin(remote.login),
              since: remote.since,
              name: remote.name,
            },
          }
        } catch (error) {
          const message =
            error instanceof ApiError ? error.message : 'Не удалось зарегистрировать пользователя'
          return { ok: false, errors: { login: message } }
        }
      }
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
    [api, now, profiles, setAccount, setProfiles],
  )
  const signOut = useCallback(() => {
    setAccount(undefined)
    if (api.auth) void api.auth.logout().catch(() => undefined)
  }, [api, setAccount])
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
  /** Вход проверяет сервер: профиль и личные данные хранятся в аккаунте и доступны на всех устройствах. */
  const server = Boolean(api.auth)
  return { account, server, signIn: submit, signUp, signOut, saveProfile }
}
