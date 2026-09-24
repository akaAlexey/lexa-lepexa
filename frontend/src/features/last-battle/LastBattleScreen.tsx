import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useRole } from '../../app/RoleContext.tsx'
import { paths } from '../../functions/core/paths.ts'
import { can } from '../../functions/core/permissions.ts'
import { placeIdOfMarker, placesLayer } from '../../functions/mapLayers/index.ts'
import { useNearbySubscription } from '../../functions/nearbyAlerts/index.ts'
import { useGraves, usePlaces } from '../../functions/places/index.ts'
import { region } from '../../config/region.ts'
import type { Grave, LastBattleSite, SiteStatus } from '../../contract/schemas.ts'
import { describeFighters, NOTIFY_RADIUS_KM, SITE_STATUS_ORDER } from '../../domain/lastBattle.ts'
import { MapView } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { SITE_STATUS_META } from '../../ui/siteStatus.ts'
import { StatusBadge } from '../../ui/StatusBadge.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './lastBattle.module.css'

const NO_GRAVES: Grave[] = []

function BattleMap({ sites, graves }: { sites: LastBattleSite[]; graves: Grave[] }) {
  const navigate = useNavigate()
  const markers = useMemo(() => placesLayer(sites, graves), [sites, graves])
  const onMarkerSelect = useCallback(
    (id: string) => {
      const placeId = placeIdOfMarker(id)
      if (placeId !== undefined) void navigate(paths.site(placeId))
    },
    [navigate],
  )
  return (
    <MapView
      label="Карта «Последний бой»: места гибели и захоронения"
      center={region.mapCenter}
      zoom={region.mapZoom}
      markers={markers}
      onMarkerSelect={onMarkerSelect}
      fitToContent
      testID="battle-map"
    />
  )
}

function LegendItem({ status }: { status: SiteStatus }) {
  const meta = SITE_STATUS_META[status]
  return (
    <li className={s.legendItem}>
      <span className={s.legendIcon} style={{ color: tokens.color.status[status] }}>
        <Icon name={meta.icon} size={1.2} />
      </span>
      {meta.label}
    </li>
  )
}

function Legend() {
  return (
    <section aria-labelledby="battle-legend">
      <h2 id="battle-legend" className="visually-hidden">
        Обозначения на карте
      </h2>
      <ul className={s.legend} data-testid="battle-legend">
        {SITE_STATUS_ORDER.map((status) => (
          <LegendItem key={status} status={status} />
        ))}
        <li className={s.legendItem}>
          <span className={s.legendIconGrave} style={{ color: tokens.color.map.grave }}>
            <Icon name="grave" size={1.2} />
          </span>
          Воинское захоронение
        </li>
      </ul>
    </section>
  )
}

/** Точка в конце фразы, если её там ещё нет («Иванов И.И.» не получает вторую). */
const withPeriod = (text: string) => (text.endsWith('.') ? text : `${text}.`)

function SiteList({ sites }: { sites: LastBattleSite[] }) {
  return (
    <section aria-labelledby="battle-sites">
      <h2 id="battle-sites">Места гибели</h2>
      <ul className="stack-list">
        {sites.map((site) => (
          <li key={site.id}>
            <Card as="div" testID={`site-${site.id}`}>
              <Link to={paths.site(site.id)} className={s.siteLink}>
                <h3>{site.placeName}</h3>
                <StatusBadge status={site.status} />
                <p>
                  {withPeriod(describeFighters(site))} {site.dateText}. {site.demo && <DemoBadge />}
                </p>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Главное действие не командира: подписка на находки в радиусе 20 км одним нажатием. */
function SubscribeAction() {
  const { subscribed, busy, failed, subscribe } = useNearbySubscription()

  if (subscribed) {
    return (
      <Notice tone="success" testID="subscribe-done">
        Вы подписаны: сообщим о находках в радиусе {NOTIFY_RADIUS_KM} км
      </Notice>
    )
  }
  return (
    <>
      <BigButton
        onClick={() => void subscribe()}
        disabled={busy}
        icon="bell"
        testID="last-battle-subscribe"
      >
        Сообщать о находках рядом
      </BigButton>
      {failed && (
        <Notice tone="error" testID="subscribe-error">
          Не удалось подписаться: проверьте доступ к геопозиции и связь, затем попробуйте ещё раз
        </Notice>
      )}
    </>
  )
}

export function LastBattleScreen() {
  const { role } = useRole()
  const [showGraves, setShowGraves] = useState(false)
  const sites = usePlaces()
  const graves = useGraves()
  return (
    <Screen
      title="Последний бой"
      lead="Места гибели бойцов, которые ещё предстоит проверить и увековечить"
      testID="screen-last-battle"
    >
      {can(role?.id, 'place.create') ? (
        <BigButton to={paths.newSite()} icon="pin" testID="last-battle-add">
          Отметить место гибели
        </BigButton>
      ) : (
        <SubscribeAction />
      )}
      <QueryState query={sites} what="места">
        {(siteList) => (
          <>
            <Button
              pressed={showGraves}
              onClick={() => setShowGraves((v) => !v)}
              icon="grave"
              testID="toggle-graves"
            >
              {showGraves ? 'Скрыть' : 'Показать'} воинские захоронения
              {graves.data ? ` · ${graves.data.length}` : ''}
            </Button>
            <BattleMap
              sites={siteList}
              graves={showGraves ? (graves.data ?? NO_GRAVES) : NO_GRAVES}
            />
            <Legend />
            <SiteList sites={siteList} />
          </>
        )}
      </QueryState>
    </Screen>
  )
}
