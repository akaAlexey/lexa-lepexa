// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { AppNotification, NewLastBattleSite } from '../../contract/schemas.ts'
import type { NotifyService } from '../../platform/types.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import { isSubscribed, listenNearby, restoreSubscription, subscribeNearby } from './nearbyAlerts.ts'

const site = (lat: number, lon: number): NewLastBattleSite => ({
  lat,
  lon,
  placeName: 'Опушка (тест)',
  fightersCount: 3,
  fighters: [],
  unit: '9-я вдбр, 5-й ВДК',
  dateText: 'октябрь 1941',
  circumstances: '',
  sources: [{ kind: 'demo', title: 'тест' }],
})

describe('подписка на находки рядом', () => {
  it('подписка на 20 км от текущей позиции запоминается на устройстве под прежним ключом', async () => {
    const deps = createTestDeps({ position: { lat: 52.97, lon: 36.07 } })
    expect(isSubscribed(deps)).toBe(false)
    const sub = await subscribeNearby(deps)
    expect(sub).toEqual({ lat: 52.97, lon: 36.07, radiusKm: 20, topics: ['search'] })
    expect(isSubscribed(deps)).toBe(true)
    expect(deps.platform.storage.get('subscription')).toEqual(sub)
  })

  it('без геопозиции подписка не оформляется', async () => {
    const deps = createTestDeps({
      platform: { geo: { source: 'device', getPosition: () => Promise.reject(new Error('нет')) } },
    })
    await expect(subscribeNearby(deps)).rejects.toThrow('нет')
    expect(isSubscribed(deps)).toBe(false)
  })

  it('при старте сохранённая подписка восстанавливается, без неё — ничего', async () => {
    const saved = { lat: 52.97, lon: 36.07, radiusKm: 20, topics: ['search'] }
    const deps = createTestDeps({ stored: { subscription: saved } })
    const subscribe = vi.spyOn(deps.api, 'subscribe')
    expect(await restoreSubscription(deps)).toEqual(saved)
    expect(subscribe).toHaveBeenCalledWith({ body: saved })
    expect(await restoreSubscription(createTestDeps())).toBeUndefined()
  })

  it('ошибка сети при восстановлении не роняет приложение', async () => {
    const deps = createTestDeps({
      stored: { subscription: { lat: 1, lon: 1, topics: ['search'] } },
    })
    vi.spyOn(deps.api, 'subscribe').mockRejectedValue(new Error('сеть'))
    await expect(restoreSubscription(deps)).resolves.toBeDefined()
  })
})

describe('уведомления о находках', () => {
  it('подписчик в 20 км получает «В N км от вас…» и системное уведомление со ссылкой на место', async () => {
    const show = vi.fn<NotifyService['show']>()
    const deps = createTestDeps({
      platform: {
        notify: { permission: () => 'granted', requestPermission: async () => 'granted', show },
      },
    })
    await subscribeNearby(deps)
    const alerts: AppNotification[] = []
    const stop = listenNearby(deps, (n) => alerts.push(n))
    const { site: created } = await deps.api.createSite({ body: site(53.05, 36.1) })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.body).toContain('В 9 км от вас обнаружено место гибели бойца')
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ url: `/last-battle/${created.id}` }),
    )
    stop()
  })

  it('автор находки уведомление о ней не получает', async () => {
    const deps = createTestDeps()
    await subscribeNearby(deps)
    const onAlert = vi.fn<(n: AppNotification) => void>()
    const stop = listenNearby(deps, onAlert)
    await deps.own.run(() => deps.api.createSite({ body: site(53.05, 36.1) }))
    expect(onAlert).not.toHaveBeenCalled()
    stop()
  })

  it('после отписки уведомлений нет', async () => {
    const deps = createTestDeps()
    await subscribeNearby(deps)
    const onAlert = vi.fn<(n: AppNotification) => void>()
    listenNearby(deps, onAlert)()
    await deps.api.createSite({ body: site(53.05, 36.1) })
    expect(onAlert).not.toHaveBeenCalled()
  })
})
