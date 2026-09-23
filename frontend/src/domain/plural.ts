import { notImplemented } from './notImplemented.ts'

/**
 * Число со словом в правильной форме: pluralRu(10, ['землекоп', 'землекопа', 'землекопов']) → '10 землекопов'.
 * Формы: [1, 2–4, 5–20].
 */
export function pluralRu(n: number, forms: readonly [string, string, string]): string {
  return notImplemented(`pluralRu(${n}, ${forms.join('/')})`)
}
