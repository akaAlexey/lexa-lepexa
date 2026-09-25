import type { FieldErrors } from '../core/form.ts'

/**
 * Вход по телефону или почте и паролю (ADR 0012). Пока это витрина на устройстве:
 * сервера авторизации нет, пароль никуда не отправляется и не хранится —
 * запоминается только логин в скрытом виде, чтобы вместо «Вход» показать «Профиль».
 */
export interface SignInValues {
  login: string
  password: string
}

export interface Account {
  /** Логин в скрытом виде: «+7 ··· ···-45-67» или «a•••@mail.ru». */
  login: string
  /** Когда вошли, ISO 8601. */
  since: string
}

export type LoginKind = 'phone' | 'email'

export const MIN_PASSWORD = 6

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Телефон — 10 или 11 цифр (с кодом страны или без), почта — с «@» и доменом. */
export function loginKind(login: string): LoginKind | undefined {
  const value = login.trim()
  if (EMAIL.test(value)) return 'email'
  const digits = value.replace(/[\s()+-]/g, '')
  if (/^\d{10,11}$/.test(digits)) return 'phone'
  return undefined
}

export function validateSignIn(values: SignInValues): FieldErrors {
  const errors: Record<string, string> = {}
  if (!values.login.trim()) errors.login = 'Введите номер телефона или почту'
  else if (!loginKind(values.login))
    errors.login = 'Телефон — 10 или 11 цифр, почта — с «@», например ivanov@mail.ru'
  if (!values.password) errors.password = 'Введите пароль'
  else if (values.password.length < MIN_PASSWORD)
    errors.password = `Пароль — не короче ${MIN_PASSWORD} символов`
  return errors
}

/** Логин для показа в профиле: без полного номера и адреса. */
export function maskLogin(login: string): string {
  const value = login.trim()
  if (loginKind(value) === 'email') {
    const [name = '', domain = ''] = value.split('@')
    return `${name.slice(0, 1)}•••@${domain}`
  }
  const digits = value.replace(/\D/g, '')
  const tail = digits.slice(-4)
  return `+7 ··· ···-${tail.slice(0, 2)}-${tail.slice(2)}`
}

export type SignInResult = { ok: true; account: Account } | { ok: false; errors: FieldErrors }

/** Проверить форму и собрать запись входа. Пароль в результат не попадает. */
export function signIn(values: SignInValues, now: Date): SignInResult {
  const errors = validateSignIn(values)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, account: { login: maskLogin(values.login), since: now.toISOString() } }
}

/** Регистрация: те же логин и пароль плюс обязательное согласие с условиями и политикой. */
export interface RegisterValues extends SignInValues {
  repeat: string
  terms: boolean
  privacy: boolean
}

export function validateRegister(values: RegisterValues): FieldErrors {
  const errors = { ...validateSignIn(values) } as Record<string, string>
  if (values.password && values.repeat !== values.password) errors.repeat = 'Пароли не совпадают'
  if (!values.terms) errors.terms = 'Нужно согласие с пользовательскими условиями'
  if (!values.privacy) errors.privacy = 'Нужно согласие с политикой конфиденциальности'
  return errors
}

export function register(values: RegisterValues, now: Date): SignInResult {
  const errors = validateRegister(values)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, account: { login: maskLogin(values.login), since: now.toISOString() } }
}
