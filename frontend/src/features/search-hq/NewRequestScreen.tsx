import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import type { Team, VolunteerRequest } from '../../contract/schemas.ts'
import { formatDayRu } from '../../domain/format.ts'
import { paths } from '../../functions/core/paths.ts'
import {
  commanderTeam,
  publishedState,
  REQUEST_AGES,
  REQUEST_COUNTS,
  usePublishRequest,
  useRequests,
  useTeams,
} from '../../functions/helpRequests/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { ChoiceChips } from '../../ui/ChoiceChips.tsx'
import { TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './search.module.css'

export function NewRequestScreen() {
  const teams = useTeams()
  const requests = useRequests()
  return (
    <Screen
      title="Набрать волонтёров"
      lead="Всё заполнено по прошлой заявке — выберите, сколько людей нужно"
      back={
        <BackLink to={paths.events()} testID="back-link">
          К мероприятиям
        </BackLink>
      }
      testID="screen-new-request"
    >
      <QueryState query={teams} what="отряд">
        {(teamList) => (
          <QueryState query={requests} what="прошлые заявки">
            {(requestList) => {
              const found = commanderTeam(teamList, requestList)
              if (!found) return <Notice tone="error">Отряд командира не найден.</Notice>
              return <RequestForm team={found.team} last={found.last} />
            }}
          </QueryState>
        )}
      </QueryState>
    </Screen>
  )
}

function RequestForm({ team, last }: { team: Team; last: VolunteerRequest | undefined }) {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const form = usePublishRequest(team, last, (created) =>
    navigate(paths.events(), { state: publishedState(created.id) }),
  )
  const { values, errors, today, tomorrow } = form
  const countNumber = Number(values.count)

  return (
    <form ref={formRef} className={s.form} onSubmit={form.submit} noValidate>
      <p className={s.team} data-testid="request-team">
        Отряд «{team.name}»
      </p>
      <div>
        <ChoiceChips
          legend="Когда"
          options={[
            { value: today, label: 'Сегодня', testID: 'date-today' },
            { value: tomorrow, label: 'Завтра', testID: 'date-tomorrow' },
          ]}
          value={values.date}
          onChange={(v) => form.set('date', v)}
        />
        <p data-testid="request-date-label" aria-live="polite">
          {formatDayRu(values.date)}
        </p>
        {errors.date && <Notice tone="error">{errors.date}</Notice>}
      </div>
      <ChoiceChips
        legend="Сколько людей нужно"
        options={REQUEST_COUNTS.map((n) => ({ value: n, label: String(n), testID: `count-${n}` }))}
        value={REQUEST_COUNTS.find((n) => n === countNumber)}
        onChange={(n) => form.set('count', String(n))}
      />
      <TextField
        label="Или своё число"
        type="number"
        inputMode="numeric"
        min={1}
        value={values.count}
        onChange={(v) => form.set('count', v)}
        error={errors.count}
        testID="request-count"
      />
      <ChoiceChips
        legend="Возраст волонтёров"
        options={REQUEST_AGES.map((n) => ({ value: n, label: `${n}+`, testID: `age-${n}` }))}
        value={values.minAge}
        onChange={(n) => form.set('minAge', n)}
      />
      <TextField
        label="Место сбора"
        value={values.place}
        onChange={(v) => form.set('place', v)}
        error={errors.place}
        autoComplete="off"
        testID="request-place"
      />
      <TextField
        label="Название заявки"
        value={values.title}
        onChange={(v) => form.set('title', v)}
        error={errors.title}
        autoComplete="off"
        testID="request-title"
      />
      {form.failed && (
        <Notice tone="error" testID="request-error">
          Не удалось опубликовать заявку. Проверьте связь и попробуйте ещё раз.
        </Notice>
      )}
      <BigButton
        // главная кнопка — не submit (ui/BigButton), поэтому отправляем форму так же, как Enter
        onClick={() => formRef.current?.requestSubmit()}
        disabled={form.sending}
        icon="flag"
        testID="request-publish"
      >
        Опубликовать
      </BigButton>
    </form>
  )
}
