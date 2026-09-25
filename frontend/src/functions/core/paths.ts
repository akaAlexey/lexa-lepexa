/**
 * Адреса экранов — единственное место, где записаны URL (правило теста архитектуры).
 * `patterns` — шаблоны для роутера, `paths` — готовые ссылки для экранов, уведомлений и «Поделиться».
 * Шаг B (ADR 0012): новые разделы «Карта» (/map), «Мероприятия» (/events), «Другое» (/other);
 * прежние адреса остаются вложенными экранами этих разделов.
 * Спринт v3.2: «/» — это «Мероприятия», выбор роли — /roles.
 */
export const patterns = {
  home: '/',
  roles: '/roles',
  map: '/map',
  events: '/events',
  other: '/other',
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
  livePhotos: '/live',
  newLivePhoto: '/live/new',
  livePhoto: '/live/:photoId',
  demo: '/demo',
  about: '/about',
  privacy: '/privacy',
  terms: '/terms',
} as const

export type ScreenId = keyof typeof patterns

/** Раздел «Другого», открытый по ссылке (?section=). */
export type OtherSection = 'account' | 'archive' | 'ar' | 'photo' | 'role'

/** «Другое» с открытым разделом: «Вход» в шапке сразу открывает форму. */
export const otherSection = (section: OtherSection, extra?: string) =>
  `${patterns.other}?section=${section}${extra ? `&${extra}` : ''}`

const seg = encodeURIComponent

export const paths = {
  home: () => patterns.home,
  roles: () => patterns.roles,
  map: () => patterns.map,
  /** «Мероприятия»; `show` — фильтр ленты (trip, request, fund), ссылкой можно поделиться. */
  events: (show?: string) => (show ? `${patterns.events}?show=${seg(show)}` : patterns.events),
  other: () => patterns.other,
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
  livePhotos: () => patterns.livePhotos,
  newLivePhoto: () => patterns.newLivePhoto,
  livePhoto: (photoId: string) => `/live/${seg(photoId)}`,
  demo: () => patterns.demo,
  about: () => patterns.about,
  privacy: () => patterns.privacy,
  terms: () => patterns.terms,
} as const satisfies Record<ScreenId, (...ids: string[]) => string>
