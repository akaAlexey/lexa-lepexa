import { notImplemented } from './notImplemented.ts'

/** Сегодняшняя дата YYYY-MM-DD в часовом поясе региона (по умолчанию Москва). */
export function todayIso(now: Date, timeZone = 'Europe/Moscow'): string {
  return notImplemented(`todayIso(${now.toISOString()}, ${timeZone})`)
}

/** Завтрашняя дата YYYY-MM-DD в часовом поясе региона — дата по умолчанию для заявки командира. */
export function tomorrowIso(now: Date, timeZone = 'Europe/Moscow'): string {
  return notImplemented(`tomorrowIso(${now.toISOString()}, ${timeZone})`)
}
