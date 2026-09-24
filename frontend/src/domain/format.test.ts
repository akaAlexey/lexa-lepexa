// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formatDayRu, formatRub } from './format.ts'
import { progressPercent } from './fundraising.ts'

describe('форматирование и сборы', () => {
  it('дата как в прототипе: «3 октября, суббота»', () => {
    expect(formatDayRu('2026-10-03')).toBe('3 октября, суббота')
  })

  it('рубли с разрядами', () => {
    expect(formatRub(15000).replace(/\s/g, ' ')).toBe('15 000 ₽')
  })

  it('прогресс сбора: 15 000 из 50 000 = 30 %, переполнение и нулевая цель не ломают шкалу', () => {
    expect(progressPercent(15000, 50000)).toBe(30)
    expect(progressPercent(60000, 50000)).toBe(100)
    expect(progressPercent(0, 0)).toBe(100)
  })
})
