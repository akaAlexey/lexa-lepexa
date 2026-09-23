import type { LatLon } from '../contract/schemas.ts'

const EARTH_RADIUS_KM = 6371.0088

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Расстояние по большой окружности (формула гаверсинуса), км. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Длина ломаной, км. */
export function pathLengthKm(path: readonly LatLon[]): number {
  let total = 0
  for (let i = 1; i < path.length; i++) total += distanceKm(path[i - 1]!, path[i]!)
  return total
}

export function isWithinRadius(center: LatLon, point: LatLon, radiusKm: number): boolean {
  return distanceKm(center, point) <= radiusKm
}

/** «3,2 км» / «850 м» — для людей, с русской десятичной запятой. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} м`
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km)
  return `${rounded.toLocaleString('ru-RU')} км`
}

/**
 * Расстояние от точки до ломаной (до ближайшего отрезка), км.
 * Ближайшая точка отрезка ищется в локальной равнопромежуточной проекции с центром в точке
 * (в пределах города погрешность ничтожна), само расстояние — по гаверсинусу.
 */
export function distanceToPathKm(point: LatLon, path: readonly LatLon[]): number {
  if (path.length === 0) return Infinity
  if (path.length === 1) return distanceKm(point, path[0]!)
  const kx = Math.cos(toRad(point.lat))
  const project = (p: LatLon) => ({ x: (p.lon - point.lon) * kx, y: p.lat - point.lat })
  let best = Infinity
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!
    const b = path[i]!
    const pa = project(a)
    const pb = project(b)
    const dx = pb.x - pa.x
    const dy = pb.y - pa.y
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, -(pa.x * dx + pa.y * dy) / len2))
    const closest = { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t }
    best = Math.min(best, distanceKm(point, closest))
  }
  return best
}
