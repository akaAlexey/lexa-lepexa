import type { Route, RoutePoint } from '../contract/schemas.ts'
import { notImplemented } from './notImplemented.ts'

/** Семейный маршрут из user story 1: ≈3 км (2,7–3,3) и ровно 4 точки, каждая не дальше 60 м от линии. */
export const FAMILY_ROUTE = { minKm: 2.7, maxKm: 3.3, points: 4, maxPointOffsetKm: 0.06 } as const

export interface RouteCheck {
  ok: boolean
  lengthKm: number
  /** Что не так — по-русски, для отчёта и теста. */
  problems: string[]
}

export function validateFamilyRoute(route: Route): RouteCheck {
  return notImplemented(`validateFamilyRoute(${route.id})`)
}

/** Прогресс квеста хранится на устройстве: какие точки ребёнок прошёл (ответил верно). */
export interface QuestProgress {
  routeId: string
  donePointIds: string[]
}

export function emptyProgress(routeId: string): QuestProgress {
  return notImplemented(`emptyProgress(${routeId})`)
}

export function checkAnswer(point: RoutePoint, optionIndex: number): boolean {
  return notImplemented(`checkAnswer(${point.id}, ${optionIndex})`)
}

/** Отметить точку пройденной (повторная отметка ничего не меняет). */
export function markPointDone(progress: QuestProgress, pointId: string): QuestProgress {
  return notImplemented(`markPointDone(${progress.routeId}, ${pointId})`)
}

export interface QuestStatus {
  done: number
  total: number
  /** Первая непройденная точка по порядку маршрута. */
  next?: RoutePoint
  complete: boolean
}

export function questStatus(route: Route, progress: QuestProgress): QuestStatus {
  return notImplemented(`questStatus(${route.id}, ${progress.donePointIds.length})`)
}
