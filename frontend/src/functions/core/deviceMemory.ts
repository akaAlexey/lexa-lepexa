import type { LatLon, Subscription } from '../../contract/schemas.ts'
import { emptyProgress, type QuestProgress } from '../../domain/trail.ts'
import { DEMO_POSITION_KEY, GEO_MODE_KEY, type StorageService } from '../../platform/index.ts'

/**
 * Память на устройстве: одна механика вместо своих `useState + storage.get/set` в каждом экране.
 * Слот — ключ хранилища, значение по умолчанию и разбор сохранённого.
 * Слоты с id (`memory.quest(id)`) кэшируются: один id — один объект.
 * Ключи прежние: то, что уже лежит на телефонах, читается после обновления.
 */
export interface MemorySlot<T> {
  readonly key: string
  readonly initial: T
  /** Сохранённое значение → значение слота; нераспознанное — значение по умолчанию. */
  parse(raw: unknown): T
}

export function memorySlot<T>(
  key: string,
  initial: T,
  parse: (raw: unknown) => T | undefined = (raw) => raw as T,
): MemorySlot<T> {
  return { key, initial, parse: (raw) => parse(raw) ?? initial }
}

export function readMemory<T>(storage: StorageService, slot: MemorySlot<T>): T {
  const raw = storage.get<unknown>(slot.key)
  return raw === undefined || raw === null ? slot.initial : slot.parse(raw)
}

export function writeMemory<T>(storage: StorageService, slot: MemorySlot<T>, value: T): void {
  storage.set(slot.key, value)
}

/** Прочитать, изменить и сохранить; возвращает новое значение. */
export function updateMemory<T>(
  storage: StorageService,
  slot: MemorySlot<T>,
  change: (prev: T) => T,
): T {
  const next = change(readMemory(storage, slot))
  writeMemory(storage, slot, next)
  return next
}

/** Забыть значение: дальше читается значение по умолчанию. */
export function forgetMemory(storage: StorageService, slot: MemorySlot<unknown>): void {
  storage.remove(slot.key)
}

/** Слот для каждого id — один и тот же объект: хуки могут зависеть от слота. */
function perId<T>(make: (id: string) => MemorySlot<T>): (id: string) => MemorySlot<T> {
  const slots = new Map<string, MemorySlot<T>>()
  return (id) => {
    const existing = slots.get(id)
    if (existing) return existing
    const created = make(id)
    slots.set(id, created)
    return created
  }
}

/** Список строк: остальное отбрасывается (защита от испорченных данных). */
const stringList = (raw: unknown): string[] | undefined =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : undefined

/** «Живое фото», отправленное с этого устройства: превью снимка и текст речи. */
export interface MyLivePhoto {
  id: string
  name: string
  speech: string
  /** Уменьшенный снимок (data URL). */
  photo: string
  createdAt: string
}

const livePhotoList = (raw: unknown): MyLivePhoto[] | undefined =>
  Array.isArray(raw)
    ? raw.filter(
        (x): x is MyLivePhoto =>
          typeof x === 'object' &&
          x !== null &&
          typeof (x as MyLivePhoto).id === 'string' &&
          typeof (x as MyLivePhoto).photo === 'string',
      )
    : undefined

/** Все слоты приложения. Новый слот — только здесь (ключи не должны совпадать). */
export const memory = {
  /** Вход на этом устройстве (витрина ADR 0012): только логин в скрытом виде, пароль не хранится. */
  account: memorySlot<{ login: string; since: string } | undefined>('account', undefined, (raw) =>
    raw && typeof raw === 'object' && typeof (raw as { login?: unknown }).login === 'string'
      ? (raw as { login: string; since: string })
      : undefined,
  ),
  /** Изображения к историям, добавленные с этого устройства (до загрузки на сервер). */
  storyImages: perId((storyId) =>
    memorySlot<{ src: string; caption: string }[]>(`archive:images:${storyId}`, [], (raw) =>
      Array.isArray(raw)
        ? raw.filter(
            (x): x is { src: string; caption: string } =>
              typeof x?.src === 'string' && typeof x?.caption === 'string',
          )
        : undefined,
    ),
  ),
  /** Роль без регистрации. */
  role: memorySlot<string | undefined>('role', undefined),
  /** Прогресс квеста по маршруту. */
  quest: perId((routeId) => memorySlot<QuestProgress>(`quest:${routeId}`, emptyProgress(routeId))),
  /** Отмеченные пункты чек-листа выезда. */
  checklist: perId((tripId) => memorySlot<string[]>(`checklist:${tripId}`, [], stringList)),
  /** Заявки отрядов, в которые пользователь записался. */
  joinedRequests: memorySlot<string[]>('search.joinedRequests', []),
  /** Заявки групп, поданные с этого устройства. */
  myGroups: memorySlot<string[]>('groups:mine', []),
  /** Истории, отправленные с этого устройства. */
  myStories: memorySlot<string[]>('archive:mine', []),
  /** «Живые фото», загруженные с этого устройства и ждущие генерации. */
  myLivePhotos: memorySlot<MyLivePhoto[]>('live:mine', [], livePhotoList),
  /** Подписка на находки рядом — восстанавливается при старте. */
  subscription: memorySlot<Subscription | undefined>('subscription', undefined),
  /** Демо-геопозиция с пульта. */
  demoPosition: memorySlot<LatLon | undefined>(DEMO_POSITION_KEY, undefined),
  /** Источник геопозиции: реальное устройство или демо. */
  geoMode: memorySlot<string | undefined>(GEO_MODE_KEY, undefined),
} as const
