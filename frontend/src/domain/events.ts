import type { Fundraiser, Team, Trip, VolunteerRequest } from '../contract/schemas.ts'

/**
 * Лента «Мероприятия» (ADR 0012): заявки отрядов, выезды и сборы одной лентой,
 * новые сверху по дате публикации. Сбор, привязанный к заявке, показывается в её карточке.
 */
export type EventKind = 'request' | 'trip' | 'fund'

export type FeedItem =
  | {
      kind: 'request'
      id: string
      postedAt: string
      request: VolunteerRequest
      team?: Team
      fundraiser?: Fundraiser
    }
  | { kind: 'trip'; id: string; postedAt: string; trip: Trip; team?: Team }
  | { kind: 'fund'; id: string; postedAt: string; fundraiser: Fundraiser; team?: Team }

export type EventFilter = 'all' | EventKind

export const EVENT_FILTERS: readonly { value: EventFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'request', label: 'Волонтёры' },
  { value: 'trip', label: 'Выезды' },
  { value: 'fund', label: 'Сборы' },
]

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  request: 'Набор волонтёров',
  trip: 'Выезд',
  fund: 'Сбор',
}

/** Без даты публикации — в конец ленты (старые данные сервера). */
const NO_DATE = ''

export function buildFeed(input: {
  requests: readonly VolunteerRequest[]
  trips: readonly Trip[]
  fundraisers: readonly Fundraiser[]
  teams: readonly Team[]
}): FeedItem[] {
  const team = new Map(input.teams.map((t) => [t.id, t]))
  const fund = new Map(input.fundraisers.map((f) => [f.id, f]))
  const linked = new Set(input.requests.map((r) => r.fundraiserId).filter(Boolean))
  const items: FeedItem[] = [
    ...input.requests.map((request) => ({
      kind: 'request' as const,
      id: request.id,
      postedAt: request.createdAt,
      request,
      team: team.get(request.teamId),
      fundraiser: request.fundraiserId ? fund.get(request.fundraiserId) : undefined,
    })),
    ...input.trips.map((trip) => ({
      kind: 'trip' as const,
      id: trip.id,
      postedAt: trip.createdAt ?? NO_DATE,
      trip,
      team: team.get(trip.teamId),
    })),
    ...input.fundraisers
      .filter((f) => !linked.has(f.id))
      .map((fundraiser) => ({
        kind: 'fund' as const,
        id: fundraiser.id,
        postedAt: fundraiser.createdAt ?? NO_DATE,
        fundraiser,
        team: team.get(fundraiser.teamId),
      })),
  ]
  return items.sort((a, b) => b.postedAt.localeCompare(a.postedAt) || a.id.localeCompare(b.id))
}

function haystack(item: FeedItem): string {
  const team = item.team?.name ?? ''
  switch (item.kind) {
    case 'request':
      return [item.request.title, item.request.place, team].join(' ')
    case 'trip':
      return [item.trip.title, item.trip.place, team].join(' ')
    case 'fund':
      return [item.fundraiser.title, team].join(' ')
  }
}

const norm = (s: string) => s.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim()

/** Фильтр по типу и поиск по названию, месту и отряду (без учёта регистра и «ё»). */
export function filterFeed(
  items: readonly FeedItem[],
  filter: EventFilter,
  query: string,
): FeedItem[] {
  const q = norm(query)
  return items.filter(
    (item) =>
      (filter === 'all' || item.kind === filter) && (!q || norm(haystack(item)).includes(q)),
  )
}

/** «Нужны волонтёры: 10» — всегда волонтёры, без «землекопов» (ADR 0012). */
export function volunteersNeeded(request: VolunteerRequest): number {
  return request.roles.reduce((sum, r) => sum + r.count, 0)
}

/** «16+» или undefined, если отряд не указал возраст. */
export function ageLabel(minAge: number | undefined): string | undefined {
  return minAge === undefined ? undefined : `${minAge}+`
}
