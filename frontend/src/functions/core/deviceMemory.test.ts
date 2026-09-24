// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createWebStorage } from '../../platform/web/storage.ts'
import {
  forgetMemory,
  memory,
  memorySlot,
  readMemory,
  updateMemory,
  writeMemory,
} from './deviceMemory.ts'

/** localStorage как на телефоне пользователя: с данными, записанными прежней версией приложения. */
function deviceStorage(saved: Record<string, string>) {
  const data = new Map(Object.entries(saved))
  const backend = {
    get length() {
      return data.size
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  } satisfies Storage
  return { storage: createWebStorage(backend), data }
}

describe('память на устройстве', () => {
  it('пустой слот отдаёт значение по умолчанию', () => {
    const { storage } = deviceStorage({})
    expect(readMemory(storage, memory.joinedRequests)).toEqual([])
    expect(readMemory(storage, memory.role)).toBeUndefined()
    expect(readMemory(storage, memory.quest('park-3km'))).toEqual({
      routeId: 'park-3km',
      donePointIds: [],
    })
  })

  it('записанное читается, изменение сохраняется, забытое возвращается к умолчанию', () => {
    const { storage } = deviceStorage({})
    writeMemory(storage, memory.myStories, ['ST01'])
    expect(readMemory(storage, memory.myStories)).toEqual(['ST01'])
    expect(updateMemory(storage, memory.myStories, (ids) => [...ids, 'ST02'])).toEqual([
      'ST01',
      'ST02',
    ])
    expect(readMemory(storage, memory.myStories)).toEqual(['ST01', 'ST02'])
    forgetMemory(storage, memory.myStories)
    expect(readMemory(storage, memory.myStories)).toEqual([])
  })

  it('данные прежней версии на телефоне читаются: ключи не изменились', () => {
    const { storage } = deviceStorage({
      'tropa:role': '"family"',
      'tropa:quest:park-3km': '{"routeId":"park-3km","donePointIds":["okop"]}',
      'tropa:checklist:W01': '["shovel","gloves"]',
      'tropa:search.joinedRequests': '["R01"]',
      'tropa:groups:mine': '["G01"]',
      'tropa:archive:mine': '["ST09"]',
      'tropa:subscription': '{"lat":52.97,"lon":36.07,"radiusKm":20,"topics":["search"]}',
      'tropa:demo-position': '{"lat":53,"lon":36}',
      'tropa:geo-mode': '"device"',
    })
    expect(readMemory(storage, memory.role)).toBe('family')
    expect(readMemory(storage, memory.quest('park-3km')).donePointIds).toEqual(['okop'])
    expect(readMemory(storage, memory.checklist('W01'))).toEqual(['shovel', 'gloves'])
    expect(readMemory(storage, memory.joinedRequests)).toEqual(['R01'])
    expect(readMemory(storage, memory.myGroups)).toEqual(['G01'])
    expect(readMemory(storage, memory.myStories)).toEqual(['ST09'])
    expect(readMemory(storage, memory.subscription)?.radiusKm).toBe(20)
    expect(readMemory(storage, memory.demoPosition)).toEqual({ lat: 53, lon: 36 })
    expect(readMemory(storage, memory.geoMode)).toBe('device')
  })

  it('испорченные данные не ломают экран: чек-лист отбрасывает не-строки, битый JSON — умолчание', () => {
    const { storage } = deviceStorage({
      'tropa:checklist:W01': '["shovel", 5, null]',
      'tropa:checklist:W02': '{"not":"a list"}',
      'tropa:search.joinedRequests': '{broken',
    })
    expect(readMemory(storage, memory.checklist('W01'))).toEqual(['shovel'])
    expect(readMemory(storage, memory.checklist('W02'))).toEqual([])
    expect(readMemory(storage, memory.joinedRequests)).toEqual([])
  })

  it('пишет под прежним ключом с префиксом приложения', () => {
    const { storage, data } = deviceStorage({})
    writeMemory(storage, memory.checklist('W01'), ['probe'])
    expect(data.get('tropa:checklist:W01')).toBe('["probe"]')
  })

  it('у слота с id один объект на id; ключи всех слотов разные', () => {
    expect(memory.quest('a')).toBe(memory.quest('a'))
    expect(memory.quest('a')).not.toBe(memory.quest('b'))
    const keys = Object.values(memory).map((slot) =>
      typeof slot === 'function' ? slot('x').key : slot.key,
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('разбор слота: нераспознанное — значение по умолчанию', () => {
    const count = memorySlot<number>('n', 0, (raw) => (typeof raw === 'number' ? raw : undefined))
    const { storage } = deviceStorage({ 'tropa:n': '"три"' })
    expect(readMemory(storage, count)).toBe(0)
  })
})
