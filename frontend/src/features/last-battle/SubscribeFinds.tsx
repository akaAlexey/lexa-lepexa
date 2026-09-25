import { NOTIFY_RADIUS_KM } from '../../domain/lastBattle.ts'
import { useNearbySubscription } from '../../functions/nearbyAlerts/index.ts'
import { Icon } from '../../ui/Icon.tsx'
import ui from '../../ui/ui.module.css'
import s from './lastBattle.module.css'

/** Подписка на находки рядом (перенесена с бывшего экрана «Последний бой»). */
export function SubscribeFinds() {
  const { subscribed, busy, failed, subscribe } = useNearbySubscription()
  if (subscribed) {
    return (
      <p className={s.muted} data-testid="subscribe-done">
        Вы подписаны: сообщим о находках в радиусе {NOTIFY_RADIUS_KM} км
      </p>
    )
  }
  return (
    <>
      <button
        type="button"
        className={ui.button}
        onClick={() => void subscribe()}
        disabled={busy}
        data-testid="last-battle-subscribe"
      >
        <Icon name="bell" size={1.1} /> Сообщать о находках рядом
      </button>
      {failed && (
        <p className={s.muted} role="alert" data-testid="subscribe-error">
          Не удалось подписаться: проверьте доступ к геопозиции и связь
        </p>
      )}
    </>
  )
}
