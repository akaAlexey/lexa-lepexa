import type { Env } from '../config/env.ts'
import type { ApiClient, OfflineReason } from './client.ts'
import { demoUserKey } from './live/demoUser.ts'
import { createLiveApi } from './live/liveApi.ts'
import { createMockApi, type MockStorage } from './mock/mockApi.ts'

/** Сколько ждать ответа сервера при запуске приложения, прежде чем перейти на встроенные данные. */
export const HEALTH_TIMEOUT_MS = 15_000

type Probe = { ok: true } | { ok: false; reason: OfflineReason; status?: number }

/** Один запрос /health: сервер жив и отвечает {"ok": true}. */
export async function probeServer(
  healthUrl: string,
  fetchImpl: typeof fetch,
  timeoutMs = HEALTH_TIMEOUT_MS,
): Promise<Probe> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(healthUrl, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) return { ok: false, reason: 'status', status: res.status }
    const body = (await res.json()) as { ok?: unknown }
    return body.ok === true ? { ok: true } : { ok: false, reason: 'status', status: res.status }
  } catch {
    // AbortError — не успел; TypeError — нет соединения (сеть, блокировка, сертификат, CORS)
    return { ok: false, reason: ctrl.signal.aborted ? 'timeout' : 'network' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * API для запуска. Живой режим с резервом (приложение): сервер ответил на /health — работаем с ним
 * (общая база). Не ответил за 15 с (или сразу ошибка сети, и повтор тоже) — встроенные данные на
 * устройстве и плашка «Сервер недоступен» с причиной; приложение само перепроверяет сервер в фоне.
 */
export async function chooseApi(env: Env, fetchImpl: typeof fetch = (...a) => fetch(...a)) {
  if (env.VITE_API_MODE !== 'live' || !env.VITE_API_URL || env.VITE_API_FALLBACK !== 'device')
    return createApi(env)
  const healthUrl = `${env.VITE_API_URL.replace(/\/$/, '')}/health`
  let probe = await probeServer(healthUrl, fetchImpl)
  // Мгновенная ошибка сети бывает при переключении Wi-Fi ↔ мобильная сеть — одна повторная попытка
  if (!probe.ok && probe.reason === 'network') {
    await new Promise((r) => setTimeout(r, 1500))
    probe = await probeServer(healthUrl, fetchImpl)
  }
  if (probe.ok) return createApi(env)
  const offline: ApiClient = {
    ...createMockApi({ latencyMs: 0, storage: browserStorage() }),
    offline: {
      reason: probe.reason,
      status: probe.status,
      healthUrl,
      probe: async () => (await probeServer(healthUrl, fetchImpl, 10_000)).ok,
    },
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

export type { ApiClient, OfflineInfo, OfflineReason } from './client.ts'
export { ApiError, ContractError } from './client.ts'
