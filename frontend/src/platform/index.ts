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
/** Демо-позиция с пульта переживает перезагрузку страницы. */
export const DEMO_POSITION_KEY = 'demo-position'

/**
 * Веб-платформа. По умолчанию геопозиция демо (точка из конфига региона):
 * показ не зависит от GPS. Реальный GPS включается с демо-пульта (geo-mode = device).
 */
export function createWebPlatform(): Platform {
  const storage = createWebStorage()
  const geo =
    storage.get<string>(GEO_MODE_KEY) === 'device'
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
export type {
  Platform,
  GeoService,
  ImageService,
  NotifyService,
  ShareService,
  StorageService,
} from './types.ts'
