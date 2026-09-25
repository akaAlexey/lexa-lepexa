import { useState } from 'react'
import { Link } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useRole } from '../../app/RoleContext.tsx'
import type { SiteStatus } from '../../contract/schemas.ts'
import { describeFighters, SITE_STATUS_ORDER } from '../../domain/lastBattle.ts'
import { paths } from '../../functions/core/paths.ts'
import { can } from '../../functions/core/permissions.ts'
import { usePlaces } from '../../functions/places/index.ts'
import { BackLink } from '../../ui/BackLink.tsx'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { SelectField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { StatusBadge } from '../../ui/StatusBadge.tsx'
import { SITE_STATUS_META } from '../../ui/siteStatus.ts'
import { SubscribeFinds } from './SubscribeFinds.tsx'
import s from './lastBattle.module.css'

export function LastBattleScreen() {
  const places = usePlaces()
  const { role } = useRole()
  const [status, setStatus] = useState<SiteStatus | 'all'>('all')
  return (
    <Screen
      title="Последний бой"
      lead="Места гибели бойцов: от находки до подтверждения по архиву и подъёма останков"
      back={<BackLink to={paths.other()}>К разделам</BackLink>}
      testID="screen-last-battle"
    >
      {can(role?.id, 'place.create') && (
        <BigButton to={paths.newSite()} icon="pin" testID="last-battle-add">
          Отметить место гибели
        </BigButton>
      )}
      <Link to={paths.map()} data-testid="last-battle-map">
        Открыть карту мест поиска
      </Link>
      <SubscribeFinds />
      <SelectField
        label="Статус поиска"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'all', label: 'Все места' },
          ...SITE_STATUS_ORDER.map((value) => ({ value, label: SITE_STATUS_META[value].label })),
        ]}
        testID="last-battle-filter"
      />
      <QueryState query={places} what="места поиска">
        {(list) => {
          const shown = list.filter((site) => status === 'all' || site.status === status)
          return shown.length ? (
            <ul className={s.sites} aria-label="Места последнего боя">
              {shown.map((site) => (
                <li key={site.id}>
                  <Card>
                    <Link
                      to={paths.site(site.id)}
                      className={s.siteLink}
                      data-testid={`last-battle-site-${site.id}`}
                    >
                      <h3>{site.placeName}</h3>
                      <StatusBadge status={site.status} />
                      <p>{describeFighters(site)}</p>
                      <p>
                        {site.dateText} · {site.unit}
                      </p>
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Notice>Мест с выбранным статусом пока нет.</Notice>
          )
        }}
      </QueryState>
    </Screen>
  )
}
