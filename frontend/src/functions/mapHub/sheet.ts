/**
 * Шторка «Места / История края» на телефоне (замечание #14): высота — доля видимой высоты экрана.
 * Логика без React: к какой точке фиксации встать после отпускания, броска или клавиши.
 */

/** Точки фиксации: 40, 50 и 82 % высоты экрана. По умолчанию — первая. */
export const SNAPS = [0.4, 0.5, 0.82] as const
export type Snap = (typeof SNAPS)[number]

const [MIN, , MAX] = SNAPS

/** Скорость броска (доля высоты экрана в секунду; вверх — плюс): быстрее — к следующей точке по направлению. */
export const FLICK_VELOCITY = 0.8

/** Погрешность дробей: 0.45 − 0.4 и 0.5 − 0.45 в плавающей точке не равны. */
const EPS = 1e-6

/** Высота шторки во время перетаскивания: не ниже первой точки и не выше последней. */
export function clampRatio(ratio: number): number {
  if (Number.isNaN(ratio)) return MIN
  return Math.min(MAX, Math.max(MIN, ratio))
}

/** Точка фиксации после отпускания. Середина между точками — к верхней; бросок — к следующей по направлению. */
export function nearestSnap(ratio: number, velocity = 0): Snap {
  if (velocity >= FLICK_VELOCITY) return SNAPS.find((s) => s > ratio + EPS) ?? MAX
  if (velocity <= -FLICK_VELOCITY) return [...SNAPS].reverse().find((s) => s < ratio - EPS) ?? MIN
  let best: Snap = MIN
  for (const s of SNAPS) {
    if (Math.abs(s - ratio) <= Math.abs(best - ratio) + EPS) best = s
  }
  return best
}

export type SnapStep = 'up' | 'down' | 'first' | 'last'

/** Клавиатура: ↑ ↓ — соседняя точка, Home и End — крайние. */
export function stepSnap(current: number, step: SnapStep): Snap {
  if (step === 'first') return MIN
  if (step === 'last') return MAX
  const i = SNAPS.indexOf(nearestSnap(current))
  const next = step === 'up' ? Math.min(i + 1, SNAPS.length - 1) : Math.max(i - 1, 0)
  return SNAPS[next] ?? MIN
}

/** Положение для скринридера: «Панель: 50 % экрана». */
export function sheetLabel(ratio: number): string {
  return `Панель: ${Math.round(ratio * 100)} % экрана`
}
