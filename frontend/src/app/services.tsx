import { createContext, useContext, type ReactNode } from 'react'
import type { ApiClient } from '../api/index.ts'
import type { Platform } from '../platform/index.ts'

export interface Services {
  api: ApiClient
  platform: Platform
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
