import type { AppNotification, Subscription } from '../../contract/schemas.ts'
import { NOTIFY_RADIUS_KM } from '../../domain/lastBattle.ts'
import type { Services } from '../core/deps.ts'
import { memory, readMemory, writeMemory } from '../core/deviceMemory.ts'
import { paths } from '../core/paths.ts'

/** Сценариям подписки часы не нужны — хватает сервисов (их передаёт и демо-пульт). */
type AlertDeps = Pick<Services, 'api' | 'platform' | 'own'>

export { NOTIFY_RADIUS_KM }

/** Подписка на находки уже оформлена на этом устройстве. */
export function isSubscribed({ platform }: Pick<Services, 'platform'>): boolean {
  return readMemory(platform.storage, memory.subscription) !== undefined
}

/** Подписаться на находки в радиусе 20 км от текущей позиции и запомнить подписку на устройстве. */
export async function subscribeNearby({
  api,
  platform,
}: Pick<Services, 'api' | 'platform'>): Promise<Subscription> {
  // Запрос системных уведомлений делаем из пользовательского клика по «Сообщать…».
  // Даже при отказе подписка остаётся полезной: уведомления внутри сайта продолжают работать.
  await platform.notify.requestPermission().catch(() => undefined)
  const { lat, lon } = await platform.geo.getPosition()
  const subscription = { lat, lon, radiusKm: NOTIFY_RADIUS_KM, topics: ['search' as const] }
  await api.subscribe({ body: subscription })
  writeMemory(platform.storage, memory.subscription, subscription)
  return subscription
}

/** Подписка переживает перезагрузку: при старте приложения сервер узнаёт её заново. Ошибка сети — не повод падать. */
export async function restoreSubscription({
  api,
  platform,
}: Pick<Services, 'api' | 'platform'>): Promise<Subscription | undefined> {
  const saved = readMemory(platform.storage, memory.subscription)
  if (!saved) return undefined
  await api.subscribe({ body: saved }).catch(() => undefined)
  return saved
}

/**
 * Слушать уведомления о находках. Автор находки уведомление о ней не получает (`own`).
 * Системное уведомление — дополнительно, если пользователь его разрешил. Возвращает отписку.
 */
export function listenNearby(
  { api, platform, own }: AlertDeps,
  onAlert: (n: AppNotification) => void,
): () => void {
  return api.onNotification((n) => {
    if (own.active()) return
    onAlert(n)
    platform.notify.show({ title: n.title, body: n.body, url: paths.site(n.siteId) })
  })
}
