// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { trips } from '../../api/fixtures/seed.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import { checklistOf, savedChecklist, toggleChecklist } from './checklist.ts'

const W01 = trips[0]!

describe('чек-лист новичка на устройстве', () => {
  it('отметки сохраняются под прежним ключом checklist:<id> в порядке нажатий', () => {
    const deps = createTestDeps()
    toggleChecklist(deps, 'W01', 'shovel')
    expect(toggleChecklist(deps, 'W01', 'gloves')).toEqual(['shovel', 'gloves'])
    expect(deps.platform.storage.get('checklist:W01')).toEqual(['shovel', 'gloves'])
    expect(savedChecklist(deps, 'W01')).toEqual(['shovel', 'gloves'])
  })

  it('повторное нажатие снимает отметку; у другого выезда свой список', () => {
    const deps = createTestDeps()
    toggleChecklist(deps, 'W01', 'shovel')
    expect(toggleChecklist(deps, 'W01', 'shovel')).toEqual([])
    expect(savedChecklist(deps, 'W02')).toEqual([])
  })

  it('испорченные данные на устройстве — пустой список или только строки', () => {
    expect(savedChecklist(createTestDeps({ stored: { 'checklist:W01': 'мусор' } }), 'W01')).toEqual(
      [],
    )
    const mixed = createTestDeps({ stored: { 'checklist:W01': ['shovel', 7, null] } })
    expect(savedChecklist(mixed, 'W01')).toEqual(['shovel'])
  })

  it('«Готово N из M»: все отмечены — готов; неизвестные пункты не считаются', () => {
    expect(checklistOf(W01, ['shovel', 'gone'])).toEqual({ done: 1, total: 4, ready: false })
    const all = W01.checklist.map((i) => i.id)
    expect(checklistOf(W01, all)).toEqual({ done: 4, total: 4, ready: true })
  })
})
