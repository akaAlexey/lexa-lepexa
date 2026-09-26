import { useEffect, useState } from 'react'
import type { OfflineReason } from '../../api/client.ts'
import { useDeps } from './useDeps.ts'

/** Как часто без сервера проверять, не вернулся ли он. */
export const RECHECK_MS = 20_000

export type ServerStatus =
  | { connected: true }
  | {
      connected: false
      reason: OfflineReason
      status?: number
      healthUrl: string
      /** Сервер снова отвечает, но пользователь что-то вводит — переключимся по кнопке. */
      back: boolean
      reconnect(): void
    }

/** Пользователь сейчас что-то вводит или открыт диалог — перезапуск потерял бы введённое. */
function busy(): boolean {
  const el = document.activeElement
  const typing =
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  return typing || document.querySelector('[role="dialog"]') !== null
}

const reconnect = () => window.location.reload()

/**
 * Связь с сервером. Приложение запустилось без сервера — каждые 20 с (и при возвращении в
 * приложение) проверяем его снова; ответил — перезапускаемся уже с сервером (общая база), если
 * пользователь ничего не вводит, иначе показываем «Подключиться».
 */
export function useServerStatus(): ServerStatus {
  const { api } = useDeps()
  const offline = api.offline
  const [back, setBack] = useState(false)

  useEffect(() => {
    if (!offline) return
    let alive = true
    let checking = false
    const check = async () => {
      if (checking || back) return
      checking = true
      const ok = await offline.probe()
      checking = false
      if (!alive || !ok) return
      if (busy()) setBack(true)
      else reconnect()
    }
    const timer = setInterval(() => void check(), RECHECK_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [offline, back])

  if (!offline) return { connected: true }
  return {
    connected: false,
    reason: offline.reason,
    status: offline.status,
    healthUrl: offline.healthUrl,
    back,
    reconnect,
  }
}
