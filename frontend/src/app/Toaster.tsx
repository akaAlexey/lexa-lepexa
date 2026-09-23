import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { AppNotification, Subscription } from '../contract/schemas.ts'
import { Icon } from '../ui/Icon.tsx'
import s from './layout.module.css'
import { SUBSCRIPTION_KEY, useServices } from './services.tsx'

/**
 * Уведомления внутри приложения — основной канал на демо (не зависит от разрешений браузера).
 * Системное уведомление показывается дополнительно, если пользователь его разрешил.
 * На экране одно уведомление — самое свежее; остальные — счётчиком, чтобы не закрывать экран.
 */
export function Toaster() {
  const { api, platform } = useServices()
  const [items, setItems] = useState<AppNotification[]>([])

  useEffect(
    () =>
      api.onNotification((n) => {
        setItems((prev) => [n, ...prev].slice(0, 10))
        platform.notify.show({ title: n.title, body: n.body, url: `/last-battle/${n.siteId}` })
      }),
    [api, platform],
  )

  // Подписка на находки рядом переживает перезагрузку: восстанавливаем её при старте.
  useEffect(() => {
    const saved = platform.storage.get<Subscription>(SUBSCRIPTION_KEY)
    if (saved) void api.subscribe({ body: saved }).catch(() => undefined)
  }, [api, platform])

  const dismiss = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))
  const [current, ...rest] = items
  const toastRef = useRef<HTMLDivElement>(null)

  // Место под уведомление: страница получает отступ, прокрутка к элементу его учитывает —
  // тост никогда не закрывает кнопки под собой.
  const currentId = current?.id
  useEffect(() => {
    const root = document.documentElement
    const el = toastRef.current
    if (!currentId || !el) {
      root.style.setProperty('--toast-space', '0px')
      return
    }
    const update = () => root.style.setProperty('--toast-space', `${el.offsetHeight + 8}px`)
    update()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    observer?.observe(el)
    return () => {
      observer?.disconnect()
      root.style.setProperty('--toast-space', '0px')
    }
  }, [currentId])

  // Escape закрывает уведомление, когда фокус внутри него
  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toastRef.current?.contains(document.activeElement)) {
        setItems((prev) => prev.filter((i) => i.id !== current.id))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current])

  return (
    <div className={s.toasts}>
      {/* Живая область держится в DOM постоянно — скринридер объявит новое уведомление */}
      <div role="status" aria-live="polite" className="visually-hidden">
        {current ? `${current.title}. ${current.body}` : ''}
      </div>
      {current && (
        <div
          key={current.id}
          className={s.toast}
          ref={toastRef}
          role="group"
          aria-label="Уведомление"
          data-testid="toast"
        >
          <Icon name="bell" className={s.toastIcon} />
          <div className={s.toastBody}>
            <strong>{current.title}</strong>
            <p>{current.body}</p>
            <div className={s.toastActions}>
              <Link
                to={`/last-battle/${current.siteId}`}
                className={s.toastAction}
                onClick={() => dismiss(current.id)}
              >
                Открыть место
              </Link>
              {rest.length > 0 && <span>Ещё уведомлений: {rest.length}</span>}
            </div>
          </div>
          <button
            type="button"
            className={s.toastClose}
            aria-label="Закрыть уведомление"
            onClick={() => dismiss(current.id)}
          >
            <Icon name="close" size={1.3} />
          </button>
        </div>
      )}
    </div>
  )
}
