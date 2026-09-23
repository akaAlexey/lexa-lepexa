/**
 * Источник тайлов — единственная точка переключения подложки.
 * openfreemap: векторные тайлы OSM без ключа (схема OpenMapTiles).
 * none: только бумажный фон и наши слои — e2e, офлайн, отказ сети.
 * Следующий шаг (P1): pmtiles — вырезка района на своём хостинге, та же схема и тот же стиль.
 */
export type TileSourceKind = 'openfreemap' | 'none'

export interface TileSource {
  kind: TileSourceKind
  tileJsonUrl?: string
  glyphs?: string
  attribution?: string
}

export const tileSources: Record<TileSourceKind, TileSource> = {
  openfreemap: {
    kind: 'openfreemap',
    tileJsonUrl: 'https://tiles.openfreemap.org/planet',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    attribution:
      '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a>, данные © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">участники OpenStreetMap</a>',
  },
  none: { kind: 'none' },
}
