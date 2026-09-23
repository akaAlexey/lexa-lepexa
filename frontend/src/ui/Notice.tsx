import type { ReactNode } from 'react'
import s from './ui.module.css'

interface Props {
  children: ReactNode
  tone?: 'info' | 'success' | 'error'
  testID?: string
}

/** Сообщение о результате действия. Объявляется скринридером (role=status / alert). */
export function Notice({ children, tone = 'info', testID }: Props) {
  const className =
    tone === 'success' ? s.noticeSuccess : tone === 'error' ? s.noticeError : s.notice
  return (
    <div className={className} role={tone === 'error' ? 'alert' : 'status'} data-testid={testID}>
      {children}
    </div>
  )
}
