import { Link, useParams } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { ShareButton } from '../../app/ShareButton.tsx'
import type { Trip } from '../../contract/schemas.ts'
import { formatDayRu } from '../../domain/format.ts'
import { isNotFound } from '../../functions/core/errors.ts'
import { paths } from '../../functions/core/paths.ts'
import {
  freeSpots,
  spotsText,
  useChecklist,
  useRegisterTrip,
  useTrip,
} from '../../functions/trips/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './weekends.module.css'
import { paths } from '../../functions/core/paths.ts'

export function TripScreen() {
  const { tripId = '' } = useParams()
  const trip = useTrip(tripId, { notFoundIsFinal: true })

  if (trip.isError && isNotFound(trip.error)) {
    return (
      <Screen
        title="Выезд не найден"
        back={
          <BackLink to={paths.events()} testID="back-link">
            К мероприятиям
          </BackLink>
        }
        testID="screen-trip-not-found"
      >
        <p>Такого выезда нет или его уже убрали из расписания.</p>
        <p>
          <Link to={paths.weekends()} className={s.tripLink}>
            К списку выездов
          </Link>
        </p>
      </Screen>
    )
  }
  if (!trip.data) {
    return (
      <Screen
        title="Выезд"
        back={
          <BackLink to={paths.events()} testID="back-link">
            К мероприятиям
          </BackLink>
        }
        testID="screen-trip"
      >
        <QueryState query={trip} what="выезд">
          {() => null}
        </QueryState>
      </Screen>
    )
  }
  return <TripDetails trip={trip.data} />
}

function TripDetails({ trip }: { trip: Trip }) {
  const register = useRegisterTrip(trip.id)
  const full = freeSpots(trip) === 0
  const registered = register.isSuccess

  return (
    <Screen
      title={trip.title}
      back={
        <BackLink to={paths.events()} testID="back-link">
          К мероприятиям
        </BackLink>
      }
      testID="screen-trip"
    >
      <Card as="section" aria-labelledby="trip-about">
        <h2 id="trip-about" className="visually-hidden">
          О выезде
        </h2>
        <dl className={s.meta}>
          <div>
            <dt>Дата</dt>
            <dd data-testid="trip-date">{formatDayRu(trip.date)}</dd>
          </div>
          <div>
            <dt>Место</dt>
            <dd>{trip.place}</dd>
          </div>
        </dl>
        <p className={s.spots} data-testid="trip-spots" aria-live="polite">
          {spotsText(trip)}
        </p>
        {trip.demo && <DemoBadge />}
      </Card>

      <BigButton
        onClick={() => register.mutate()}
        disabled={registered || full || register.isPending}
        icon="calendar"
        testID="trip-register"
      >
        {registered ? 'Вы записаны' : 'Записаться на выезд'}
      </BigButton>
      {registered && (
        <Notice tone="success" testID="trip-registered">
          Вы записаны на выезд {formatDayRu(trip.date)}. Соберите вещи по чек-листу ниже.
        </Notice>
      )}
      {!registered && full && (
        <Notice testID="trip-full">
          Свободных мест на этот выезд нет. <Link to={paths.weekends()}>Выберите другую дату</Link>
        </Notice>
      )}
      {register.isError && (
        <Notice tone="error" testID="trip-register-error">
          Не удалось записаться: {register.error.message}. Попробуйте ещё раз.
        </Notice>
      )}

      <p>
        <Link to={paths.tripGroup(trip.id)} className={s.tripLink} data-testid="trip-group">
          Записать группу: школу, клуб или семью
        </Link>
      </p>

      <Checklist trip={trip} />
      <ShareButton
        title={`Выезд с поисковиками: ${trip.title}`}
        text={`${formatDayRu(trip.date)} — «Выходные с поисковиком»`}
        testID="trip-share"
      />
    </Screen>
  )
}

function Checklist({ trip }: { trip: Trip }) {
  const { isChecked, toggle, progress } = useChecklist(trip)

  return (
    <Card as="section">
      <fieldset className={s.checklist}>
        <legend>Чек-лист новичка</legend>
        {trip.checklist.map((item) => (
          <div key={item.id} className={s.item}>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={isChecked(item.id)}
                onChange={() => toggle(item.id)}
                data-testid={`checklist-${item.id}`}
              />
              <span>{item.label}</span>
            </label>
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className={s.itemLink}>
                Открыть сайт<span className="visually-hidden">: {item.label}</span>
              </a>
            )}
          </div>
        ))}
      </fieldset>
      <p className={s.progress} data-testid="checklist-progress" aria-live="polite">
        Готово {progress.done} из {progress.total}
      </p>
      {progress.ready && (
        <Notice tone="success" testID="checklist-ready">
          Вы готовы к выезду! Всё собрано — до встречи в поле.
        </Notice>
      )}
    </Card>
  )
}
