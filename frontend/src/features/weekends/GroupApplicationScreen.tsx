import { useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import type { Trip } from '../../contract/schemas.ts'
import { formatDayRu } from '../../domain/format.ts'
import { GROUP_MAX, GROUP_MIN } from '../../domain/groupApplications.ts'
import { paths } from '../../functions/core/paths.ts'
import { useGroupApplicationForm } from '../../functions/groupApplications/index.ts'
import { useTrip } from '../../functions/trips/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { TextAreaField, TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './weekends.module.css'

/** Переход к списку выездов после подачи — показать «Заявка отправлена». */
export interface GroupSentState {
  groupSent: string
}

export function GroupApplicationScreen() {
  const { tripId = '' } = useParams()
  const trip = useTrip(tripId)
  return (
    <Screen
      title="Заявка группы"
      lead="Школа, клуб или семейная группа — одной заявкой. Командир отряда подтвердит состав и подготовку"
      back={
        <BackLink to={paths.events()} testID="back-link">
          К мероприятиям
        </BackLink>
      }
      testID="screen-group-application"
    >
      <QueryState query={trip} what="выезд">
        {(data) => <GroupForm trip={data} />}
      </QueryState>
    </Screen>
  )
}

function GroupForm({ trip }: { trip: Trip }) {
  const navigate = useNavigate()
  const form = useGroupApplicationForm(trip.id, (created) =>
    navigate(paths.weekends(), { state: { groupSent: created.id } satisfies GroupSentState }),
  )
  const formRef = useRef<HTMLFormElement>(null)
  const { values, set, errors } = form

  return (
    <form ref={formRef} className={s.form} onSubmit={form.submit} noValidate>
      <p className={s.tripTitle} data-testid="group-trip">
        {formatDayRu(trip.date)}. {trip.title}
      </p>
      <TextField
        label="Школа, клуб или группа"
        placeholder="Например: школа № 5, 7 «А» класс"
        value={values.organization}
        onChange={(v) => set('organization', v)}
        error={errors.organization}
        autoComplete="organization"
        testID="group-organization"
      />
      <TextField
        label="Ответственный за группу"
        value={values.contactName}
        onChange={(v) => set('contactName', v)}
        error={errors.contactName}
        autoComplete="name"
        testID="group-contact-name"
      />
      <TextField
        label="Телефон или почта для связи"
        hint="Видит только командир отряда"
        type="tel"
        value={values.contact}
        onChange={(v) => set('contact', v)}
        error={errors.contact}
        autoComplete="tel"
        testID="group-contact"
      />
      <TextField
        label="Сколько человек"
        hint={`От ${GROUP_MIN} до ${GROUP_MAX}, вместе со взрослыми`}
        type="number"
        inputMode="numeric"
        min={GROUP_MIN}
        max={GROUP_MAX}
        value={values.count}
        onChange={(v) => set('count', v)}
        error={errors.peopleCount}
        testID="group-count"
      />
      <TextAreaField
        label="Пожелания"
        hint="Например: 8 детей и 2 взрослых, нужен гид"
        value={values.comment}
        onChange={(v) => set('comment', v)}
        rows={3}
        testID="group-comment"
      />
      <Notice>
        Командир уточнит дату, состав группы и подготовку. Статус заявки — в «Выходных».
      </Notice>
      {form.failed && (
        <Notice tone="error" testID="group-error">
          Не удалось отправить заявку. Проверьте связь и попробуйте ещё раз.
        </Notice>
      )}
      <BigButton
        onClick={() => formRef.current?.requestSubmit()}
        disabled={form.sending}
        icon="family"
        testID="group-send"
      >
        Отправить заявку группы
      </BigButton>
    </form>
  )
}
