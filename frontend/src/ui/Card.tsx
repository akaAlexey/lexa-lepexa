import type { ReactNode } from 'react'
import s from './ui.module.css'

interface Props {
  children: ReactNode
  testID?: string
  as?: 'article' | 'section' | 'li' | 'div'
  'aria-labelledby'?: string
}

export function Card({ children, testID, as: Tag = 'article', ...rest }: Props) {
  return (
    <Tag className={s.card} data-testid={testID} {...rest}>
      {children}
    </Tag>
  )
}
