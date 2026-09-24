// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { trips } from '../api/fixtures/seed.ts'
import { checklistProgress, toggleChecklistItem } from './checklist.ts'

const items = trips[0]!.checklist

describe('чек-лист новичка', () => {
  it('в демо-выезде 4 пункта из кейса: лопата, щуп, перчатки, регистрация на «Памяти народа»', () => {
    expect(items.map((i) => i.label).join(', ')).toMatch(/Лопата, Щуп, Перчатки, .*Память народа/)
  })

  it('отметить и снять пункт', () => {
    const once = toggleChecklistItem([], 'shovel')
    expect(once).toEqual(['shovel'])
    expect(toggleChecklistItem(once, 'shovel')).toEqual([])
  })

  it('прогресс и готовность', () => {
    expect(checklistProgress(items, [])).toEqual({ done: 0, total: 4, ready: false })
    expect(checklistProgress(items, ['shovel', 'gloves'])).toEqual({
      done: 2,
      total: 4,
      ready: false,
    })
    expect(
      checklistProgress(
        items,
        items.map((i) => i.id),
      ),
    ).toEqual({ done: 4, total: 4, ready: true })
  })

  it('неизвестные пункты не считаются', () => {
    expect(checklistProgress(items, ['shovel', 'removed-item'])).toMatchObject({ done: 1 })
  })
})
