import type { StyleSpecification } from 'maplibre-gl'
import { tokens as defaultTokens, type Tokens } from '../theme/tokens.ts'
import type { TileSource } from './tiles.ts'

/**
 * Стиль «военная картография», собранный из токенов темы.
 * Тот же JSON понимает MapLibre Native (Android), если понадобится нативная карта.
 * Стиль строится в коде, а не грузится по сети: без сети остаются фон и наши слои.
 */
export function buildMapStyle(tiles: TileSource, t: Tokens = defaultTokens): StyleSpecification {
  const c = t.color.map
  const background = {
    id: 'background',
    type: 'background' as const,
    paint: { 'background-color': c.land },
  }
  if (!tiles.tileJsonUrl) {
    return { version: 8, name: 'tropa-paper', sources: {}, layers: [background] }
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
    },
    layers: [
      background,
      {
        id: 'wood',
        type: 'fill',
        source: src,
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['wood', 'forest']]],
        paint: { 'fill-color': c.wood, 'fill-opacity': 0.8 },
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
        paint: { 'fill-color': c.building, 'fill-outline-color': c.roadCasing },
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
        id: 'boundary',
        type: 'line',
        source: src,
        'source-layer': 'boundary',
        filter: ['<=', ['get', 'admin_level'], 4],
        paint: { 'line-color': c.boundary, 'line-width': 1.5, 'line-dasharray': [4, 2, 1, 2] },
      },
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
