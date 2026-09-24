import type { Fundraiser, Team } from '../../contract/schemas.ts'
import { formatRub } from '../../domain/format.ts'
import { progressPercent } from '../../domain/fundraising.ts'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { Icon } from '../../ui/Icon.tsx'
import { FUNDRAISER_PURPOSE } from './purposes.ts'
import s from './search.module.css'

interface Props {
  fundraiser: Fundraiser
  team: Team | undefined
  onDonate: (f: Fundraiser) => void
}

/** Целевой сбор: «Поднять бойца», «Экипировать отряд», «Бензин» — на что пойдут деньги и сколько собрано. */
export function FundraiserCard({ fundraiser: f, team, onDonate }: Props) {
  const purpose = FUNDRAISER_PURPOSE[f.purpose]
  const headingId = `fundraiser-title-${f.id}`
  return (
    <Card testID={`fundraiser-${f.id}`} aria-labelledby={headingId}>
      <p className={s.purpose}>
        <Icon name={purpose.icon} size={1.2} />
        {purpose.label}
      </p>
      <h3 id={headingId}>{f.title}</h3>
      {team && (
        <p className={s.meta}>
          Отряд «{team.name}» · {team.region}
        </p>
      )}
      <label htmlFor={`fundraiser-progress-${f.id}`}>
        Собрано {formatRub(f.collectedRub)} из {formatRub(f.goalRub)}
      </label>
      <progress
        id={`fundraiser-progress-${f.id}`}
        className={s.progress}
        max={100}
        value={progressPercent(f.collectedRub, f.goalRub)}
      />
      <Button icon="flag" onClick={() => onDonate(f)} testID={`fundraiser-donate-${f.id}`}>
        Поддержать сбор
      </Button>
    </Card>
  )
}
