import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useApi } from '../../app/services.tsx'
import type { Trip } from '../../contract/schemas.ts'
import { todayIso } from '../../domain/dates.ts'
import { formatDayRu } from '../../domain/format.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { freeSpots, spotsText } from './trips.ts'
import s from './weekends.module.css'

/** Ближайший выезд, на который ещё можно записаться (список отсортирован по дате). */
function nearestTrip(list: readonly Trip[], today: string): Trip | undefined {
  const upcoming = list.filter((t) => t.date >= today)
  return upcoming.find((t) => freeSpots(t) > 0) ?? upcoming[0]
}

export function WeekendsScreen() {
  const api = useApi()
  const trips = useQuery({ queryKey: ['trips'], queryFn: api.listTrips })
  return (
    <Screen
      title="Выходные с поисковиком"
      lead="Выберите дату выезда и подготовьтесь по чек-листу новичка"
      testID="screen-weekends"
    >
      <QueryState query={trips} what="выезды">
        {(list) => {
          const nearest = nearestTrip(list, todayIso(new Date()))
          return (
            <>
              {nearest ? (
                <BigButton
                  to={`/weekends/${nearest.id}`}
                  icon="calendar"
                  testID="weekends-register"
                >
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
                    <Link to={`/weekends/${t.id}`} className={s.tripLink}>
                      {formatDayRu(t.date)}. {t.title}
                    </Link>
                    <p className={s.spots}>{spotsText(t)}</p>
                    {t.demo && <DemoBadge />}
                  </Card>
                ))}
              </ul>
            </>
          )
        }}
      </QueryState>
    </Screen>
  )
}
