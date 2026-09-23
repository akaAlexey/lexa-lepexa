import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useRole } from '../../app/RoleContext.tsx'
import { SUBSCRIPTION_KEY, subscribeNearby, useApi, useServices } from '../../app/services.tsx'
import { region } from '../../config/region.ts'
import type { Grave, LastBattleSite, SiteStatus } from '../../contract/schemas.ts'
import { describeFighters, NOTIFY_RADIUS_KM, SITE_STATUS_ORDER } from '../../domain/lastBattle.ts'
import { MapView, type MapMarker } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { SITE_STATUS_META } from '../../ui/siteStatus.ts'
import { StatusBadge } from '../../ui/StatusBadge.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './lastBattle.module.css'

const SITE_MARKER_PREFIX = 'site-'

function BattleMap({ sites, graves }: { sites: LastBattleSite[]; graves: Grave[] }) {
  const navigate = useNavigate()
  const markers = useMemo<MapMarker[]>(
    () => [
      ...graves.map((g) => ({
        id: `grave-${g.id}`,
        lat: g.lat,
        lon: g.lon,
        icon: 'grave' as const,
        label: `Захоронение: ${g.fullName}, ${g.unit}`,
        color: tokens.color.map.grave,
        size: 'small' as const,
      })),
      ...sites.map((site) => ({
        id: `${SITE_MARKER_PREFIX}${site.id}`,
        lat: site.lat,
        lon: site.lon,
        icon: SITE_STATUS_META[site.status].icon,
        label: `${site.placeName}: ${SITE_STATUS_META[site.status].label}`,
        color: tokens.color.status[site.status],
      })),
    ],
    [sites, graves],
  )
  const onMarkerSelect = useCallback(
    (id: string) => {
      if (id.startsWith(SITE_MARKER_PREFIX)) {
        void navigate(`/last-battle/${id.slice(SITE_MARKER_PREFIX.length)}`)
      }
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
          <span className={s.legendIcon} style={{ color: tokens.color.map.grave }}>
            <Icon name="grave" size={1.2} />
          </span>
          Воинское захоронение
        </li>
      </ul>
    </section>
  )
}

function SiteList({ sites }: { sites: LastBattleSite[] }) {
  return (
    <section aria-labelledby="battle-sites">
      <h2 id="battle-sites">Места гибели</h2>
      <ul className="stack-list">
        {sites.map((site) => (
          <li key={site.id}>
            <Card as="div" testID={`site-${site.id}`}>
              <Link to={`/last-battle/${site.id}`} className={s.siteLink}>
                <h3>{site.placeName}</h3>
                <StatusBadge status={site.status} />
                <p>
                  {describeFighters(site)}. {site.dateText}. {site.demo && <DemoBadge />}
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
  const services = useServices()
  const [subscribed, setSubscribed] = useState(
    () => services.platform.storage.get(SUBSCRIPTION_KEY) !== undefined,
  )
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const subscribe = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await subscribeNearby(services)
      setSubscribed(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

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
  const api = useApi()
  const { role } = useRole()
  const sites = useQuery({ queryKey: ['sites'], queryFn: api.listSites })
  const graves = useQuery({ queryKey: ['graves'], queryFn: api.listGraves })
  return (
    <Screen
      title="Последний бой"
      lead="Места гибели бойцов, которые ещё предстоит проверить и увековечить"
      testID="screen-last-battle"
    >
      {role?.id === 'commander' ? (
        <BigButton to="/last-battle/new" icon="pin" testID="last-battle-add">
          Отметить место гибели
        </BigButton>
      ) : (
        <SubscribeAction />
      )}
      <QueryState query={sites} what="места">
        {(siteList) => (
          <>
            {graves.data && <BattleMap sites={siteList} graves={graves.data} />}
            <Legend />
            <SiteList sites={siteList} />
          </>
        )}
      </QueryState>
    </Screen>
  )
}
