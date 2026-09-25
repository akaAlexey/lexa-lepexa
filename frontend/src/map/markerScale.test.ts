// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DOT_ZOOM, markerScale } from './markerScale.ts'

describe('размер меток от масштаба карты', () => {
  it('издалека маленькие, у улиц — крупнее обычного', () => {
    expect(markerScale(5).scale).toBe(0.4)
    expect(markerScale(7).scale).toBe(0.4)
    expect(markerScale(10).scale).toBe(0.7)
    expect(markerScale(13).scale).toBe(1)
    expect(markerScale(16).scale).toBe(1.25)
    expect(markerScale(19).scale).toBe(1.25)
  })

  it('растут монотонно при приближении', () => {
    const scales = Array.from({ length: 29 }, (_, i) => markerScale(4 + i / 2).scale)
    expect([...scales].sort((a, b) => a - b)).toEqual(scales)
  })

  it('фоновые метки — точками только на обзоре региона', () => {
    expect(markerScale(DOT_ZOOM - 0.5).detail).toBe('dot')
    expect(markerScale(DOT_ZOOM).detail).toBe('icon')
    expect(markerScale(14).detail).toBe('icon')
  })
})
