// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createTestDeps } from '../../test/testDeps.ts'
import { distanceFromMe, locate, locateOrNull } from './whereAmI.ts'

const noGeo = {
  geo: { source: 'device' as const, getPosition: () => Promise.reject(new Error('запрещено')) },
}

describe('«Где я?»', () => {
  it('отдаёт позицию устройства (в демо — точку с пульта)', async () => {
    const deps = createTestDeps({ position: { lat: 53.28, lon: 36.58 } })
    expect(await locate(deps)).toEqual({ lat: 53.28, lon: 36.58 })
  })

  it('без доступа к геопозиции — ошибка, которую экран покажет', async () => {
    await expect(locate(createTestDeps({ platform: noGeo }))).rejects.toThrow('запрещено')
  })

  it('locateOrNull вместо ошибки даёт null', async () => {
    expect(await locateOrNull(createTestDeps({ platform: noGeo }))).toBeNull()
    expect(await locateOrNull(createTestDeps())).toEqual({ lat: 52.97, lon: 36.07 })
  })

  it('расстояние до точки по прямой: Орёл → Мценск ≈ 48 км', () => {
    const km = distanceFromMe({ lat: 52.9651, lon: 36.0785 }, { lat: 53.2791, lon: 36.5752 })
    expect(km).toBeGreaterThan(47)
    expect(km).toBeLessThan(49)
  })
})
