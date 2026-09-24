import type { LatLon } from '../../contract/schemas.ts'
import { distanceKm } from '../../domain/geo.ts'
import type { Services } from '../core/deps.ts'

/** Где устройство сейчас. В демо — точка с пульта, показ не зависит от GPS. Нет доступа — ошибка. */
export function locate({ platform }: Pick<Services, 'platform'>): Promise<LatLon> {
  return platform.geo.getPosition()
}

/** Позиция или `null`, если её не узнать: форма тогда открывается с пустыми координатами. */
export function locateOrNull(deps: Pick<Services, 'platform'>): Promise<LatLon | null> {
  return locate(deps).catch(() => null)
}

/** Расстояние от «Вы здесь» до цели по прямой, км. */
export function distanceFromMe(me: LatLon, target: LatLon): number {
  return distanceKm(me, target)
}
