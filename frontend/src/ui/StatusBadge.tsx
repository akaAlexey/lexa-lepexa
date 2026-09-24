import type { CSSProperties } from 'react'
import type { SiteStatus } from '../contract/schemas.ts'
import { tokens } from '../theme/tokens.ts'
import { Icon } from './Icon.tsx'
import { SITE_STATUS_META } from './siteStatus.ts'
import s from './ui.module.css'

/** Статус никогда не передаётся только цветом: иконка + текст + цвет. */
export function StatusBadge({ status }: { status: SiteStatus }) {
  const meta = SITE_STATUS_META[status]
  return (
    <span
      className={s.statusBadge}
      style={{ '--badge': tokens.color.status[status] } as CSSProperties}
      data-testid={`status-${status}`}
    >
      <Icon name={meta.icon} size={1.1} />
      {meta.label}
    </span>
  )
}
