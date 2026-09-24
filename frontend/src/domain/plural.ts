/**
 * Число со словом в правильной форме: pluralRu(10, ['землекоп', 'землекопа', 'землекопов']) → '10 землекопов'.
 * Формы: [1, 2–4, 5–20].
 */
export function pluralRu(n: number, forms: readonly [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  const form =
    mod10 === 1 && mod100 !== 11
      ? forms[0]
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? forms[1]
        : forms[2]
  return `${n} ${form}`
}
