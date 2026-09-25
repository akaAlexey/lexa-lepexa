// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { GroupApplication, NewGroupApplication } from '../../contract/schemas.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import {
  addMyGroup,
  decideGroupApplication,
  groupState,
  listGroupApplications,
  pendingByTrip,
  prependApplication,
  replaceApplication,
  submitGroupApplication,
  visibleApplications,
} from './groupApplications.ts'

const request: NewGroupApplication = {
  tripId: 'W01',
  organization: 'Школа № 5, 7 «А»',
  contactName: 'Мария Петровна',
  contact: '+7 900 555-44-33',
  peopleCount: 10,
  comment: '',
}

const application = (id: string, status: GroupApplication['status']): GroupApplication => ({
  ...request,
  id,
  status,
  createdAt: '2026-09-21T10:00:00Z',
  demo: true,
})

describe('подача заявки группы', () => {
  it('заявка уходит на сервер со статусом «На рассмотрении» и видна в списке первой', async () => {
    const deps = createTestDeps()
    const created = await submitGroupApplication(deps, request)
    expect(created).toMatchObject({ ...request, status: 'pending' })
    const list = await listGroupApplications(deps)
    expect(list.map((a) => a.id)).toEqual([created.id, 'G01'])
  })

  it('на несуществующий выезд — ошибка, заявка не создаётся', async () => {
    const deps = createTestDeps()
    await expect(submitGroupApplication(deps, { ...request, tripId: 'NOPE' })).rejects.toThrow(
      'Выезд NOPE не найден',
    )
    expect(await listGroupApplications(deps)).toHaveLength(1)
  })

  it('сервер проверяет заявку по контракту: больше 100 человек не принимается', async () => {
    await expect(
      submitGroupApplication(createTestDeps(), { ...request, peopleCount: 150 }),
    ).rejects.toThrow(/100/)
  })
})

describe('решение командира', () => {
  it('«Принять» — заявка подтверждена', async () => {
    const deps = createTestDeps()
    const updated = await decideGroupApplication(deps, 'G01', 'confirmed')
    expect(groupState(updated)).toEqual({ label: 'Подтверждена', tone: 'done' })
  })

  it('«Уточнить» — нужно действие руководителя группы', async () => {
    const updated = await decideGroupApplication(createTestDeps(), 'G01', 'clarify')
    expect(groupState(updated)).toEqual({ label: 'Нужно уточнение', tone: 'action' })
  })

  it('нет такой заявки — ошибка', async () => {
    await expect(decideGroupApplication(createTestDeps(), 'NOPE', 'confirmed')).rejects.toThrow(
      'Заявка NOPE не найден',
    )
  })
})

describe('кто какие заявки видит', () => {
  const list = [application('G01', 'pending'), application('G02', 'confirmed')]

  it('командир — все заявки', () => {
    expect(visibleApplications(list, 'commander', []).map((a) => a.id)).toEqual(['G01', 'G02'])
  })

  it('остальные роли и гость — только поданные с этого устройства', () => {
    expect(visibleApplications(list, 'family', ['G02']).map((a) => a.id)).toEqual(['G02'])
    expect(visibleApplications(list, 'volunteer', [])).toEqual([])
    expect(visibleApplications(list, undefined, ['G01']).map((a) => a.id)).toEqual(['G01'])
  })

  it('новая заявка «На рассмотрении» ждёт', () => {
    expect(groupState(application('G03', 'pending'))).toEqual({
      label: 'На рассмотрении',
      tone: 'wait',
    })
  })
})

describe('«Мои заявки групп» и кэш', () => {
  it('id добавляется в конец без повторов', () => {
    expect(addMyGroup(['G1'], 'G2')).toEqual(['G1', 'G2'])
    expect(addMyGroup(['G1', 'G2'], 'G1')).toEqual(['G2', 'G1'])
  })

  it('новая заявка — в начало списка, даже если списка ещё нет', () => {
    const created = application('G09', 'pending')
    expect(prependApplication(undefined, created)).toEqual([created])
    expect(prependApplication([application('G01', 'pending')], created)[0]).toBe(created)
  })

  it('решение заменяет только свою заявку', () => {
    const list = [application('G01', 'pending'), application('G02', 'pending')]
    const updated = application('G02', 'confirmed')
    expect(replaceApplication(list, updated)?.map((a) => a.status)).toEqual([
      'pending',
      'confirmed',
    ])
    expect(replaceApplication(undefined, updated)).toBeUndefined()
  })
})

describe('заявки групп, ждущие решения, по выездам', () => {
  it('считаются только «На рассмотрении», по своему выезду; выездов без таких заявок нет', () => {
    const other = { ...application('c', 'pending'), tripId: 'W02' }
    const counts = pendingByTrip([
      application('a', 'pending'),
      application('b', 'pending'),
      application('d', 'confirmed'),
      application('e', 'clarify'),
      other,
    ])
    expect(Object.fromEntries(counts)).toEqual({ W01: 2, W02: 1 })
    expect(pendingByTrip([application('d', 'confirmed')]).size).toBe(0)
  })
})
