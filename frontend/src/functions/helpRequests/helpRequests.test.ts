// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Team, VolunteerRequest } from '../../contract/schemas.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import {
  budgetProgress,
  commanderTeam,
  joinedRequests,
  joinRequest,
  nearestOpen,
  nextToJoin,
  teamsShortOfBudget,
} from './helpRequests.ts'

const request = (id: string, date: string, createdAt = '2026-09-01T00:00:00Z') =>
  ({ id, date, createdAt }) as VolunteerRequest

describe('счётчик «Найдено бойцов за месяц»', () => {
  it('сумма находок отрядов за текущий месяц', async () => {
    const deps = createTestDeps()
    const teams = await deps.api.listTeams()
    const stats = await deps.api.getSearchStats()
    expect(stats.foundThisMonth).toBe(teams.reduce((sum, t) => sum + t.foundThisMonth, 0))
    expect(stats.foundThisMonth).toBeGreaterThan(0)
  })
})

describe('«Стать частью команды»', () => {
  it('запись в заявку запоминается на устройстве под прежним ключом, без дублей', async () => {
    const deps = createTestDeps()
    expect(joinedRequests(deps)).toEqual([])
    expect(await joinRequest(deps, 'R01')).toEqual(['R01'])
    expect(await joinRequest(deps, 'R01')).toEqual(['R01'])
    expect(deps.platform.storage.get('search.joinedRequests')).toEqual(['R01'])
    const [r01] = (await deps.api.listRequests()).filter((r) => r.id === 'R01')
    expect(r01?.joined).toBeGreaterThan(0)
  })

  it('запись, сохранённая прежней версией, читается', () => {
    const deps = createTestDeps({ stored: { 'search.joinedRequests': ['R07'] } })
    expect(joinedRequests(deps)).toEqual(['R07'])
  })

  it('ошибка сети — запись не запоминается', async () => {
    const deps = createTestDeps()
    vi.spyOn(deps.api, 'joinRequest').mockRejectedValue(new Error('сеть'))
    await expect(joinRequest(deps, 'R01')).rejects.toThrow('сеть')
    expect(joinedRequests(deps)).toEqual([])
  })
})

describe('ближайшая открытая заявка', () => {
  const list = [
    request('late', '2026-10-10'),
    request('past', '2026-09-01'),
    request('soon-new', '2026-10-03', '2026-09-20T00:00:00Z'),
    request('soon-old', '2026-10-03', '2026-09-10T00:00:00Z'),
  ]

  it('ближайшая по дате, при равной дате — созданная раньше; прошедшие не предлагаются', () => {
    expect(nearestOpen(list, [], '2026-10-02')?.id).toBe('soon-old')
    expect(nearestOpen(list, ['soon-old'], '2026-10-02')?.id).toBe('soon-new')
  })

  it('заявка на сегодня ещё открыта', () => {
    expect(nearestOpen([request('today', '2026-10-02')], [], '2026-10-02')?.id).toBe('today')
  })

  it('во все записались — цели нет', () => {
    expect(nearestOpen(list, ['late', 'soon-new', 'soon-old'], '2026-10-02')).toBeUndefined()
  })

  it('«сегодня» — по Москве: 23:30 UTC 2 октября — уже 3 октября', () => {
    const deps = createTestDeps({ now: new Date('2026-10-02T23:30:00Z') })
    expect(nextToJoin(deps, [request('oct2', '2026-10-02')], [])).toBeUndefined()
    expect(nextToJoin(createTestDeps(), [request('oct2', '2026-10-02')], [])?.id).toBe('oct2')
  })

  it('в демо волонтёру предлагается R01', async () => {
    const deps = createTestDeps()
    expect(nextToJoin(deps, await deps.api.listRequests(), [])?.id).toBe('R01')
  })
})

describe('дефицит бюджета отрядов', () => {
  const team = (id: string, collected: number, goal: number) =>
    ({ id, budgetCollectedRub: collected, budgetGoalRub: goal }) as Team

  it('показываются только отряды, которым не хватает, в прежнем порядке', () => {
    const teams = [team('a', 10, 100), team('b', 100, 100), team('c', 0, 50), team('d', 120, 100)]
    expect(teamsShortOfBudget(teams).map((t) => t.id)).toEqual(['a', 'c'])
  })

  it('прогресс бюджета — проценты 0…100', () => {
    expect(budgetProgress(team('a', 25, 100))).toBe(25)
    expect(budgetProgress(team('b', 150, 100))).toBe(100)
  })
})

describe('отряд командира', () => {
  it('в демо — «Высота» и его последняя заявка как шаблон', async () => {
    const deps = createTestDeps()
    const found = commanderTeam(await deps.api.listTeams(), await deps.api.listRequests())
    expect(found?.team.name).toBe('Высота')
    expect(found?.last?.teamId).toBe(found?.team.id)
  })

  it('отряда нет в данных — undefined', () => {
    expect(commanderTeam([], [])).toBeUndefined()
  })
})
