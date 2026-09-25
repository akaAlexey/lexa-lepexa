import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useRole } from '../../app/RoleContext.tsx'
import type { Fundraiser } from '../../contract/schemas.ts'
import { EVENT_FILTERS, filterFeed, type EventFilter, type FeedItem } from '../../domain/events.ts'
import { paths } from '../../functions/core/paths.ts'
import { can } from '../../functions/core/permissions.ts'
import { useEventsFeed } from '../../functions/events/useEvents.ts'
import { isPublishedState, useJoinRequest } from '../../functions/helpRequests/index.ts'
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
  const {
    joined,
    joining,
    failed,
    next: target,
    join,
  } = useJoinRequest(feed.status === 'ready' ? feed.requests : undefined)
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
  ) : can(role?.id, 'request.join') && target ? (
    <BigButton
      onClick={() => void join(target.id)}
      disabled={joining !== undefined}
      icon="shovel"
      testID="search-join"
    >
      Стать частью команды
    </BigButton>
  ) : can(role?.id, 'request.join') && feed.status === 'pending' ? (
    <BigButton onClick={() => undefined} disabled testID="search-join">
      Загружаем заявки…
    </BigButton>
  ) : can(role?.id, 'request.join') && feed.status === 'error' ? (
    <BigButton onClick={feed.retry} testID="search-join">
      Повторить загрузку заявок
    </BigButton>
  ) : can(role?.id, 'story.verify') ? (
    <BigButton to={paths.archive()} icon="book" testID="events-archive">
      Проверить истории
    </BigButton>
  ) : (
    <BigButton to={paths.weekends()} icon="calendar" testID="search-join">
      Посмотреть выезды
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
        {shown.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <FeedCard
              item={item}
              canJoin={can(role?.id, 'request.join')}
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
