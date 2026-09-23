import 'maplibre-gl/dist/maplibre-gl.css'
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LatLon } from '../contract/schemas.ts'
import { env } from '../config/env.ts'
import { tokens } from '../theme/tokens.ts'
import { Icon, type IconName } from '../ui/Icon.tsx'
import s from './map.module.css'
import { buildMapStyle } from './style.ts'
import { tileSources } from './tiles.ts'

export interface MapMarker {
  id: string
  lat: number
  lon: number
  /** Подпись для скринридера и всплывающей подсказки. */
  label: string
  icon: IconName
  color: string
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
  testID,
}: MapViewProps) {
  const container = useRef<HTMLElement>(null)
  const [map, setMap] = useState<MlMap | null>(null)
  const [failed, setFailed] = useState(false)
  const [anchors, setAnchors] = useState<{ marker: MapMarker; el: HTMLElement }[]>([])
  const initial = useRef({ center, zoom })

  useEffect(() => {
    let disposed = false
    let instance: MlMap | undefined
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
        instance.on('load', () => !disposed && setMap(instance ?? null))
      })
      .catch(() => !disposed && setFailed(true))
    return () => {
      disposed = true
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
    // «След танка»: две пунктирные колеи по бокам линии маршрута.
    for (const offset of [-3, 3]) {
      map.addLayer({
        id: `route-track${offset}`,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        paint: {
          'line-color': tokens.color.map.route,
          'line-width': 3,
          'line-offset': offset,
          'line-dasharray': [0.8, 0.6],
        },
      })
    }
  }, [map, route])

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
      { padding: 48, animate: false, maxZoom: 16 },
    )
  }, [map, markers, route, fitToContent])

  if (failed) {
    return (
      <div className={s.fallback} data-testid={`${testID}-fallback`} role="note">
        Карта недоступна на этом устройстве. Все точки есть в списке ниже.
      </div>
    )
  }

  return (
    <div className={s.frame}>
      <section
        ref={container}
        className={s.map}
        aria-label={label}
        data-testid={testID}
        data-ready={map ? 'true' : 'false'}
      />
      {anchors.map(({ marker, el }) =>
        createPortal(
          <button
            type="button"
            className={s.marker}
            style={{ color: marker.color }}
            aria-label={marker.label}
            title={marker.label}
            data-testid={`marker-${marker.id}`}
            onClick={() => onMarkerSelect?.(marker.id)}
          >
            <Icon name={marker.icon} size={1.6} />
          </button>,
          el,
          marker.id,
        ),
      )}
    </div>
  )
}
