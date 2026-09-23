import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client.ts'
import { QueryState } from '../../app/QueryState.tsx'
import { useServices } from '../../app/services.tsx'
import type { Trip } from '../../contract/schemas.ts'
import { checklistProgress, toggleChecklistItem } from '../../domain/checklist.ts'
import { formatDayRu } from '../../domain/format.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Card } from '../../ui/Card.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { groupUrl } from './groups.ts'
import { checklistKey, freeSpots, spotsText } from './trips.ts'
import s from './weekends.module.css'

const isNotFound = (e: unknown) => e instanceof ApiError && e.status === 404

export function TripScreen() {
  const { tripId = '' } = useParams()
  const { api } = useServices()
  const trip = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => api.getTrip({ id: tripId }),
    retry: (count, e) => !isNotFound(e) && count < 1,
  })

  if (trip.isError && isNotFound(trip.error)) {
    return (
      <Screen title="Выезд не найден" testID="screen-trip-not-found">
        <p>Такого выезда нет или его уже убрали из расписания.</p>
        <p>
          <Link to="/weekends" className={s.tripLink}>
            К списку выездов
          </Link>
        </p>
      </Screen>
    )
  }
  if (!trip.data) {
    return (
      <Screen title="Выезд" testID="screen-trip">
        <QueryState query={trip} what="выезд">
          {() => null}
        </QueryState>
      </Screen>
    )
  }
  return <TripDetails trip={trip.data} />
}

function TripDetails({ trip }: { trip: Trip }) {
  const { api } = useServices()
  const queryClient = useQueryClient()
  const register = useMutation({
    mutationFn: () => api.registerTrip({ id: trip.id }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['trip', trip.id], updated)
      queryClient.setQueryData<Trip[]>(['trips'], (list) =>
        list?.map((t) => (t.id === updated.id ? updated : t)),
      )
    },
  })
  const full = freeSpots(trip) === 0
  const registered = register.isSuccess

  return (
    <Screen title={trip.title} testID="screen-trip">
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
          Свободных мест на этот выезд нет. <Link to="/weekends">Выберите другую дату</Link>
        </Notice>
      )}
      {register.isError && (
        <Notice tone="error" testID="trip-register-error">
          Не удалось записаться: {register.error.message}. Попробуйте ещё раз.
        </Notice>
      )}

      <p>
        <Link to={groupUrl(trip.id)} className={s.tripLink} data-testid="trip-group">
          Записать группу: школу, клуб или семью
        </Link>
      </p>

      <Checklist trip={trip} />
    </Screen>
  )
}

function Checklist({ trip }: { trip: Trip }) {
  const { platform } = useServices()
  const key = checklistKey(trip.id)
  const [checked, setChecked] = useState<string[]>(() => {
    const saved = platform.storage.get<unknown>(key)
    return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string') : []
  })
  const progress = checklistProgress(trip.checklist, checked)

  const toggle = (id: string) => {
    const next = toggleChecklistItem(checked, id)
    platform.storage.set(key, next)
    setChecked(next)
  }

  return (
    <Card as="section">
      <fieldset className={s.checklist}>
        <legend>Чек-лист новичка</legend>
        {trip.checklist.map((item) => (
          <div key={item.id} className={s.item}>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={checked.includes(item.id)}
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
