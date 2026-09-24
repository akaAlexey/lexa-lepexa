import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { QueryState } from '../../app/QueryState.tsx'
import { useApi } from '../../app/services.tsx'
import { region } from '../../config/region.ts'
import type { Battle } from '../../contract/schemas.ts'
import {
  CHRONICLE_YEARS,
  chronicleByYear,
  formatHistoricDate,
  type YearFilter,
} from '../../domain/chronicle.ts'
import { MapView, type MapMarker } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { ChoiceChips } from '../../ui/ChoiceChips.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './chronicle.module.css'

const FILTERS: { value: YearFilter; label: string; testID: string }[] = [
  ...CHRONICLE_YEARS.map((y) => ({ value: y, label: y, testID: `year-${y}` })),
  { value: 'all', label: 'Все', testID: 'year-all' },
]

function Timeline({ battles }: { battles: Battle[] }) {
  const [year, setYear] = useState<YearFilter>('all')
  const [selected, setSelected] = useState<string>()
  const groups = useMemo(() => chronicleByYear(battles, year), [battles, year])
  const shown = useMemo(() => groups.flatMap((g) => g.battles), [groups])

  // Метка на карте выбирает событие — показываем его карточку в ленте
  const selectedRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (selected) selectedRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [selected])

  const markers = useMemo<MapMarker[]>(
    () =>
      shown.flatMap((b) =>
        b.place
          ? [
              {
                id: b.id,
                lat: b.place.lat,
                lon: b.place.lon,
                icon: 'star' as const,
                label: `${formatHistoricDate(b.date)}, ${b.place.name}`,
                color: b.id === selected ? tokens.color.accent : tokens.color.point.battle,
              },
            ]
          : [],
      ),
    [shown, selected],
  )

  return (
    <>
      <ChoiceChips legend="Годы" options={FILTERS} value={year} onChange={setYear} />
      <MapView
        label="Карта событий хроники"
        center={region.mapCenter}
        zoom={region.mapZoom}
        markers={markers}
        onMarkerSelect={setSelected}
        fitToContent
        testID="chronicle-map"
      />
      {groups.map((g) => (
        <section key={g.year} aria-labelledby={`year-title-${g.year}`}>
          <h2 id={`year-title-${g.year}`} className={s.year}>
            {g.year} <span className={s.yearNote}>{g.note}</span>
          </h2>
          {g.battles.length === 0 ? (
            <Notice testID={`year-empty-${g.year}`}>
              О событиях этого года пока нет проверенных записей.{' '}
              <Link to="/archive/new">Расскажите, что знаете</Link> — краевед проверит.
            </Notice>
          ) : (
            <ol className={s.timeline} aria-label={`События ${g.year} года`}>
              {g.battles.map((b) => (
                <li
                  key={b.id}
                  ref={b.id === selected ? selectedRef : undefined}
                  className={b.id === selected ? s.eventSelected : s.event}
                  data-testid={`event-${b.id}`}
                >
                  <span className={s.date}>{formatHistoricDate(b.date)}</span>
                  <p className={s.text}>{b.text}</p>
                  {b.place && <p className={s.place}>{b.place.name}</p>}
                  <p className={s.links}>
                    <a href={b.archiveUrl} target="_blank" rel="noopener noreferrer">
                      Архивный источник
                      <span className="visually-hidden">: {formatHistoricDate(b.date)}</span>
                    </a>{' '}
                    {b.demo && <DemoBadge />}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </>
  )
}

/** Лента событий по годам с картой — из дизайна «Универсальный вариант» (вкладка «История»). */
export function ChronicleScreen() {
  const api = useApi()
  const battles = useQuery({ queryKey: ['battles'], queryFn: api.listBattles })
  return (
    <Screen
      title="Хроника"
      lead="Бои за Орловщину: оборона 1941 года, оккупация и освобождение в августе 1943-го"
      testID="screen-chronicle"
    >
      <BigButton to="/archive/new" icon="story" testID="chronicle-tell">
        Рассказать историю о событиях
      </BigButton>
      <QueryState query={battles} what="хронику">
        {(list) => <Timeline battles={list} />}
      </QueryState>
    </Screen>
  )
}
