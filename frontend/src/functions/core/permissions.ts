import { canVerify } from '../../domain/archive.ts'

/** Роли без регистрации (демо). Школа/клуб и гид — P2. */
export type RoleId = 'family' | 'volunteer' | 'commander' | 'verifier'

/**
 * Действия, доступные не всем ролям. Экран спрашивает `can(role, действие)`,
 * а не сравнивает роль сам — правило живёт в одном месте.
 */
export type Action =
  /** Создать заявку на набор волонтёров. */
  | 'request.create'
  /** Записаться волонтёром в открытую заявку. */
  | 'request.join'
  /** Отметить место гибели. */
  | 'place.create'
  /** Видеть точные координаты места (защита от «чёрных копателей»; настоящее скрытие — на сервере). */
  | 'place.exactCoords'
  /** Перевести место в «Подтверждено архивом» — по архивному источнику (шаг C). */
  | 'place.confirmArchive'
  /** Отметить «Останки подняты» (шаг C). */
  | 'place.markRaised'
  /** Проверять истории народного архива. */
  | 'story.verify'
  /** Видеть все заявки групп с контактами и принимать решение по ним. */
  | 'group.decide'

const RULES: Record<Action, (role: RoleId) => boolean> = {
  'request.create': (r) => r === 'commander',
  'request.join': (r) => r === 'volunteer',
  'place.create': (r) => r === 'commander',
  'place.exactCoords': (r) => r === 'commander' || r === 'verifier',
  'place.confirmArchive': (r) => r === 'verifier',
  'place.markRaised': (r) => r === 'commander',
  // правило «кто подтверждает» — в domain/archive (краевед и поисковый отряд)
  'story.verify': (r) => canVerify(r),
  'group.decide': (r) => r === 'commander',
}

/** Может ли роль выполнить действие. Без роли — ничего из списка. */
export function can(role: RoleId | undefined, action: Action): boolean {
  return role !== undefined && RULES[action](role)
}
