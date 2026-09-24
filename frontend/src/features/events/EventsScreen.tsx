import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useRole } from '../../app/RoleContext.tsx'
import type { Fundraiser, VolunteerRequest } from '../../contract/schemas.ts'
import { todayIso } from '../../domain/dates.ts'
import { EVENT_FILTERS, filterFeed, type EventFilter, type FeedItem } from '../../domain/events.ts'
import { paths } from '../../functions/core/paths.ts'
import { useEventsFeed, useJoinRequest } from '../../functions/events/useEvents.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { DonateDialog } from '../search-hq/DonateDialog.tsx'
import { isPublishedState } from '../search-hq/queries.ts'
import s from './events.module.css'
import { FeedCard } from './FeedCard.tsx'
import { WeekNewsCard } from './WeekNewsCard.tsx'

/** Ближайшая по дате заявка, в которую ещё не записались. */
function nearestOpen(items: readonly FeedItem[], joined: readonly string[], today: string) {
  return items
    .flatMap((i) => (i.kind === 'request' ? [i.request] : []))
    .filter((r: VolunteerRequest) => !joined.includes(r.id) && r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))[0]
}

/**
 * «Мероприятия» (ADR 0011): «Новости недели» первой строкой, затем одна лента заявок,
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
  const isCommander = role?.id === 'commander'
  const published = isPublishedState(location.state)
  const publishedRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (published) publishedRef.current?.scrollIntoView?.({ block: 'center' })
  }, [published])

  const items = feed.status === 'ready' ? feed.items : []
  const shown = useMemo(() => filterFeed(items, filter, query), [items, filter, query])
  const target = nearestOpen(items, joined, todayIso(new Date()))

  const main = isCommander ? (
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
      {feed.status === 'ready' && !target ? 'Вы в команде' : 'Стать частью команды'}
    </BigButton>
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
      {failed && <Notice tone="error">Не удалось записаться. Проверьте связь и попробуйте ещё раз.</Notice>}

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
