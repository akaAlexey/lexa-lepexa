import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { ApiError, type ApiClient } from '../../api/client.ts'
import type { FamilyFighterInput } from '../../contract/schemas.ts'
import {
  makeFighter,
  makeRecord,
  type Errors,
  type FamilyFighter,
  type FighterValues,
  type RecordValues,
} from '../../domain/familyArchive.ts'
import { memory, readMemory } from '../core/deviceMemory.ts'
import { qk } from '../core/queryKeys.ts'
import { useDeps } from '../core/useDeps.ts'
import { useDeviceMemory } from '../core/useDeviceMemory.ts'

export type ArchiveResult = { ok: true; id: string } | { ok: false; errors: Errors }

/**
 * Где лежит архив: `server` — в базе, у аккаунта (вход через сервер); `device` — в этом
 * браузере (демо-режим без сервера входа).
 */
export type ArchiveStorage = 'server' | 'device'

/** `loading` — ждём сервер; `signed-out` — сессия истекла; `error` — нет связи. */
export type ArchiveStatus = 'ready' | 'loading' | 'signed-out' | 'error'

export interface FamilyArchive {
  storage: ArchiveStorage
  status: ArchiveStatus
  fighters: FamilyFighter[]
  /** Сколько бойцов перенесено в аккаунт из этого браузера при входе. */
  moved: number
  retry(): void
  save(values: FighterValues, id?: string): Promise<ArchiveResult>
  remove(id: string): Promise<ArchiveResult>
  addRecord(fighterId: string, values: RecordValues): Promise<ArchiveResult>
  removeRecord(fighterId: string, recordId: string): Promise<ArchiveResult>
}

