/**
 * Размер меток от масштаба карты — как на больших картах (Яндекс, 2ГИС):
 * издалека метки маленькие, фоновые (памятники, музеи) — просто точки без значка;
 * при приближении метки растут и крупнее обычного на уровне улиц.
 */
export interface MarkerScale {
  /** Множитель размера метки. */
  scale: number
  /** `dot` — фоновые метки точками (обзор региона), `icon` — со значком. */
  detail: 'dot' | 'icon'
}

/** Опорные точки: зум → множитель; между ними — линейно. */
const STOPS: readonly (readonly [zoom: number, scale: number])[] = [
  [7, 0.4],
  [13, 1],
  [16, 1.25],
]

/** Дальше этого зума фоновые метки рисуются точками. */
export const DOT_ZOOM = 9

export function markerScale(zoom: number): MarkerScale {
  const first = STOPS[0]!
  const last = STOPS[STOPS.length - 1]!
  let scale = zoom <= first[0] ? first[1] : last[1]
  for (let i = 1; i < STOPS.length; i++) {
    const [z0, s0] = STOPS[i - 1]!
    const [z1, s1] = STOPS[i]!
    if (zoom >= z0 && zoom <= z1) {
      scale = s0 + ((zoom - z0) / (z1 - z0)) * (s1 - s0)
      break
    }
  }
  return { scale: Math.round(scale * 1000) / 1000, detail: zoom < DOT_ZOOM ? 'dot' : 'icon' }
}
