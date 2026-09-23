import { useQuery } from '@tanstack/react-query'
import { QueryState } from '../../app/QueryState.tsx'
import { useApi } from '../../app/services.tsx'
import { formatRub } from '../../domain/format.ts'
import { progressPercent } from '../../domain/fundraising.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Screen } from '../../ui/Screen.tsx'

export function SearchScreen() {
  const api = useApi()
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.getSearchStats })
  const teams = useQuery({ queryKey: ['teams'], queryFn: api.listTeams })
  return (
    <Screen
      title="Поисковикам"
      lead="Отрядам нужны люди и средства на экспедиции"
      testID="screen-search"
    >
      <QueryState query={stats} what="счётчик">
        {(st) => (
          <p data-testid="found-counter">
            Найдено бойцов за месяц: <strong>{st.foundThisMonth}</strong> <DemoBadge />
          </p>
        )}
      </QueryState>
      <BigButton onClick={() => undefined} disabled icon="shovel" testID="search-join">
        Стать частью команды
      </BigButton>
      <p>Заявки, запись и сборы появятся в следующей итерации.</p>
      <h2>Отряды</h2>
      <QueryState query={teams} what="отряды">
        {(list) => (
          <ul aria-label="Поисковые отряды" className="stack-list">
            {list.map((t) => (
              <li key={t.id}>
                <Card as="div" testID={`team-${t.id}`}>
                  <h3>Отряд «{t.name}»</h3>
                  <p>{t.region}</p>
                  <label htmlFor={`budget-${t.id}`}>
                    Собрано {formatRub(t.budgetCollectedRub)} из {formatRub(t.budgetGoalRub)}
                  </label>
                  <progress
                    id={`budget-${t.id}`}
                    max={100}
                    value={progressPercent(t.budgetCollectedRub, t.budgetGoalRub)}
                    style={{ display: 'block', width: '100%', height: '1rem' }}
                  />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </Screen>
  )
}
