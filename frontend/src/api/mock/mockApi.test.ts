// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { AppNotification, NewLastBattleSite } from '../../contract/schemas.ts'
import { createMockApi } from './mockApi.ts'

const newSite = (lat: number, lon: number): NewLastBattleSite => ({
  lat,
  lon,
  placeName: 'Опушка (демо)',
  fightersCount: 3,
  fighters: [{}, {}, {}],
  unit: '9-я вдбр, 5-й ВДК',
  dateText: 'октябрь 1941',
  circumstances: 'Найдено в экспедиции',
  sources: [{ kind: 'demo', title: 'Полевой отчёт отряда (демо)' }],
  teamId: 'T01',
})

describe('mock API: «Последний бой»', () => {
  it('новая точка получает статус «требуется проверка», подписчик в 20 км получает уведомление', async () => {
    const api = createMockApi({ latencyMs: 0, channelName: null })
    const listener = vi.fn<(n: AppNotification) => void>()
    api.onNotification(listener)
    await api.subscribe({ body: { lat: 52.97, lon: 36.07, topics: ['search'] } })

    const { site, notifiedCount } = await api.createSite({ body: newSite(53.05, 36.1) })

    expect(site.status).toBe('found_needs_check')
    expect(notifiedCount).toBeGreaterThan(0)
    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0]![0].body).toMatch(/^В 9 км от вас обнаружено место гибели бойца/)
  })

  it('подписчик дальше 20 км уведомление не получает', async () => {
    const api = createMockApi({ latencyMs: 0, channelName: null })
    const listener = vi.fn<(n: AppNotification) => void>()
    api.onNotification(listener)
    await api.subscribe({ body: { lat: 52.97, lon: 36.07, topics: ['search'] } })
    await api.createSite({ body: newSite(53.4, 36.07) })
    expect(listener).not.toHaveBeenCalled()
  })

  it('статус нельзя перепрыгнуть', async () => {
    const api = createMockApi({ latencyMs: 0, channelName: null })
    await expect(
      api.changeSiteStatus({
        id: 'S01',
        body: { status: 'remains_raised', source: { kind: 'demo', title: 'тест' } },
      }),
    ).rejects.toMatchObject({ status: 409 })
  })
})
