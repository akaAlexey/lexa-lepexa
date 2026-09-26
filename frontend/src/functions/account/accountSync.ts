import type { ApiClient } from '../../api/client.ts'
import type { StorageService } from '../../platform/index.ts'

/**
 * Личное состояние аккаунта на сервере (`/me/state`): что раньше жило только в браузере, теперь
 * общее для всех устройств пользователя. Ключ на сервере — имя слота памяти, значение — как в слоте.
 *
 * Синхронизируются только личные слоты. Настройки конкретного устройства (демо-геопозиция, раскрытые
 * «Новости недели», платёж в процессе оплаты) остаются на устройстве.
 */
const EXACT = new Set([
  'search.joinedRequests', // заявки отрядов, в которые записался
  'trips.registered', // выезды, на которые записался
  'groups:mine', // заявки групп, поданные пользователем
  'archive:mine', // «Мои истории»
  'live:mine', // «Мои живые фото»
  'subscription', // подписка на находки рядом
  'profile.age', // возраст 18+ из профиля
  'role', // роль на сайте
])
const PREFIXES = ['quest:', 'checklist:'] // прогресс тропы и чек-листы выездов

/** Профиль лежит в слоте всех профилей устройства — на сервер уходит только профиль аккаунта. */
export const PROFILE_KEY = 'profile'
const PROFILES_SLOT = 'account:profiles'
/** Чьё личное состояние сейчас на устройстве: чужое не переносим в другой аккаунт. */
const OWNER_KEY = 'sync.owner'
/** Ключи, изменённые на устройстве и ещё не подтверждённые сервером. */
const DIRTY_KEY = 'sync.dirty'
const PUSH_DELAY_MS = 400

export const isSyncedKey = (key: string) =>
  EXACT.has(key) || PREFIXES.some((prefix) => key.startsWith(prefix))

/** Хранилище, о записях в которое можно узнать: синхронизация отправляет их на сервер. */
export interface ObservedStorage extends StorageService {
  /** Запись в обход наблюдения — для данных, пришедших с сервера (без эха обратно). */
  readonly raw: StorageService
  onWrite(listener: (key: string) => void): () => void
}

export function observeStorage(storage: StorageService): ObservedStorage {
  const listeners = new Set<(key: string) => void>()
  const emit = (key: string) => listeners.forEach((l) => l(key))
  return {
    raw: storage,
    get: (key) => storage.get(key),
    set(key, value) {
      storage.set(key, value)
      emit(key)
    },
    remove(key) {
      storage.remove(key)
      emit(key)
    },
    clear: () => storage.clear(),
    keys: () => storage.keys?.() ?? [],
    onWrite(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}

export const isObserved = (storage: StorageService): storage is ObservedStorage =>
  'onWrite' in storage && 'raw' in storage

type Profiles = Record<string, unknown>

/**
 * Запустить синхронизацию для вошедшего пользователя. Сервер главнее: его значения приходят на
 * устройство — кроме тех, что изменены здесь и ещё не дошли до сервера (закрыли вкладку, пропала
 * связь): они помечены «к отправке» и уходят первыми. Чего на сервере нет, а на устройстве есть
 * (записано до входа) — уходит на сервер; состояние другого аккаунта не переносится, а убирается.
 * Возвращает остановку (выход, смена аккаунта).
 */
export function startAccountSync({
  api,
  storage,
  accountId,
  notify,
}: {
  api: Pick<ApiClient, 'getMyState' | 'putMyState'>
  storage: ObservedStorage
  accountId: string
  /** Сообщить экранам, что слот изменился (данные с сервера). */
  notify: (key: string) => void
}): () => void {
  let stopped = false
  let ready = false
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const raw = storage.raw

  const dirty = () => new Set(raw.get<string[]>(DIRTY_KEY) ?? [])
  const setDirty = (keys: Set<string>) =>
    keys.size ? raw.set(DIRTY_KEY, [...keys]) : raw.remove(DIRTY_KEY)
  const markDirty = (key: string) => setDirty(dirty().add(key))

  const valueFor = (key: string): unknown =>
    key === PROFILE_KEY
      ? (raw.get<Profiles>(PROFILES_SLOT)?.[accountId] ?? null)
      : (raw.get(key) ?? null)
  // Нет связи — ключ остаётся «к отправке» и уйдёт при следующей записи или следующем запуске
  const send = async (key: string) => {
    const value = valueFor(key)
    try {
      await api.putMyState({ body: { key, value } })
    } catch {
      return
    }
    // Пока летел запрос, значение могли снова поменять — тогда отправка ещё впереди
    if (JSON.stringify(valueFor(key)) !== JSON.stringify(value)) return
    const keys = dirty()
    keys.delete(key)
    setDirty(keys)
  }
  const push = (key: string) => {
    markDirty(key)
    if (stopped || !ready) return
    clearTimeout(timers.get(key))
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key)
        void send(key)
      }, PUSH_DELAY_MS),
    )
  }
  /** Закрывают вкладку или сворачивают приложение — отправить сразу, не дожидаясь паузы. */
  const flush = () => {
    for (const [key, timer] of timers) {
      clearTimeout(timer)
      void send(key)
    }
    timers.clear()
  }
  const onHidden = () => {
    if (document.visibilityState === 'hidden') flush()
  }
  const off = storage.onWrite((key) => {
    if (isSyncedKey(key)) push(key)
    else if (key === PROFILES_SLOT) push(PROFILE_KEY)
  })
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHidden)
  }

  void (async () => {
    let state: Record<string, unknown>
    try {
      state = await api.getMyState()
    } catch {
      return
    }
    if (stopped) return
    const owner = raw.get<string>(OWNER_KEY)
    const foreign = owner !== undefined && owner !== accountId
    // Изменения этого аккаунта, не дошедшие до сервера, главнее серверных
    const pending = foreign ? new Set<string>() : dirty()
    if (foreign) raw.remove(DIRTY_KEY)

    for (const [key, value] of Object.entries(state)) {
      if (pending.has(key)) continue
      if (key === PROFILE_KEY) {
        raw.set(PROFILES_SLOT, { ...raw.get<Profiles>(PROFILES_SLOT), [accountId]: value })
        notify(PROFILES_SLOT)
      } else if (isSyncedKey(key)) {
        raw.set(key, value)
        notify(key)
      }
    }
    const toSend = new Set(pending)
    const local = [...new Set([...EXACT, ...(raw.keys?.() ?? [])])].filter(isSyncedKey)
    for (const key of local) {
      if (key in state || raw.get(key) === undefined) continue
      if (foreign) {
        raw.remove(key)
        notify(key)
      } else toSend.add(key)
    }
    if (!(PROFILE_KEY in state) && !foreign && valueFor(PROFILE_KEY) !== null)
      toSend.add(PROFILE_KEY)
    raw.set(OWNER_KEY, accountId)
    ready = true
    for (const key of toSend) {
      markDirty(key)
      void send(key)
    }
  })()

  return () => {
    stopped = true
    off()
    flush()
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }
}
