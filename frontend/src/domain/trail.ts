import type { Route, RoutePoint } from '../contract/schemas.ts'
import { distanceToPathKm, formatDistance, pathLengthKm } from './geo.ts'
import { pluralRu } from './plural.ts'

/** Семейный маршрут из user story 1: ≈3 км (2,7–3,3) и ровно 4 точки, каждая не дальше 60 м от линии. */
export const FAMILY_ROUTE = { minKm: 2.7, maxKm: 3.3, points: 4, maxPointOffsetKm: 0.06 } as const

export interface RouteCheck {
  ok: boolean
  lengthKm: number
  /** Что не так — по-русски, для отчёта и теста. */
  problems: string[]
}

const km = (value: number) => value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })

export function validateFamilyRoute(route: Route): RouteCheck {
  const lengthKm = pathLengthKm(route.path)
  const problems: string[] = []
  const lengthOk = lengthKm >= FAMILY_ROUTE.minKm && lengthKm <= FAMILY_ROUTE.maxKm
  if (!lengthOk) {
    problems.push(
      `Длина маршрута ${km(lengthKm)} км, а нужно от ${km(FAMILY_ROUTE.minKm)} до ${km(FAMILY_ROUTE.maxKm)} км`,
    )
  }
  if (route.points.length !== FAMILY_ROUTE.points) {
    problems.push(
      `На маршруте ${pluralRu(route.points.length, ['точка', 'точки', 'точек'])}, а нужно ровно ${FAMILY_ROUTE.points}`,
    )
  }
  // Пока сама линия неверной длины, её придётся перерисовать — отступы точек от неё ещё ничего не говорят.
  for (const p of lengthOk ? route.points : []) {
    const offsetKm = distanceToPathKm(p, route.path)
    if (offsetKm > FAMILY_ROUTE.maxPointOffsetKm) {
      problems.push(
        `Точка «${p.title}» в стороне от линии маршрута: ${formatDistance(offsetKm)}, а допустимо не дальше ${formatDistance(FAMILY_ROUTE.maxPointOffsetKm)}`,
      )
    }
  }
  return { ok: problems.length === 0, lengthKm, problems }
}

/** Прогресс квеста хранится на устройстве: какие точки ребёнок прошёл (ответил верно). */
export interface QuestProgress {
  routeId: string
  donePointIds: string[]
}

export function emptyProgress(routeId: string): QuestProgress {
  return { routeId, donePointIds: [] }
}

export function checkAnswer(point: RoutePoint, optionIndex: number): boolean {
  return optionIndex === point.task.answerIndex
}

/** Отметить точку пройденной (повторная отметка ничего не меняет). */
export function markPointDone(progress: QuestProgress, pointId: string): QuestProgress {
  if (progress.donePointIds.includes(pointId)) return progress
  return { ...progress, donePointIds: [...progress.donePointIds, pointId] }
}

export interface QuestStatus {
  done: number
  total: number
  /** Первая непройденная точка по порядку маршрута. */
  next?: RoutePoint
  complete: boolean
}

export function questStatus(route: Route, progress: QuestProgress): QuestStatus {
  const done = new Set(progress.donePointIds)
  const next = route.points.find((p) => !done.has(p.id))
  return {
    done: route.points.filter((p) => done.has(p.id)).length,
    total: route.points.length,
    next,
    complete: next === undefined,
  }
}
