import type {
  GroupApplication,
  GroupApplicationStatus,
  NewGroupApplication,
} from '../../contract/schemas.ts'
import { GROUP_STATUS_LABEL } from '../../domain/groupApplications.ts'
import type { Deps } from '../core/deps.ts'
import { can, type RoleId } from '../core/permissions.ts'

/** Решение командира: принять или попросить уточнить. */
export type GroupDecision = Exclude<GroupApplicationStatus, 'pending'>

/** Все заявки групп, новые сверху. Контакты видит только командир — фильтрует экран через `visibleApplications`. */
export function listGroupApplications({ api }: Pick<Deps, 'api'>): Promise<GroupApplication[]> {
  return api.listGroupApplications()
}

/** Подать заявку группы. Статус на сервере всегда «На рассмотрении». */
export function submitGroupApplication(
  { api }: Pick<Deps, 'api'>,
  request: NewGroupApplication,
): Promise<GroupApplication> {
  return api.createGroupApplication({ body: request })
}

/** Решение командира по заявке. */
export function decideGroupApplication(
  { api }: Pick<Deps, 'api'>,
  id: string,
  status: GroupDecision,
): Promise<GroupApplication> {
  return api.decideGroupApplication({ id, body: { status } })
}

/** Id своей заявки в «Моих заявках групп»: без повторов, новая — в конец. */
export const addMyGroup = (ids: readonly string[], id: string): string[] => [
  ...ids.filter((x) => x !== id),
  id,
]

/**
 * Какие заявки видит роль: командир (`group.decide`) — все с контактами,
 * остальные — только поданные с этого устройства.
 */
export function visibleApplications(
  list: readonly GroupApplication[],
  role: RoleId | undefined,
  mine: readonly string[],
): GroupApplication[] {
  const all = can(role, 'group.decide')
  return list.filter((a) => all || mine.includes(a.id))
}

/** Сколько заявок групп ждут решения командира на каждом выезде: id выезда → число (нулей нет). */
export function pendingByTrip(list: readonly GroupApplication[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>()
  for (const a of list)
    if (a.status === 'pending') counts.set(a.tripId, (counts.get(a.tripId) ?? 0) + 1)
  return counts
}

/** Тон значка состояния заявки (совпадает с `StatePill`): ждёт, нужно действие, готово. */
export type GroupTone = 'wait' | 'action' | 'done'

const TONE: Record<GroupApplicationStatus, GroupTone> = {
  pending: 'wait',
  clarify: 'action',
  confirmed: 'done',
}

/** Подпись и тон состояния заявки: «На рассмотрении», «Нужно уточнение», «Подтверждена». */
export const groupState = (a: GroupApplication) => ({
  label: GROUP_STATUS_LABEL[a.status],
  tone: TONE[a.status],
})

/** Новая заявка — в начало списка в кэше. */
export const prependApplication = (
  list: readonly GroupApplication[] | undefined,
  created: GroupApplication,
): GroupApplication[] => [created, ...(list ?? [])]

/** Обновлённая заявка в списке; списка ещё нет — `undefined`. */
export const replaceApplication = (
  list: readonly GroupApplication[] | undefined,
  updated: GroupApplication,
): GroupApplication[] | undefined => list?.map((a) => (a.id === updated.id ? updated : a))

/** Состояние перехода после подачи: карточка выезда показывает «Заявка группы отправлена». */
export interface GroupSentState {
  groupSent: string
}

export const groupSentState = (groupSent: string): GroupSentState => ({ groupSent })

export function isGroupSentState(state: unknown): state is GroupSentState {
  return typeof (state as Partial<GroupSentState> | null)?.groupSent === 'string'
}
