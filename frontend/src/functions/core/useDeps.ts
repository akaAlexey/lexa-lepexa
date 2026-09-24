import { useMemo } from 'react'
import { useServices } from '../../app/services.tsx'
import type { Deps } from './deps.ts'

const now = () => new Date()

/** Единственное место, где функции берут сервисы из контекста (проверяет тест архитектуры). */
export function useDeps(): Deps {
  const services = useServices()
  return useMemo(() => ({ ...services, now }), [services])
}
