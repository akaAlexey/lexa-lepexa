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

  it('нет связи или ошибка сервера — встроенные данные, причина и повторная проверка', async () => {
    const down = (async () => Promise.reject(new TypeError('network'))) as unknown as typeof fetch
    const offline = await chooseApi(app, down)
    expect(offline.offline).toMatchObject({
      reason: 'network',
      healthUrl: 'https://api.example.ru/api/v1/health',
    })
    expect(await offline.offline!.probe()).toBe(false)
    expect((await offline.listFundraisers()).length).toBeGreaterThan(0)
    const broken = await chooseApi(app, answer(502, { detail: 'нет' }))
    expect(broken.offline).toMatchObject({ reason: 'status', status: 502 })
  })

  it('мгновенная ошибка сети — одна повторная попытка, сервер ответил — живой API', async () => {
    let calls = 0
    const flaky = (async () => {
      calls += 1
      if (calls === 1) throw new TypeError('network')
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as unknown as typeof fetch
    const api = await chooseApi(app, flaky)
    expect(calls).toBe(2)
    expect(api.offline).toBeUndefined()
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
