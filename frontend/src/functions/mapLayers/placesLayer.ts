import type { Grave, LastBattleSite } from '../../contract/schemas.ts'
import type { MapMarker } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { SITE_STATUS_META } from '../../ui/siteStatus.ts'

const SITE_MARKER_PREFIX = 'site-'

/**
 * Слой «Последний бой»: места гибели — зоны по статусам (иконка + подпись + цвет),
 * захоронения — мелкий фоновый слой без фокуса под ними.
 */
export function placesLayer(
  sites: readonly LastBattleSite[],
  graves: readonly Grave[],
): MapMarker[] {
  return [
    ...graves.map((g) => ({
      id: `grave-${g.id}`,
      lat: g.lat,
      lon: g.lon,
      icon: 'grave' as const,
      label: `Захоронение: ${g.fullName}, ${g.unit}`,
      color: tokens.color.map.grave,
      size: 'small' as const,
      interactive: false,
    })),
    ...sites.map((site) => ({
      id: `${SITE_MARKER_PREFIX}${site.id}`,
      lat: site.lat,
      lon: site.lon,
      icon: SITE_STATUS_META[site.status].icon,
      label: `${site.placeName}: ${SITE_STATUS_META[site.status].label}`,
      color: tokens.color.status[site.status],
      shape: 'zone' as const,
    })),
  ]
}

/** Id места по метке слоя; метка не места (захоронение) — `undefined`. */
export function placeIdOfMarker(markerId: string): string | undefined {
  return markerId.startsWith(SITE_MARKER_PREFIX)
    ? markerId.slice(SITE_MARKER_PREFIX.length)
    : undefined
}
