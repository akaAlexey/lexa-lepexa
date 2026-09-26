/**
 * Учебная оплата сборов условными токенами: показывает, как работает пожертвование, без реальных
 * денег. 1 токен = 1 ₽ условно. Настоящая касса (ЮKassa) включается ключами магазина на сервере.
 */
export const WALLET_START = 10_000
export const WALLET_TOP_UP = 5_000

export type TokenPayment =
  { ok: true; balance: number } | { ok: false; reason: 'amount' | 'balance' }

/** Списать `amount` токенов с баланса. */
export function payWithTokens(balance: number, amount: number): TokenPayment {
  if (!Number.isInteger(amount) || amount < 1) return { ok: false, reason: 'amount' }
  if (amount > balance) return { ok: false, reason: 'balance' }
  return { ok: true, balance: balance - amount }
}

/** «1 000 токенов», «1 токен», «3 токена». */
export function tokensLabel(n: number): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  const word =
    abs > 10 && abs < 20
      ? 'токенов'
      : last === 1
        ? 'токен'
        : last >= 2 && last <= 4
          ? 'токена'
          : 'токенов'
  return `${n.toLocaleString('ru-RU')} ${word}`
}
