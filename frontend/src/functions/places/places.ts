import type {
  Grave,
  LastBattleSite,
  NewLastBattleSite,
  SiteStatus,
} from '../../contract/schemas.ts'
import type { Services } from '../core/deps.ts'

type ApiDeps = Pick<Services, 'api'>

/** Места гибели «Последний бой». */
export function listPlaces({ api }: ApiDeps): Promise<LastBattleSite[]> {
  return api.listSites()
}

/** Воинские захоронения — фоновый слой карты. */
export function listGraves({ api }: ApiDeps): Promise<Grave[]> {
  return api.listGraves()
}

/** Место по id. Нет такого — ошибка 404 (`isNotFound` из core/errors). */
export function getPlace({ api }: ApiDeps, id: string): Promise<LastBattleSite> {
  return api.getSite({ id })
}

/** Подъём нужен, пока останки не подняты. */
const NEEDS_RAISING: readonly SiteStatus[] = ['found_needs_check', 'archive_confirmed']

export function needsRaising(site: Pick<LastBattleSite, 'status'>): boolean {
  return NEEDS_RAISING.includes(site.status)
}

/** «Я готов помочь в подъёме»: сервер увеличивает счётчик готовых помочь и возвращает место. */
export function helpRaise({ api }: ApiDeps, id: string): Promise<LastBattleSite> {
  return api.volunteerForSite({ id })
}

/** Состояние, передаваемое карточке нового места через навигацию. */
export interface SiteCreatedState {
  notifiedCount: number
}

/** Число уведомлённых из состояния навигации; не наше состояние — `undefined`. */
export function readNotified(state: unknown): number | undefined {
  const n = (state as Partial<SiteCreatedState> | null)?.notifiedCount
  return typeof n === 'number' ? n : undefined
}

export interface PublishedPlace {
  site: LastBattleSite
  notifiedCount: number
}

/**
 * Опубликовать место. Сервер рассылает уведомления подписчикам в 20 км;
 * публикация — собственное действие (`own.run`), поэтому автор своё уведомление не получает.
 */
export async function publishPlace(
  { api, own }: Pick<Services, 'api' | 'own'>,
  input: NewLastBattleSite,
): Promise<PublishedPlace> {
  const { site, notifiedCount } = await own.run(() => api.createSite({ body: input }))
  return { site, notifiedCount }
}
