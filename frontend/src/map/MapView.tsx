import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LatLon } from '../contract/schemas.ts'
import { env } from '../config/env.ts'
import { tokens } from '../theme/tokens.ts'
import { Icon, type IconName } from '../ui/Icon.tsx'
import s from './map.module.css'
import { buildMapStyle, gridLayer } from './style.ts'
import { tileSources } from './tiles.ts'

export interface MapMarker {
  id: string
  lat: number
  lon: number
  /** Подпись для скринридера и всплывающей подсказки. */
  label: string
  icon: IconName
  color: string
  /** Компактная метка для плотного фонового слоя (захоронения), чтобы не перекрывать главные. */
  size?: 'normal' | 'small'
  /** 'zone' — круг-зона с пунктирной границей («Последний бой»): место известно примерно, это не булавка. */
  shape?: 'pin' | 'zone'
  /** false — фоновая метка без действия: не кнопка, не в порядке фокуса, скринридер её пропускает. */
  interactive?: boolean
}

export interface MapViewProps {
  /** Название карты для скринридера. */
  label: string
  center: LatLon
  zoom: number
  /** Передавайте стабильный массив (useMemo): смена ссылки пересоздаёт метки. */
  markers?: MapMarker[]
  /** Линия маршрута, рисуется пунктиром «след танка». */
  route?: LatLon[]
  onMarkerSelect?: (id: string) => void
  /** Подобрать масштаб так, чтобы все метки и маршрут поместились в кадр. */
  fitToContent?: boolean
  /** Выбранная метка: оранжевое кольцо, камера плавно подлетает к ней. */
  selectedId?: string
  /**
   * inline — карта в потоке экрана (на ноутбуке — справа от панели);
   * fill — на всё место родителя (карта-хаб «Карта», ADR 0012).
   */
  variant?: 'inline' | 'fill'
  /** Отступы кадра при подгонке, px: шторка и поиск не закрывают метки. */
  fitPadding?: { top: number; right: number; bottom: number; left: number }
  /** Где пользователь: синяя точка «я здесь» поверх карты. */
  userPosition?: LatLon | null
  testID: string
}

const ROUTE_SOURCE = 'route'
const NO_MARKERS: MapMarker[] = []

/**
 * Карта на MapLibre GL JS. Метки — настоящие кнопки (фокус, Enter, подписи, testID).
 * Карта не единственный способ добраться до данных: экраны дублируют метки списком.
 */
