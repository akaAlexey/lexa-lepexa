import { endpoints, notificationStream, type EndpointName } from '../../contract/endpoints.ts'
import {
  ApiError,
  ContractError,
  type ApiClient,
  type AuthAccount,
  type EndpointMethods,
} from '../client.ts'

interface LiveOptions {
  /** Абсолютный (https://…/api/v1) или относительный (/api/v1 — тот же домен) адрес API. */
  baseUrl: string
  /** Ключ демо-пользователя (X-Demo-User), пока нет входа. */
  userKey?: string
  fetch?: typeof fetch
  EventSource?: typeof EventSource
}

function fillPath(path: string, args: Record<string, unknown>): string {
  return path.replace(/\{(\w+)\}/g, (_, key: string) => encodeURIComponent(String(args[key])))
}

/** Текст ошибки сервера: FastAPI кладёт его в detail.message (свои ошибки) или detail[0].msg (валидация). */
async function serverMessage(res: Response): Promise<string | undefined> {
  try {
    const body: unknown = await res.json()
    const detail = (body as { detail?: unknown }).detail
    if (detail && typeof detail === 'object' && 'message' in detail) {
      return String((detail as { message: unknown }).message)
    }
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object' && 'msg' in detail[0]) {
      return String((detail[0] as { msg: unknown }).msg)
    }
  } catch {
    /* тело не JSON */
  }
  return undefined
}

/** Адаптер к реальному серверу. Каждый ответ проверяется схемой контракта. */
export function createLiveApi({
  baseUrl,
  userKey,
  fetch: fetchImpl = (...args) => fetch(...args),
  EventSource: EventSourceImpl = globalThis.EventSource,
}: LiveOptions): ApiClient {
  const root = baseUrl.replace(/\/$/, '')
  const identity: Record<string, string> = userKey ? { 'X-Demo-User': userKey } : {}

  const call = async (name: EndpointName, args: Record<string, unknown> = {}) => {
    const e = endpoints[name]
    const init: RequestInit = {
      method: e.method,
      headers: { Accept: 'application/json', ...identity },
      credentials: 'include',
    }
    if ('body' in e && e.body) {
      init.body = JSON.stringify(e.body.parse(args.body))
      init.headers = { ...init.headers, 'Content-Type': 'application/json' }
    }
    let res: Response
    try {
      res = await fetchImpl(root + fillPath(e.path, args), init)
    } catch {
      throw new ApiError('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз', 0)
    }
    if (!res.ok) {
      const message = await serverMessage(res)
      throw new ApiError(message ?? `${e.method} ${e.path}: HTTP ${res.status}`, res.status)
    }
    const parsed = e.response.safeParse(await res.json())
    if (!parsed.success) {
      const error = new ContractError(`${e.method} ${e.path}`, parsed.error.message)
      console.error(error)
      throw error
    }
    return parsed.data
  }

  const authRequest = async (path: string, init: RequestInit = {}): Promise<Response> => {
    let res: Response
    try {
      res = await fetchImpl(root + path, {
        ...init,
        credentials: 'include',
        headers: { Accept: 'application/json', ...init.headers },
      })
    } catch {
      throw new ApiError('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз', 0)
    }
    if (!res.ok) {
      const message = await serverMessage(res)
      throw new ApiError(message ?? `HTTP ${res.status}`, res.status)
    }
    return res
  }

  const parseAccount = (value: unknown): AuthAccount => {
    if (!value || typeof value !== 'object')
      throw new ContractError('/auth', 'ожидался объект аккаунта')
    const x = value as Record<string, unknown>
    if (
      typeof x.id !== 'string' ||
      typeof x.login !== 'string' ||
      typeof x.since !== 'string' ||
      (x.name !== undefined && typeof x.name !== 'string')
    )
      throw new ContractError('/auth', 'неверный формат аккаунта')
    return { id: x.id, login: x.login, since: x.since, ...(x.name ? { name: x.name } : {}) }
  }

  const methods = Object.fromEntries(
    (Object.keys(endpoints) as EndpointName[]).map((name) => [
      name,
      (args?: Record<string, unknown>) => call(name, args),
    ]),
  ) as unknown as EndpointMethods

  return {
    ...methods,
    auth: {
      async login(input) {
        const res = await authRequest('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        return parseAccount(await res.json())
      },
      async register(input) {
        const res = await authRequest('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        return parseAccount(await res.json())
      },
      async me() {
        let res: Response
        try {
          res = await fetchImpl(root + '/auth/me', {
            headers: { Accept: 'application/json' },
            credentials: 'include',
          })
        } catch {
          throw new ApiError('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз', 0)
        }
        if (res.status === 401) return null
        if (!res.ok) {
          const message = await serverMessage(res)
          throw new ApiError(message ?? `HTTP ${res.status}`, res.status)
        }
        return parseAccount(await res.json())
      },
      async logout() {
        await authRequest('/auth/logout', { method: 'POST' })
      },
    },
    onNotification(listener) {
      if (!EventSourceImpl) return () => undefined
      // EventSource не умеет заголовки — ключ пользователя идёт параметром.
      const query = userKey ? `?user=${encodeURIComponent(userKey)}` : ''
      const source = new EventSourceImpl(root + notificationStream.path + query, {
        withCredentials: true,
      })
      source.onmessage = (msg: MessageEvent<string>) => {
        let data: unknown
        try {
          data = JSON.parse(msg.data)
        } catch {
          return
        }
        const parsed = notificationStream.event.safeParse(data)
        if (parsed.success) listener(parsed.data)
        else console.error(new ContractError(notificationStream.path, parsed.error.message))
      }
      return () => source.close()
    },
  }
}
