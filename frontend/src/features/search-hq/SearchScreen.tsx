import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useRole } from '../../app/RoleContext.tsx'
import type { Fundraiser, Team } from '../../contract/schemas.ts'
import { formatRub } from '../../domain/format.ts'
import { paths } from '../../functions/core/paths.ts'
import { can } from '../../functions/core/permissions.ts'
import { useFundraisers } from '../../functions/fundraising/index.ts'
import {
  budgetProgress,
  isPublishedState,
  teamsShortOfBudget,
  useJoinRequest,
  useRequests,
  useSearchStats,
  useTeams,
} from '../../functions/helpRequests/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { DonateDialog } from './DonateDialog.tsx'
import { RequestCard } from './RequestCard.tsx'
import s from './search.module.css'

export function SearchScreen() {
  const { role } = useRole()
  const location = useLocation()
  const canCreate = can(role?.id, 'request.create')

  const stats = useSearchStats()
  const requests = useRequests()
  const teams = useTeams()
  const fundraisers = useFundraisers()
  const { joined, joining, failed: joinFailed, next: target, join } = useJoinRequest(requests.data)

  const [donateTo, setDonateTo] = useState<Fundraiser>()
  const closeDonate = useCallback(() => setDonateTo(undefined), [])

  const teamById = new Map<string, Team>((teams.data ?? []).map((t) => [t.id, t]))
  const fundraiserById = new Map<string, Fundraiser>((fundraisers.data ?? []).map((f) => [f.id, f]))
  const published = isPublishedState(location.state)
  // Форма длинная: после публикации возвращаем командира к сообщению и новой карточке.
  const publishedRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (published) publishedRef.current?.scrollIntoView?.({ block: 'center' })
  }, [published])

  return (
    <Screen
      title="Поисковикам"
      lead="Отрядам нужны люди и средства на экспедиции"
      testID="screen-search"
    >
      {published && (
        <div ref={publishedRef}>
          <Notice tone="success" testID="request-published">
            Заявка опубликована. Волонтёры видят её первой в ленте.
          </Notice>
        </div>
      )}
      <QueryState query={stats} what="счётчик">
        {(st) => (
          <p className={s.counter} data-testid="found-counter">
            <span className={s.counterLabel}>
              Найдено бойцов за месяц: <DemoBadge />
            </span>
            <strong className={s.counterValue}>{st.foundThisMonth}</strong>
            <small className={s.counterSource}>
              Источник: сводки поисковых отрядов региона (демо).
            </small>
          </p>
        )}
      </QueryState>

      {canCreate ? (
        <BigButton to={paths.newRequest()} icon="flag" testID="search-create-request">
          Набрать волонтёров
        </BigButton>
      ) : (
        <BigButton
          onClick={() => target && void join(target.id)}
          disabled={!target || joining !== undefined}
          icon="shovel"
          testID="search-join"
        >
          {requests.data && !target ? 'Вы в команде' : 'Стать частью команды'}
        </BigButton>
      )}
      {joinFailed && (
        <Notice tone="error">Не удалось записаться. Проверьте связь и попробуйте ещё раз.</Notice>
      )}

      <h2>Заявки отрядов</h2>
      <QueryState query={requests} what="заявки">
        {(list) =>
          list.length === 0 ? (
            <p>Открытых заявок пока нет.</p>
          ) : (
            <ul aria-label="Заявки отрядов" className="stack-list">
              {list.map((r) => (
                <li key={r.id}>
                  <RequestCard
                    request={r}
                    team={teamById.get(r.teamId)}
                    fundraiser={r.fundraiserId ? fundraiserById.get(r.fundraiserId) : undefined}
                    canJoin={!canCreate}
                    joined={joined.includes(r.id)}
                    joining={joining === r.id}
                    onJoin={() => void join(r.id)}
                    onDonate={setDonateTo}
                  />
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>

      <h2>Отрядам не хватает на экспедиции</h2>
      <QueryState query={teams} what="отряды">
        {(list) => (
          <ul aria-label="Поисковые отряды" className="stack-list">
            {teamsShortOfBudget(list).map((t) => (
              <li key={t.id}>
                <Card as="div" testID={`team-${t.id}`}>
                  <h3>
                    Отряд «{t.name}» {t.demo && <DemoBadge />}
                  </h3>
                  <p className={s.meta}>{t.region}</p>
                  <label htmlFor={`budget-${t.id}`}>
                    Собрано {formatRub(t.budgetCollectedRub)} из {formatRub(t.budgetGoalRub)}
                  </label>
                  <progress
                    id={`budget-${t.id}`}
                    className={s.progress}
                    max={100}
                    value={budgetProgress(t)}
                  />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      {donateTo && <DonateDialog fundraiser={donateTo} onClose={closeDonate} />}
    </Screen>
  )
}
