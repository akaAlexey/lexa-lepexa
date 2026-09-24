import type { Fundraiser, Team, VolunteerRequest } from '../../contract/schemas.ts'
import { formatDayRu } from '../../domain/format.ts'
import { describeRoles } from '../../domain/requests.ts'
import { fundProgress } from '../../functions/fundraising/index.ts'
import { Button } from '../../ui/Button.tsx'
import { Card } from '../../ui/Card.tsx'
import { Icon } from '../../ui/Icon.tsx'
import s from './search.module.css'

const numberRu = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

/** 15000 → «15 000» (без знака валюты — для «Собрано: 15 000 из 50 000 ₽»). */
function formatNumberRu(n: number): string {
  return numberRu.format(n)
}

interface Props {
  request: VolunteerRequest
  team: Team | undefined
  fundraiser: Fundraiser | undefined
  canJoin: boolean
  joined: boolean
  joining: boolean
  onJoin: () => void
  onDonate: (f: Fundraiser) => void
}

/** Карточка заявки из прототипа: кто, кого ищет, когда, сколько собрано на бензин. */
export function RequestCard({
  request: r,
  team,
  fundraiser: f,
  canJoin,
  joined,
  joining,
  onJoin,
  onDonate,
}: Props) {
  const headingId = `request-title-${r.id}`
  return (
    <Card testID={`request-card-${r.id}`} aria-labelledby={headingId}>
      <h3 id={headingId}>{r.title}</h3>
      <p className={s.meta}>
        {team ? `Отряд «${team.name}»` : 'Поисковый отряд'} · {r.place}
      </p>
      <p>
        <span className={s.needs}>Требуется: {describeRoles(r.roles)}.</span> {formatDayRu(r.date)}
      </p>
      <p className={s.meta}>Уже в команде: {r.joined}</p>
      {f && (
        <>
          <label htmlFor={`fund-${r.id}`}>
            Собрано: {formatNumberRu(f.collectedRub)} из {formatNumberRu(f.goalRub)} ₽
          </label>
          <progress id={`fund-${r.id}`} className={s.progress} max={100} value={fundProgress(f)} />
        </>
      )}
      <div className={s.actions}>
        {canJoin &&
          (joined ? (
            <span className={s.joined} data-testid={`request-joined-${r.id}`}>
              <Icon name="check" size={1.4} />
              Вы в команде
            </span>
          ) : (
            <Button
              onClick={onJoin}
              disabled={joining}
              icon="shovel"
              testID={`request-join-${r.id}`}
            >
              Записаться
            </Button>
          ))}
        {f && (
          <Button onClick={() => onDonate(f)} testID={`donate-${f.id}`}>
            Пожертвовать на бензин
          </Button>
        )}
      </div>
    </Card>
  )
}
