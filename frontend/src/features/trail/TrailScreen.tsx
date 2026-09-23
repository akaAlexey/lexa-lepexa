import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useServices } from '../../app/services.tsx'
import type { LatLon, Route } from '../../contract/schemas.ts'
import { distanceKm, formatDistance } from '../../domain/geo.ts'
import { questStatus } from '../../domain/trail.ts'
import { MapView, type MapMarker } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { POINT_ICON } from './pointKinds.ts'
import s from './trail.module.css'
import { finishUrl, pointUrl, useQuestProgress, useRoutes } from './useTrail.ts'

function RouteOverview({ route }: { route: Route }) {
  const navigate = useNavigate()
  const { progress } = useQuestProgress(route.id)
  const status = questStatus(route, progress)
  const done = useMemo(() => new Set(progress.donePointIds), [progress])
  const { platform } = useServices()
  // «Где я?» из единого макета: метка положения и расстояние до следующей точки
  const [me, setMe] = useState<LatLon>()
  const [geoFailed, setGeoFailed] = useState(false)
  const locate = () => {
    setGeoFailed(false)
    platform.geo.getPosition().then(setMe, () => setGeoFailed(true))
  }

  const markers = useMemo<MapMarker[]>(
    () => [
      ...route.points.map((p, i) => ({
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        icon: done.has(p.id) ? 'check' : POINT_ICON[p.kind].icon,
        label: `Точка ${i + 1}: ${p.title} (${POINT_ICON[p.kind].label})${done.has(p.id) ? ', пройдена' : ''}`,
        color: done.has(p.id) ? tokens.color.point.done : tokens.color.point[p.kind],
      })),
      ...(me
        ? [
            {
              id: 'me',
              lat: me.lat,
              lon: me.lon,
              icon: 'locate' as const,
              label: 'Вы здесь',
              color: tokens.color.map.me,
              interactive: false,
            },
          ]
        : []),
    ],
    [route, done, me],
  )
  const target = status.next ?? route.points[0]

  return (
    <>
      <p>
        {route.summary}. {formatDistance(route.lengthM / 1000)}, около {route.durationMin} мин.{' '}
        {route.demo && <DemoBadge />}
      </p>
      <p className={s.progress} data-testid="trail-progress">
        <Icon name="flag" /> Пройдено {status.done} из {status.total}
      </p>
      {status.next ? (
        <BigButton to={pointUrl(route.id, status.next.id)} icon="route" testID="trail-start">
          {status.done === 0 ? 'Начать тропу' : 'Продолжить тропу'}
        </BigButton>
      ) : (
        <BigButton to={finishUrl(route.id)} icon="check" testID="trail-start">
          Тропа пройдена — штампы
        </BigButton>
      )}
      <Button onClick={locate} icon="locate" testID="trail-locate">
        Где я?
      </Button>
      {me && target && (
        <Notice testID="trail-distance">
          Вы здесь — синяя метка на карте. До точки «{target.title}»{' '}
          {formatDistance(distanceKm(me, target))} по прямой.
        </Notice>
      )}
      {geoFailed && (
        <Notice tone="error" testID="trail-locate-error">
          Не удалось определить местоположение. Разрешите доступ к геопозиции или идите по списку
          точек ниже.
        </Notice>
      )}
      <MapView
        label={`Карта маршрута «${route.title}»`}
        center={route.points[0] ?? route.path[0]!}
        zoom={14}
        route={route.path}
        markers={markers}
        onMarkerSelect={(id) => void navigate(pointUrl(route.id, id))}
        fitToContent
        testID="trail-map"
      />
      <ol className={s.pointList} aria-label="Точки маршрута">
        {route.points.map((p, i) => (
          <li key={p.id}>
            <Link
              to={pointUrl(route.id, p.id)}
              className={s.pointLink}
              data-testid={`point-${p.id}`}
            >
              <span className={s.pointIcon} style={{ color: tokens.color.point[p.kind] }}>
                <Icon name={POINT_ICON[p.kind].icon} label={POINT_ICON[p.kind].label} size={1.3} />
              </span>
              <span className={s.pointTitle}>
                {i + 1}. {p.title}
              </span>
              {done.has(p.id) && (
                <span className={s.doneMark}>
                  <Icon name="check" /> пройдена
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </>
  )
}

export function TrailScreen() {
  const routes = useRoutes()
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
