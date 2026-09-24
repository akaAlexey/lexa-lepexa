import type { ApiClient } from '../../api/index.ts'
import type { LatLon } from '../../contract/schemas.ts'
import type { Platform } from '../../platform/index.ts'

export interface DemoControls {
  readonly buildId: string
  /** Подставить демо-геопозицию (сохраняется на устройстве). */
  setPosition(p: LatLon): void
  /** Забыть всё на устройстве и вернуть mock-данные к исходным. */
  reset(): void
}

/** Собственные действия пользователя: уведомления, пришедшие во время них, — о нём самом. */
export interface OwnActions {
  run<T>(action: () => Promise<T>): Promise<T>
  active(): boolean
}

/** Сервисы приложения: создаются в корне композиции (`app/services.tsx`), тесты подменяют. */
export interface Services {
  api: ApiClient
  platform: Platform
  demo: DemoControls
  own: OwnActions
}

/**
 * Зависимости сценария функции: сервисы и часы. Сценарий — чистая функция `(deps, input) → результат`
 * без React, DOM и роутера (ADR 0008): её вызовет и хук, и тест, и Android-оболочка.
 */
export interface Deps extends Services {
  now(): Date
}
