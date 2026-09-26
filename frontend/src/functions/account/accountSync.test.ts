// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebStorage } from '../../platform/web/storage.ts'
import { isSyncedKey, observeStorage, startAccountSync } from './accountSync.ts'

function setup(server: Record<string, unknown> = {}, device: Record<string, unknown> = {}) {
  const storage = observeStorage(createWebStorage(undefined))
  for (const [key, value] of Object.entries(device)) storage.raw.set(key, value)
  const puts: { key: string; value: unknown }[] = []
  const api = {
    getMyState: async () => ({ ...server }),
    putMyState: async ({ body }: { body: { key: string; value: unknown } }) => {
      puts.push(body)
      return { ok: true as const }
    },
  }
  const notified: string[] = []
  const stop = startAccountSync({
    api,
    storage,
    accountId: 'USR-1',
    notify: (key) => notified.push(key),
  })
  return { storage, api, puts, notified, stop }
}

const settle = () => vi.advanceTimersByTimeAsync(1000)

describe('личное состояние аккаунта: общее для всех устройств', () => {
  beforeEach(() => void vi.useFakeTimers())
  afterEach(() => void vi.useRealTimers())

  it('синхронизируются только личные слоты', () => {
    for (const key of [
      'search.joinedRequests',
      'trips.registered',
      'archive:mine',
      'quest:park-3km',
    ])
      expect(isSyncedKey(key)).toBe(true)
    for (const key of ['account', 'geo.demoPosition', 'payment:pending', 'events.weekNewsOpen'])
      expect(isSyncedKey(key)).toBe(false)
  })

  it('со входом на новом устройстве записи и профиль приходят из аккаунта', async () => {
    const profile = { name: 'Анна', city: 'Орёл', bio: '', since: '2026-09-26T10:00:00Z' }
    const { storage, notified, puts } = setup({
      'search.joinedRequests': ['R01'],
      profile,
      'geo.demoPosition': { lat: 1, lon: 2 },
    })
    await settle()
    expect(storage.get('search.joinedRequests')).toEqual(['R01'])
    expect(storage.get('account:profiles')).toEqual({ 'USR-1': profile })
    expect(notified).toEqual(expect.arrayContaining(['search.joinedRequests', 'account:profiles']))
    // Не личный ключ с сервера на устройство не пишется
    expect(storage.get('geo.demoPosition')).toBeUndefined()
    expect(puts).toEqual([])
  })

  it('записанное до входа уходит в аккаунт; сервер главнее при расхождении', async () => {
    const { puts, storage } = setup(
      { 'trips.registered': ['W02'] },
      {
        'quest:park-3km': { visited: ['rubezh'] },
        'trips.registered': ['W01'],
        'account:profiles': { 'USR-1': { name: 'Анна', city: '', bio: '', since: 'x' } },
      },
    )
    await settle()
    expect(storage.get('trips.registered')).toEqual(['W02'])
    expect(puts).toEqual(
      expect.arrayContaining([
        { key: 'quest:park-3km', value: { visited: ['rubezh'] } },
        { key: 'profile', value: { name: 'Анна', city: '', bio: '', since: 'x' } },
      ]),
    )
    expect(puts.some((p) => p.key === 'trips.registered')).toBe(false)
  })

  it('состояние другого аккаунта на общем устройстве не переносится, а убирается', async () => {
    const { puts, storage } = setup(
      {},
      { 'sync.owner': 'USR-OTHER', 'archive:mine': ['ST05'], 'quest:park-3km': { visited: [] } },
    )
    await settle()
    expect(puts).toEqual([])
    expect(storage.get('archive:mine')).toBeUndefined()
    expect(storage.get('quest:park-3km')).toBeUndefined()
    expect(storage.get('sync.owner')).toBe('USR-1')
  })

  it('изменения после входа уходят на сервер одной отправкой; после выхода — нет', async () => {
    const { storage, puts, stop } = setup()
    await settle()
    storage.set('search.joinedRequests', ['R01'])
    storage.set('search.joinedRequests', ['R01', 'R02'])
    storage.set('events.weekNewsOpen', true)
    await settle()
    expect(puts).toEqual([{ key: 'search.joinedRequests', value: ['R01', 'R02'] }])
    storage.remove('search.joinedRequests')
    await settle()
    expect(puts.at(-1)).toEqual({ key: 'search.joinedRequests', value: null })
    stop()
    storage.set('role', 'volunteer')
    await settle()
    expect(puts.some((p) => p.key === 'role')).toBe(false)
  })

  it('нет связи с сервером — устройство работает как раньше', async () => {
    const storage = observeStorage(createWebStorage(undefined))
    storage.raw.set('archive:mine', ['ST05'])
    const offline = () => Promise.reject(new Error('offline'))
    const api = { getMyState: offline, putMyState: offline }
    const stop = startAccountSync({ api, storage, accountId: 'USR-1', notify: () => undefined })
    await settle()
    expect(storage.get('archive:mine')).toEqual(['ST05'])
    storage.set('archive:mine', ['ST05', 'ST06'])
    await settle()
    expect(storage.get('archive:mine')).toEqual(['ST05', 'ST06'])
    stop()
  })

  it('изменение, не дошедшее до сервера (закрыли вкладку), не теряется при следующем входе', async () => {
    const { storage, puts } = setup(
      { 'search.joinedRequests': ['R01'] },
      {
        'sync.owner': 'USR-1',
        'sync.dirty': ['search.joinedRequests'],
        'search.joinedRequests': ['R01', 'R02'],
      },
    )
    await settle()
    expect(storage.get('search.joinedRequests')).toEqual(['R01', 'R02'])
    expect(puts).toEqual([{ key: 'search.joinedRequests', value: ['R01', 'R02'] }])
    expect(storage.get('sync.dirty')).toBeUndefined()
  })

  it('до ответа сервера изменения копятся «к отправке», а не теряются', async () => {
    const { storage, puts } = setup()
    storage.set('archive:mine', ['ST07'])
    expect(storage.get('sync.dirty')).toEqual(['archive:mine'])
    await settle()
    expect(puts).toEqual([{ key: 'archive:mine', value: ['ST07'] }])
    expect(storage.get('sync.dirty')).toBeUndefined()
  })
})
