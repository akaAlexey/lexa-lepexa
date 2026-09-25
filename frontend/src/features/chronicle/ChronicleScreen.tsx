import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { paths } from '../../functions/core/paths.ts'
import { QueryState } from '../../app/QueryState.tsx'
import { useApi } from '../../app/services.tsx'
import { region } from '../../config/region.ts'
import type { Battle, Grave, Memorial, MemorialKind } from '../../contract/schemas.ts'
import {
  CHRONICLE_YEARS,
  chronicleByYear,
  formatHistoricDate,
  type YearFilter,
} from '../../domain/chronicle.ts'
import { MapView, type MapMarker } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { ChoiceChips, ToggleChips } from '../../ui/ChoiceChips.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import type { IconName } from '../../ui/Icon.tsx'
import { Notice } from '../../ui/Notice.tsx'
import { BackLink } from '../../ui/BackLink.tsx'
import { Screen } from '../../ui/Screen.tsx'
import s from './chronicle.module.css'

const FILTERS: { value: YearFilter; label: string; testID: string }[] = [
  ...CHRONICLE_YEARS.map((y) => ({ value: y, label: y, testID: `year-${y}` })),
  { value: 'all', label: 'Все', testID: 'year-all' },
]

type Layer = 'battles' | 'memorials' | 'graves'

const LAYERS: { value: Layer; label: string; testID: string }[] = [
  { value: 'battles', label: 'Бои', testID: 'layer-battles' },
  { value: 'memorials', label: 'Памятники', testID: 'layer-memorials' },
  { value: 'graves', label: 'Захоронения', testID: 'layer-graves' },
]

const MEMORIAL: Record<MemorialKind, { icon: IconName; label: string }> = {
  grave: { icon: 'grave', label: 'Братская могила' },
  flame: { icon: 'star', label: 'Вечный огонь' },
  vehicle: { icon: 'helmet', label: 'Техника-памятник' },
  monument: { icon: 'flag', label: 'Памятник' },
}

const NONE_MEMORIALS: Memorial[] = []
const NONE_GRAVES: Grave[] = []
const MEMORIAL_PREFIX = 'mem:'
const GRAVE_PREFIX = 'grave:'

interface TimelineProps {
  battles: Battle[]
  memorials: Memorial[]
  graves: Grave[]
}

function MemorialCard({ memorial }: { memorial: Memorial }) {
  return (
    <article className={s.memorial} data-testid="memorial-card" aria-live="polite">
      <p className={s.memorialKind}>{MEMORIAL[memorial.kind].label}</p>
      <h2 className={s.memorialName}>{memorial.name}</h2>
      <p className={s.links}>
        Источник:{' '}
        <a href={memorial.osmUrl} target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>
      </p>
      {memorial.kind === 'grave' && (
        <p>
          <Link to={paths.newLivePhoto()} data-testid="memorial-live-photo">
            Создать «живое фото» бойца, похороненного здесь
          </Link>
        </p>
      )}
    </article>
  )
}

function Timeline({ battles, memorials, graves }: TimelineProps) {
  const [year, setYear] = useState<YearFilter>('all')
  const [layers, setLayers] = useState<Layer[]>(['battles', 'memorials'])
  const [selected, setSelected] = useState<string>()
  const groups = useMemo(() => chronicleByYear(battles, year), [battles, year])
  const shown = useMemo(() => groups.flatMap((g) => g.battles), [groups])
  const selectedMemorial = selected?.startsWith(MEMORIAL_PREFIX)
    ? memorials.find((m) => MEMORIAL_PREFIX + m.id === selected)
    : undefined

  // Метка на карте выбирает событие — показываем его карточку в ленте
  const selectedRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (selected) selectedRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [selected])

  const markers = useMemo<MapMarker[]>(
    () => [
      // Бои — первыми: главные метки хроники поверх фоновых слоёв
      ...(layers.includes('battles')
        ? shown.flatMap((b) =>
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
          )
        : []),
      ...(layers.includes('memorials')
        ? memorials.map((m) => ({
            id: MEMORIAL_PREFIX + m.id,
            lat: m.lat,
            lon: m.lon,
            icon: MEMORIAL[m.kind].icon,
            label: `${MEMORIAL[m.kind].label}: ${m.name}`,
            color:
              MEMORIAL_PREFIX + m.id === selected ? tokens.color.accent : tokens.color.point.hq,
            size: 'small' as const,
          }))
        : []),
      ...(layers.includes('graves')
        ? graves.map((g) => ({
            id: GRAVE_PREFIX + g.id,
            lat: g.lat,
            lon: g.lon,
            icon: 'grave' as const,
            label: `Захоронение: ${g.fullName}, ${g.unit}`,
            color: tokens.color.point.trench,
            size: 'small' as const,
            interactive: false,
          }))
        : []),
    ],
    [shown, memorials, graves, layers, selected],
  )

  return (
    <>
      <ToggleChips legend="Слои карты" options={LAYERS} value={layers} onChange={setLayers} />
      <ChoiceChips legend="Годы боёв" options={FILTERS} value={year} onChange={setYear} />
      <MapView
        label="Карта событий хроники"
        center={region.mapCenter}
        zoom={region.mapZoom}
        markers={markers}
        onMarkerSelect={setSelected}
        fitToContent
        testID="chronicle-map"
      />
      {selectedMemorial && <MemorialCard memorial={selectedMemorial} />}
      {layers.includes('memorials') && memorials.length > 0 && (
        <details className={s.memorialList} data-testid="memorial-list">
          <summary>Памятники войны списком: {memorials.length}. Данные OpenStreetMap</summary>
          <ul>
            {memorials.map((m) => (
              <li key={m.id}>
                <a href={m.osmUrl} target="_blank" rel="noopener noreferrer">
                  {m.name}
                </a>{' '}
                <span className={s.place}>{MEMORIAL[m.kind].label}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
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
  // Фоновые слои: если не загрузились — хроника работает без них
  const memorials = useQuery({ queryKey: ['memorials'], queryFn: api.listMemorials })
  const graves = useQuery({ queryKey: ['graves'], queryFn: api.listGraves })
  return (
    <Screen
      title="Хроника"
      lead="Бои за Орловщину 1941–1943 годов и памятники войны на одной карте"
      back={
        <BackLink to={paths.map()} testID="back-link">
          К карте
        </BackLink>
      }
      testID="screen-chronicle"
    >
      <BigButton to="/archive/new" icon="story" testID="chronicle-tell">
        Рассказать историю о событиях
      </BigButton>
      <QueryState query={battles} what="хронику">
        {(list) => (
          <Timeline
            battles={list}
            memorials={memorials.data ?? NONE_MEMORIALS}
            graves={graves.data ?? NONE_GRAVES}
          />
        )}
      </QueryState>
    </Screen>
  )
}
