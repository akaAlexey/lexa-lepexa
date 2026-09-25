import { region } from '../config/region.ts'
import type { LatLon } from '../contract/schemas.ts'
import { createDemoGeo } from './demo/geo.ts'
import type { Platform } from './types.ts'
import { createWebAr } from './web/ar.ts'
import { createWebGeo } from './web/geo.ts'
import { createWebImages } from './web/images.ts'
import { createWebNotify } from './web/notify.ts'
import { createWebShare } from './web/share.ts'
import { createWebStorage } from './web/storage.ts'

export const GEO_MODE_KEY = 'geo-mode'
/** Геопозиция по умолчанию из сборки (VITE_GEO_DEFAULT, схема — в config/env.ts). */
const GEO_DEFAULT: string =
  (import.meta.env as Record<string, string | undefined> | undefined)?.VITE_GEO_DEFAULT ?? 'device'
/** Демо-позиция с пульта переживает перезагрузку страницы. */
export const DEMO_POSITION_KEY = 'demo-position'

/**
 * Веб-платформа. По умолчанию — настоящая геопозиция устройства (нужен HTTPS).
 * Точка из конфига региона — если так выбрано на демо-пульте (geo-mode = demo) или в сборке
 * (VITE_GEO_DEFAULT=demo: e2e и показ без GPS).
 */
export function createWebPlatform(): Platform {
  const storage = createWebStorage()
  const mode = storage.get<string>(GEO_MODE_KEY) ?? GEO_DEFAULT
  const geo =
    mode === 'device'
      ? createWebGeo()
      : createDemoGeo(storage.get<LatLon>(DEMO_POSITION_KEY) ?? region.demoPosition)
  return {
    geo,
    notify: createWebNotify(),
    storage,
    share: createWebShare(),
    ar: createWebAr(),
    images: createWebImages(),
  }
}

export { readAsDataUrl } from './web/images.ts'
export { registerOffline } from './web/offline.ts'
export type {
  Platform,
  GeoService,
  ImageService,
  NotifyService,
  ShareService,
  StorageService,
} from './types.ts'
