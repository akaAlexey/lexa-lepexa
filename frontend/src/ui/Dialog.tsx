import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button.tsx'
import s from './ui.module.css'

interface Props {
  title: string
  children: ReactNode
  onClose: () => void
  testID?: string
}

/** Модальный диалог: фокус внутрь при открытии, Escape и кнопка «Закрыть», возврат фокуса. */
export function Dialog({ title, children, onClose, testID }: Props) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !ref.current) return
      // Фокус не уходит на страницу под затемнением
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === ref.current)
      ) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose])
  return (
    <div className={s.backdrop}>
      <div
        ref={ref}
        className={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testID}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <Button onClick={onClose} testID="dialog-close">
          Закрыть
        </Button>
      </div>
    </div>
  )
}
