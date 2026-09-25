import { useCallback, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { ShareButton } from '../../app/ShareButton.tsx'
import type { Trip } from '../../contract/schemas.ts'
import { formatDayRu } from '../../domain/format.ts'
import { isNotFound } from '../../functions/core/errors.ts'
import { paths } from '../../functions/core/paths.ts'
import { moscowTime, useSignups, type SignupTarget } from '../../functions/signup/index.ts'
import { freeSpots, spotsText, useChecklist, useTrip } from '../../functions/trips/index.ts'
import { isGroupSentState } from '../../functions/groupApplications/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { SignupDialog } from '../events/SignupDialog.tsx'
import { GroupList } from './GroupList.tsx'
import s from './weekends.module.css'

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
          <Link to={paths.events('trip')} className={s.tripLink}>
            Все выезды в ленте
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
  const location = useLocation()
  const { isSignedUp } = useSignups()
  const target: SignupTarget = { kind: 'trip', trip }
  const registered = isSignedUp(target)
  const full = freeSpots(trip) === 0
  // Запись — только через окно с условиями (решение команды 25.09)
  const [signingUp, setSigningUp] = useState(false)
  // Стабильный обработчик: диалог держит фокус и не перезапускает эффект на каждом рендере
  const closeSignup = useCallback(() => setSigningUp(false), [])
  const starts = moscowTime(trip.startsAt)
  const ends = moscowTime(trip.endsAt)

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
      {isGroupSentState(location.state) && (
        <Notice tone="success" testID="group-sent">
          Заявка группы отправлена. Командир отряда рассмотрит её и уточнит подготовку.
        </Notice>
      )}
      <Card as="section" aria-labelledby="trip-about">
        <h2 id="trip-about" className="visually-hidden">
          О выезде
        </h2>
        <dl className={s.meta}>
          <div>
            <dt>Дата</dt>
            <dd data-testid="trip-date">{formatDayRu(trip.date)}</dd>
          </div>
          {starts && (
            <div>
              <dt>Время</dt>
              <dd data-testid="trip-time">
                {starts}
                {ends && `–${ends}`} по Москве
              </dd>
            </div>
          )}
          <div>
            <dt>Место</dt>
            <dd>{trip.place}</dd>
          </div>
          {trip.meetingPoint && (
            <div>
              <dt>Сбор</dt>
              <dd>{trip.meetingPoint}</dd>
            </div>
          )}
        </dl>
        <p className={s.spots} data-testid="trip-spots" aria-live="polite">
          {spotsText(trip)}
        </p>
        {trip.demo && <DemoBadge />}
      </Card>

      <BigButton
        onClick={() => setSigningUp(true)}
        disabled={registered || full}
        icon="calendar"
        testID="trip-register"
      >
        {registered ? 'Вы записаны' : 'Записаться на выезд'}
      </BigButton>
      {registered && (
        <Notice tone="success" testID="trip-registered">
          Вы записаны на выезд {formatDayRu(trip.date)}
          {starts && `, сбор в ${starts}`}. Соберите вещи по чек-листу ниже.
        </Notice>
      )}
      {!registered && full && (
        <Notice testID="trip-full">
          Свободных мест на этот выезд нет.{' '}
          <Link to={paths.events('trip')}>Выберите другую дату</Link>
        </Notice>
      )}

      <p>
        <Link to={paths.tripGroup(trip.id)} className={s.tripLink} data-testid="trip-group">
          Записать группу: школу, клуб или семью
        </Link>
      </p>

      <GroupList trip={trip} />
      <Checklist trip={trip} />
      <ShareButton
        title={`Выезд с поисковиками: ${trip.title}`}
        text={`${formatDayRu(trip.date)} — «Выходные с поисковиком»`}
        testID="trip-share"
      />
      {signingUp && <SignupDialog target={target} onClose={closeSignup} />}
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
