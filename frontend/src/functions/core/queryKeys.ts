/**
 * Ключи кэша TanStack Query — все в одном месте. Функции инвалидируют их после изменений.
 * Значения совпадают с прежними ключами экранов (шаг A не меняет поведение).
 * Известная неровность: выезд — `['trip', id]`, а не под `['trips']`, поэтому обновление
 * списка не трогает карточку выезда. Сводится на шаге C вместе с тестом.
 */
export const qk = {
  routes: ['routes'],
  sites: ['sites'],
  site: (id: string) => ['sites', id] as const,
  graves: ['graves'],
  battles: ['battles'],
  memorials: ['memorials'],
  teams: ['teams'],
  requests: ['requests'],
  fundraisers: ['fundraisers'],
  trips: ['trips'],
  trip: (id: string) => ['trip', id] as const,
  groupApplications: ['group-applications'],
  stories: ['stories'],
  story: (id: string) => ['stories', id] as const,
  family: (owner: string) => ['family', owner] as const,
} as const
