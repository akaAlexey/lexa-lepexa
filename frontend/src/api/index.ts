import type { Env } from '../config/env.ts'
import type { ApiClient } from './client.ts'
import { demoUserKey } from './live/demoUser.ts'
import { createLiveApi } from './live/liveApi.ts'
import { createMockApi, type MockStorage } from './mock/mockApi.ts'

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
