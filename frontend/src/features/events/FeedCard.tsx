import { Link } from 'react-router'
import type { Fundraiser } from '../../contract/schemas.ts'
import { ageLabel, EVENT_KIND_LABEL, volunteersNeeded, type FeedItem } from '../../domain/events.ts'
import { formatDayRu } from '../../domain/format.ts'
import { progressPercent } from '../../domain/fundraising.ts'
import { paths } from '../../functions/core/paths.ts'
import { freeSpots } from '../../functions/trips/index.ts'
import { Button } from '../../ui/Button.tsx'
import { Icon } from '../../ui/Icon.tsx'
import ui from '../../ui/ui.module.css'
import s from './events.module.css'

const posted = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Moscow',
})
const num = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

interface Props {
  item: FeedItem
  /** Можно ли записаться в заявку: командир набирает людей, а не записывается. */
  canSignUp: boolean
  /** Гость видит понятную ссылку на вход вместо действия записи. */
  signedIn: boolean
  signInPath: string
  /** Уже записан с этого устройства (заявка или выезд). */
  signedUp: boolean
  /** Открыть окно записи с условиями. */
  onSignUp: () => void
  onDonate: (f: Fundraiser) => void
  /** Командиру: сколько заявок групп на этот выезд ждут решения. */
  pendingGroups?: number
}

function Progress({ id, f }: { id: string; f: Fundraiser }) {
  return (
    <>
      <label htmlFor={id} className={s.fundLabel}>
        Собрано: {num.format(f.collectedRub)} из {num.format(f.goalRub)} ₽
      </label>
      <progress
        id={id}
        className={s.progress}
        max={100}
        value={progressPercent(f.collectedRub, f.goalRub)}
      />
    </>
  )
}

/** Запись ленты «Мероприятия»: надстрочник, штамп типа, заголовок, условия и действие. */
export function FeedCard({
  item,
  canSignUp,
  signedIn,
  signInPath,
  signedUp,
  onSignUp,
  onDonate,
  pendingGroups,
}: Props) {
  const headingId = `feed-title-${item.id}`
  const kick = [
    item.postedAt ? posted.format(new Date(item.postedAt)) : undefined,
    item.team ? `Отряд «${item.team.name}»` : 'Поисковый отряд',
  ]
    .filter(Boolean)
    .join(' · ')
  const testID =
    item.kind === 'request' ? `request-card-${item.id}` : `feed-${item.kind}-${item.id}`

  return (
    <article className={s.card} aria-labelledby={headingId} data-testid={testID}>
      <p className={ui.kick}>{kick}</p>
      <p className={s.tagLine}>
        <span className={`${ui.tag} ${s[`tag-${item.kind}`]}`}>{EVENT_KIND_LABEL[item.kind]}</span>
      </p>
      {item.kind === 'request' && (
        <>
          <h3 id={headingId} className={s.title}>
            {item.request.title}
          </h3>
          <p className={s.meta}>
            {formatDayRu(item.request.date)} · {item.request.place}
          </p>
          <p className={s.needs}>
            Требуются волонтёры: {volunteersNeeded(item.request)}
            {item.request.minAge !== undefined && (
              <span className={s.age} title={`Возраст — от ${item.request.minAge} лет`}>
                {ageLabel(item.request.minAge)}
              </span>
            )}
          </p>
          <p className={s.meta}>Уже в команде: {item.request.joined}</p>
          {item.fundraiser && <Progress id={`fund-${item.id}`} f={item.fundraiser} />}
          <div className={s.actions}>
            {canSignUp &&
              (signedUp ? (
                <span className={s.joined} data-testid={`request-joined-${item.id}`}>
                  <Icon name="check" size={1.3} />
                  Вы записаны
                </span>
              ) : (
                <Button onClick={onSignUp} icon="shovel" testID={`request-join-${item.id}`}>
                  Записаться
                </Button>
              ))}
            {!canSignUp && !signedIn && (
              <Link to={signInPath} className={ui.button} data-testid={`request-signin-${item.id}`}>
                Войти, чтобы записаться
              </Link>
            )}
            {item.fundraiser && (
              <Button
                onClick={() => item.fundraiser && onDonate(item.fundraiser)}
                testID={`donate-${item.fundraiser.id}`}
              >
                Пожертвовать на бензин
              </Button>
            )}
          </div>
        </>
      )}
      {item.kind === 'trip' && (
        <>
          <h3 id={headingId} className={s.title}>
            <Link to={paths.trip(item.trip.id)} className={s.titleLink}>
              {item.trip.title}
            </Link>
          </h3>
          <p className={s.meta}>
            {formatDayRu(item.trip.date)} · {item.trip.place}
          </p>
          <p className={s.needs}>
            Свободно мест: {freeSpots(item.trip)} из {item.trip.spotsTotal}
            {item.trip.minAge !== undefined && (
              <span className={s.age} title={`Возраст — от ${item.trip.minAge} лет`}>
                {ageLabel(item.trip.minAge)}
              </span>
            )}
          </p>
          {pendingGroups !== undefined && (
            <p className={s.meta}>
              <Link to={paths.trip(item.trip.id)} data-testid={`feed-trip-groups-${item.trip.id}`}>
                Заявки групп ждут решения: {pendingGroups}
              </Link>
            </p>
          )}
          <div className={s.actions}>
            <Link
              to={paths.trip(item.trip.id)}
              className={ui.button}
              data-testid={`feed-trip-open-${item.trip.id}`}
            >
              Подробнее и запись
            </Link>
            {signedUp && (
              <span className={s.joined} data-testid={`feed-trip-registered-${item.trip.id}`}>
                <Icon name="check" size={1.3} />
                Вы записаны
              </span>
            )}
          </div>
        </>
      )}
      {item.kind === 'fund' && (
        <>
          <h3 id={headingId} className={s.title}>
            {item.fundraiser.title}
          </h3>
          <Progress id={`fund-${item.id}`} f={item.fundraiser} />
          <div className={s.actions}>
            <Button
              onClick={() => onDonate(item.fundraiser)}
              testID={`donate-${item.fundraiser.id}`}
            >
              Пожертвовать
            </Button>
          </div>
        </>
      )}
    </article>
  )
}
