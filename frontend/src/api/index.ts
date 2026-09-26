import type { Env } from '../config/env.ts'
import type { ApiClient } from './client.ts'
import { demoUserKey } from './live/demoUser.ts'
import { createLiveApi } from './live/liveApi.ts'
import { createMockApi, type MockStorage } from './mock/mockApi.ts'

/** Сколько ждать ответа сервера при запуске приложения, прежде чем перейти на встроенные данные. */
export const HEALTH_TIMEOUT_MS = 5000

/**
 * API для запуска. Живой режим с резервом (приложение): сервер ответил на /health — работаем с ним
 * (общая база), не ответил за 5 с — встроенные данные на устройстве и плашка «Сервер недоступен».
 * При следующем запуске сервер проверяется снова.
 */
export async function chooseApi(env: Env, fetchImpl: typeof fetch = (...a) => fetch(...a)) {
  if (env.VITE_API_MODE !== 'live' || !env.VITE_API_URL || env.VITE_API_FALLBACK !== 'device')
    return createApi(env)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS)
  try {
    const res = await fetchImpl(`${env.VITE_API_URL.replace(/\/$/, '')}/health`, {
      signal: ctrl.signal,
    })
    const body = (await res.json()) as { ok?: unknown }
    if (res.ok && body.ok === true) return createApi(env)
  } catch {
    // нет связи, таймаут, не тот ответ — ниже резерв
  } finally {
    clearTimeout(timer)
  }
  const offline: ApiClient = {
    ...createMockApi({ latencyMs: 0, storage: browserStorage() }),
    offline: true,
  }
  return offline
}

export function createApi(env: Env): ApiClient {
  if (env.VITE_API_MODE === 'live' && env.VITE_API_URL) {
    return createLiveApi({ baseUrl: env.VITE_API_URL, userKey: demoUserKey() })
  }
  return createMockApi({ latencyMs: env.VITE_MOCK_LATENCY_MS, storage: browserStorage() })
}

const MOCK_DB_KEY = 'tropa:mock-db'

/**
 * Демо без бэкенда хранит созданное в браузере: после перезагрузки заявка или история на месте.
 * Нет localStorage (приватный режим, запрет) — работаем как раньше, в памяти вкладки.
 */
function browserStorage(): MockStorage | null {
  try {
    const ls = globalThis.localStorage
    if (!ls) return null
    return {
      load: () => {
        try {
          return JSON.parse(ls.getItem(MOCK_DB_KEY) ?? 'null') as unknown
        } catch {
          return undefined
        }
      },
      save: (snapshot) => {
        try {
          ls.setItem(MOCK_DB_KEY, JSON.stringify(snapshot))
        } catch {
          // место кончилось — демо продолжит работать в памяти
        }
      },
      clear: () => ls.removeItem(MOCK_DB_KEY),
    }
  } catch {
    return null
  }
}

export type { ApiClient } from './client.ts'
export { ApiError, ContractError } from './client.ts'
