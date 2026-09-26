// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { payWithTokens, tokensLabel, WALLET_START } from './tokens.ts'

describe('учебная оплата условными токенами', () => {
  it('списывает сумму с баланса', () => {
    expect(payWithTokens(WALLET_START, 500)).toEqual({ ok: true, balance: 9500 })
  })
  it('не хватает токенов — отказ без списания', () => {
    expect(payWithTokens(300, 500)).toEqual({ ok: false, reason: 'balance' })
  })
  it('сумма — целое положительное число', () => {
    expect(payWithTokens(1000, 0)).toEqual({ ok: false, reason: 'amount' })
    expect(payWithTokens(1000, 1.5)).toEqual({ ok: false, reason: 'amount' })
  })
  it('подписи по-русски', () => {
    expect(tokensLabel(1)).toBe('1 токен')
    expect(tokensLabel(3)).toBe('3 токена')
    expect(tokensLabel(11)).toBe('11 токенов')
    expect(tokensLabel(10000).replace(/\s/g, ' ')).toBe('10 000 токенов')
  })
})
