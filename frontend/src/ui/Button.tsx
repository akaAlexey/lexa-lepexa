import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon.tsx'
import s from './ui.module.css'

interface Props {
  children: ReactNode
  onClick: () => void
  testID: string
  icon?: IconName
  /** Для переключателей (чипов): выбран ли вариант. */
  pressed?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}

/** Вторичное действие. Главное действие экрана — только BigButton. */
export function Button({
  children,
  onClick,
  testID,
  icon,
  pressed,
  disabled,
  type = 'button',
}: Props) {
  return (
    <button
      type={type}
      className={s.button}
      onClick={onClick}
      aria-pressed={pressed}
      disabled={disabled}
      data-testid={testID}
    >
      {icon && <Icon name={icon} size={1.2} />}
      {children}
    </button>
  )
}
