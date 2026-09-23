import type { StorageService } from '../types.ts'

const PREFIX = 'tropa:'

/** localStorage может быть недоступен (приватный режим, запрет) — тогда работаем в памяти. */
export function createWebStorage(
  backend: Storage | undefined = globalThis.localStorage,
): StorageService {
  const memory = new Map<string, string>()
  const read = (key: string) => {
    try {
      return backend?.getItem(PREFIX + key) ?? memory.get(key) ?? null
    } catch {
      return memory.get(key) ?? null
    }
  }
  const write = (key: string, value: string | null) => {
    if (value === null) memory.delete(key)
    else memory.set(key, value)
    try {
      if (value === null) backend?.removeItem(PREFIX + key)
      else backend?.setItem(PREFIX + key, value)
    } catch {
      /* остаёмся в памяти */
    }
  }
  return {
    get<T>(key: string) {
      const raw = read(key)
      if (raw === null) return undefined
      try {
        return JSON.parse(raw) as T
      } catch {
        return undefined
      }
    },
    set(key, value) {
      write(key, JSON.stringify(value))
    },
    remove(key) {
      write(key, null)
    },
    clear() {
      memory.clear()
      try {
        if (!backend) return
        const keys = Array.from({ length: backend.length }, (_, i) => backend.key(i))
        for (const key of keys) if (key?.startsWith(PREFIX)) backend.removeItem(key)
      } catch {
        /* хранилище недоступно — память уже очищена */
      }
    },
  }
}
