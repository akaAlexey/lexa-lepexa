/** Даты в часовом поясе региона. Формат YYYY-MM-DD, как в контракте. */

function isoInZone(date: Date, timeZone: string): string {
  // en-CA даёт ровно YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Сегодняшняя дата YYYY-MM-DD в часовом поясе региона (по умолчанию Москва). */
export function todayIso(now: Date, timeZone = 'Europe/Moscow'): string {
  return isoInZone(now, timeZone)
}

/** Завтрашняя дата YYYY-MM-DD в часовом поясе региона — дата по умолчанию для заявки командира. */
export function tomorrowIso(now: Date, timeZone = 'Europe/Moscow'): string {
  return addDaysIso(todayIso(now, timeZone), 1)
}

/** '2026-12-31' + 1 → '2027-01-01' (календарная арифметика в UTC, без часовых поясов). */
export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
