// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { sites } from '../api/fixtures/seed.ts'
import type { NewLastBattleSite } from '../contract/schemas.ts'
import {
  NOTIFY_RADIUS_KM,
  canTransition,
  describeFighters,
  siteFoundNotificationText,
  validateNewSite,
} from './lastBattle.ts'

describe('«Последний бой»: статусы', () => {
  it('только вперёд и по одному шагу', () => {
    expect(canTransition('found_needs_check', 'archive_confirmed')).toBe(true)
    expect(canTransition('archive_confirmed', 'remains_raised')).toBe(true)
    expect(canTransition('found_needs_check', 'remains_raised')).toBe(false)
    expect(canTransition('remains_raised', 'found_needs_check')).toBe(false)
    expect(canTransition('archive_confirmed', 'archive_confirmed')).toBe(false)
  })
})

describe('«Последний бой»: уведомление (user story 3)', () => {
  it('радиус из кейса — 20 км', () => expect(NOTIFY_RADIUS_KM).toBe(20))

  it('текст из кейса, расстояние в целых км, не меньше 1', () => {
    expect(siteFoundNotificationText(5.4).body).toBe(
      'В 5 км от вас обнаружено место гибели бойца. Требуется помощь в идентификации',
    )
    expect(siteFoundNotificationText(9.6).body).toMatch(/^В 10 км/)
    expect(siteFoundNotificationText(0.2).body).toMatch(/^В 1 км/)
  })
})

describe('«Последний бой»: форма и карточка', () => {
  const expedition: NewLastBattleSite = {
    lat: 53.05,
    lon: 36.1,
    placeName: 'Опушка у р. Оптуха',
    fightersCount: 3,
    fighters: [{}, {}, {}],
    unit: '9-я вдбр, 5-й ВДК',
    dateText: 'октябрь 1941',
    circumstances: 'Обнаружено в ходе экспедиции отряда «Высота»',
    sources: [{ kind: 'eyewitness', title: 'Полевой отчёт отряда «Высота»' }],
    teamId: 'T01',
  }

  it('находка экспедиции «Высоты» проходит проверку', () => {
    expect(validateNewSite(expedition)).toEqual({})
  })

  it('ошибки: координаты вне диапазона, нет бойцов, нет источника, пустое место', () => {
    const errors = validateNewSite({
      ...expedition,
      lat: 95,
      fightersCount: 0,
      sources: [],
      placeName: '',
    })
    expect(Object.keys(errors).sort()).toEqual(['coords', 'fightersCount', 'placeName', 'sources'])
  })

  it('описание бойцов для карточки', () => {
    expect(describeFighters(sites[0]!)).toBe('Красноармеец Иванов И.И.')
    expect(describeFighters({ fightersCount: 3, fighters: [{}, {}, {}] })).toBe(
      '3 бойца, имена не установлены',
    )
    expect(describeFighters({ fightersCount: 1, fighters: [{}] })).toBe(
      '1 боец, имя не установлено',
    )
  })
})
