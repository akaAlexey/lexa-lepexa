import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'
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
      {/* Статус не только цветом: у успеха и ошибки есть иконка */}
      {tone !== 'info' && (
        <Icon name={tone === 'success' ? 'check' : 'alert'} size={1.3} className={s.noticeIcon} />
      )}
      <div>{children}</div>
    </div>
  )
}
