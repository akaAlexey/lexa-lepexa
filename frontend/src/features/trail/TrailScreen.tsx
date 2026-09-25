import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import type { Route } from '../../contract/schemas.ts'
import { formatDistance } from '../../domain/geo.ts'
import { paths } from '../../functions/core/paths.ts'
import { routeMarkers } from '../../functions/mapLayers/index.ts'
import {
  POINT_ICON,
  questOverview,
  useQuestProgress,
  useRoutes,
} from '../../functions/quest/index.ts'
import { distanceFromMe, useWhereAmI } from '../../functions/whereAmI/index.ts'
import { MapView } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './trail.module.css'

function RouteOverview({ route }: { route: Route }) {
  const navigate = useNavigate()
  const { progress, done } = useQuestProgress(route.id)
  const status = questOverview(route, progress)
  // «Где я?» из единого макета: метка положения и расстояние до следующей точки
  const { me, failed: geoFailed, locate } = useWhereAmI()
  const markers = useMemo(() => routeMarkers(route, done, me), [route, done, me])
  const target = status.target

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
        <BigButton to={status.continueTo} icon="route" testID="trail-start">
          {status.done === 0 ? 'Начать тропу' : 'Продолжить тропу'}
        </BigButton>
      ) : (
        <BigButton to={status.continueTo} icon="check" testID="trail-start">
          Тропа пройдена — штампы
        </BigButton>
      )}
      <Button onClick={locate} icon="locate" testID="trail-locate">
        Где я?
      </Button>
      {me && target && (
        <Notice testID="trail-distance">
          Вы здесь — синяя метка на карте. До точки «{target.title}»{' '}
          {formatDistance(distanceFromMe(me, target))} по прямой.
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
        onMarkerSelect={(id) => void navigate(paths.point(route.id, id))}
        fitToContent
        testID="trail-map"
      />
      <ol className={s.pointList} aria-label="Точки маршрута">
        {route.points.map((p, i) => (
          <li key={p.id}>
            <Link
              to={paths.point(route.id, p.id)}
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
      back={
        <BackLink to={paths.map()} testID="back-link">
          К карте
        </BackLink>
      }
      testID="screen-trail"
    >
      <QueryState query={routes} what="маршруты">
        {(list) => (list[0] ? <RouteOverview route={list[0]} /> : <p>Маршрутов пока нет.</p>)}
      </QueryState>
    </Screen>
  )
}
