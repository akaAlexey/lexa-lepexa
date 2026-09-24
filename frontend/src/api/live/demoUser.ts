const KEY = 'tropa-demo-user'

/**
 * Ключ демо-пользователя, пока на сайте нет входа. Свой у каждой вкладки (sessionStorage):
 * так показ «командир в одной вкладке → волонтёр в другой» работает и с настоящим сервером.
 * Сервер получает его в X-Demo-User и по нему адресует уведомления.
 */
export function demoUserKey(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeSession(),
): string {
  try {
    const saved = storage?.getItem(KEY)
    if (saved) return saved
  } catch {
    /* хранилище недоступно — ключ живёт до перезагрузки */
  }
  const created = `web-${randomId()}`
  try {
    storage?.setItem(KEY, created)
  } catch {
    /* см. выше */
  }
  return created
}

function safeSession(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14)
}
