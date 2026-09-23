import { useQuery } from '@tanstack/react-query'
import { QueryState } from '../../app/QueryState.tsx'
import { useApi } from '../../app/services.tsx'
import { formatDayRu } from '../../domain/format.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Screen } from '../../ui/Screen.tsx'

export function WeekendsScreen() {
  const api = useApi()
  const trips = useQuery({ queryKey: ['trips'], queryFn: api.listTrips })
  return (
    <Screen
      title="Выходные с поисковиком"
      lead="Выберите дату выезда и подготовьтесь по чек-листу новичка"
      testID="screen-weekends"
    >
      <BigButton onClick={() => undefined} disabled icon="calendar" testID="weekends-register">
        Записаться на выезд
      </BigButton>
      <p>Запись и чек-лист появятся в следующей итерации.</p>
      <QueryState query={trips} what="выезды">
        {(list) => (
          <ul aria-label="Выезды" className="stack-list">
            {list.map((t) => (
              <li key={t.id}>
                <Card as="div" testID={`trip-${t.id}`}>
                  <h2>{formatDayRu(t.date)}</h2>
                  <p>
                    {t.title}. Свободно мест: {t.spotsTotal - t.spotsTaken} из {t.spotsTotal}{' '}
                    {t.demo && <DemoBadge />}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </Screen>
  )
}
