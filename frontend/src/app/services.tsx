import { createContext, useContext, type ReactNode } from 'react'
import type { ApiClient } from '../api/index.ts'
import type { Services } from '../functions/core/deps.ts'
import { BUILD_ID } from '../config/build.ts'
import type { Subscription } from '../contract/schemas.ts'
import { NOTIFY_RADIUS_KM } from '../domain/lastBattle.ts'
import { DEMO_POSITION_KEY, type Platform } from '../platform/index.ts'

/** Ключ подписки на поисковую деятельность рядом — переживает перезагрузку. */
export const SUBSCRIPTION_KEY = 'subscription'

export type { DemoControls, OwnActions, Services } from '../functions/core/deps.ts'

export function createServices(api: ApiClient, platform: Platform): Services {
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

/** Подписаться на находки в радиусе 20 км от текущей позиции и запомнить подписку на устройстве. */
export async function subscribeNearby({ api, platform }: Services): Promise<Subscription> {
  const { lat, lon } = await platform.geo.getPosition()
  const subscription = { lat, lon, radiusKm: NOTIFY_RADIUS_KM, topics: ['search' as const] }
  await api.subscribe({ body: subscription })
  platform.storage.set(SUBSCRIPTION_KEY, subscription)
  return subscription
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
