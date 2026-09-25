// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createTestDeps } from '../../test/testDeps.ts'
import { commanderTeam, joinedRequests, joinRequest } from './helpRequests.ts'

const ADULT = { termsAccepted: true, adultVerified: true, age: 30 } as const

describe('запись в заявку отряда', () => {
  it('запись в заявку запоминается на устройстве под прежним ключом, без дублей', async () => {
    const deps = createTestDeps()
    expect(joinedRequests(deps)).toEqual([])
    expect(await joinRequest(deps, 'R01', ADULT)).toEqual(['R01'])
    expect(await joinRequest(deps, 'R01', ADULT)).toEqual(['R01'])
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
    await expect(joinRequest(deps, 'R01', ADULT)).rejects.toThrow('сеть')
    expect(joinedRequests(deps)).toEqual([])
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
