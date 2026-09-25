import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { useRole } from '../../app/RoleContext.tsx'
import type { Fundraiser } from '../../contract/schemas.ts'
import {
  EVENT_FILTERS,
  eventFilterOf,
  filterFeed,
  type EventFilter,
  type FeedItem,
} from '../../domain/events.ts'
import { formatDayRu } from '../../domain/format.ts'
import { paths } from '../../functions/core/paths.ts'
import { can } from '../../functions/core/permissions.ts'
import { useDeps } from '../../functions/core/useDeps.ts'
import { useEventsFeed, type FeedState } from '../../functions/events/useEvents.ts'
import { pendingByTrip, useGroupApplications } from '../../functions/groupApplications/index.ts'
import { isPublishedState } from '../../functions/helpRequests/index.ts'
import { useSignups, type SignupTarget } from '../../functions/signup/index.ts'
import { nearestTrip } from '../../functions/trips/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { DonateDialog } from '../search-hq/DonateDialog.tsx'
import s from './events.module.css'
import { FeedCard } from './FeedCard.tsx'
import { SignupDialog } from './SignupDialog.tsx'
import { WeekNewsCard } from './WeekNewsCard.tsx'

const NO_ITEMS: FeedItem[] = []
const NO_PENDING: ReadonlyMap<string, number> = new Map()

/**
 * «Мероприятия» (ADR 0012) — главная страница: «Новости недели» первой строкой, затем одна лента
 * заявок, выездов и сборов по дате публикации. Поиск и фильтр; фильтр — в адресе (?show=trip),
 * поэтому бывшие страницы /weekends и /search ведут сюда с нужным фильтром.
 */
export function EventsScreen() {
  const { role } = useRole()
  const location = useLocation()
  const feed = useEventsFeed()
  const { isSignedUp } = useSignups()
  const [signupFor, setSignupFor] = useState<SignupTarget>()
  const closeSignup = useCallback(() => setSignupFor(undefined), [])
  const [params, setParams] = useSearchParams()
  const filter = eventFilterOf(params.get('show'))
  const setFilter = (f: EventFilter) =>
    setParams(f === 'all' ? {} : { show: f }, { replace: true, preventScrollReset: true })
  const [query, setQuery] = useState('')
  const [donateTo, setDonateTo] = useState<Fundraiser>()
  const closeDonate = useCallback(() => setDonateTo(undefined), [])
  const isCommander = can(role?.id, 'request.create')
  const groups = useGroupApplications()
  const pending = useMemo(
    () => (can(role?.id, 'group.decide') && groups.data ? pendingByTrip(groups.data) : NO_PENDING),
    [role?.id, groups.data],
  )
  const published = isPublishedState(location.state)
  const publishedRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (published) publishedRef.current?.scrollIntoView?.({ block: 'center' })
  }, [published])

  const items = feed.status === 'ready' ? feed.items : NO_ITEMS
  const shown = useMemo(() => filterFeed(items, filter, query), [items, filter, query])

  const main = isCommander ? (
    <BigButton to={paths.newRequest()} icon="flag" testID="search-create-request">
      Набрать волонтёров
    </BigButton>
  ) : can(role?.id, 'story.verify') ? (
    <BigButton to={paths.archive()} icon="book" testID="events-archive">
      Проверить истории
    </BigButton>
  ) : (
    <NearestTripButton feed={feed} />
  )

  return (
    <Screen
      title="Мероприятия"
      lead="Новости поисковых отрядов: выезды, набор волонтёров и сборы"
      aside={main}
      testID="screen-events"
    >
      {published && (
        <div ref={publishedRef}>
          <Notice tone="success" testID="request-published">
            Заявка опубликована. Волонтёры видят её первой в ленте.
          </Notice>
        </div>
      )}

      <div className={s.tools} role="search">
        <label className={s.search}>
          <Icon name="search" size={1.2} />
          <span className="visually-hidden">Поиск по мероприятиям</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: отряд, место, выезд…"
            data-testid="events-search"
          />
        </label>
        <div className={s.filters} role="group" aria-label="Что показать">
          {EVENT_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={s.filter}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              data-testid={`events-filter-${f.value}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className={s.feed} aria-label="Лента мероприятий">
        <li>
          <WeekNewsCard />
        </li>
        {feed.status === 'pending' && (
          <li>
            <div role="status" className={s.feedState} data-testid="loading">
              Загружаем мероприятия…
            </div>
          </li>
        )}
        {feed.status === 'error' && (
          <li>
            <div role="alert" className={s.feedState} data-testid="error">
              <p>Не удалось загрузить мероприятия. Проверьте связь и попробуйте ещё раз.</p>
              <button type="button" className={s.retry} onClick={feed.retry}>
                Повторить
              </button>
            </div>
          </li>
        )}
        {shown.map((item) => {
          const target = signupTarget(item)
          return (
            <li key={`${item.kind}-${item.id}`}>
              <FeedCard
                item={item}
                canSignUp={can(role?.id, 'request.join')}
                signedUp={target ? isSignedUp(target) : false}
                onSignUp={() => target && setSignupFor(target)}
                onDonate={setDonateTo}
                pendingGroups={item.kind === 'trip' ? pending.get(item.id) : undefined}
              />
            </li>
          )
        })}
        {feed.status === 'ready' && shown.length === 0 && (
          <li className={s.empty} data-testid="events-empty">
            {query || filter !== 'all' ? (
              <>
                Ничего не нашли. Попробуйте другое слово или{' '}
                <button
                  type="button"
                  className={s.retry}
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                  }}
                >
                  покажите все мероприятия
                </button>
                .
              </>
            ) : (
              'Мероприятий пока нет. Загляните позже.'
            )}
          </li>
        )}
      </ul>
      {donateTo && <DonateDialog fundraiser={donateTo} onClose={closeDonate} />}
      {signupFor && <SignupDialog target={signupFor} onClose={closeSignup} />}
    </Screen>
  )
}

/**
 * Главная кнопка волонтёра и гостя: ближайший выезд открывается карточкой с условиями.
 * Записывает только сама карточка — после того как человек прочитал условия (решение команды 25.09).
 */
function NearestTripButton({ feed }: { feed: FeedState }) {
  const { now } = useDeps()
  if (feed.status === 'pending')
    return (
      <BigButton onClick={() => undefined} disabled icon="calendar" testID="events-nearest-trip">
        Загружаем выезды…
      </BigButton>
    )
  if (feed.status === 'error') return null
  const trip = nearestTrip(feed.trips, now())
  if (!trip) return null
  return (
    <BigButton to={paths.trip(trip.id)} icon="calendar" testID="events-nearest-trip">
      Ближайший выезд — {formatDayRu(trip.date)}
    </BigButton>
  )
}

/** Запись — на заявку или выезд; у сбора записи нет. */
function signupTarget(item: FeedItem): SignupTarget | undefined {
  if (item.kind === 'request') return { kind: 'request', request: item.request }
  if (item.kind === 'trip') return { kind: 'trip', trip: item.trip }
  return undefined
}
