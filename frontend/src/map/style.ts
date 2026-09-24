import type { StyleSpecification } from 'maplibre-gl'
import { tokens as defaultTokens, type Tokens } from '../theme/tokens.ts'
import type { TileSource } from './tiles.ts'

/**
 * Стиль «военная картография», собранный из токенов темы.
 * Тот же JSON понимает MapLibre Native (Android), если понадобится нативная карта.
 * Стиль строится в коде, а не грузится по сети: без сети остаются фон и наши слои.
 */
/** Область сетки — Орловская область с запасом. */
const GRID_BOUNDS = { south: 51.9, north: 53.9, west: 34.6, east: 38.1 }
/** Шаг сетки ≈ 2 км, как километровая сетка на военной карте. */
const GRID_STEP = 0.02

/** Километровая сетка военной карты: тонкие линии сепией поверх подложки, работает и без сети. */
export function gridLines(step = GRID_STEP, b = GRID_BOUNDS) {
  const lines: number[][][] = []
  const round = (x: number) => Math.round(x * 1e6) / 1e6
  for (let lat = b.south; lat <= b.north + 1e-9; lat += step)
    lines.push([
      [b.west, round(lat)],
      [b.east, round(lat)],
    ])
  for (let lon = b.west; lon <= b.east + 1e-9; lon += step * 1.65)
    lines.push([
      [round(lon), b.south],
      [round(lon), b.north],
    ])
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'MultiLineString' as const, coordinates: lines },
  }
}

export function buildMapStyle(tiles: TileSource, t: Tokens = defaultTokens): StyleSpecification {
  const c = t.color.map
  const background = {
    id: 'background',
    type: 'background' as const,
    paint: { 'background-color': c.land },
  }
  const gridSource = { type: 'geojson' as const, data: gridLines() }
  const grid = {
    id: 'grid',
    type: 'line' as const,
    source: 'grid',
    minzoom: 10,
    paint: { 'line-color': c.grid, 'line-width': 1 },
  }
  if (!tiles.tileJsonUrl) {
    return {
      version: 8,
      name: 'tropa-paper',
      sources: { grid: gridSource },
      layers: [background, grid],
    }
  }
  const src = 'omt'
  const label = ['coalesce', ['get', 'name:ru'], ['get', 'name']]
  return {
    version: 8,
    name: 'tropa-military',
    ...(tiles.glyphs ? { glyphs: tiles.glyphs } : {}),
    sources: {
      [src]: {
        type: 'vector',
        url: tiles.tileJsonUrl,
        ...(tiles.attribution ? { attribution: tiles.attribution } : {}),
      },
      grid: gridSource,
    },
    layers: [
      background,
      {
        id: 'residential',
        type: 'fill',
        source: src,
        'source-layer': 'landuse',
        filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]],
        paint: { 'fill-color': c.residential },
      },
      {
        id: 'field',
        type: 'fill',
        source: src,
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['farmland', 'grass']]],
        paint: { 'fill-color': c.field, 'fill-opacity': 0.8 },
      },
      {
        id: 'wood',
        type: 'fill',
        source: src,
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['wood', 'forest']]],
        paint: { 'fill-color': c.wood, 'fill-opacity': 0.9 },
      },
      {
        // Штриховка леса, как на топографической карте
        id: 'wood-outline',
        type: 'line',
        source: src,
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['wood', 'forest']]],
        paint: { 'line-color': c.woodHatch, 'line-width': 1 },
      },
      {
        id: 'park',
        type: 'fill',
        source: src,
        'source-layer': 'park',
        paint: { 'fill-color': c.park, 'fill-opacity': 0.7 },
      },
      {
        id: 'water',
        type: 'fill',
        source: src,
        'source-layer': 'water',
        paint: { 'fill-color': c.water },
      },
      {
        id: 'waterway',
        type: 'line',
        source: src,
        'source-layer': 'waterway',
        paint: {
          'line-color': c.waterLine,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 2],
        },
      },
      {
        id: 'building',
        type: 'fill',
        source: src,
        'source-layer': 'building',
        minzoom: 13,
        paint: { 'fill-color': c.building, 'fill-outline-color': c.buildingLine },
      },
      {
        id: 'road-casing',
        type: 'line',
        source: src,
        'source-layer': 'transportation',
        filter: [
          'in',
          ['get', 'class'],
          ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']],
        ],
        paint: {
          'line-color': c.roadCasing,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 16, 10],
        },
      },
      {
        id: 'road',
        type: 'line',
        source: src,
        'source-layer': 'transportation',
        filter: ['!=', ['get', 'class'], 'rail'],
        paint: {
          'line-color': c.road,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 16, 7],
        },
      },
      {
        id: 'path',
        type: 'line',
        source: src,
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['path', 'track']]],
        minzoom: 13,
        paint: { 'line-color': c.roadCasing, 'line-width': 1, 'line-dasharray': [2, 2] },
      },
      {
        id: 'rail',
        type: 'line',
        source: src,
        'source-layer': 'transportation',
        filter: ['==', ['get', 'class'], 'rail'],
        paint: { 'line-color': c.rail, 'line-width': 1.5, 'line-dasharray': [3, 3] },
      },
      {
        id: 'boundary',
        type: 'line',
        source: src,
        'source-layer': 'boundary',
        filter: ['<=', ['get', 'admin_level'], 4],
        paint: { 'line-color': c.boundary, 'line-width': 1.5, 'line-dasharray': [4, 2, 1, 2] },
      },
      grid,
      {
        id: 'place-label',
        type: 'symbol',
        source: src,
        'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'hamlet']]],
        layout: {
          'text-field': label,
          'text-font': ['Noto Sans Regular'],
          'text-size': ['match', ['get', 'class'], 'city', 16, 'town', 14, 12],
        },
        paint: { 'text-color': c.label, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.5 },
      },
    ],
  } as StyleSpecification
}
