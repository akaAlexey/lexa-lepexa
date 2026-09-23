import type { IconName } from '../ui/Icon.tsx'

export type TabId = 'trail' | 'search' | 'weekends' | 'lastBattle' | 'archive'

export const TABS: Record<TabId, { path: string; label: string; icon: IconName }> = {
  trail: { path: '/trail', label: 'Тропа', icon: 'route' },
  search: { path: '/search', label: 'Поисковикам', icon: 'shovel' },
  weekends: { path: '/weekends', label: 'Выходные', icon: 'calendar' },
  lastBattle: { path: '/last-battle', label: 'Последний бой', icon: 'pin' },
  archive: { path: '/archive', label: 'Истории', icon: 'story' },
}

export type RoleId = 'family' | 'volunteer' | 'commander' | 'verifier'

export interface Role {
  id: RoleId
  label: string
  /** Короткое имя для шапки на телефоне. */
  short: string
  description: string
  icon: IconName
  /** Порядок вкладок: первая — домашний экран роли. */
  tabs: readonly TabId[]
}

/** Роли P0. Школа/клуб и гид — P2 (коллективные заявки). */
export const ROLES: readonly Role[] = [
  {
    id: 'family',
    label: 'Семья',
    short: 'Семья',
    description: 'Прогулка-квест с ребёнком по местам боёв',
    icon: 'family',
    tabs: ['trail', 'lastBattle', 'weekends', 'search', 'archive'],
  },
  {
    id: 'volunteer',
    label: 'Волонтёр',
    short: 'Волонтёр',
    description: 'Помочь отряду делом или рублём',
    icon: 'shovel',
    tabs: ['search', 'weekends', 'lastBattle', 'trail', 'archive'],
  },
  {
    id: 'commander',
    label: 'Командир отряда',
    short: 'Командир',
    description: 'Набрать людей и отметить находку',
    icon: 'flag',
    tabs: ['search', 'lastBattle', 'weekends', 'trail', 'archive'],
  },
  {
    id: 'verifier',
    label: 'Краевед, учитель, музей',
    short: 'Краевед',
    description: 'Проверить истории и подтвердить данные',
    icon: 'book',
    tabs: ['archive', 'lastBattle', 'trail', 'search', 'weekends'],
  },
]

export const DEFAULT_TABS: readonly TabId[] = [
  'trail',
  'search',
  'weekends',
  'lastBattle',
  'archive',
]

export function roleById(id: string | undefined): Role | undefined {
  return ROLES.find((r) => r.id === id)
}

export function homePath(role: Role): string {
  return TABS[role.tabs[0] ?? 'trail'].path
}
