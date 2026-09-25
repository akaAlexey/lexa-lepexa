import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useRole } from '../../app/RoleContext.tsx'
import type { Fundraiser } from '../../contract/schemas.ts'
import { EVENT_FILTERS, filterFeed, type EventFilter, type FeedItem } from '../../domain/events.ts'
import { formatDayRu } from '../../domain/format.ts'
import { paths } from '../../functions/core/paths.ts'
import { can } from '../../functions/core/permissions.ts'
import { useDeps } from '../../functions/core/useDeps.ts'
import { useEventsFeed, type FeedState } from '../../functions/events/useEvents.ts'
import { isPublishedState, useJoinRequest } from '../../functions/helpRequests/index.ts'
import { nearestTrip } from '../../functions/trips/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { DonateDialog } from '../search-hq/DonateDialog.tsx'
import s from './events.module.css'
import { FeedCard } from './FeedCard.tsx'
import { WeekNewsCard } from './WeekNewsCard.tsx'

const NO_ITEMS: FeedItem[] = []

/**
 * «Мероприятия» (ADR 0012): «Новости недели» первой строкой, затем одна лента заявок,
 * выездов и сборов по дате публикации. Поиск и простой фильтр вместо счётчика.
 */
export function EventsScreen() {
  const { role } = useRole()
  const location = useLocation()
  const feed = useEventsFeed()
  const { joined, joining, failed, join } = useJoinRequest()
  const [filter, setFilter] = useState<EventFilter>('all')
  const [query, setQuery] = useState('')
  const [donateTo, setDonateTo] = useState<Fundraiser>()
  const closeDonate = useCallback(() => setDonateTo(undefined), [])
  const isCommander = can(role?.id, 'request.create')
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
      {failed && (
        <Notice tone="error">Не удалось записаться. Проверьте связь и попробуйте ещё раз.</Notice>
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

      <nav className={s.more} aria-label="Ещё в разделе">
        <Link to={paths.weekends()} data-testid="events-weekends">
          Все выезды и заявки групп
        </Link>
        <Link to={paths.search()} data-testid="events-search-hq">
          Отряды и находки за месяц
        </Link>
      </nav>

      <ul className={s.feed} aria-label="Лента мероприятий">
        <li>
          <WeekNewsCard />
        </li>
        {feed.status === 'pending' && (
          <li role="status" data-testid="loading">
            Загружаем мероприятия…
          </li>
        )}
        {feed.status === 'error' && (
          <li role="alert" data-testid="error">
            <p>Не удалось загрузить мероприятия. Проверьте связь и попробуйте ещё раз.</p>
            <button type="button" className={s.retry} onClick={feed.retry}>
              Повторить
            </button>
          </li>
        )}
        {shown.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <FeedCard
              item={item}
              canJoin={!isCommander}
              joined={joined.includes(item.id)}
              joining={joining === item.id}
              onJoin={(id) => void join(id)}
              onDonate={setDonateTo}
            />
          </li>
        ))}
        {feed.status === 'ready' && shown.length === 0 && (
          <li className={s.empty} data-testid="events-empty">
            Ничего не нашли. Попробуйте другое слово или покажите все мероприятия.
          </li>
        )}
      </ul>
      {donateTo && <DonateDialog fundraiser={donateTo} onClose={closeDonate} />}
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
