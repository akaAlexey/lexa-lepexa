import type { LastBattleSite, NewLastBattleSite, SiteStatus } from '../contract/schemas.ts'
import { notImplemented } from './notImplemented.ts'

/** Радиус оповещения подписчиков о новом месте гибели (из кейса). */
export const NOTIFY_RADIUS_KM = 20

export const SITE_STATUS_ORDER: readonly SiteStatus[] = [
  'found_needs_check',
  'archive_confirmed',
  'remains_raised',
]

/** Статус меняется только вперёд, по одному шагу. */
export function canTransition(from: SiteStatus, to: SiteStatus): boolean {
  return SITE_STATUS_ORDER.indexOf(to) === SITE_STATUS_ORDER.indexOf(from) + 1
}

/** Текст уведомления из кейса: «В 5 км от вас обнаружено место гибели бойца…» */
export function siteFoundNotificationText(distanceKm: number): { title: string; body: string } {
  const km = Math.max(1, Math.round(distanceKm))
  return {
    title: 'Последний бой',
    body: `В ${km} км от вас обнаружено место гибели бойца. Требуется помощь в идентификации`,
  }
}

export type SiteErrors = Partial<
  Record<'coords' | 'placeName' | 'fightersCount' | 'unit' | 'dateText' | 'sources', string>
>

/** Проверка формы «Отметить место гибели». */
export function validateNewSite(input: NewLastBattleSite): SiteErrors {
  return notImplemented(`validateNewSite(${input.placeName})`)
}

/** «Красноармеец Иванов И.И.» или «3 бойца, имена не установлены». */
export function describeFighters(site: Pick<LastBattleSite, 'fighters' | 'fightersCount'>): string {
  return notImplemented(`describeFighters(${site.fightersCount})`)
}
