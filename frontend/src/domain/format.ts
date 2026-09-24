/** Форматирование для людей: русская локаль, даты без сдвига часового пояса. */

const dayMonth = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', timeZone: 'UTC' })

/** '2026-10-03' → '3 октября, суббота' (как в прототипе кейса). */
export function formatDayRu(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  return `${dayMonth.format(d)}, ${weekday.format(d)}`
}

const rub = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

export function formatRub(amount: number): string {
  return rub.format(amount)
}
