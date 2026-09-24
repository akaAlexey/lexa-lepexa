import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { region } from '../../config/region.ts'
import type { Fundraiser, Team, Trip, VolunteerRequest } from '../../contract/schemas.ts'
import { formatDayRu, formatRub } from '../../domain/format.ts'
import { describeRoles } from '../../domain/requests.ts'
import { paths } from '../../functions/core/paths.ts'
import { MapView, type MapMarker } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { Card } from '../../ui/Card.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { FundraiserCard } from './FundraiserCard.tsx'
import { FUNDRAISER_PURPOSE } from './purposes.ts'
import s from './search.module.css'

interface Props {
  requests: readonly VolunteerRequest[]
  trips: readonly Trip[]
  fundraisers: readonly Fundraiser[]
  teams: ReadonlyMap<string, Team>
  onDonate: (f: Fundraiser) => void
}

type Need =
  | { id: string; type: 'request'; lat: number; lon: number; request: VolunteerRequest }
  | { id: string; type: 'trip'; lat: number; lon: number; trip: Trip }
  | { id: string; type: 'money'; lat: number; lon: number; fundraiser: Fundraiser }

/** Метка и подпись потребности: «нужны люди» — лопата, «нужны деньги» — значок сбора. */
function describe(need: Need): Pick<MapMarker, 'icon' | 'color' | 'label'> {
  switch (need.type) {
    case 'request':
      return {
        icon: 'shovel',
        color: tokens.color.accent,
        label: `Нужны люди: ${need.request.title}, ${describeRoles(need.request.roles)}`,
      }
    case 'trip':
      return {
        icon: 'calendar',
        color: tokens.color.accent,
        label: `Выезд ${formatDayRu(need.trip.date)}: ${need.trip.title}, свободно мест: ${need.trip.spotsTotal - need.trip.spotsTaken}`,
      }
    case 'money':
      return {
        icon: 'flag',
        color: tokens.color.point.hq,
        label: `Нужны средства: ${FUNDRAISER_PURPOSE[need.fundraiser.purpose].label}. ${need.fundraiser.title}, не хватает ${formatRub(need.fundraiser.goalRub - need.fundraiser.collectedRub)}`,
      }
  }
}

/**
 * Карта потребностей отрядов (задача 3 кейса): где нужны люди на раскопки и где — деньги.
 * Метки дублируются списком ниже — карта не единственный путь к данным.
 */
export function NeedsMap({ requests, trips, fundraisers, teams, onDonate }: Props) {
  const [selected, setSelected] = useState<string>()
  const needs = useMemo<Need[]>(
    () => [
      ...requests.flatMap((r) =>
        r.lat !== undefined && r.lon !== undefined
          ? [{ id: `req:${r.id}`, type: 'request' as const, lat: r.lat, lon: r.lon, request: r }]
          : [],
      ),
      ...trips
        .filter((t) => t.spotsTaken < t.spotsTotal)
        .map((t) => ({
          id: `trip:${t.id}`,
          type: 'trip' as const,
          lat: t.lat,
          lon: t.lon,
          trip: t,
        })),
      ...fundraisers.flatMap((f) =>
        f.lat !== undefined && f.lon !== undefined && f.collectedRub < f.goalRub
          ? [{ id: `money:${f.id}`, type: 'money' as const, lat: f.lat, lon: f.lon, fundraiser: f }]
          : [],
      ),
    ],
    [requests, trips, fundraisers],
  )
  const markers = useMemo<MapMarker[]>(
    () => needs.map((n) => ({ id: n.id, lat: n.lat, lon: n.lon, ...describe(n) })),
    [needs],
  )
  const current = needs.find((n) => n.id === selected)

  return (
    <section aria-labelledby="needs-map-title" className={s.needsMap}>
      <h2 id="needs-map-title">Карта потребностей</h2>
      <ul className={s.needsLegend} aria-label="Обозначения">
        <li>
          <Icon name="shovel" size={1.2} /> Нужны люди на раскопки
        </li>
        <li>
          <Icon name="calendar" size={1.2} /> Выезд со свободными местами
        </li>
        <li>
          <Icon name="flag" size={1.2} /> Нужны средства: целевой сбор
        </li>
      </ul>
      <MapView
        label="Карта потребностей поисковых отрядов"
        center={region.mapCenter}
        zoom={region.mapZoom}
        markers={markers}
        onMarkerSelect={setSelected}
        fitToContent
        testID="needs-map"
      />
      {current?.type === 'money' && (
        <FundraiserCard
          fundraiser={current.fundraiser}
          team={teams.get(current.fundraiser.teamId)}
          onDonate={onDonate}
        />
      )}
      {current?.type === 'request' && (
        <Card testID="needs-selected">
          <h3>{current.request.title}</h3>
          <p className={s.meta}>
            {teams.get(current.request.teamId)?.name
              ? `Отряд «${teams.get(current.request.teamId)?.name}» · `
              : ''}
            {current.request.place}
          </p>
          <p className={s.needs}>
            Требуется: {describeRoles(current.request.roles)}. {formatDayRu(current.request.date)}
          </p>
        </Card>
      )}
      {current?.type === 'trip' && (
        <Card testID="needs-selected">
          <h3>{current.trip.title}</h3>
          <p className={s.meta}>
            {formatDayRu(current.trip.date)} · свободно мест:{' '}
            {current.trip.spotsTotal - current.trip.spotsTaken}
          </p>
          <Link to={paths.trip(current.trip.id)}>Карточка выезда и чек-лист</Link>
        </Card>
      )}
      <ul aria-label="Потребности на карте списком" className={s.needsList}>
        {needs.map((n) => (
          <li key={n.id}>
            <button type="button" className={s.needsItem} onClick={() => setSelected(n.id)}>
              {describe(n).label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
