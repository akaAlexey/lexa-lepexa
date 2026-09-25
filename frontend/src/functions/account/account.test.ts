// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loginKind, maskLogin, signIn, validateSignIn } from './account.ts'

const NOW = new Date('2026-10-02T09:00:00Z')

describe('вход по телефону или почте (витрина на устройстве)', () => {
  it('узнаёт телефон и почту, остальное — нет', () => {
    expect(loginKind('+7 (900) 123-45-67')).toBe('phone')
    expect(loginKind('89001234567')).toBe('phone')
    expect(loginKind('ivanov@mail.ru')).toBe('email')
    expect(loginKind('ivanov')).toBeUndefined()
    expect(loginKind('12345')).toBeUndefined()
  })

  it('ошибки по-русски у пустых и неверных полей', () => {
    expect(validateSignIn({ login: '', password: '' })).toEqual({
      login: 'Введите номер телефона или почту',
      password: 'Введите пароль',
    })
    expect(validateSignIn({ login: 'ivanov', password: '123' })).toMatchObject({
      login: expect.stringMatching(/10 или 11 цифр/),
      password: 'Пароль — не короче 6 символов',
    })
    expect(validateSignIn({ login: 'ivanov@mail.ru', password: 'секрет12' })).toEqual({})
  })

  it('пароль не попадает в запись входа, логин скрыт', () => {
    const result = signIn({ login: '+7 900 123-45-67', password: 'секрет12' }, NOW)
    expect(result).toEqual({
      ok: true,
      account: { id: '79001234567', login: '+7 ··· ···-45-67', since: '2026-10-02T09:00:00.000Z' },
    })
    expect(JSON.stringify(result)).not.toContain('секрет')
    expect(maskLogin('ivanov@mail.ru')).toBe('i•••@mail.ru')
  })

  it('с ошибками вход не выполняется', () => {
    expect(signIn({ login: '', password: '' }, NOW).ok).toBe(false)
  })
})
