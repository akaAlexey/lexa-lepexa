// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Route } from '../../contract/schemas.ts'
import { emptyProgress } from '../../domain/trail.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import {
  afterPoint,
  answer,
  findPoint,
  findRoute,
  finishSummary,
  listRoutes,
  questOverview,
  restart,
} from './quest.ts'

async function familyRoute(): Promise<Route> {
  const route = findRoute(await listRoutes(createTestDeps()), 'park-3km')
  if (!route) throw new Error('нет демо-маршрута park-3km')
  return route
}

const progressOf = (...donePointIds: string[]) => ({ routeId: 'park-3km', donePointIds })

describe('маршруты и точки', () => {
  it('список маршрутов с API, маршрут и точка по id', async () => {
    const routes = await listRoutes(createTestDeps())
    const route = findRoute(routes, 'park-3km')
    expect(route?.points.map((p) => p.id)).toEqual(['rubezh', 'okop', 'shtab', 'salut'])
    expect(findPoint(route, 'okop')).toMatchObject({ index: 1, point: { id: 'okop' } })
  })

  it('нет маршрута или точки — undefined', async () => {
    const routes = await listRoutes(createTestDeps())
    expect(findRoute(routes, 'nope')).toBeUndefined()
    expect(findRoute(routes, undefined)).toBeUndefined()
    expect(findPoint(routes[0], 'nope')).toBeUndefined()
    expect(findPoint(undefined, 'rubezh')).toBeUndefined()
  })
})

describe('ответ на задание', () => {
  it('верный ответ — точка пройдена', async () => {
    const point = (await familyRoute()).points[0]!
    const result = answer(emptyProgress('park-3km'), point, point.task.answerIndex)
    expect(result).toEqual({ correct: true, progress: progressOf('rubezh') })
  })

  it('неверный ответ — прогресс не меняется', async () => {
    const point = (await familyRoute()).points[0]!
    const before = progressOf()
    const wrong = (point.task.answerIndex + 1) % point.task.options.length
    const result = answer(before, point, wrong)
    expect(result.correct).toBe(false)
    expect(result.progress).toBe(before)
  })

  it('повторный верный ответ не дублирует точку', async () => {
    const point = (await familyRoute()).points[0]!
    const result = answer(progressOf('rubezh'), point, point.task.answerIndex)
    expect(result.progress.donePointIds).toEqual(['rubezh'])
  })
})

describe('статус квеста', () => {
  it('без прогресса — «начать» с первой точки, расстояние до неё', async () => {
    const route = await familyRoute()
    const overview = questOverview(route, progressOf())
    expect(overview).toMatchObject({ done: 0, total: 4, complete: false })
    expect(overview.continueTo).toBe('/trail/park-3km/point/rubezh')
    expect(overview.target?.id).toBe('rubezh')
  })

  it('продолжить — первая непройденная точка', async () => {
    const overview = questOverview(await familyRoute(), progressOf('rubezh', 'shtab'))
    expect(overview.done).toBe(2)
    expect(overview.continueTo).toBe('/trail/park-3km/point/okop')
    expect(overview.target?.id).toBe('okop')
  })

  it('всё пройдено — на финиш, расстояние до первой точки', async () => {
    const overview = questOverview(
      await familyRoute(),
      progressOf('rubezh', 'okop', 'shtab', 'salut'),
    )
    expect(overview.complete).toBe(true)
    expect(overview.continueTo).toBe('/trail/park-3km/finish')
    expect(overview.target?.id).toBe('rubezh')
  })

  it('после точки — к следующей, после последней — на финиш', async () => {
    const route = await familyRoute()
    expect(afterPoint(route, 0)).toEqual({ to: '/trail/park-3km/point/okop', finish: false })
    expect(afterPoint(route, 3)).toEqual({ to: '/trail/park-3km/finish', finish: true })
  })
})

describe('финиш и повтор', () => {
  it('штампы по порядку маршрута и источники без повторов и демо-пометок', async () => {
    const route = await familyRoute()
    const summary = finishSummary(route, progressOf('okop', 'rubezh'))
    expect(summary.status).toMatchObject({ done: 2, total: 4 })
    expect(summary.stamps.map((s) => [s.point.id, s.done])).toEqual([
      ['rubezh', true],
      ['okop', true],
      ['shtab', false],
      ['salut', false],
    ])
    const titles = summary.sources.map((s) => s.title)
    expect(new Set(titles).size).toBe(titles.length)
    expect(summary.sources.every((s) => s.kind !== 'demo')).toBe(true)
    expect(titles.length).toBeGreaterThan(0)
  })

  it('«Пройти ещё раз» — пустой прогресс и первая точка', async () => {
    expect(restart(await familyRoute())).toEqual({
      progress: emptyProgress('park-3km'),
      to: '/trail/park-3km/point/rubezh',
    })
  })
})
