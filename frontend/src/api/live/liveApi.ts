import { endpoints, notificationStream, type EndpointName } from '../../contract/endpoints.ts'
import { ApiError, ContractError, type ApiClient, type EndpointMethods } from '../client.ts'

interface LiveOptions {
  baseUrl: string
  fetch?: typeof fetch
}

function fillPath(path: string, args: Record<string, unknown>): string {
  return path.replace(/\{(\w+)\}/g, (_, key: string) => encodeURIComponent(String(args[key])))
}

/** Адаптер к реальному серверу. Каждый ответ проверяется схемой контракта. */
export function createLiveApi({ baseUrl, fetch: fetchImpl = fetch }: LiveOptions): ApiClient {
  const root = baseUrl.replace(/\/$/, '')

  const call = async (name: EndpointName, args: Record<string, unknown> = {}) => {
    const e = endpoints[name]
    const init: RequestInit = { method: e.method, headers: { Accept: 'application/json' } }
    if ('body' in e && e.body) {
      init.body = JSON.stringify(e.body.parse(args.body))
      init.headers = { ...init.headers, 'Content-Type': 'application/json' }
    }
    const res = await fetchImpl(root + fillPath(e.path, args), init)
    if (!res.ok) throw new ApiError(`${e.method} ${e.path}: HTTP ${res.status}`, res.status)
    const parsed = e.response.safeParse(await res.json())
    if (!parsed.success) {
      const error = new ContractError(`${e.method} ${e.path}`, parsed.error.message)
      if (import.meta.env.DEV) console.error(error)
      throw error
    }
    return parsed.data
  }

  const methods = Object.fromEntries(
    (Object.keys(endpoints) as EndpointName[]).map((name) => [
      name,
      (args?: Record<string, unknown>) => call(name, args),
    ]),
  ) as unknown as EndpointMethods

  return {
    ...methods,
    onNotification(listener) {
      const source = new EventSource(root + notificationStream.path)
      source.onmessage = (msg: MessageEvent<string>) => {
        const parsed = notificationStream.event.safeParse(JSON.parse(msg.data))
        if (parsed.success) listener(parsed.data)
        else console.error(new ContractError(notificationStream.path, parsed.error.message))
      }
      return () => source.close()
    },
  }
}
