import type { Battle, Grave, LastBattleSite, Route, SiteStatus } from '../contract/schemas.ts'
import { formatHistoricDate } from './chronicle.ts'
import { describeFighters } from './lastBattle.ts'

/**
 * Карта-хаб (ADR 0011): всё, что можно найти на карте, одним списком —
 * точки семейных маршрутов, места поиска, захоронения и бои из хроники.
 */
export type PlaceKind = 'point' | 'site' | 'grave' | 'battle'

export interface Place {
  /** Уникален среди всех видов: `point-rubezh`, `site-S01`, `grave-G001`, `battle-B01`. */
  key: string
  kind: PlaceKind
  id: string
  title: string
  subtitle: string
  lat: number
  lon: number
  /** Для точки маршрута — id маршрута (адрес карточки точки). */
  routeId?: string
  status?: SiteStatus
  demo: boolean
}

export const PLACE_KIND_LABEL: Record<PlaceKind, string> = {
  point: 'Точка маршрута',
  site: 'Место поиска',
  grave: 'Воинское захоронение',
  battle: 'Бой',
}

export function collectPlaces(data: {
  routes?: readonly Route[]
  sites?: readonly LastBattleSite[]
  graves?: readonly Grave[]
  battles?: readonly Battle[]
}): Place[] {
  return [
    ...(data.routes ?? []).flatMap((r) =>
      r.points.map((p) => ({
        key: `point-${p.id}`,
        kind: 'point' as const,
        id: p.id,
        title: p.title,
        subtitle: `Маршрут «${r.title}»`,
        lat: p.lat,
        lon: p.lon,
        routeId: r.id,
        demo: r.demo,
      })),
    ),
    ...(data.sites ?? []).map((x) => ({
      key: `site-${x.id}`,
      kind: 'site' as const,
      id: x.id,
      title: x.placeName,
      subtitle: `${describeFighters(x)}, ${x.dateText}`,
      lat: x.lat,
      lon: x.lon,
      status: x.status,
      demo: x.demo,
    })),
    ...(data.graves ?? []).map((g) => ({
      key: `grave-${g.id}`,
      kind: 'grave' as const,
      id: g.id,
      title: g.fullName,
      subtitle: g.unit,
      lat: g.lat,
      lon: g.lon,
      demo: g.demo,
    })),
    ...(data.battles ?? []).flatMap((b) =>
      b.place
        ? [
            {
              key: `battle-${b.id}`,
              kind: 'battle' as const,
              id: b.id,
              title: b.place.name,
              subtitle: formatHistoricDate(b.date),
              lat: b.place.lat,
              lon: b.place.lon,
              demo: b.demo,
            },
          ]
        : [],
    ),
  ]
}

const norm = (s: string) => s.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim()

/**
 * Поиск «Места боя, музеи, исторические маршруты…»: сначала совпадения в начале названия,
 * затем внутри названия, затем в подписи. Не больше `limit` результатов.
 */
export function searchPlaces(places: readonly Place[], query: string, limit = 8): Place[] {
  const q = norm(query)
  if (q.length < 2) return []
  const score = (p: Place) => {
    const title = norm(p.title)
    if (title.startsWith(q)) return 0
    if (title.includes(q)) return 1
    if (norm(p.subtitle).includes(q) || norm(PLACE_KIND_LABEL[p.kind]).includes(q)) return 2
    return undefined
  }
  return places
    .map((p) => ({ p, s: score(p) }))
    .filter((x): x is { p: Place; s: number } => x.s !== undefined)
    .sort((a, b) => a.s - b.s || a.p.title.localeCompare(b.p.title, 'ru'))
    .slice(0, limit)
    .map((x) => x.p)
}
