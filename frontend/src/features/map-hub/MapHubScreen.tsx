import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useRole } from '../../app/RoleContext.tsx'
import { region } from '../../config/region.ts'
import type { Battle, LastBattleSite, Route } from '../../contract/schemas.ts'
import {
  CHRONICLE_YEARS,
  chronicleByYear,
  formatHistoricDate,
  type YearFilter,
} from '../../domain/chronicle.ts'
import { SITE_STATUS_ORDER } from '../../domain/lastBattle.ts'
import { PLACE_KIND_LABEL, searchPlaces, type Place } from '../../domain/mapHub.ts'
import { questStatus } from '../../domain/trail.ts'
import { paths } from '../../functions/core/paths.ts'
import { useMapHub } from '../../functions/mapHub/useMapHub.ts'
import { MapView, type MapMarker } from '../../map/MapView.tsx'
import { tokens } from '../../theme/tokens.ts'
import { BigButton } from '../../ui/BigButton.tsx'
import { DemoBadge } from '../../ui/DemoBadge.tsx'
import { Icon, type IconName } from '../../ui/Icon.tsx'
import { SITE_STATUS_META } from '../../ui/siteStatus.ts'
import { StatusBadge } from '../../ui/StatusBadge.tsx'
import ui from '../../ui/ui.module.css'
import { POINT_ICON } from '../trail/pointKinds.ts'
import { useQuestProgress } from '../trail/useTrail.ts'
import s from './mapHub.module.css'
import { useWide } from './useWide.ts'

type SheetTab = 'places' | 'history'

const KIND_ICON: Record<Place['kind'], IconName> = {
  point: 'route',
  site: 'pin',
  grave: 'grave',
  battle: 'star',
}

/** Адрес подробной карточки места: у каждой точки и места поиска свой экран. */
function detailPath(p: Place): string | undefined {
  if (p.kind === 'point' && p.routeId) return paths.point(p.routeId, p.id)
  if (p.kind === 'site') return paths.site(p.id)
  if (p.kind === 'battle') return paths.chronicle()
  return undefined
}

function markerFor(p: Place, routes: readonly Route[] | undefined): MapMarker {
  switch (p.kind) {
    case 'point': {
      const kind = routes?.flatMap((r) => r.points).find((x) => x.id === p.id)?.kind ?? 'battle'
      return {
        id: p.key,
        lat: p.lat,
        lon: p.lon,
        icon: POINT_ICON[kind].icon,
        label: `${p.title} (${POINT_ICON[kind].label}, ${p.subtitle})`,
        color: tokens.color.point[kind],
      }
    }
    case 'site':
      return {
        id: p.key,
        lat: p.lat,
        lon: p.lon,
        icon: SITE_STATUS_META[p.status ?? 'found_needs_check'].icon,
        label: `${p.title}: ${SITE_STATUS_META[p.status ?? 'found_needs_check'].label}`,
        color: tokens.color.status[p.status ?? 'found_needs_check'],
        shape: 'zone',
      }
    case 'grave':
      return {
        id: p.key,
        lat: p.lat,
        lon: p.lon,
        icon: 'grave',
        label: `Захоронение: ${p.title}`,
        color: tokens.color.map.grave,
        size: 'small',
        interactive: false,
      }
    case 'battle':
      return {
        id: p.key,
        lat: p.lat,
        lon: p.lon,
        icon: 'star',
        label: `Бой: ${p.title}, ${p.subtitle}`,
        color: tokens.color.map.marker,
      }
  }
}

/**
 * «Карта» (ADR 0011): карта на весь экран, сверху поиск «Места боя, музеи, исторические маршруты…»,
 * снизу шторка (на ноутбуке — панель слева): «Места» и «История края».
 * Выбранное место и вкладка — в адресе: ссылкой можно поделиться, «Назад» работает.
 */
