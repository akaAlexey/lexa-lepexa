import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { paths } from '../../functions/core/paths.ts'
import {
  useNewPlaceForm,
  type NewPlaceContext,
  type NewPlaceProblem,
  type SiteCreatedState,
} from '../../functions/places/index.ts'
import { useCurrentPosition } from '../../functions/whereAmI/index.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './lastBattle.module.css'

const PROBLEM_TEXT: Record<NewPlaceProblem, string> = {
  locate: 'Не удалось определить координаты. Введите их вручную.',
  publish: 'Не удалось опубликовать место. Проверьте связь и попробуйте ещё раз.',
}

function NewSiteForm({ initial }: { initial: NewPlaceContext }) {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const form = useNewPlaceForm(initial, ({ site, notifiedCount }) => {
    const state: SiteCreatedState = { notifiedCount }
    void navigate(paths.site(site.id), { state })
  })
  const { values, errors } = form

  return (
    // Кнопки формы — type="button": Enter в поле ничего не отправляет, как и раньше.
    <form className={s.form} ref={formRef} onSubmit={form.submit} noValidate>
      <TextField
        label="Место"
        hint="Овраг, опушка, ближайшая деревня"
        value={values.placeName}
        onChange={(v) => form.set('placeName', v)}
        error={errors.placeName}
        testID="site-place"
      />
      <fieldset className={s.coords}>
        <legend>Координаты места</legend>
        <div className={s.actions}>
          <Button onClick={() => void form.fillMyPosition()} icon="pin" testID="site-my-position">
            Мои координаты
          </Button>
        </div>
        <div className={s.coordsRow}>
          <TextField
            label="Широта"
            type="number"
            inputMode="decimal"
            step="any"
            value={values.lat}
            onChange={(v) => form.set('lat', v)}
            error={errors.coords}
            testID="site-lat"
          />
          <TextField
            label="Долгота"
            type="number"
            inputMode="decimal"
            step="any"
            value={values.lon}
            onChange={(v) => form.set('lon', v)}
            testID="site-lon"
          />
        </div>
      </fieldset>
      <TextField
        label="Сколько бойцов"
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={values.fightersCount}
        onChange={(v) => form.set('fightersCount', v)}
        error={errors.fightersCount}
        testID="site-fighters-count"
      />
      <TextField
        label="Часть"
        hint="Как в источнике или «Неизвестно»"
        value={values.unit}
        onChange={(v) => form.set('unit', v)}
        error={errors.unit}
        testID="site-unit"
      />
      <TextField
        label="Когда"
        hint="Датировка как в источнике"
        value={values.dateText}
        onChange={(v) => form.set('dateText', v)}
        error={errors.dateText}
        testID="site-date-text"
      />
      <TextField
        label="Источник"
        value={values.source}
        onChange={(v) => form.set('source', v)}
        error={errors.sources}
        testID="site-source"
      />
      <TextField
        label="Обстоятельства"
        hint="Что нашли, кто указал место — необязательно"
        value={values.circumstances}
        onChange={(v) => form.set('circumstances', v)}
        testID="site-circumstances"
      />
      <p>После публикации место получит статус «Обнаружено место (требуется проверка)».</p>
      {form.problem && (
        <Notice tone="error" testID="site-problem">
          {PROBLEM_TEXT[form.problem]}
        </Notice>
      )}
      <BigButton
        onClick={() => formRef.current?.requestSubmit()}
        disabled={form.sending}
        icon="flag"
        testID="site-publish"
      >
        Опубликовать
      </BigButton>
    </form>
  )
}

export function NewSiteScreen() {
  // Форма появляется, когда известны координаты устройства (или стало ясно, что их нет).
  const position = useCurrentPosition()

  return (
    <Screen
      title="Отметить место гибели"
      lead="Шаблон экспедиции уже заполнен — добавьте описание места и проверьте координаты"
      back={
        <BackLink to={paths.lastBattle()} testID="back-link">
          К местам поиска
        </BackLink>
      }
      testID="screen-new-site"
    >
      {position === undefined ? (
        <p role="status" data-testid="loading">
          Определяем координаты…
        </p>
      ) : (
        <NewSiteForm initial={position} />
      )}
    </Screen>
  )
}
