// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Grave, LastBattleSite } from '../../contract/schemas.ts'
import { tokens } from '../../theme/tokens.ts'
import { placeIdOfMarker, placesLayer } from './placesLayer.ts'

const site = (id: string, status: LastBattleSite['status']) =>
  ({ id, lat: 53, lon: 36, placeName: `Место ${id}`, status }) as LastBattleSite

const grave = { id: 'G1', lat: 52.9, lon: 36.1, fullName: 'Иванов И.И.', unit: '9-я вдбр' } as Grave

describe('слой «Последний бой»', () => {
  it('места — зоны со статусом в подписи и цветом статуса, захоронения — фоном под ними', () => {
    const markers = placesLayer(
      [site('S1', 'found_needs_check'), site('S2', 'remains_raised')],
      [grave],
    )
    expect(markers.map((m) => m.id)).toEqual(['grave-G1', 'site-S1', 'site-S2'])
    expect(markers[0]).toMatchObject({
      icon: 'grave',
      label: 'Захоронение: Иванов И.И., 9-я вдбр',
      size: 'small',
      interactive: false,
    })
    expect(markers[1]).toMatchObject({
      shape: 'zone',
      icon: 'question',
      label: 'Место S1: Обнаружено место (требуется проверка)',
      color: tokens.color.status.found_needs_check,
    })
    expect(markers[2]).toMatchObject({ icon: 'check', label: 'Место S2: Останки подняты' })
  })

  it('пустые данные — пустой слой', () => {
    expect(placesLayer([], [])).toEqual([])
  })

  it('метка места ведёт к месту, метка захоронения — никуда', () => {
    expect(placeIdOfMarker('site-S02')).toBe('S02')
    expect(placeIdOfMarker('grave-G1')).toBeUndefined()
  })
})