export function MapHubScreen() {
  const hub = useMapHub()
  const wide = useWide()
  const [params, setParams] = useSearchParams()
  const tab: SheetTab = params.get('tab') === 'history' ? 'history' : 'places'
  const yearParam = params.get('year')
  const year: YearFilter = CHRONICLE_YEARS.find((y) => y === yearParam) ?? 'all'
  const selectedKey = params.get('place') ?? undefined
  const selected = hub.places.find((p) => p.key === selectedKey)
  const [sheetOpen, setSheetOpen] = useState(true)
  const h1 = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = `Карта — ${region.appTitle}`
    h1.current?.focus({ preventScroll: true })
  }, [])

  const update = (next: Record<string, string | undefined>, replace = true) => {
    const merged = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined) merged.delete(k)
      else merged.set(k, v)
    }
    setParams(merged, { replace })
  }
  const select = (key: string | undefined) => {
    update({ place: key }, false)
    if (key) setSheetOpen(true)
  }

  // На вкладке «История края» на карте — бои выбранных лет, на «Местах» — маршруты и поиск
  const shownBattles = useMemo(
    () =>
      new Set(chronicleByYear(hub.battles ?? [], year).flatMap((g) => g.battles.map((b) => b.id))),
    [hub.battles, year],
  )
  const markers = useMemo<MapMarker[]>(
    () =>
      hub.places
        .filter((p) =>
          tab === 'history'
            ? p.kind === 'battle' && shownBattles.has(p.id)
            : // Захоронения и бои — только выбранные: 40 обелисков закрыли бы маршрут и места поиска
              (p.kind !== 'battle' && p.kind !== 'grave') || p.key === selectedKey,
        )
        .map((p) => markerFor(p, hub.routes)),
    [hub.places, hub.routes, tab, shownBattles, selectedKey],
  )
  const route = tab === 'places' ? hub.routes?.[0]?.path : undefined
  // Шторка и поиск не закрывают метки: отступы кадра в пикселях
  const padding = useMemo(
    () =>
      wide
        ? { top: 90, right: 48, bottom: 48, left: 460 }
        : {
            top: 90,
            right: 32,
            bottom: sheetOpen ? Math.round(window.innerHeight * 0.45) + 40 : 110,
            left: 32,
          },
    [wide, sheetOpen],
  )

  return (
    <div className={s.hub} data-testid="screen-map">
      <h1 ref={h1} tabIndex={-1} className="visually-hidden">
        Карта
      </h1>
      <MapView
        label="Карта памяти: маршруты, места поиска, захоронения и бои"
        center={region.mapCenter}
        zoom={region.mapZoom}
        markers={markers}
        route={route}
        onMarkerSelect={(key) => select(key)}
        selectedId={selectedKey}
        fitToContent
        fitPadding={padding}
        variant="fill"
        testID="hub-map"
      />
      <SearchBox places={hub.places} onPick={(p) => select(p.key)} />
      <section
        className={s.sheet}
        data-open={sheetOpen || undefined}
        aria-label="Панель карты"
        data-testid="hub-sheet"
      >
        <button
          type="button"
          className={s.handle}
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen((v) => !v)}
          data-testid="hub-sheet-toggle"
        >
          <span className={s.grip} aria-hidden="true" />
          <span className="visually-hidden">
            {sheetOpen ? 'Свернуть панель' : 'Развернуть панель'}
          </span>
        </button>
        <div className={s.tabs} role="tablist" aria-label="Что показать">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'places'}
            className={s.tab}
            onClick={() => update({ tab: undefined, year: undefined })}
            data-testid="hub-tab-places"
          >
            Места
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'history'}
            className={s.tab}
            onClick={() => {
              update({ tab: 'history', place: undefined })
              setSheetOpen(true)
            }}
            data-testid="hub-tab-history"
          >
            История края
          </button>
        </div>
        <div className={s.body} role="tabpanel" hidden={!sheetOpen && !wide}>
          {hub.pending && (
            <p role="status" data-testid="loading">
              Загружаем карту…
            </p>
          )}
          {hub.failed && (
            <div role="alert" data-testid="error">
              <p>Не удалось загрузить места. Проверьте связь и попробуйте ещё раз.</p>
              <button type="button" className={ui.button} onClick={hub.retry}>
                Повторить
              </button>
            </div>
          )}
          {!hub.pending &&
            !hub.failed &&
            (selected ? (
              <PlaceCard place={selected} onClose={() => select(undefined)} battles={hub.battles} />
            ) : tab === 'history' ? (
              <History
                battles={hub.battles ?? []}
                year={year}
                onYear={(y) => update({ year: y === 'all' ? undefined : y })}
                onShow={(id) => select(`battle-${id}`)}
              />
            ) : (
              <Overview
                routes={hub.routes ?? []}
                sites={hub.sites ?? []}
                places={hub.places}
                onPick={(key) => select(key)}
              />
            ))}
        </div>
      </section>
    </div>
  )
}