/** `F-…` и `R-…`: время плюс случайный хвост — два бойца в одну миллисекунду не совпадут. */
const newId = (prefix: 'F' | 'R', now: Date) =>
  `${prefix}-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const NOT_FOUND = 'Боец не найден в архиве'
const NONE: FamilyFighter[] = []

/** Тело запроса из проверенного бойца: сервер проверит те же правила ещё раз. */
const input = (f: FamilyFighter): FamilyFighterInput => ({
  lastName: f.lastName,
  firstName: f.firstName,
  middleName: f.middleName,
  ...(f.birthYear ? { birthYear: f.birthYear } : {}),
  relation: f.relation,
  note: f.note,
})

/** Ошибка сервера → ошибка поля формы (текст сервера уже по-русски). */
function serverErrors(error: unknown, field: string): Errors {
  if (error instanceof ApiError && error.status === 401)
    return { [field]: 'Сессия истекла: войдите снова, чтобы сохранить' }
  if (error instanceof ApiError && error.status > 0) return { [field]: error.message }
  return { [field]: 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз' }
}

/**
 * Семейный архив владельца (A7): бойцы и найденные записи.
 * Правила — в domain/familyArchive; здесь только хранение: в базе, если есть сервер входа,
 * иначе — в этом браузере. Бойцы, записанные в браузере до входа, переносятся в аккаунт.
 */
export function useFamilyArchive(owner: string): FamilyArchive {
  const { api } = useDeps()
  const device = useDeviceArchive(owner)
  const server = useServerArchive(owner, api.auth ? api : undefined)
  return server ?? device
}

/** Архив в этом браузере: слот `family:<владелец>`. */
function useDeviceArchive(owner: string): FamilyArchive {
  const { now } = useDeps()
  const [fighters, setFighters] = useDeviceMemory(memory.family(owner))

  const save = useCallback(
    async (values: FighterValues, id?: string): Promise<ArchiveResult> => {
      const previous = id ? fighters.find((f) => f.id === id) : undefined
      if (id && !previous) return { ok: false, errors: { lastName: NOT_FOUND } }
      const at = now()
      const made = makeFighter(values, {
        id: newId('F', at),
        createdAt: at.toISOString(),
        previous,
      })
      if (!made.ok) return made
      const fighter = made.value
      setFighters((prev) =>
        previous ? prev.map((f) => (f.id === fighter.id ? fighter : f)) : [...prev, fighter],
      )
      return { ok: true, id: fighter.id }
    },
    [fighters, now, setFighters],
  )

  const remove = useCallback(
    async (id: string): Promise<ArchiveResult> => {
      setFighters((prev) => prev.filter((f) => f.id !== id))
      return { ok: true, id }
    },
    [setFighters],
  )

  const addRecord = useCallback(
    async (fighterId: string, values: RecordValues): Promise<ArchiveResult> => {
      const fighter = fighters.find((f) => f.id === fighterId)
      if (!fighter) return { ok: false, errors: { url: NOT_FOUND } }
      const made = makeRecord(values, { id: newId('R', now()), existing: fighter.records })
      if (!made.ok) return made
      const record = made.value
      setFighters((prev) =>
        prev.map((f) => (f.id === fighterId ? { ...f, records: [...f.records, record] } : f)),
      )
      return { ok: true, id: record.id }
    },
    [fighters, now, setFighters],
  )

  const removeRecord = useCallback(
    async (fighterId: string, recordId: string): Promise<ArchiveResult> => {
      setFighters((prev) =>
        prev.map((f) =>
          f.id === fighterId ? { ...f, records: f.records.filter((r) => r.id !== recordId) } : f,
        ),
      )
      return { ok: true, id: recordId }
    },
    [setFighters],
  )

  return {
    storage: 'device',
    status: 'ready',
    fighters,
    moved: 0,
    retry: () => undefined,
    save,
    remove,
    addRecord,
    removeRecord,
  }
}

/**
 * Архив в базе. Загрузка — через кэш запросов (перенос из браузера не запустится дважды
 * и в StrictMode). Правки — сразу в состоянии React: после сохранения экран переходит к карточке
 * в том же обновлении, и новый боец уже в списке (без мигания «бойца нет»).
 * Без `api` (нет сервера входа) запрос не идёт, хук возвращает undefined.
 */
function useServerArchive(owner: string, api: ApiClient | undefined): FamilyArchive | undefined {
  const { now, platform } = useDeps()
  const queryClient = useQueryClient()
  const [, setLocal] = useDeviceMemory(memory.family(owner))
  const key = useMemo(() => qk.family(owner), [owner])
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(api),
    // Истёкшую сессию не повторяем; сбой связи — ещё раз (как у остальных запросов, retry: 1)
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 1,
    queryFn: async () => {
      if (!api) return { list: [], moved: 0 }
      const list = await api.listFamilyFighters()
      // Что записано в браузере до входа — в аккаунт; каждого перенесённого сразу забываем
      // в браузере, чтобы при сбое посередине не было дублей
      const local = readMemory(platform.storage, memory.family(owner))
      const done = await moveToAccount(api, local, (id) =>
        setLocal((prev) => prev.filter((f) => f.id !== id)),
      )
      return { list: [...list, ...done], moved: done.length }
    },
  })
  const [edited, setEdited] = useState<FamilyFighter[]>()
  const fighters = edited ?? query.data?.list ?? NONE
  const status: ArchiveStatus = query.isPending
    ? 'loading'
    : query.isError
      ? query.error instanceof ApiError && query.error.status === 401
        ? 'signed-out'
        : 'error'
      : 'ready'

  /** Правка списка: в состоянии (для экрана) и в кэше (для следующего открытия). */
  const change = useCallback(
    (update: (prev: FamilyFighter[]) => FamilyFighter[]) => {
      setEdited((prev) => update(prev ?? query.data?.list ?? NONE))
      queryClient.setQueryData<{ list: FamilyFighter[]; moved: number }>(key, (old) =>
        old ? { ...old, list: update(old.list) } : old,
      )
    },
    [key, query.data, queryClient],
  )

  const put = useCallback(
    (fighter: FamilyFighter) =>
      change((prev) =>
        prev.some((f) => f.id === fighter.id)
          ? prev.map((f) => (f.id === fighter.id ? fighter : f))
          : [...prev, fighter],
      ),
    [change],
  )

  const save = useCallback(
    async (values: FighterValues, id?: string): Promise<ArchiveResult> => {
      const previous = id ? fighters.find((f) => f.id === id) : undefined
      if (!api || (id && !previous)) return { ok: false, errors: { lastName: NOT_FOUND } }
      const made = makeFighter(values, { id: 'new', createdAt: now().toISOString(), previous })
      if (!made.ok) return made
      try {
        const body = input(made.value)
        const fighter = previous
          ? await api.updateFamilyFighter({ id: previous.id, body })
          : await api.createFamilyFighter({ body })
        put(fighter)
        return { ok: true, id: fighter.id }
      } catch (error) {
        return { ok: false, errors: serverErrors(error, 'lastName') }
      }
    },
    [api, fighters, now, put],
  )

  const remove = useCallback(
    async (id: string): Promise<ArchiveResult> => {
      if (!api) return { ok: false, errors: { remove: NOT_FOUND } }
      try {
        await api.deleteFamilyFighter({ id })
        change((prev) => prev.filter((f) => f.id !== id))
        return { ok: true, id }
      } catch (error) {
        return { ok: false, errors: serverErrors(error, 'remove') }
      }
    },
    [api, change],
  )

  const addRecord = useCallback(
    async (fighterId: string, values: RecordValues): Promise<ArchiveResult> => {
      const fighter = fighters.find((f) => f.id === fighterId)
      if (!api || !fighter) return { ok: false, errors: { url: NOT_FOUND } }
      const made = makeRecord(values, { id: 'new', existing: fighter.records })
      if (!made.ok) return made
      try {
        const updated = await api.addFamilyRecord({
          id: fighterId,
          body: { url: made.value.url, title: made.value.title },
        })
        put(updated)
        return { ok: true, id: updated.records.at(-1)?.id ?? fighterId }
      } catch (error) {
        return { ok: false, errors: serverErrors(error, 'url') }
      }
    },
    [api, fighters, put],
  )

  const removeRecord = useCallback(
    async (fighterId: string, recordId: string): Promise<ArchiveResult> => {
      if (!api) return { ok: false, errors: { records: NOT_FOUND } }
      try {
        put(await api.deleteFamilyRecord({ id: fighterId, recordId }))
        return { ok: true, id: recordId }
      } catch (error) {
        return { ok: false, errors: serverErrors(error, 'records') }
      }
    },
    [api, put],
  )

  const { refetch } = query
  const retry = useCallback(() => {
    setEdited(undefined)
    void refetch()
  }, [refetch])

  if (!api) return undefined
  return {
    storage: 'server',
    status,
    fighters,
    moved: query.data?.moved ?? 0,
    retry,
    save,
    remove,
    addRecord,
    removeRecord,
  }
}

/** Бойцы из браузера → в аккаунт, вместе с записями, в прежнем порядке. */
async function moveToAccount(
  api: ApiClient,
  local: readonly FamilyFighter[],
  forget: (id: string) => void,
) {
  const done: FamilyFighter[] = []
  for (const f of local) {
    // по одному, по порядку: записи бойца добавляются к уже созданному на сервере
    let fighter = await api.createFamilyFighter({ body: input(f) })
    for (const r of f.records) {
      fighter = await api.addFamilyRecord({ id: fighter.id, body: { url: r.url, title: r.title } })
    }
    forget(f.id)
    done.push(fighter)
  }
  return done
}
