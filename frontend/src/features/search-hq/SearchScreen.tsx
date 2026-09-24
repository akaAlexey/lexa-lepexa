import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useRole } from '../../app/RoleContext.tsx'
import type { Fundraiser, Team } from '../../contract/schemas.ts'
import { formatRub } from '../../domain/format.ts'
import { paths } from '../../functions/core/paths.ts'
import { can } from '../../functions/core/permissions.ts'
import { neediestFundraiserOfTeam, useFundraisers } from '../../functions/fundraising/index.ts'
import {
  budgetProgress,
  isPublishedState,
  teamsShortOfBudget,
  useJoinRequest,
  useRequests,
  useSearchStats,
  useTeams,
} from '../../functions/helpRequests/index.ts'
import { useTrips } from '../../functions/trips/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { ChoiceChips } from '../../ui/ChoiceChips.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { DonateDialog } from './DonateDialog.tsx'
import { FundraiserCard } from './FundraiserCard.tsx'
import { NeedsMap } from './NeedsMap.tsx'
import { RequestCard } from './RequestCard.tsx'
import s from './search.module.css'

const VIEWS = [
  { value: 'list', label: 'Списком', testID: 'needs-view-list' },
  { value: 'map', label: 'На карте', testID: 'needs-view-map' },
] as const

export function SearchScreen() {
  const { role } = useRole()
  const location = useLocation()
  const canCreate = can(role?.id, 'request.create')

  const stats = useSearchStats()
  const requests = useRequests()
  const teams = useTeams()
  const fundraisers = useFundraisers()
  const trips = useTrips()
  const [view, setView] = useState<'list' | 'map'>('list')
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
      back={
        <BackLink to={paths.events()} testID="back-link">
          К мероприятиям
        </BackLink>
      }
      testID="screen-search"
    >
      {published && (
        <div ref={publishedRef}>
          <Notice tone="success" testID="request-published">
            Заявка опубликована. Волонтёры видят её первой в ленте.
          </Notice>
        </div>
      )}
      {/* Одна пометка на экран вместо плашки на каждой карточке: данные честно помечены, экран не пестрит */}
      <p className={s.demoNote} data-testid="search-demo-note">
        <DemoBadge /> Отряды, заявки, сборы и счётчик на этом экране — демонстрационные
      </p>
      <QueryState query={stats} what="счётчик">
        {(st) => (
          <p className={s.counter} data-testid="found-counter">
            <span className={s.counterLabel}>Найдено бойцов за месяц:</span>
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

      <ChoiceChips legend="Потребности отрядов" options={VIEWS} value={view} onChange={setView} />
      {view === 'map' ? (
        <NeedsMap
          requests={requests.data ?? []}
          trips={trips.data ?? []}
          fundraisers={fundraisers.data ?? []}
          teams={teamById}
          onDonate={setDonateTo}
        />
      ) : (
        <>
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

          <h2>Целевые сборы</h2>
          <QueryState query={fundraisers} what="сборы">
            {(list) => (
              <ul aria-label="Целевые сборы" className="stack-list">
                {list.map((f) => (
                  <li key={f.id}>
                    <FundraiserCard
                      fundraiser={f}
                      team={teamById.get(f.teamId)}
                      onDonate={setDonateTo}
                    />
                  </li>
                ))}
              </ul>
            )}
          </QueryState>

          <h2>Отрядам не хватает на экспедиции</h2>
          <QueryState query={teams} what="отряды">
            {(list) => (
              <ul aria-label="Поисковые отряды" className="stack-list">
                {teamsShortOfBudget(list).map((t) => (
                  <li key={t.id}>
                    <Card as="div" testID={`team-${t.id}`}>
                      <h3>Отряд «{t.name}»</h3>
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
                      {neediestFundraiserOfTeam(fundraisers.data ?? [], t.id) && (
                        <Button
                          icon="flag"
                          onClick={() =>
                            setDonateTo(neediestFundraiserOfTeam(fundraisers.data ?? [], t.id))
                          }
                          testID={`team-donate-${t.id}`}
                        >
                          Пожертвовать отряду
                        </Button>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </>
      )}

      {donateTo && <DonateDialog fundraiser={donateTo} onClose={closeDonate} />}
    </Screen>
  )
}
