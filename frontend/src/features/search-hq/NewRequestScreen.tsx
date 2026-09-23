import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useApi } from '../../app/services.tsx'
import { region } from '../../config/region.ts'
import type {
  NewVolunteerRequest,
  Team,
  VolunteerRequest,
  VolunteerRole,
} from '../../contract/schemas.ts'
import { todayIso, tomorrowIso } from '../../domain/dates.ts'
import { formatDayRu } from '../../domain/format.ts'
import { ROLE_LABELS, validateNewRequest, type RequestErrors } from '../../domain/requests.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { ChoiceChips } from '../../ui/ChoiceChips.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { SelectField, TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import { qk, type PublishedState } from './queries.ts'
import s from './search.module.css'

const COUNTS = [5, 10, 20] as const
const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as VolunteerRole[]).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}))

export function NewRequestScreen() {
  const api = useApi()
  const teams = useQuery({ queryKey: qk.teams, queryFn: api.listTeams })
  const requests = useQuery({ queryKey: qk.requests, queryFn: api.listRequests })
  return (
    <Screen
      title="Набрать волонтёров"
      lead="Всё заполнено по прошлой заявке — выберите, сколько людей нужно"
      testID="screen-new-request"
    >
      <QueryState query={teams} what="отряд">
        {(teamList) => (
          <QueryState query={requests} what="прошлые заявки">
            {(requestList) => {
              const team = teamList.find((t) => t.id === region.demo.commanderTeamId)
              if (!team) return <Notice tone="error">Отряд командира не найден.</Notice>
              return (
                <RequestForm team={team} last={requestList.find((r) => r.teamId === team.id)} />
              )
            }}
          </QueryState>
        )}
      </QueryState>
    </Screen>
  )
}

function RequestForm({ team, last }: { team: Team; last: VolunteerRequest | undefined }) {
  const api = useApi()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [now] = useState(() => new Date())
  const today = todayIso(now)
  const tomorrow = tomorrowIso(now)

  const [date, setDate] = useState(tomorrow)
  const [count, setCount] = useState('5')
  const [role, setRole] = useState<VolunteerRole>('digger')
  const [place, setPlace] = useState(last?.place ?? '')
  const [title, setTitle] = useState(last?.title ?? `Набор волонтёров — отряд «${team.name}»`)
  const [errors, setErrors] = useState<RequestErrors>({})
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [attempt, setAttempt] = useState(0)

  // После неудачной проверки фокус — на первое поле с ошибкой.
  useEffect(() => {
    if (attempt > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attempt])

  const countNumber = Number(count)
  const publish = async () => {
    const input: NewVolunteerRequest = {
      teamId: team.id,
      title: title.trim(),
      date,
      place: place.trim(),
      roles: [{ role, count: count.trim() === '' ? 0 : countNumber }],
    }
    const found = validateNewRequest(input, today)
    setErrors(found)
    setFailed(false)
    if (Object.keys(found).length > 0) {
      setAttempt((a) => a + 1)
      return
    }
    setSending(true)
    try {
      const created = await api.createRequest({ body: input })
      queryClient.setQueryData<VolunteerRequest[]>(qk.requests, (old) => [
        created,
        ...(old ?? []).filter((r) => r.id !== created.id),
      ])
      void queryClient.invalidateQueries({ queryKey: qk.requests })
      navigate('/search', { state: { publishedId: created.id } satisfies PublishedState })
    } catch {
      setFailed(true)
      setSending(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void publish()
  }

  return (
    <form ref={formRef} className={s.form} onSubmit={onSubmit} noValidate>
      <p className={s.team} data-testid="request-team">
        Отряд «{team.name}» {team.demo && <DemoBadge />}
      </p>
      <div>
        <ChoiceChips
          legend="Когда"
          options={[
            { value: today, label: 'Сегодня', testID: 'date-today' },
            { value: tomorrow, label: 'Завтра', testID: 'date-tomorrow' },
          ]}
          value={date}
          onChange={setDate}
        />
        <p data-testid="request-date-label" aria-live="polite">
          {formatDayRu(date)}
        </p>
        {errors.date && <Notice tone="error">{errors.date}</Notice>}
      </div>
      <ChoiceChips
        legend="Сколько людей нужно"
        options={COUNTS.map((n) => ({ value: n, label: String(n), testID: `count-${n}` }))}
        value={COUNTS.find((n) => n === countNumber)}
        onChange={(n) => setCount(String(n))}
      />
      <TextField
        label="Или своё число"
        type="number"
        inputMode="numeric"
        min={1}
        value={count}
        onChange={setCount}
        error={errors.count}
        testID="request-count"
      />
      <SelectField
        label="Кто нужен"
        value={role}
        options={ROLE_OPTIONS}
        onChange={setRole}
        testID="request-role"
      />
      <TextField
        label="Место сбора"
        value={place}
        onChange={setPlace}
        error={errors.place}
        autoComplete="off"
        testID="request-place"
      />
      <TextField
        label="Название заявки"
        value={title}
        onChange={setTitle}
        error={errors.title}
        autoComplete="off"
        testID="request-title"
      />
      {failed && (
        <Notice tone="error" testID="request-error">
          Не удалось опубликовать заявку. Проверьте связь и попробуйте ещё раз.
        </Notice>
      )}
      <BigButton
        onClick={() => void publish()}
        disabled={sending}
        icon="flag"
        testID="request-publish"
      >
        Опубликовать
      </BigButton>
    </form>
  )
}
