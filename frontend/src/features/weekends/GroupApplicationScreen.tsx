import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useServices } from '../../app/services.tsx'
import type { GroupApplication, Trip } from '../../contract/schemas.ts'
import { formatDayRu } from '../../domain/format.ts'
import {
  GROUP_MAX,
  GROUP_MIN,
  validateGroupApplication,
  type GroupErrors,
} from '../../domain/groupApplications.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { TextAreaField, TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { groupsKey, useMyGroups } from './groups.ts'
import s from './weekends.module.css'

/** Переход к списку выездов после подачи — показать «Заявка отправлена». */
export interface GroupSentState {
  groupSent: string
}

export function GroupApplicationScreen() {
  const { tripId = '' } = useParams()
  const { api } = useServices()
  const trip = useQuery({ queryKey: ['trip', tripId], queryFn: () => api.getTrip({ id: tripId }) })
  return (
    <Screen
      title="Заявка группы"
      lead="Школа, клуб или семейная группа — одной заявкой. Командир отряда подтвердит состав и подготовку"
      testID="screen-group-application"
    >
      <QueryState query={trip} what="выезд">
        {(data) => <GroupForm trip={data} />}
      </QueryState>
    </Screen>
  )
}

function GroupForm({ trip }: { trip: Trip }) {
  const { api } = useServices()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mine = useMyGroups()
  const [organization, setOrganization] = useState('')
  const [contactName, setContactName] = useState('')
  const [contact, setContact] = useState('')
  const [count, setCount] = useState('10')
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<GroupErrors>({})
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (attempt > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attempt])

  const send = async () => {
    const peopleCount = count.trim() === '' ? 0 : Number(count)
    const found = validateGroupApplication({ organization, contactName, contact, peopleCount })
    setErrors(found)
    setFailed(false)
    if (Object.keys(found).length > 0) {
      setAttempt((a) => a + 1)
      return
    }
    setSending(true)
    try {
      const created = await api.createGroupApplication({
        body: {
          tripId: trip.id,
          organization: organization.trim(),
          contactName: contactName.trim(),
          contact: contact.trim(),
          peopleCount,
          comment: comment.trim(),
        },
      })
      mine.add(created.id)
      queryClient.setQueryData<GroupApplication[]>(groupsKey, (old) => [created, ...(old ?? [])])
      navigate('/weekends', { state: { groupSent: created.id } satisfies GroupSentState })
    } catch {
      setFailed(true)
      setSending(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send()
  }

  return (
    <form ref={formRef} className={s.form} onSubmit={onSubmit} noValidate>
      <p className={s.tripTitle} data-testid="group-trip">
        {formatDayRu(trip.date)}. {trip.title}
      </p>
      <TextField
        label="Школа, клуб или группа"
        placeholder="Например: школа № 5, 7 «А» класс"
        value={organization}
        onChange={setOrganization}
        error={errors.organization}
        autoComplete="organization"
        testID="group-organization"
      />
      <TextField
        label="Ответственный за группу"
        value={contactName}
        onChange={setContactName}
        error={errors.contactName}
        autoComplete="name"
        testID="group-contact-name"
      />
      <TextField
        label="Телефон или почта для связи"
        hint="Видит только командир отряда"
        type="tel"
        value={contact}
        onChange={setContact}
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
        value={count}
        onChange={setCount}
        error={errors.peopleCount}
        testID="group-count"
      />
      <TextAreaField
        label="Пожелания"
        hint="Например: 8 детей и 2 взрослых, нужен гид"
        value={comment}
        onChange={setComment}
        rows={3}
        testID="group-comment"
      />
      <Notice>
        Командир уточнит дату, состав группы и подготовку. Статус заявки — в «Выходных».
      </Notice>
      {failed && (
        <Notice tone="error" testID="group-error">
          Не удалось отправить заявку. Проверьте связь и попробуйте ещё раз.
        </Notice>
      )}
      <BigButton onClick={() => void send()} disabled={sending} icon="family" testID="group-send">
        Отправить заявку группы
      </BigButton>
    </form>
  )
}
