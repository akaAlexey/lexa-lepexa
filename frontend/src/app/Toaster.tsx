import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { AppNotification } from '../contract/schemas.ts'
import { Icon } from '../ui/Icon.tsx'
import s from './layout.module.css'
import { useServices } from './services.tsx'

/**
 * Уведомления внутри приложения — основной канал на демо (не зависит от разрешений браузера).
 * Системное уведомление показывается дополнительно, если пользователь его разрешил.
 */
export function Toaster() {
  const { api, platform } = useServices()
  const [items, setItems] = useState<AppNotification[]>([])

  useEffect(
    () =>
      api.onNotification((n) => {
        setItems((prev) => [n, ...prev].slice(0, 3))
        platform.notify.show({ title: n.title, body: n.body, url: `/last-battle/${n.siteId}` })
      }),
    [api, platform],
  )

  const dismiss = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  return (
    <div className={s.toasts} role="status" aria-live="polite">
      {items.map((n) => (
        <div key={n.id} className={s.toast} data-testid="toast">
          <Icon name="bell" />
          <div>
            <strong>{n.title}</strong>
            <p>{n.body}</p>
            <Link to={`/last-battle/${n.siteId}`} onClick={() => dismiss(n.id)}>
              Открыть место
            </Link>
          </div>
          <button
            type="button"
            className={s.toastClose}
            aria-label="Закрыть уведомление"
            onClick={() => dismiss(n.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
