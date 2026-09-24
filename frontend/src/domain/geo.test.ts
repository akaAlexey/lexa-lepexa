// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { distanceKm, formatDistance, isWithinRadius, pathLengthKm } from './geo.ts'

const orel = { lat: 52.9651, lon: 36.0785 }

describe('geo', () => {
  it('один градус широты ≈ 111,2 км', () => {
    expect(distanceKm({ lat: 52, lon: 36 }, { lat: 53, lon: 36 })).toBeCloseTo(111.2, 1)
  })

  it('граница радиуса 20 км: 19,9 км — внутри, 20,1 км — снаружи', () => {
    const kmPerDegLat = distanceKm({ lat: 52, lon: 36 }, { lat: 53, lon: 36 })
    const north = (km: number) => ({ lat: orel.lat + km / kmPerDegLat, lon: orel.lon })
    expect(isWithinRadius(orel, north(19.9), 20)).toBe(true)
    expect(isWithinRadius(orel, north(20.1), 20)).toBe(false)
  })

  it('длина ломаной — сумма отрезков', () => {
    const a = { lat: 52, lon: 36 }
    const b = { lat: 52.01, lon: 36 }
    const c = { lat: 52.02, lon: 36 }
    expect(pathLengthKm([a, b, c])).toBeCloseTo(distanceKm(a, c), 6)
  })

  it('расстояние по-русски', () => {
    expect(formatDistance(0.85)).toBe('850 м')
    expect(formatDistance(3.04)).toBe('3 км')
    expect(formatDistance(3.26)).toBe('3,3 км')
  })
})
