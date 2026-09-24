import type { LatLon, Route } from '../../contract/schemas.ts'
import type { MapMarker } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { POINT_ICON } from '../quest/index.ts'

/**
 * Слой «Маршрут»: точки по порядку (пройденные — с галочкой) и «Вы здесь», если позиция известна.
 * Экран оборачивает вызов в `useMemo`: MapView пересоздаёт метки при смене массива.
 */
export function routeMarkers(route: Route, done: ReadonlySet<string>, me?: LatLon): MapMarker[] {
  const points = route.points.map((p, i): MapMarker => {
    const kind = POINT_ICON[p.kind]
    const passed = done.has(p.id)
    return {
      id: p.id,
      lat: p.lat,
      lon: p.lon,
      icon: passed ? 'check' : kind.icon,
      label: `Точка ${i + 1}: ${p.title} (${kind.label})${passed ? ', пройдена' : ''}`,
      color: passed ? tokens.color.point.done : tokens.color.point[p.kind],
    }
  })
  if (!me) return points
  return [
    ...points,
    {
      id: 'me',
      lat: me.lat,
      lon: me.lon,
      icon: 'locate',
      label: 'Вы здесь',
      color: tokens.color.map.me,
      interactive: false,
    },
  ]
}
