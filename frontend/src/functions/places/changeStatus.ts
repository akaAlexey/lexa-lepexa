import type { LastBattleSite, SiteStatus, Source } from '../../contract/schemas.ts'
import { can, type RoleId } from '../core/permissions.ts'
import type { Services } from '../core/deps.ts'

/** Шаг статуса места: краевед подтверждает по архиву, командир отмечает подъём (L5). */
export type StatusAction = 'confirm' | 'raise'

export type ArchiveKind = Extract<
  Source['kind'],
  'book_of_memory' | 'obd_memorial' | 'pamyat_naroda' | 'archive'
>

/** Базы верификации из кейса: Книга Памяти Орловской обл., ОБД «Мемориал», «Память народа». */
export const ARCHIVE_KINDS: readonly { value: ArchiveKind; label: string }[] = [
  { value: 'book_of_memory', label: 'Книга Памяти. Орловская область' },
  { value: 'obd_memorial', label: 'ОБД «Мемориал» Минобороны' },
  { value: 'pamyat_naroda', label: '«Память народа»' },
  { value: 'archive', label: 'Архивный документ (ЦАМО, ГАОО)' },
]

/** Статус, в который переводит шаг. */
export const NEXT_STATUS: Record<StatusAction, SiteStatus> = {
  confirm: 'archive_confirmed',
  raise: 'remains_raised',
}

/**
 * Какой шаг статуса доступен роли. Статусы идут только вперёд и по одному шагу.
 */
export function statusActionFor(
  role: RoleId | undefined,
  status: SiteStatus,
): StatusAction | undefined {
  if (status === 'found_needs_check' && can(role, 'place.confirmArchive')) return 'confirm'
  if (status === 'archive_confirmed' && can(role, 'place.markRaised')) return 'raise'
  return undefined
}

export interface StatusChangeInput {
  action: StatusAction
  /** Для подтверждения — база, где записан боец; подъём всегда подтверждается актом (`archive`). */
  kind: ArchiveKind
  /** Том и страница, номер документа или акт подъёма. */
  detail: string
}

/** Ошибка проверки: без ссылки на документ статус не меняется. */
export function statusChangeProblem({ action, detail }: StatusChangeInput): string | undefined {
  if (detail.trim() !== '') return undefined
  return action === 'confirm'
    ? 'Укажите, где в источнике это записано'
    : 'Укажите акт или место перезахоронения'
}

/** Источник, который ложится в карточку места вместе с новым статусом. */
export function statusSource({ action, kind, detail }: StatusChangeInput): Source {
  if (action === 'raise') return { kind: 'archive', title: `Акт подъёма: ${detail.trim()}` }
  const label = ARCHIVE_KINDS.find((k) => k.value === kind)?.label ?? ''
  return { kind, title: `${label}, ${detail.trim()}` }
}

/** Сменить статус места с источником. Проверку `statusChangeProblem` делает вызывающий. */
export function changeStatus(
  { api }: Pick<Services, 'api'>,
  siteId: string,
  input: StatusChangeInput,
): Promise<LastBattleSite> {
  return api.changeSiteStatus({
    id: siteId,
    body: { status: NEXT_STATUS[input.action], source: statusSource(input) },
  })
}
