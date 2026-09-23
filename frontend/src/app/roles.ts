import type { IconName } from '../ui/Icon.tsx'

export type TabId = 'trail' | 'search' | 'weekends' | 'lastBattle'

export const TABS: Record<TabId, { path: string; label: string; icon: IconName }> = {
  trail: { path: '/trail', label: 'Тропа', icon: 'route' },
  search: { path: '/search', label: 'Поисковикам', icon: 'shovel' },
  weekends: { path: '/weekends', label: 'Выходные', icon: 'calendar' },
  lastBattle: { path: '/last-battle', label: 'Последний бой', icon: 'pin' },
}

export type RoleId = 'family' | 'volunteer' | 'commander' | 'verifier'

export interface Role {
  id: RoleId
  label: string
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
    description: 'Прогулка-квест с ребёнком по местам боёв',
    icon: 'family',
    tabs: ['trail', 'lastBattle', 'weekends', 'search'],
  },
  {
    id: 'volunteer',
    label: 'Волонтёр',
    description: 'Помочь отряду делом или рублём',
    icon: 'shovel',
    tabs: ['search', 'weekends', 'lastBattle', 'trail'],
  },
  {
    id: 'commander',
    label: 'Командир отряда',
    description: 'Набрать людей и отметить находку',
    icon: 'flag',
    tabs: ['search', 'lastBattle', 'weekends', 'trail'],
  },
  {
    id: 'verifier',
    label: 'Краевед, учитель, музей',
    description: 'Проверить и подтвердить данные',
    icon: 'book',
    tabs: ['lastBattle', 'trail', 'search', 'weekends'],
  },
]

export const DEFAULT_TABS: readonly TabId[] = ['trail', 'search', 'weekends', 'lastBattle']

export function roleById(id: string | undefined): Role | undefined {
  return ROLES.find((r) => r.id === id)
}

export function homePath(role: Role): string {
  return TABS[role.tabs[0] ?? 'trail'].path
}
