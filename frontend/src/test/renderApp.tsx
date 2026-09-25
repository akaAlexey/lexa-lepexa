import { render } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { createMockApi } from '../api/mock/mockApi.ts'
import { App } from '../app/App.tsx'
import type { RoleId } from '../app/roles.ts'
import { appRoutes } from '../app/routes.tsx'
import { createServices } from '../app/services.tsx'
import { createDemoGeo } from '../platform/demo/geo.ts'
import type { Platform } from '../platform/types.ts'
import { createWebStorage } from '../platform/web/storage.ts'

interface RenderOptions {
  /** Роль, уже выбранная на устройстве. */
  role?: RoleId
  /** Значения в хранилище до старта (например, прогресс квеста). */
  stored?: Record<string, unknown>
  /** Пользователь уже вошёл на этом устройстве («Живое фото» — только после входа). */
  signedIn?: boolean
  platform?: Partial<Platform>
}

/** Рендер всего приложения на нужном URL с mock-API без задержек и хранилищем в памяти. */
export function renderApp(
  url = '/',
  { role, stored = {}, signedIn = false, platform: overrides = {} }: RenderOptions = {},
) {
  const storage = createWebStorage(undefined)
  const account = signedIn
    ? { account: { login: '+7 ··· ···-45-67', since: '2026-09-25T09:00:00Z' } }
    : {}
  for (const [key, value] of Object.entries({ ...stored, ...account, ...(role ? { role } : {}) }))
    storage.set(key, value)
  const api = createMockApi({ latencyMs: 0, channelName: null })
  const platform: Platform = {
    geo: createDemoGeo({ lat: 52.97, lon: 36.07 }),
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
  const router = createMemoryRouter(appRoutes, { initialEntries: [url] })
  const services = createServices(api, platform)
  const utils = render(<App services={services} router={router} />)
  return { ...utils, api, platform, router, services }
}
