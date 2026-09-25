import { paths } from '../functions/core/paths.ts'
import type { RoleId } from '../functions/core/permissions.ts'
import type { IconName } from '../ui/Icon.tsx'

/** Четыре раздела дизайна «Стол и газета» (ADR 0012). Подписи в меню видны всегда. */
export type TabId = 'map' | 'events' | 'stories' | 'other'

export const TAB_ORDER: readonly TabId[] = ['map', 'events', 'stories', 'other']

export const TABS: Record<TabId, { path: string; label: string; icon: IconName; section: RegExp }> =
  {
    map: {
      path: paths.map(),
      label: 'Карта',
      icon: 'map',
      section: /^\/(map|trail|last-battle|chronicle)(\/|$)/,
    },
    events: {
      path: paths.events(),
      label: 'Мероприятия',
      icon: 'calendar',
      section: /^\/(events|search|weekends)(\/|$)/,
    },
    stories: {
      path: paths.archive(),
      label: 'Истории',
      icon: 'book',
      section: /^\/(archive|live)(\/|$)/,
    },
    other: {
      path: paths.other(),
      label: 'Другое',
      icon: 'menu',
      section: /^\/(other|demo)?(\/|$)/,
    },
  }

/** Раздел меню, к которому относится адрес: вложенные экраны подсвечивают свой раздел. */
export function tabOf(pathname: string): TabId | undefined {
  return TAB_ORDER.find((id) => TABS[id].section.test(pathname))
}

export type { RoleId } from '../functions/core/permissions.ts'

export interface Role {
  id: RoleId
  label: string
  /** Короткое имя для шапки на телефоне. */
  short: string
  description: string
  icon: IconName
  /** Домашний экран роли: главный сценарий — не больше 3 нажатий отсюда (ADR 0010). У всех — «Мероприятия». */
  home: string
}

/** Роли P0. Школа/клуб и гид — P2 (коллективные заявки). */
export const ROLES: readonly Role[] = [
  {
    id: 'family',
    label: 'Семья',
    short: 'Семья',
    description: 'Прогулка-квест с ребёнком по местам боёв',
    icon: 'family',
    home: paths.events(),
  },
  {
    id: 'volunteer',
    label: 'Волонтёр',
    short: 'Волонтёр',
    description: 'Помочь отряду делом или рублём',
    icon: 'shovel',
    home: paths.events(),
  },
  {
    id: 'commander',
    label: 'Командир отряда',
    short: 'Командир',
    description: 'Набрать людей и отметить находку',
    icon: 'flag',
    home: paths.events(),
  },
  {
    id: 'verifier',
    label: 'Краевед, учитель, музей',
    short: 'Краевед',
    description: 'Проверить истории и подтвердить данные',
    icon: 'book',
    home: paths.events(),
  },
]

export function roleById(id: string | undefined): Role | undefined {
  return ROLES.find((r) => r.id === id)
}

export function homePath(role: Role): string {
  return role.home
}
