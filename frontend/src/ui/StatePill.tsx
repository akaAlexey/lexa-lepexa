import type { CSSProperties } from 'react'
import { tokens } from '../theme/tokens.ts'
import { Icon, type IconName } from './Icon.tsx'
import s from './ui.module.css'

/** Смысл состояния: ждёт решения, нужно действие человека, всё готово. */
export type StateTone = 'wait' | 'action' | 'done'

const TONE: Record<StateTone, { color: string; icon: IconName }> = {
  wait: { color: tokens.color.inkMuted, icon: 'calendar' },
  action: { color: tokens.color.status.archive_confirmed, icon: 'alert' },
  done: { color: tokens.color.status.remains_raised, icon: 'check' },
}

/** Плашка состояния заявки или истории: иконка + подпись + цвет, как у статусов «Последнего боя». */
export function StatePill({
  label,
  tone,
  testID,
}: {
  label: string
  tone: StateTone
  testID?: string
}) {
  return (
    <span
      className={s.statusBadge}
      style={{ '--badge': TONE[tone].color } as CSSProperties}
      data-testid={testID}
    >
      <Icon name={TONE[tone].icon} size={1.1} />
      {label}
    </span>
  )
}
