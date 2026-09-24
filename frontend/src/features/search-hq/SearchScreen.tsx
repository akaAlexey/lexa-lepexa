import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useRole } from '../../app/RoleContext.tsx'
import { useServices } from '../../app/services.tsx'
import type { Fundraiser, Team, VolunteerRequest } from '../../contract/schemas.ts'
import { todayIso } from '../../domain/dates.ts'
import { formatRub } from '../../domain/format.ts'
import { progressPercent } from '../../domain/fundraising.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { ChoiceChips } from '../../ui/ChoiceChips.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { DonateDialog } from './DonateDialog.tsx'
import { FundraiserCard } from './FundraiserCard.tsx'
import { NeedsMap } from './NeedsMap.tsx'
import { RequestCard } from './RequestCard.tsx'
import { isPublishedState, JOINED_KEY, qk } from './queries.ts'
import s from './search.module.css'

const VIEWS = [
  { value: 'list', label: 'Списком', testID: 'needs-view-list' },
  { value: 'map', label: 'На карте', testID: 'needs-view-map' },
] as const

/** Ближайшая по дате заявка, в которую ещё не записались (в демо — R01). */
function nearestOpen(
  requests: readonly VolunteerRequest[],
  joined: readonly string[],
  today: string,
): VolunteerRequest | undefined {
  return requests
    .filter((r) => !joined.includes(r.id) && r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))[0]
}

export function SearchScreen() {
  const { api, platform } = useServices()
  const { role } = useRole()
  const location = useLocation()
  const queryClient = useQueryClient()
  const isCommander = role?.id === 'commander'

  const stats = useQuery({ queryKey: qk.stats, queryFn: api.getSearchStats })
  const requests = useQuery({ queryKey: qk.requests, queryFn: api.listRequests })
  const teams = useQuery({ queryKey: qk.teams, queryFn: api.listTeams })
  const fundraisers = useQuery({ queryKey: qk.fundraisers, queryFn: api.listFundraisers })
  // Тот же ключ, что у «Выходных»: список выездов общий
  const trips = useQuery({ queryKey: ['trips'], queryFn: api.listTrips })
  const [view, setView] = useState<'list' | 'map'>('list')

  const [joined, setJoined] = useState<string[]>(
    () => platform.storage.get<string[]>(JOINED_KEY) ?? [],
  )
  const [joining, setJoining] = useState<string>()
  const [joinError, setJoinError] = useState<string>()
  const [donateTo, setDonateTo] = useState<Fundraiser>()
  const closeDonate = useCallback(() => setDonateTo(undefined), [])

  const join = async (id: string) => {
    setJoining(id)
    setJoinError(undefined)
    try {
      await api.joinRequest({ id })
      const next = [...joined.filter((j) => j !== id), id]
      platform.storage.set(JOINED_KEY, next)
      setJoined(next)
      void queryClient.invalidateQueries({ queryKey: qk.requests })
    } catch {
      setJoinError('Не удалось записаться. Проверьте связь и попробуйте ещё раз.')
    } finally {
      setJoining(undefined)
    }
  }

  const target = requests.data && nearestOpen(requests.data, joined, todayIso(new Date()))
  const teamById = new Map<string, Team>((teams.data ?? []).map((t) => [t.id, t]))
  const fundraiserById = new Map<string, Fundraiser>((fundraisers.data ?? []).map((f) => [f.id, f]))
  /** Открытый сбор отряда с наибольшим дефицитом — туда ведёт «Пожертвовать отряду». */
  const fundraiserOfTeam = (teamId: string) =>
    (fundraisers.data ?? [])
      .filter((f) => f.teamId === teamId && f.collectedRub < f.goalRub)
      .sort((a, b) => b.goalRub - b.collectedRub - (a.goalRub - a.collectedRub))[0]
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

      {isCommander ? (
        <BigButton to="/search/requests/new" icon="flag" testID="search-create-request">
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
      {joinError && <Notice tone="error">{joinError}</Notice>}

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
                        canJoin={!isCommander}
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
                {list
                  .filter((t) => t.budgetCollectedRub < t.budgetGoalRub)
                  .map((t) => (
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
                          value={progressPercent(t.budgetCollectedRub, t.budgetGoalRub)}
                        />
                        {fundraiserOfTeam(t.id) && (
                          <Button
                            icon="flag"
                            onClick={() => setDonateTo(fundraiserOfTeam(t.id))}
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
