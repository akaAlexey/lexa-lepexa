// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createTestDeps } from '../../test/testDeps.ts'
import { DEFAULT_DONATION, donate, DONATION_AMOUNTS, fundProgress } from './fundraising.ts'

describe('сборы отрядов', () => {
  it('прогресс сбора — проценты для шкалы, переполнение не ломает шкалу', () => {
    expect(fundProgress({ collectedRub: 15000, goalRub: 50000 })).toBe(30)
    expect(fundProgress({ collectedRub: 70000, goalRub: 50000 })).toBe(100)
    expect(fundProgress({ collectedRub: 0, goalRub: 0 })).toBe(100)
  })

  it('суммы в одно нажатие, по умолчанию 300 ₽', () => {
    expect(DONATION_AMOUNTS).toEqual([100, 300, 500, 1000])
    expect(DONATION_AMOUNTS).toContain(DEFAULT_DONATION)
    expect(DEFAULT_DONATION).toBe(300)
  })
})

describe('тестовое пожертвование', () => {
  it('платёж только тестовый, сумма добавляется к сбору', async () => {
    const deps = createTestDeps()
    const [before] = await deps.api.listFundraisers()
    if (!before) throw new Error('в демо нет сборов')
    const collected = before.collectedRub
    const result = await donate(deps, before.id, 500)
    expect(result.status).toBe('test_succeeded')
    expect(result.fundraiser.collectedRub).toBe(collected + 500)
    const after = (await deps.api.listFundraisers()).find((f) => f.id === before.id)
    expect(after?.collectedRub).toBe(collected + 500)
  })

  it('неизвестный сбор — ошибка, ничего не списано', async () => {
    const deps = createTestDeps()
    const total = async () =>
      (await deps.api.listFundraisers()).reduce((sum, f) => sum + f.collectedRub, 0)
    const before = await total()
    await expect(donate(deps, 'NOPE', 300)).rejects.toThrow('Сбор NOPE не найден')
    expect(await total()).toBe(before)
  })

  it('сумма не больше нуля отклоняется контрактом', async () => {
    const deps = createTestDeps()
    await expect(donate(deps, 'F01', 0)).rejects.toThrow(/amountRub/)
  })
})
