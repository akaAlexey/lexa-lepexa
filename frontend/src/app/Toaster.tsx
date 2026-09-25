import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { paths } from '../functions/core/paths.ts'
import { useNearbyAlerts } from '../functions/nearbyAlerts/index.ts'
import { Icon } from '../ui/Icon.tsx'
import s from './layout.module.css'

/**
 * Уведомления внутри приложения — основной канал на демо (не зависит от разрешений браузера).
 * Системное уведомление показывается дополнительно, если пользователь его разрешил.
 * На экране одно уведомление — самое свежее; остальные — счётчиком, чтобы не закрывать экран.
 */
export function Toaster() {
  const { items, dismiss } = useNearbyAlerts()
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
        dismiss(current.id)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current, dismiss])

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
                to={paths.site(current.siteId)}
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
