// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { FLICK_VELOCITY, SNAPS, clampRatio, nearestSnap, sheetLabel, stepSnap } from './sheet.ts'

describe('шторка карты: точки фиксации', () => {
  it('три точки: 40, 50 и 82 % высоты экрана', () => {
    expect(SNAPS).toEqual([0.4, 0.5, 0.82])
  })

  it('отпускание у каждой точки оставляет шторку на ней', () => {
    for (const snap of SNAPS) expect(nearestSnap(snap)).toBe(snap)
  })

  it('отпускание между точками — к ближайшей, середина — вверх', () => {
    expect(nearestSnap(0.45)).toBe(0.5)
    expect(nearestSnap(0.44)).toBe(0.4)
    expect(nearestSnap(0.7)).toBe(0.82)
    expect(nearestSnap(0.6)).toBe(0.5)
  })

  it('за пределами — к крайней точке', () => {
    expect(nearestSnap(0.1)).toBe(0.4)
    expect(nearestSnap(0)).toBe(0.4)
    expect(nearestSnap(0.95)).toBe(0.82)
    expect(nearestSnap(1.2)).toBe(0.82)
  })

  it('нулевая и медленная скорость — как обычное отпускание', () => {
    expect(nearestSnap(0.44, 0)).toBe(0.4)
    expect(nearestSnap(0.44, FLICK_VELOCITY / 2)).toBe(0.4)
    expect(nearestSnap(0.47, -FLICK_VELOCITY / 2)).toBe(0.5)
  })

  it('бросок вверх — к следующей точке выше, даже если ближе нижняя', () => {
    expect(nearestSnap(0.42, FLICK_VELOCITY)).toBe(0.5)
    expect(nearestSnap(0.5, FLICK_VELOCITY * 3)).toBe(0.82)
    expect(nearestSnap(0.55, FLICK_VELOCITY)).toBe(0.82)
  })

  it('бросок вниз — к следующей точке ниже', () => {
    expect(nearestSnap(0.8, -FLICK_VELOCITY)).toBe(0.5)
    expect(nearestSnap(0.5, -FLICK_VELOCITY)).toBe(0.4)
    expect(nearestSnap(0.48, -FLICK_VELOCITY)).toBe(0.4)
  })

  it('бросок за крайнюю точку — остаётся на крайней', () => {
    expect(nearestSnap(0.82, FLICK_VELOCITY * 5)).toBe(0.82)
    expect(nearestSnap(0.95, FLICK_VELOCITY)).toBe(0.82)
    expect(nearestSnap(0.4, -FLICK_VELOCITY * 5)).toBe(0.4)
    expect(nearestSnap(0.2, -FLICK_VELOCITY)).toBe(0.4)
  })
})

describe('шторка карты: границы при перетаскивании', () => {
  it('clampRatio не даёт уйти ниже 40 % и выше 82 %', () => {
    expect(clampRatio(0.2)).toBe(0.4)
    expect(clampRatio(0.4)).toBe(0.4)
    expect(clampRatio(0.63)).toBe(0.63)
    expect(clampRatio(0.82)).toBe(0.82)
    expect(clampRatio(0.99)).toBe(0.82)
  })

  it('clampRatio переживает NaN (visualViewport ещё не измерен)', () => {
    expect(clampRatio(Number.NaN)).toBe(0.4)
  })
})

describe('шторка карты: клавиатура', () => {
  it('↑ и ↓ переключают соседние точки и не выходят за края', () => {
    expect(stepSnap(0.4, 'up')).toBe(0.5)
    expect(stepSnap(0.5, 'up')).toBe(0.82)
    expect(stepSnap(0.82, 'up')).toBe(0.82)
    expect(stepSnap(0.82, 'down')).toBe(0.5)
    expect(stepSnap(0.5, 'down')).toBe(0.4)
    expect(stepSnap(0.4, 'down')).toBe(0.4)
  })

  it('Home и End — крайние точки', () => {
    expect(stepSnap(0.5, 'first')).toBe(0.4)
    expect(stepSnap(0.5, 'last')).toBe(0.82)
  })

  it('подпись для скринридера — в процентах экрана', () => {
    expect(sheetLabel(0.5)).toBe('Панель: 50 % экрана')
    expect(sheetLabel(0.82)).toBe('Панель: 82 % экрана')
  })
})
