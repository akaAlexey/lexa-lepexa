import type { Route, RoutePoint, Source } from '../../contract/schemas.ts'
import {
  checkAnswer,
  emptyProgress,
  markPointDone,
  questStatus,
  type QuestProgress,
  type QuestStatus,
} from '../../domain/trail.ts'
import type { Deps } from '../core/deps.ts'
import { paths } from '../core/paths.ts'

export type { QuestProgress, QuestStatus } from '../../domain/trail.ts'

/** Маршруты семейной тропы. */
export function listRoutes({ api }: Pick<Deps, 'api'>): Promise<Route[]> {
  return api.listRoutes()
}

/** Маршрут по id из загруженного списка. */
export function findRoute(
  routes: readonly Route[],
  routeId: string | undefined,
): Route | undefined {
  return routes.find((r) => r.id === routeId)
}

/** Точка маршрута и её номер (с нуля); нет такой — `undefined`. */
export function findPoint(
  route: Route | undefined,
  pointId: string | undefined,
): { point: RoutePoint; index: number } | undefined {
  const index = route?.points.findIndex((p) => p.id === pointId) ?? -1
  const point = route?.points[index]
  return point ? { point, index } : undefined
}

export interface AnswerResult {
  correct: boolean
  /** Прогресс после ответа: верный ответ отмечает точку пройденной, неверный ничего не меняет. */
  progress: QuestProgress
}

/** Ответ на задание точки. */
export function answer(
  progress: QuestProgress,
  point: RoutePoint,
  optionIndex: number,
): AnswerResult {
  const correct = checkAnswer(point, optionIndex)
  return { correct, progress: correct ? markPointDone(progress, point.id) : progress }
}

export interface QuestOverview extends QuestStatus {
  /** Куда ведёт главная кнопка: первая непройденная точка или финиш. */
  continueTo: string
  /** Точка, до которой считать расстояние «Где я?»: следующая, а если всё пройдено — первая. */
  target: RoutePoint | undefined
}

/** Статус квеста для экрана маршрута. */
export function questOverview(route: Route, progress: QuestProgress): QuestOverview {
  const status = questStatus(route, progress)
  return {
    ...status,
    continueTo: status.next ? paths.point(route.id, status.next.id) : paths.finish(route.id),
    target: status.next ?? route.points[0],
  }
}

/** Куда идти после точки с номером `index`: к следующей или на финиш. */
export function afterPoint(route: Route, index: number): { to: string; finish: boolean } {
  const next = route.points[index + 1]
  return next
    ? { to: paths.point(route.id, next.id), finish: false }
    : { to: paths.finish(route.id), finish: true }
}

/** «Пройти ещё раз»: пустой прогресс и первая точка маршрута. */
export function restart(route: Route): { progress: QuestProgress; to: string | undefined } {
  const first = route.points[0]
  return {
    progress: emptyProgress(route.id),
    to: first ? paths.point(route.id, first.id) : undefined,
  }
}

export interface Stamp {
  point: RoutePoint
  done: boolean
}

export interface FinishSummary {
  status: QuestStatus
  /** Штамп на каждую остановку по порядку маршрута. */
  stamps: Stamp[]
  /** Источники всех остановок без повторов и без пометок «демо-текст». */
  sources: Source[]
}

/** Данные финиша: штампы и источники маршрута. */
export function finishSummary(route: Route, progress: QuestProgress): FinishSummary {
  const done = new Set(progress.donePointIds)
  const all = route.points.flatMap((p) => p.sources).filter((src) => src.kind !== 'demo')
  return {
    status: questStatus(route, progress),
    stamps: route.points.map((point) => ({ point, done: done.has(point.id) })),
    sources: all.filter((src, i) => all.findIndex((x) => x.title === src.title) === i),
  }
}
