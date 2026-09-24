/**
 * Адреса экранов — единственное место, где записаны URL (правило теста архитектуры).
 * `patterns` — шаблоны для роутера, `paths` — готовые ссылки для экранов, уведомлений и «Поделиться».
 * Шаг A: адреса прежние. Шаг B (ADR 0009) меняет их здесь, а старые уходят в таблицу редиректов.
 */
export const patterns = {
  home: '/',
  trail: '/trail',
  point: '/trail/:routeId/point/:pointId',
  finish: '/trail/:routeId/finish',
  search: '/search',
  newRequest: '/search/requests/new',
  weekends: '/weekends',
  trip: '/weekends/:tripId',
  tripGroup: '/weekends/:tripId/group',
  lastBattle: '/last-battle',
  newSite: '/last-battle/new',
  site: '/last-battle/:siteId',
  archive: '/archive',
  newStory: '/archive/new',
  story: '/archive/:storyId',
  chronicle: '/chronicle',
  demo: '/demo',
} as const

export type ScreenId = keyof typeof patterns

const seg = encodeURIComponent

export const paths = {
  home: () => patterns.home,
  trail: () => patterns.trail,
  point: (routeId: string, pointId: string) => `/trail/${seg(routeId)}/point/${seg(pointId)}`,
  finish: (routeId: string) => `/trail/${seg(routeId)}/finish`,
  search: () => patterns.search,
  newRequest: () => patterns.newRequest,
  weekends: () => patterns.weekends,
  trip: (tripId: string) => `/weekends/${seg(tripId)}`,
  tripGroup: (tripId: string) => `/weekends/${seg(tripId)}/group`,
  lastBattle: () => patterns.lastBattle,
  newSite: () => patterns.newSite,
  site: (siteId: string) => `/last-battle/${seg(siteId)}`,
  archive: () => patterns.archive,
  newStory: () => patterns.newStory,
  story: (storyId: string) => `/archive/${seg(storyId)}`,
  chronicle: () => patterns.chronicle,
  demo: () => patterns.demo,
} as const satisfies Record<ScreenId, (...ids: string[]) => string>
