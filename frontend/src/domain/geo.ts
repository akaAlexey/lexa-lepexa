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
