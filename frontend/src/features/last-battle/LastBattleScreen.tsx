import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { QueryState } from '../../app/QueryState.tsx'
import { useApi } from '../../app/services.tsx'
import { region } from '../../config/region.ts'
import type { Grave, LastBattleSite } from '../../contract/schemas.ts'
import { MapView, type MapMarker } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { SITE_STATUS_META } from '../../ui/siteStatus.ts'
import { StatusBadge } from '../../ui/StatusBadge.tsx'
import { Screen } from '../../ui/Screen.tsx'

function BattleMap({ sites, graves }: { sites: LastBattleSite[]; graves: Grave[] }) {
  const markers = useMemo<MapMarker[]>(
    () => [
      ...graves.map((g) => ({
        id: `grave-${g.id}`,
        lat: g.lat,
        lon: g.lon,
        icon: 'grave' as const,
        label: `Захоронение: ${g.fullName}, ${g.unit}`,
        color: tokens.color.map.grave,
      })),
      ...sites.map((site) => ({
        id: `site-${site.id}`,
        lat: site.lat,
        lon: site.lon,
        icon: SITE_STATUS_META[site.status].icon,
        label: `${site.placeName}: ${SITE_STATUS_META[site.status].label}`,
        color: tokens.color.status[site.status],
      })),
    ],
    [sites, graves],
  )
  return (
    <MapView
      label="Карта «Последний бой»: места гибели и захоронения"
      center={region.mapCenter}
      zoom={region.mapZoom}
      markers={markers}
      fitToContent
      testID="battle-map"
    />
  )
}

export function LastBattleScreen() {
  const api = useApi()
  const sites = useQuery({ queryKey: ['sites'], queryFn: api.listSites })
  const graves = useQuery({ queryKey: ['graves'], queryFn: api.listGraves })
  return (
    <Screen
      title="Последний бой"
      lead="Места гибели бойцов, которые ещё предстоит проверить и увековечить"
      testID="screen-last-battle"
    >
      <BigButton onClick={() => undefined} disabled icon="pin" testID="last-battle-help">
        Я готов помочь в подъёме
      </BigButton>
      <p>Карточки мест и добавление новых появятся в следующей итерации.</p>
      <QueryState query={sites} what="места">
        {(siteList) => (
          <>
            {graves.data && <BattleMap sites={siteList} graves={graves.data} />}
            <p>
              На карте: {siteList.length} мест(а) гибели и {graves.data?.length ?? 0} захоронений.{' '}
              <DemoBadge />
            </p>
            <ul aria-label="Места гибели" className="stack-list">
              {siteList.map((site) => (
                <li key={site.id}>
                  <Card as="div" testID={`site-${site.id}`}>
                    <h2>{site.placeName}</h2>
                    <StatusBadge status={site.status} />
                    <p>
                      {site.unit}, {site.dateText}. Бойцов: {site.fightersCount}.
                    </p>
                    <p>Источник: {site.sources.map((src) => src.title).join('; ')}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </QueryState>
    </Screen>
  )
}
