import type { LatLon } from '../../contract/schemas.ts'
import type { GeoService } from '../types.ts'

/** Подставная геопозиция для показа: не зависит от GPS и разрешений. */
export function createDemoGeo(initial: LatLon): GeoService & { setPosition(p: LatLon): void } {
  let position = initial
  return {
    source: 'demo',
    getPosition: () => Promise.resolve(position),
    setPosition(p) {
      position = p
    },
  }
}