function SearchBox({ places, onPick }: { places: Place[]; onPick: (p: Place) => void }) {
  const [query, setQuery] = useState('')
  const listId = useId()
  const found = useMemo(() => searchPlaces(places, query), [places, query])
  const showEmpty = query.trim().length >= 2 && found.length === 0
  return (
    <div className={s.search} role="search">
      <label className={s.searchField}>
        <Icon name="search" size={1.2} />
        <span className="visually-hidden">Поиск по карте</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Места боя, музеи, исторические маршруты..."
          aria-controls={listId}
          autoComplete="off"
          data-testid="hub-search"
        />
      </label>
      {(found.length > 0 || showEmpty) && (
        <ul id={listId} className={s.results} aria-label="Найдено на карте">
          {found.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                className={s.result}
                onClick={() => {
                  onPick(p)
                  setQuery('')
                }}
                data-testid={`hub-result-${p.key}`}
              >
                <Icon name={KIND_ICON[p.kind]} size={1.1} />
                <span>
                  <span className={s.resultTitle}>{p.title}</span>
                  <span className={s.resultHint}>
                    {PLACE_KIND_LABEL[p.kind]} · {p.subtitle}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {showEmpty && <li className={s.noResults}>Ничего не нашли на карте</li>}
        </ul>
      )}
    </div>
  )
}

function RouteCard({ route, main }: { route: Route; main: boolean }) {
  const { progress } = useQuestProgress(route.id)
  const status = questStatus(route, progress)
  const next = status.next
  return (
    <article className={s.routeCard} data-testid={`hub-route-${route.id}`}>
      <p className={ui.kick}>
        Семейный маршрут · {status.done} из {status.total} точек
      </p>
      <h3 className={s.cardTitle}>{route.title}</h3>
      <p className={s.muted}>
        {route.summary}. {(route.lengthM / 1000).toFixed(1).replace('.', ',')} км, около{' '}
        {route.durationMin} мин. {route.demo && <DemoBadge />}
      </p>
      {main ? (
        <BigButton
          to={next ? paths.point(route.id, next.id) : paths.finish(route.id)}
          icon="route"
          testID="hub-route-start"
        >
          {status.done === 0 ? 'Начать тропу' : next ? 'Продолжить тропу' : 'Тропа пройдена'}
        </BigButton>
      ) : null}
      <Link to={paths.trail()} className={s.more}>
        Маршрут и задания для ребёнка
      </Link>
    </article>
  )
}

function Overview({
  routes,
  sites,
  places,
  onPick,
}: {
  routes: Route[]
  sites: LastBattleSite[]
  places: Place[]
  onPick: (key: string) => void
}) {
  const { role } = useRole()
  const isCommander = role?.id === 'commander'
  const counts = SITE_STATUS_ORDER.map((st) => ({
    status: st,
    n: sites.filter((x) => x.status === st).length,
  }))
  const list = places.filter((p) => p.kind === 'site' || p.kind === 'point')
  return (
    <>
      {/* Главная кнопка карты зависит от роли (ADR 0010): командир отмечает находку, остальные идут по тропе */}
      {isCommander && (
        <BigButton to={paths.newSite()} icon="pin" testID="last-battle-add">
          Отметить место гибели
        </BigButton>
      )}
      {routes[0] && <RouteCard route={routes[0]} main={!isCommander} />}
      <section aria-labelledby="hub-sites" className={s.block}>
        <h2 id="hub-sites" className={s.blockTitle}>
          Места поиска
        </h2>
        <ul className={s.counts}>
          {counts.map((c) => (
            <li key={c.status}>
              <span style={{ color: tokens.color.status[c.status] }}>
                <Icon name={SITE_STATUS_META[c.status].icon} size={1} />
              </span>
              {SITE_STATUS_META[c.status].label}: <strong>{c.n}</strong>
            </li>
          ))}
        </ul>
        <Link to={paths.lastBattle()} className={s.more} data-testid="hub-last-battle">
          «Последний бой»: все места и подписка на находки
        </Link>
      </section>
      <section aria-labelledby="hub-list" className={s.block}>
        <h2 id="hub-list" className={s.blockTitle}>
          На карте
        </h2>
        <ul className={s.placeList}>
          {list.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                className={s.placeItem}
                onClick={() => onPick(p.key)}
                data-testid={`hub-place-${p.key}`}
              >
                <Icon name={KIND_ICON[p.kind]} size={1.1} />
                <span>
                  <span className={s.resultTitle}>{p.title}</span>
                  <span className={s.resultHint}>{p.subtitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function PlaceCard({
  place,
  onClose,
  battles,
}: {
  place: Place
  onClose: () => void
  battles: Battle[] | undefined
}) {
  const href = detailPath(place)
  const battle = place.kind === 'battle' ? battles?.find((b) => b.id === place.id) : undefined
  return (
    <article className={s.placeCard} data-testid={`hub-card-${place.key}`}>
      <div className={s.placeHead}>
        <p className={ui.kick}>{PLACE_KIND_LABEL[place.kind]}</p>
        <button type="button" className={s.close} onClick={onClose} data-testid="hub-card-close">
          <Icon name="close" size={1.2} label="Закрыть карточку" />
        </button>
      </div>
      <h2 className={s.cardTitle}>{place.title}</h2>
      <p className={s.muted}>{place.subtitle}</p>
      {place.status && <StatusBadge status={place.status} />}
      {battle && <p>{battle.text}</p>}
      {place.demo && <DemoBadge />}
      {href && (
        <BigButton to={href} icon={place.kind === 'point' ? 'route' : 'pin'} testID="hub-card-open">
          {place.kind === 'site'
            ? 'Открыть место'
            : place.kind === 'point'
              ? 'Открыть точку и задание'
              : 'Открыть хронику'}
        </BigButton>
      )}
    </article>
  )
}

function History({
  battles,
  year,
  onYear,
  onShow,
}: {
  battles: Battle[]
  year: YearFilter
  onYear: (y: YearFilter) => void
  onShow: (id: string) => void
}) {
  const groups = chronicleByYear(battles, year)
  const years: YearFilter[] = [...CHRONICLE_YEARS, 'all']
  return (
    <>
      <div className={s.years} role="group" aria-label="Годы">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            className={s.year}
            aria-pressed={year === y}
            onClick={() => onYear(y)}
            data-testid={`hub-year-${y}`}
          >
            {y === 'all' ? 'Все' : y}
          </button>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g.year} aria-labelledby={`hub-year-title-${g.year}`} className={s.block}>
          <h2 id={`hub-year-title-${g.year}`} className={s.blockTitle}>
            {g.year} <span className={s.muted}>{g.note}</span>
          </h2>
          {g.battles.length === 0 ? (
            <p className={s.muted}>Проверенных записей об этом годе пока нет.</p>
          ) : (
            <ol className={s.events}>
              {g.battles.map((b) => (
                <li key={b.id} className={s.event} data-testid={`hub-event-${b.id}`}>
                  <p className={ui.kick}>{formatHistoricDate(b.date)}</p>
                  <p className={s.eventText}>{b.text}</p>
                  <p className={s.eventLinks}>
                    {b.place && (
                      <button
                        type="button"
                        className={ui.button}
                        onClick={() => onShow(b.id)}
                        data-testid={`hub-event-show-${b.id}`}
                      >
                        <Icon name="pin" size={1.1} /> На карте
                      </button>
                    )}
                    <a href={b.archiveUrl} target="_blank" rel="noopener noreferrer">
                      Архивный источник
                      <span className="visually-hidden">: {formatHistoricDate(b.date)}</span>
                    </a>
                    {b.demo && <DemoBadge />}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
      <Link to={paths.chronicle()} className={s.more}>
        Хроника целиком
      </Link>
    </>
  )
}
