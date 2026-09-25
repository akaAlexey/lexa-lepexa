import { createMockApi } from '../api/mock/mockApi.ts'
import { createServices } from '../app/services.tsx'
import type { LatLon } from '../contract/schemas.ts'
import type { Deps } from '../functions/core/deps.ts'
import { createDemoGeo } from '../platform/demo/geo.ts'
import type { Platform } from '../platform/types.ts'
import { createWebStorage } from '../platform/web/storage.ts'

interface TestDepsOptions {
  /** Значения в хранилище устройства до старта. */
  stored?: Record<string, unknown>
  /** Геопозиция устройства (по умолчанию центр Орла из демо). */
  position?: LatLon
  /** «Сейчас» для сценария (даты по Москве). */
  now?: Date
  platform?: Partial<Platform>
}

/**
 * Зависимости сценария для тестов функций: mock-API без задержек и рассылки между вкладками,
 * хранилище в памяти, демо-геопозиция, фиксированные часы.
 */
export function createTestDeps({
  stored = {},
  position = { lat: 52.97, lon: 36.07 },
  now = new Date('2026-10-02T09:00:00Z'),
  platform: overrides = {},
}: TestDepsOptions = {}): Deps {
  const storage = createWebStorage(undefined)
  for (const [key, value] of Object.entries(stored)) storage.set(key, value)
  const platform: Platform = {
    geo: createDemoGeo(position),
    notify: {
      permission: () => 'unsupported',
      requestPermission: async () => 'unsupported',
      show: () => undefined,
    },
    storage,
    share: { share: async () => 'copied' },
    ar: {
      openCamera: () => Promise.reject(new Error('Камеры нет в тестовой среде')),
      trackImage: () => Promise.reject(new Error('Камеры нет в тестовой среде')),
    },
    ...overrides,
  }
  const services = createServices(createMockApi({ latencyMs: 0, channelName: null }), platform)
  return { ...services, now: () => now }
}
