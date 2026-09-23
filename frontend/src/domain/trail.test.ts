// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { routes } from '../api/fixtures/seed.ts'
import type { Route } from '../contract/schemas.ts'
import { distanceToPathKm } from './geo.ts'
import {
  checkAnswer,
  emptyProgress,
  markPointDone,
  questStatus,
  validateFamilyRoute,
} from './trail.ts'

const route = routes[0]!

describe('маршрут для семьи (user story 1)', () => {
  it('демо-маршрут: ≈3 км, 4 точки, все точки на линии маршрута', () => {
    const check = validateFamilyRoute(route)
    expect(check.problems).toEqual([])
    expect(check.ok).toBe(true)
    expect(check.lengthKm).toBeGreaterThan(2.7)
    expect(check.lengthKm).toBeLessThan(3.3)
  })

  it('слишком длинный маршрут и лишняя точка — две понятные проблемы', () => {
    const long: Route = {
      ...route,
      path: route.path.map((p) => ({
        lat: route.path[0]!.lat + (p.lat - route.path[0]!.lat) * 2,
        lon: route.path[0]!.lon + (p.lon - route.path[0]!.lon) * 2,
      })),
      points: [...route.points, { ...route.points[0]!, id: 'extra' }],
    }
    const check = validateFamilyRoute(long)
    expect(check.ok).toBe(false)
    expect(check.problems).toHaveLength(2)
    expect(check.problems.join(' ')).toMatch(/км/)
    expect(check.problems.join(' ')).toMatch(/точ/)
  })

  it('точка в стороне от линии маршрута — проблема', () => {
    const off: Route = {
      ...route,
      points: route.points.map((p, i) => (i === 2 ? { ...p, lat: p.lat + 0.01 } : p)),
    }
    expect(validateFamilyRoute(off).problems.join(' ')).toMatch(/в стороне|далеко/)
  })

  it('расстояние до линии: на вершине 0, в 1,1 км к северу от отрезка ≈ 1,1 км', () => {
    const path = [
      { lat: 53, lon: 36 },
      { lat: 53, lon: 36.1 },
    ]
    expect(distanceToPathKm({ lat: 53, lon: 36.05 }, path)).toBeLessThan(0.01)
    expect(distanceToPathKm({ lat: 53.01, lon: 36.05 }, path)).toBeCloseTo(1.11, 1)
    expect(distanceToPathKm({ lat: 53, lon: 36.2 }, path)).toBeCloseTo(6.7, 0)
  })
})

describe('квест: ответы и прогресс', () => {
  const [first, second] = route.points

  it('верный и неверный ответ', () => {
    expect(checkAnswer(first!, first!.task.answerIndex)).toBe(true)
    expect(checkAnswer(first!, (first!.task.answerIndex + 1) % first!.task.options.length)).toBe(
      false,
    )
  })

  it('прогресс: следующая точка — первая непройденная, повторная отметка не считается', () => {
    let progress = emptyProgress(route.id)
    expect(questStatus(route, progress)).toMatchObject({ done: 0, total: 4, complete: false })
    expect(questStatus(route, progress).next?.id).toBe(first!.id)

    progress = markPointDone(progress, first!.id)
    progress = markPointDone(progress, first!.id)
    expect(questStatus(route, progress)).toMatchObject({ done: 1, total: 4 })
    expect(questStatus(route, progress).next?.id).toBe(second!.id)
  })

  it('все 4 точки — маршрут пройден, следующей нет', () => {
    const progress = route.points.reduce(
      (p, pt) => markPointDone(p, pt.id),
      emptyProgress(route.id),
    )
    expect(questStatus(route, progress)).toEqual({
      done: 4,
      total: 4,
      next: undefined,
      complete: true,
    })
  })

  it('прогресс не мутирует исходный объект', () => {
    const progress = emptyProgress(route.id)
    markPointDone(progress, first!.id)
    expect(progress.donePointIds).toEqual([])
  })
})
