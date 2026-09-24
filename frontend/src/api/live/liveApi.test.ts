import { ApiError, ContractError } from '../client.ts'
import { demoUserKey } from './demoUser.ts'
import { createLiveApi } from './liveApi.ts'

const team = {
  id: 'T01',
  name: 'Высота',
  region: 'Орловская обл.',
  budgetGoalRub: 50000,
  budgetCollectedRub: 15000,
  foundThisMonth: 7,
  demo: true,
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('live-адаптер API', () => {
  it('ходит по базовому адресу и представляется ключом пользователя', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json([team]))
    const api = createLiveApi({ baseUrl: '/api/v1/', userKey: 'web-1', fetch })
    expect(await api.listTeams()).toEqual([team])
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('/api/v1/teams')
    expect(init?.headers).toMatchObject({ 'X-Demo-User': 'web-1' })
  })

  it('принимает дату со смещением +00:00 так же, как с Z', async () => {
    const story = {
      id: 'ST1',
      title: 'История',
      place: 'Орёл',
      story: 'Достаточно длинный текст истории для проверки схемы контракта.',
      sourceText: '',
      author: 'Автор',
      status: 'pending',
      createdAt: '2026-09-24T10:00:00.123456+00:00',
      demo: false,
    }
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json(story))
    const api = createLiveApi({ baseUrl: 'https://api.example.ru/api/v1', fetch })
    expect((await api.getStory({ id: 'ST1' })).createdAt).toBe(story.createdAt)
  })

  it('показывает текст ошибки сервера', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(json({ detail: { message: 'Мест нет' } }, 409))
    const api = createLiveApi({ baseUrl: '/api/v1', fetch })
    await expect(api.registerTrip({ id: 'W01' })).rejects.toEqual(new ApiError('Мест нет', 409))
  })

  it('нет сети — понятная ошибка со статусом 0', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new TypeError('Failed to fetch'))
    const api = createLiveApi({ baseUrl: '/api/v1', fetch })
    await expect(api.listTeams()).rejects.toMatchObject({ status: 0 })
  })

  it('ответ не по контракту — ContractError', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json([{ id: 'T01' }]))
    const api = createLiveApi({ baseUrl: '/api/v1', fetch })
    await expect(api.listTeams()).rejects.toBeInstanceOf(ContractError)
  })

  it('поток уведомлений передаёт ключ пользователя параметром', () => {
    const urls: string[] = []
    class FakeEventSource {
      onmessage: ((msg: MessageEvent<string>) => void) | null = null
      constructor(url: string) {
        urls.push(url)
      }
      close() {}
    }
    const api = createLiveApi({
      baseUrl: '/api/v1',
      userKey: 'web 1',
      EventSource: FakeEventSource as unknown as typeof EventSource,
    })
    api.onNotification(() => undefined)()
    expect(urls).toEqual(['/api/v1/notifications/stream?user=web%201'])
  })
})

describe('ключ демо-пользователя', () => {
  it('создаётся один раз и хранится во вкладке', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    }
    const first = demoUserKey(storage)
    expect(first).toMatch(/^web-/)
    expect(demoUserKey(storage)).toBe(first)
  })

  it('работает без хранилища', () => {
    expect(demoUserKey(null)).toMatch(/^web-/)
  })
})
