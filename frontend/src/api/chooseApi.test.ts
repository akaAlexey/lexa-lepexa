// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Env } from '../config/env.ts'
import { chooseApi } from './index.ts'

const app: Env = {
  VITE_API_MODE: 'live',
  VITE_API_URL: 'https://api.example.ru/api/v1',
  VITE_TILES: 'none',
  VITE_MOCK_LATENCY_MS: 0,
  VITE_GEO_DEFAULT: 'device',
  VITE_API_FALLBACK: 'device',
}
const answer = (status: number, body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

describe('приложение: сервер или встроенные данные при запуске', () => {
  it('сервер ответил — живой API, связь есть', async () => {
    const api = await chooseApi(app, answer(200, { ok: true }))
    expect(api.offline).toBeUndefined()
    expect(api.auth).toBeDefined()
  })

  it('нет связи или не тот ответ — встроенные данные и признак offline', async () => {
    const down = (async () => Promise.reject(new TypeError('network'))) as unknown as typeof fetch
    expect((await chooseApi(app, down)).offline).toBe(true)
    expect((await chooseApi(app, answer(404, { detail: 'нет' }))).offline).toBe(true)
    const offline = await chooseApi(app, down)
    expect((await offline.listFundraisers()).length).toBeGreaterThan(0)
  })

  it('сайт (без резерва) сервер при запуске не проверяет', async () => {
    let called = false
    const spy = (async () => {
      called = true
      return new Response('{}')
    }) as unknown as typeof fetch
    const api = await chooseApi({ ...app, VITE_API_FALLBACK: 'none' }, spy)
    expect(called).toBe(false)
    expect(api.offline).toBeUndefined()
  })
})
