// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/index.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import { changeStatus, statusActionFor, statusChangeProblem, statusSource } from './changeStatus.ts'
import { getPlace } from './places.ts'

describe('кто и какой шаг статуса делает', () => {
  it('краевед подтверждает обнаруженное место по архиву', () => {
    expect(statusActionFor('verifier', 'found_needs_check')).toBe('confirm')
    expect(statusActionFor('verifier', 'archive_confirmed')).toBeUndefined()
  })
  it('командир отмечает подъём только после подтверждения архивом', () => {
    expect(statusActionFor('commander', 'archive_confirmed')).toBe('raise')
    expect(statusActionFor('commander', 'found_needs_check')).toBeUndefined()
  })
  it('семья и волонтёр статус не меняют, поднятое место — конечный статус', () => {
    expect(statusActionFor('family', 'found_needs_check')).toBeUndefined()
    expect(statusActionFor('volunteer', 'archive_confirmed')).toBeUndefined()
    expect(statusActionFor(undefined, 'found_needs_check')).toBeUndefined()
    expect(statusActionFor('commander', 'remains_raised')).toBeUndefined()
  })
})

describe('источник нового статуса', () => {
  it('без ссылки на документ статус не меняется', () => {
    expect(statusChangeProblem({ action: 'confirm', kind: 'book_of_memory', detail: '  ' })).toBe(
      'Укажите, где в источнике это записано',
    )
    expect(statusChangeProblem({ action: 'raise', kind: 'archive', detail: '' })).toBe(
      'Укажите акт или место перезахоронения',
    )
    expect(
      statusChangeProblem({ action: 'confirm', kind: 'book_of_memory', detail: 'т. 5' }),
    ).toBeUndefined()
  })
  it('подтверждение ссылается на базу, подъём — на акт', () => {
    expect(
      statusSource({ action: 'confirm', kind: 'book_of_memory', detail: ' т. 5, с. 112 ' }),
    ).toEqual({
      kind: 'book_of_memory',
      title: 'Книга Памяти. Орловская область, т. 5, с. 112',
    })
    expect(statusSource({ action: 'raise', kind: 'book_of_memory', detail: 'акт № 14' })).toEqual({
      kind: 'archive',
      title: 'Акт подъёма: акт № 14',
    })
  })
})

describe('смена статуса', () => {
  it('переводит место на шаг вперёд и добавляет источник', async () => {
    const deps = createTestDeps()
    const before = await getPlace(deps, 'S01')
    expect(before.status).toBe('found_needs_check')
    const updated = await changeStatus(deps, 'S01', {
      action: 'confirm',
      kind: 'obd_memorial',
      detail: 'донесение № 7',
    })
    expect(updated.status).toBe('archive_confirmed')
    expect(updated.sources.at(-1)?.title).toBe('ОБД «Мемориал» Минобороны, донесение № 7')
  })
  it('несуществующее место — ошибка 404', async () => {
    const deps = createTestDeps()
    await expect(
      changeStatus(deps, 'NOPE', { action: 'confirm', kind: 'archive', detail: 'x' }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
