import { render } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { createMockApi } from '../api/mock/mockApi.ts'
import { App } from '../app/App.tsx'
import { appRoutes } from '../app/routes.tsx'
import { createDemoGeo } from '../platform/demo/geo.ts'
import type { Platform } from '../platform/types.ts'
import { createWebStorage } from '../platform/web/storage.ts'

/** Рендер всего приложения на нужном URL с mock-API без задержек и хранилищем в памяти. */
export function renderApp(url = '/', overrides: Partial<Platform> = {}) {
  const api = createMockApi({ latencyMs: 0, channelName: null })
  const platform: Platform = {
    geo: createDemoGeo({ lat: 52.97, lon: 36.07 }),
    notify: {
      permission: () => 'unsupported',
      requestPermission: async () => 'unsupported',
      show: () => undefined,
    },
    storage: createWebStorage(undefined),
    ...overrides,
  }
  const router = createMemoryRouter(appRoutes, { initialEntries: [url] })
  const utils = render(<App services={{ api, platform }} router={router} />)
  return { ...utils, api, platform, router }
}
