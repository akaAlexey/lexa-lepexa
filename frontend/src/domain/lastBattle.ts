import type { LastBattleSite, NewLastBattleSite, SiteStatus } from '../contract/schemas.ts'
import { pluralRu } from './plural.ts'

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

const inRange = (v: number, limit: number) => Number.isFinite(v) && Math.abs(v) <= limit

/** Проверка формы «Отметить место гибели». Пустой объект — можно публиковать. */
export function validateNewSite(input: NewLastBattleSite): SiteErrors {
  const errors: SiteErrors = {}
  if (!inRange(input.lat, 90) || !inRange(input.lon, 180)) {
    errors.coords = 'Укажите координаты: широта от −90 до 90, долгота от −180 до 180'
  }
  if (!input.placeName.trim()) errors.placeName = 'Опишите место: овраг, опушка, ближайшая деревня'
  if (!Number.isInteger(input.fightersCount) || input.fightersCount < 1) {
    errors.fightersCount = 'Укажите число бойцов — хотя бы одного'
  }
  if (!input.unit.trim()) errors.unit = 'Укажите часть или «Неизвестно»'
  if (!input.dateText.trim()) errors.dateText = 'Укажите датировку, например «октябрь 1941»'
  if (input.sources.length === 0 || input.sources.some((src) => !src.title.trim())) {
    errors.sources = 'Укажите источник: отчёт отряда, архив, рассказ жителей'
  }
  return errors
}

const FIGHTER_FORMS = ['боец', 'бойца', 'бойцов'] as const

/** «Красноармеец Иванов И.И.» или «3 бойца, имена не установлены». */
export function describeFighters(site: Pick<LastBattleSite, 'fighters' | 'fightersCount'>): string {
  const named = site.fighters.filter((f) => f.fullName)
  if (named.length > 0) {
    const names = named.map((f) => [f.rank, f.fullName].filter(Boolean).join(' ')).join(', ')
    const unnamed = site.fightersCount - named.length
    return unnamed > 0 ? `${names} и ещё ${pluralRu(unnamed, FIGHTER_FORMS)}` : names
  }
  const count = pluralRu(site.fightersCount, FIGHTER_FORMS)
  return site.fightersCount === 1
    ? `${count}, имя не установлено`
    : `${count}, имена не установлены`
}
