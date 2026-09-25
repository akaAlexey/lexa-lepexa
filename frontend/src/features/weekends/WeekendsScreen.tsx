import { Link, useLocation } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { formatDayRu } from '../../domain/format.ts'
import { paths } from '../../functions/core/paths.ts'
import {
  NEAR_TRIP_RADIUS_KM,
  nearestTrip,
  spotsText,
  useTrips,
} from '../../functions/trips/index.ts'
import { useCurrentPosition } from '../../functions/whereAmI/useWhereAmI.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import type { GroupSentState } from './GroupApplicationScreen.tsx'
import { GroupList } from './GroupList.tsx'
import s from './weekends.module.css'

const groupSent = (state: unknown) =>
  typeof (state as Partial<GroupSentState> | null)?.groupSent === 'string'

export function WeekendsScreen() {
  const location = useLocation()
  const trips = useTrips()
  const me = useCurrentPosition()
  return (
    <Screen
      title="Выходные с поисковиком"
      lead="Выберите дату выезда и подготовьтесь по чек-листу новичка"
      back={
        <BackLink to={paths.events()} testID="back-link">
          К мероприятиям
        </BackLink>
      }
      testID="screen-weekends"
    >
      <QueryState query={trips} what="выезды">
        {(list) => {
          const nearest = nearestTrip(list, new Date(), me)
          return (
            <>
              {groupSent(location.state) && (
                <Notice tone="success" testID="group-sent">
                  Заявка группы отправлена. Командир отряда рассмотрит её и уточнит подготовку.
                </Notice>
              )}
              {nearest ? (
                <BigButton to={paths.trip(nearest.id)} icon="calendar" testID="weekends-register">
                  <span className={s.nearTitle}>Ближайший выезд</span>{' '}
                  <span className={s.nearDate}>{formatDayRu(nearest.date)}</span>
                </BigButton>
              ) : (
                <>
                  <BigButton
                    onClick={() => undefined}
                    disabled
                    icon="calendar"
                    testID="weekends-register"
                  >
                    Записаться на ближайший выезд
                  </BigButton>
                  <Notice>
                    {me
                      ? `В радиусе ${NEAR_TRIP_RADIUS_KM} км от вас выездов пока нет. Все даты — ниже.`
                      : 'Ближайших выездов пока нет. Загляните позже.'}
                  </Notice>
                </>
              )}
              <h2>Даты выездов</h2>
              <ul aria-label="Выезды" className="stack-list">
                {list.map((t) => (
                  <Card as="li" key={t.id} testID={`trip-${t.id}`}>
                    <Link to={paths.trip(t.id)} className={s.tripLink}>
                      {formatDayRu(t.date)}. {t.title}
                    </Link>
                    <p className={s.spots}>{spotsText(t)}</p>
                    {t.demo && <DemoBadge />}
                  </Card>
                ))}
              </ul>
              <GroupList trips={list} />
            </>
          )
        }}
      </QueryState>
    </Screen>
  )
}
