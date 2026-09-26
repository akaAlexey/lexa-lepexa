import { createContext, useContext, type ReactNode } from 'react'
import type { ApiClient } from '../api/index.ts'
import type { Services } from '../functions/core/deps.ts'
import { BUILD_ID } from '../config/build.ts'
import { observeStorage } from '../functions/account/accountSync.ts'
import { DEMO_POSITION_KEY, type Platform } from '../platform/index.ts'

export type { DemoControls, OwnActions, Services } from '../functions/core/deps.ts'

export function createServices(api: ApiClient, source: Platform): Services {
  // Есть сервер входа — личные слоты памяти синхронизируются с аккаунтом (functions/account/accountSync)
  const platform: Platform = api.auth
    ? { ...source, storage: observeStorage(source.storage) }
    : source
  let running = 0
  return {
    api,
    platform,
    own: {
      async run(action) {
        running++
        try {
          return await action()
        } finally {
          running--
        }
      },
      active: () => running > 0,
    },
    demo: {
      buildId: BUILD_ID,
      setPosition(p) {
        platform.geo.setPosition?.(p)
        platform.storage.set(DEMO_POSITION_KEY, p)
      },
      reset() {
        platform.storage.clear()
        api.reset?.()
      },
    },
  }
}

const ServicesContext = createContext<Services | null>(null)

/** Внедрение зависимостей: экраны берут API и платформу из контекста, тесты подменяют. */
export function ServicesProvider({ value, children }: { value: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
}

export function useServices(): Services {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('useServices вне ServicesProvider')
  return services
}

export const useApi = () => useServices().api
