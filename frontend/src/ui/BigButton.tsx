import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon, type IconName } from './Icon.tsx'
import s from './ui.module.css'

interface Common {
  children: ReactNode
  icon?: IconName
  testID: string
}

type Props = Common &
  ({ to: string; onClick?: never } | { onClick: () => void; to?: never; disabled?: boolean })

/** «Одна большая красная кнопка» — главное действие экрана. На экране она одна. */
export function BigButton(props: Props) {
  const content = (
    <>
      {props.icon && <Icon name={props.icon} />}
      <span>{props.children}</span>
    </>
  )
  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={s.bigButton} data-testid={props.testID}>
        {content}
      </Link>
    )
  }
  return (
    <button
      type="button"
      className={s.bigButton}
      onClick={props.onClick}
      disabled={'disabled' in props ? props.disabled : undefined}
      data-testid={props.testID}
    >
      {content}
    </button>
  )
}
