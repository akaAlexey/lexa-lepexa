import { useEffect, useRef, type ReactNode } from 'react'
import { region } from '../config/region.ts'
import s from './ui.module.css'

interface Props {
  title: string
  lead?: string
  children?: ReactNode
  testID: string
}

/**
 * Обёртка экрана: заголовок вкладки браузера и перенос фокуса на h1 при переходе,
 * чтобы скринридер объявил новый экран.
 */
export function Screen({ title, lead, children, testID }: Props) {
  const h1 = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    document.title = `${title} — ${region.appTitle}`
    h1.current?.focus({ preventScroll: true })
  }, [title])
  return (
    <div className={s.screen} data-testid={testID}>
      <h1 ref={h1} tabIndex={-1} className={s.screenTitle}>
        {title}
      </h1>
      {lead && <p className={s.lead}>{lead}</p>}
      {children}
    </div>
  )
}
