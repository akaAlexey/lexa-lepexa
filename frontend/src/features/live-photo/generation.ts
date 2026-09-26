import { useEffect, useState } from 'react'

/**
 * Этапы генерации ролика «живого фото» — как у настоящей нейросети (docs/LIVE_PHOTO.md): загрузка
 * снимка, поиск лица, синтез речи, синхронизация губ, сборка. В MVP нейросеть не подключена к онлайн-
 * сервису: этапы идут по таймеру, в конце показывается заранее сгенерированный ролик.
 */
export const GENERATION_STEPS = [
  { label: 'Загружаем снимок на сервер', ms: 1200 },
  { label: 'Находим лицо и ключевые точки', ms: 1800 },
  { label: 'Синтезируем речь по тексту', ms: 2200 },
  { label: 'Синхронизируем губы и мимику', ms: 2600 },
  { label: 'Собираем ролик и субтитры', ms: 1400 },
] as const

export const GENERATION_MS = GENERATION_STEPS.reduce((sum, s) => sum + s.ms, 0)

/** Этап и процент на момент `elapsed` мс от начала. */
export function generationAt(elapsed: number): { step: number; percent: number; done: boolean } {
  const clamped = Math.max(0, Math.min(elapsed, GENERATION_MS))
  let left = clamped
  let step = 0
  while (step < GENERATION_STEPS.length - 1 && left >= GENERATION_STEPS[step]!.ms) {
    left -= GENERATION_STEPS[step]!.ms
    step++
  }
  return {
    step,
    percent: Math.round((clamped / GENERATION_MS) * 100),
    done: clamped >= GENERATION_MS,
  }
}

const TICK_MS = 100

/**
 * Идущая генерация: обновляется 10 раз в секунду, пока не закончится. Время считается тиками таймера,
 * а не по часам: так этапы идут и когда часы страницы зафиксированы (e2e с «демо-датой»).
 */
export function useGeneration(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + TICK_MS
        if (next >= GENERATION_MS) clearInterval(timer)
        return next
      })
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [running])
  return generationAt(running ? elapsed : 0)
}
