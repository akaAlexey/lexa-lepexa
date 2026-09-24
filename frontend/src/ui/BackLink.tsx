import { Link } from 'react-router'
import { Icon } from './Icon.tsx'
import s from './ui.module.css'

/**
 * Заметная кнопка возврата к разделу (ADR 0011): тёмная, липнет к верху при прокрутке.
 * Системная «Назад» браузера работает как прежде — это дополнительный путь.
 */
export function BackLink({
  to,
  children,
  testID,
}: {
  to: string
  children: string
  testID?: string
}) {
  return (
    <Link to={to} className={s.back} data-testid={testID}>
      <Icon name="left" size={1.1} />
      {children}
    </Link>
  )
}
