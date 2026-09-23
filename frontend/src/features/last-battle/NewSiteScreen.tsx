import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useServices } from '../../app/services.tsx'
import { region } from '../../config/region.ts'
import type { LatLon, NewLastBattleSite } from '../../contract/schemas.ts'
import { validateNewSite, type SiteErrors } from '../../domain/lastBattle.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { Button } from '../../ui/Button.tsx'
import { TextField } from '../../ui/Field.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './lastBattle.module.css'

/** Шаблон экспедиции отряда «Высота»: три десантника 9-й бригады, октябрь 1941 (из кейса). */
const EXPEDITION_TEMPLATE = {
  fightersCount: '3',
  unit: '9-я вдбр, 5-й ВДК',
  dateText: 'октябрь 1941',
  source: 'Полевой отчёт отряда «Высота»',
}

/** Состояние, передаваемое карточке нового места через навигацию. */
export interface SiteCreatedState {
  notifiedCount: number
}

const toNumber = (value: string) => (value.trim() === '' ? NaN : Number(value.replace(',', '.')))

function NewSiteForm({ initial }: { initial: LatLon | null }) {
  const { api, platform, own } = useServices()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const form = useRef<HTMLDivElement>(null)

  const [placeName, setPlaceName] = useState('')
  const [fightersCount, setFightersCount] = useState(EXPEDITION_TEMPLATE.fightersCount)
  const [unit, setUnit] = useState(EXPEDITION_TEMPLATE.unit)
  const [dateText, setDateText] = useState(EXPEDITION_TEMPLATE.dateText)
  const [source, setSource] = useState(EXPEDITION_TEMPLATE.source)
  const [circumstances, setCircumstances] = useState('')
  const [lat, setLat] = useState(initial ? String(initial.lat) : '')
  const [lon, setLon] = useState(initial ? String(initial.lon) : '')
  const [errors, setErrors] = useState<SiteErrors>({})
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const fillMyPosition = async () => {
    setProblem(null)
    try {
      const p = await platform.geo.getPosition()
      setLat(String(p.lat))
      setLon(String(p.lon))
    } catch {
      setProblem('Не удалось определить координаты. Введите их вручную.')
    }
  }

  const publish = async () => {
    const count = toNumber(fightersCount)
    const input: NewLastBattleSite = {
      lat: toNumber(lat),
      lon: toNumber(lon),
      placeName: placeName.trim(),
      fightersCount: count,
      // Имена бойцов на месте находки не известны — их установит проверка по архивам.
      fighters:
        Number.isInteger(count) && count > 0 && count <= 1000
          ? Array.from({ length: count }, () => ({}))
          : [],
      unit: unit.trim(),
      dateText: dateText.trim(),
      circumstances: circumstances.trim(),
      // Полевой отчёт — наблюдение самих поисковиков на месте, а не архивный документ.
      sources: [{ kind: 'eyewitness', title: source.trim() }],
      teamId: region.demo.commanderTeamId,
    }
    const found = validateNewSite(input)
    setErrors(found)
    setProblem(null)
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() =>
        form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      )
      return
    }
    setBusy(true)
    try {
      const { site, notifiedCount } = await own.run(() => api.createSite({ body: input }))
      queryClient.setQueryData(['sites', site.id], site)
      void queryClient.invalidateQueries({ queryKey: ['sites'], exact: true })
      const state: SiteCreatedState = { notifiedCount }
      void navigate(`/last-battle/${site.id}`, { state })
    } catch {
      setProblem('Не удалось опубликовать место. Проверьте связь и попробуйте ещё раз.')
      setBusy(false)
    }
  }

  return (
    <div className={s.form} ref={form}>
      <TextField
        label="Место"
        hint="Овраг, опушка, ближайшая деревня"
        value={placeName}
        onChange={setPlaceName}
        error={errors.placeName}
        testID="site-place"
      />
      <fieldset className={s.coords}>
        <legend>Координаты места</legend>
        <div className={s.actions}>
          <Button onClick={() => void fillMyPosition()} icon="pin" testID="site-my-position">
            Мои координаты
          </Button>
        </div>
        <div className={s.coordsRow}>
          <TextField
            label="Широта"
            type="number"
            inputMode="decimal"
            step="any"
            value={lat}
            onChange={setLat}
            error={errors.coords}
            testID="site-lat"
          />
          <TextField
            label="Долгота"
            type="number"
            inputMode="decimal"
            step="any"
            value={lon}
            onChange={setLon}
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
        value={fightersCount}
        onChange={setFightersCount}
        error={errors.fightersCount}
        testID="site-fighters-count"
      />
      <TextField
        label="Часть"
        hint="Как в источнике или «Неизвестно»"
        value={unit}
        onChange={setUnit}
        error={errors.unit}
        testID="site-unit"
      />
      <TextField
        label="Когда"
        hint="Датировка как в источнике"
        value={dateText}
        onChange={setDateText}
        error={errors.dateText}
        testID="site-date-text"
      />
      <TextField
        label="Источник"
        value={source}
        onChange={setSource}
        error={errors.sources}
        testID="site-source"
      />
      <TextField
        label="Обстоятельства"
        hint="Что нашли, кто указал место — необязательно"
        value={circumstances}
        onChange={setCircumstances}
        testID="site-circumstances"
      />
      <p>После публикации место получит статус «Обнаружено место (требуется проверка)».</p>
      {problem && (
        <Notice tone="error" testID="site-problem">
          {problem}
        </Notice>
      )}
      <BigButton onClick={() => void publish()} disabled={busy} icon="flag" testID="site-publish">
        Опубликовать
      </BigButton>
    </div>
  )
}

export function NewSiteScreen() {
  const { platform } = useServices()
  // Форма появляется, когда известны координаты устройства (или стало ясно, что их нет).
  const [position, setPosition] = useState<LatLon | null | undefined>(undefined)
  useEffect(() => {
    let active = true
    platform.geo.getPosition().then(
      (p) => active && setPosition(p),
      () => active && setPosition(null),
    )
    return () => {
      active = false
    }
  }, [platform])

  return (
    <Screen
      title="Отметить место гибели"
      lead="Шаблон экспедиции уже заполнен — добавьте описание места и проверьте координаты"
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