export function MapView({
  label,
  center,
  zoom,
  markers = NO_MARKERS,
  route,
  onMarkerSelect,
  fitToContent = false,
  selectedId,
  variant = 'inline',
  fitPadding,
  userPosition,
  testID,
}: MapViewProps) {
  const container = useRef<HTMLElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MlMap | null>(null)
  const [failed, setFailed] = useState(false)
  const [anchors, setAnchors] = useState<{ marker: MapMarker; el: HTMLElement }[]>([])
  const initial = useRef({ center, zoom })

  useEffect(() => {
    let disposed = false
    let instance: MlMap | undefined
    const timeout = window.setTimeout(() => {
      if (disposed) return
      disposed = true
      instance?.remove()
      setFailed(true)
    }, 10_000)
    // Воркер MapLibre собирается Vite отдельно: сам пакет ищет его рядом с чанком и не находит.
    Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    ])
      .then(([{ Map, setWorkerUrl }, { default: workerUrl }]) => {
        if (disposed || !container.current) return
        setWorkerUrl(workerUrl)
        instance = new Map({
          container: container.current,
          style: buildMapStyle(tileSources[env.VITE_TILES]),
          center: [initial.current.center.lon, initial.current.center.lat],
          zoom: initial.current.zoom,
          attributionControl: { compact: false },
          cooperativeGestures: false,
        })
        instance.on('load', () => {
          if (disposed || !instance) return
          window.clearTimeout(timeout)
          setMap(instance)
          const grid = gridLayer()
          instance.addSource('grid', grid.source)
          instance.addLayer(
            grid.layer,
            instance.getLayer(grid.beforeId) ? grid.beforeId : undefined,
          )
        })
      })
      .catch(() => {
        if (disposed) return
        window.clearTimeout(timeout)
        setFailed(true)
      })
    return () => {
      disposed = true
      window.clearTimeout(timeout)
      instance?.remove()
    }
  }, [])

  useEffect(() => {
    if (!map) return
    let created: Marker[] = []
    let cancelled = false
    void import('maplibre-gl').then(({ Marker }) => {
      if (cancelled) return
      const next = markers.map((marker) => {
        const el = document.createElement('div')
        created.push(new Marker({ element: el }).setLngLat([marker.lon, marker.lat]).addTo(map))
        return { marker, el }
      })
      setAnchors(next)
    })
    return () => {
      cancelled = true
      created.forEach((m) => m.remove())
      created = []
    }
  }, [map, markers])

  useEffect(() => {
    if (!map) return
    const data = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: (route ?? []).map((p) => [p.lon, p.lat]),
      },
    }
    const existing = map.getSource(ROUTE_SOURCE)
    if (existing && existing.type === 'geojson') {
      ;(existing as GeoJSONSource).setData(data)
      return
    }
    map.addSource(ROUTE_SOURCE, { type: 'geojson', data })
    // Маршрут — георгиевская лента (ADR 0012): чёрный край, оранжевая лента, чёрная осевая.
    map.addLayer({
      id: 'route-halo',
      type: 'line',
      source: ROUTE_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': tokens.color.map.routeHalo, 'line-width': 11 },
    })
    map.addLayer({
      id: 'route-track',
      type: 'line',
      source: ROUTE_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': tokens.color.map.route, 'line-width': 7 },
    })
    map.addLayer({
      id: 'route-center',
      type: 'line',
      source: ROUTE_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': tokens.color.map.routeHalo, 'line-width': 1.8 },
    })
  }, [map, route])

  // Метки уменьшаются при отдалении: масштаб 0,45…1 между зумом 8 и 13
  useEffect(() => {
    if (!map) return
    const apply = () => {
      const z = map.getZoom()
      const scale = Math.min(1, Math.max(0.45, 0.45 + ((z - 8) / 5) * 0.55))
      frame.current?.style.setProperty('--marker-scale', scale.toFixed(3))
    }
    apply()
    map.on('zoom', apply)
    return () => {
      map.off('zoom', apply)
    }
  }, [map])

  // Точка «я здесь»
  useEffect(() => {
    if (!map || !userPosition) return
    let marker: Marker | undefined
    let cancelled = false
    void import('maplibre-gl').then(({ Marker }) => {
      if (cancelled) return
      const el = document.createElement('div')
      el.className = s.me ?? ''
      el.setAttribute('data-testid', `${testID}-me`)
      el.setAttribute('role', 'img')
      el.setAttribute('aria-label', 'Вы здесь')
      marker = new Marker({ element: el })
        .setLngLat([userPosition.lon, userPosition.lat])
        .addTo(map)
    })
    return () => {
      cancelled = true
      marker?.remove()
    }
  }, [map, userPosition, testID])

  useEffect(() => {
    if (!map || !fitToContent) return
    const points = [...markers, ...(route ?? [])]
    if (points.length < 2) return
    const lons = points.map((p) => p.lon)
    const lats = points.map((p) => p.lat)
    map.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: fitPadding ?? 48, animate: false, maxZoom: 16 },
    )
  }, [map, markers, route, fitToContent, fitPadding])

  useEffect(() => {
    if (!map || !selectedId) return
    const m = markers.find((x) => x.id === selectedId)
    if (!m) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // Центр на выбранной метке, масштаб прежний: пользователь сам решает, насколько приблизить
    map.easeTo({
      center: [m.lon, m.lat],
      duration: reduce ? 0 : 600,
      ...(fitPadding ? { padding: fitPadding } : {}),
    })
  }, [map, selectedId, markers, fitPadding])

  if (failed) {
    return (
      <div className={s.fallback} data-testid={`${testID}-fallback`} role="note">
        Карта недоступна на этом устройстве. Точки можно открыть из списка на этой странице.
      </div>
    )
  }

  return (
    <div
      ref={frame}
      className={variant === 'fill' ? s.frameFill : s.frame}
      data-map-frame={variant === 'fill' ? undefined : ''}
    >
      <section
        ref={container}
        className={s.map}
        aria-label={label}
        data-testid={testID}
        data-ready={map ? 'true' : 'false'}
      />
      {anchors.map(({ marker, el }) =>
        createPortal(
          marker.interactive === false ? (
            <span
              className={marker.size === 'small' ? s.markerSmall : s.marker}
              style={{ color: marker.color, pointerEvents: 'none' }}
              aria-hidden="true"
              data-testid={`marker-${marker.id}`}
            >
              <Icon name={marker.icon} size={marker.size === 'small' ? 1 : 1.6} />
            </span>
          ) : (
            <button
              type="button"
              className={
                marker.size === 'small'
                  ? s.markerSmall
                  : marker.shape === 'zone'
                    ? s.markerZone
                    : s.marker
              }
              style={{ color: marker.color }}
              aria-label={marker.label}
              aria-pressed={selectedId === undefined ? undefined : selectedId === marker.id}
              title={marker.label}
              data-selected={selectedId === marker.id || undefined}
              data-testid={`marker-${marker.id}`}
              onClick={() => onMarkerSelect?.(marker.id)}
            >
              <Icon name={marker.icon} size={marker.size === 'small' ? 1 : 1.6} />
            </button>
          ),
          el,
          marker.id,
        ),
      )}
    </div>
  )
}
