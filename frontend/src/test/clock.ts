import { afterEach, vi } from 'vitest'

/** Демо-«сегодня» для тестов: пятница 2 октября 2026, 12:00 по Москве. «Завтра» — суббота 3 октября. */
export const DEMO_NOW = new Date('2026-10-02T09:00:00Z')

/** Подменяет только Date: таймеры и промисы работают как обычно. */
export function useDemoClock() {
  vi.useFakeTimers({ toFake: ['Date'], now: DEMO_NOW })
  afterEach(() => vi.useRealTimers())
}
