import type { Env } from '../config/env.ts'
import type { ApiClient } from './client.ts'
import { createLiveApi } from './live/liveApi.ts'
import { createMockApi } from './mock/mockApi.ts'

export function createApi(env: Env): ApiClient {
  if (env.VITE_API_MODE === 'live' && env.VITE_API_URL) {
    return createLiveApi({ baseUrl: env.VITE_API_URL })
  }
  return createMockApi({ latencyMs: env.VITE_MOCK_LATENCY_MS })
}

export type { ApiClient } from './client.ts'
export { ApiError, ContractError } from './client.ts'
