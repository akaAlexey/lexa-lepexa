import type { GeoService } from '../types.ts'

/** Геопозиция браузера. Работает только в защищённом контексте (HTTPS или localhost). */
export function createWebGeo(): GeoService {
  return {
    source: 'device',
    getPosition: () =>
      new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          reject(new Error('Геопозиция недоступна в этом браузере'))
          return
        }
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
          (e) => reject(new Error(e.message)),
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
        )
      }),
  }
}
