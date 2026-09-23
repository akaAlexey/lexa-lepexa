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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
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
