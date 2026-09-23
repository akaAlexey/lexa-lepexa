import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { QueryState } from '../../app/QueryState.tsx'
import { useApi } from '../../app/services.tsx'
import type { Route } from '../../contract/schemas.ts'
import { formatDistance } from '../../domain/geo.ts'
import { MapView, type MapMarker } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { POINT_ICON } from './pointKinds.ts'
import { Screen } from '../../ui/Screen.tsx'

function RouteOverview({ route }: { route: Route }) {
  const markers = useMemo<MapMarker[]>(
    () =>
      route.points.map((p, i) => ({
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        icon: POINT_ICON[p.kind].icon,
        label: `Точка ${i + 1}: ${p.title} (${POINT_ICON[p.kind].label})`,
        color: tokens.color.red,
      })),
    [route],
  )
  return (
    <>
      <p>
        {route.summary}. {formatDistance(route.lengthM / 1000)}, около {route.durationMin} мин.{' '}
        {route.demo && <DemoBadge />}
      </p>
      <BigButton onClick={() => undefined} disabled icon="route" testID="trail-start">
        Начать тропу
      </BigButton>
      <p>Прохождение точек с заданиями появится в следующей итерации.</p>
      <MapView
        label={`Карта маршрута «${route.title}»`}
        center={route.points[0] ?? route.path[0]!}
        zoom={14}
        route={route.path}
        markers={markers}
        testID="trail-map"
      />
      <ol aria-label="Точки маршрута">
        {route.points.map((p) => (
          <li key={p.id}>
            <Card as="div" testID={`point-${p.id}`}>
              <Icon name={POINT_ICON[p.kind].icon} label={POINT_ICON[p.kind].label} />{' '}
              <strong>{p.title}</strong>
            </Card>
          </li>
        ))}
      </ol>
    </>
  )
}

export function TrailScreen() {
  const api = useApi()
  const routes = useQuery({ queryKey: ['routes'], queryFn: api.listRoutes })
  return (
    <Screen
      title="Тропа"
      lead="Семейный маршрут по местам боёв с заданиями для ребёнка"
      testID="screen-trail"
    >
      <QueryState query={routes} what="маршруты">
        {(list) => (list[0] ? <RouteOverview route={list[0]} /> : <p>Маршрутов пока нет.</p>)}
      </QueryState>
    </Screen>
  )
}
