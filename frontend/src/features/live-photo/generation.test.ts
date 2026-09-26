// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { GENERATION_MS, GENERATION_STEPS, generationAt } from './generation.ts'

describe('этапы генерации «живого фото»', () => {
  it('идут по порядку от загрузки до сборки', () => {
    expect(generationAt(0)).toEqual({ step: 0, percent: 0, done: false })
    expect(generationAt(GENERATION_STEPS[0].ms).step).toBe(1)
    expect(generationAt(GENERATION_MS - 1).step).toBe(GENERATION_STEPS.length - 1)
    expect(generationAt(GENERATION_MS)).toEqual({
      step: GENERATION_STEPS.length - 1,
      percent: 100,
      done: true,
    })
  })
  it('процент растёт и не выходит за 0…100', () => {
    expect(generationAt(-5).percent).toBe(0)
    expect(generationAt(GENERATION_MS * 2).percent).toBe(100)
    expect(generationAt(GENERATION_MS / 2).percent).toBe(50)
  })
})
