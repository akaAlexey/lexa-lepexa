import { Link, useLocation } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { formatDayRu } from '../../domain/format.ts'
import { paths } from '../../functions/core/paths.ts'
import { nearestTrip, spotsText, useTrips } from '../../functions/trips/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import type { GroupSentState } from './GroupApplicationScreen.tsx'
import { GroupList } from './GroupList.tsx'
import s from './weekends.module.css'

const groupSent = (state: unknown) =>
  typeof (state as Partial<GroupSentState> | null)?.groupSent === 'string'

export function WeekendsScreen() {
  const location = useLocation()
  const trips = useTrips()
  return (
    <Screen
      title="Выходные с поисковиком"
      lead="Выберите дату выезда и подготовьтесь по чек-листу новичка"
      testID="screen-weekends"
    >
      <QueryState query={trips} what="выезды">
        {(list) => {
          const nearest = nearestTrip(list, new Date())
          return (
            <>
              {groupSent(location.state) && (
                <Notice tone="success" testID="group-sent">
                  Заявка группы отправлена. Командир отряда рассмотрит её и уточнит подготовку.
                </Notice>
              )}
              {nearest ? (
                <BigButton to={paths.trip(nearest.id)} icon="calendar" testID="weekends-register">
                  Ближайший выезд — {formatDayRu(nearest.date)}
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
                  <Notice>Ближайших выездов пока нет. Загляните позже.</Notice>
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
