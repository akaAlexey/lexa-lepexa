import { region } from '../config/region.ts'
import { createDemoGeo } from './demo/geo.ts'
import type { Platform } from './types.ts'
import { createWebGeo } from './web/geo.ts'
import { createWebNotify } from './web/notify.ts'
import { createWebStorage } from './web/storage.ts'

export const GEO_MODE_KEY = 'geo-mode'

/**
 * Веб-платформа. По умолчанию геопозиция демо (точка из конфига региона):
 * показ не зависит от GPS. Реальный GPS включается с демо-пульта (geo-mode = device).
 */
export function createWebPlatform(): Platform {
  const storage = createWebStorage()
  const geo =
    storage.get<string>(GEO_MODE_KEY) === 'device'
      ? createWebGeo()
      : createDemoGeo(region.demoPosition)
  return { geo, notify: createWebNotify(), storage }
}

export type { Platform, GeoService, NotifyService, StorageService } from './types.ts'
