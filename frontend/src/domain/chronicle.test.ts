// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Battle } from '../contract/schemas.ts'
import { chronicleByYear, formatHistoricDate } from './chronicle.ts'

const battle = (id: string, date: string): Battle => ({
  id,
  date,
  text: 'Демо-текст',
  archiveUrl: 'https://pamyat-naroda.ru/',
  demo: true,
})

const battles = [battle('b3', '1943-08-05'), battle('b1', '1941-10-03'), battle('b2', '1941-10-06')]

describe('хроника боёв', () => {
  it('годы по порядку с подписью, события внутри года — по дате', () => {
    const groups = chronicleByYear(battles, 'all')
    expect(groups.map((g) => `${g.year} ${g.note}`)).toEqual([
      '1941 оборона',
      '1942 оккупация',
      '1943 освобождение',
    ])
    expect(groups[0]!.battles.map((b) => b.id)).toEqual(['b1', 'b2'])
    expect(groups[1]!.battles).toEqual([])
  })

  it('фильтр по году оставляет только его', () => {
    const groups = chronicleByYear(battles, '1943')
    expect(groups).toHaveLength(1)
    expect(groups[0]!.battles.map((b) => b.id)).toEqual(['b3'])
  })

  it('историческая дата: «3 октября 1941»', () => {
    expect(formatHistoricDate('1941-10-03')).toBe('3 октября 1941')
    expect(formatHistoricDate('1943-08-05')).toBe('5 августа 1943')
  })
})
