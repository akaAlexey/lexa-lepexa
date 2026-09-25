import { useEffect, useRef, type ReactNode } from 'react'
import { region } from '../config/region.ts'
import s from './ui.module.css'

interface Props {
  title: string
  lead?: string
  /** Над заголовком: кнопка возврата к разделу (BackLink). */
  back?: ReactNode
  /** Справа от заголовка на ноутбуке: главное действие, как в газетной шапке. */
  aside?: ReactNode
  children?: ReactNode
  testID: string
}

/**
 * Обёртка экрана: заголовок вкладки браузера и перенос фокуса на h1 при переходе,
 * чтобы скринридер объявил новый экран.
 */
export function Screen({ title, lead, back, aside, children, testID }: Props) {
  const h1 = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    // на стартовом экране заголовок совпадает с названием — не повторяем его дважды
    document.title = title === region.appTitle ? title : `${title} — ${region.appTitle}`
    h1.current?.focus({ preventScroll: true })
  }, [title])
  return (
    <div className={s.screen} data-testid={testID}>
      {back}
      <header className={s.screenHead}>
        <div>
          <h1 ref={h1} tabIndex={-1} className={s.screenTitle}>
            {title}
          </h1>
          {lead && <p className={s.lead}>{lead}</p>}
        </div>
        {aside}
      </header>
      {children}
    </div>
  )
}
