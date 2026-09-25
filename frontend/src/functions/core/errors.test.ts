// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/index.ts'
import { isNotFound } from './errors.ts'

describe('isNotFound', () => {
  it('404 от API — «не найдено»', () => {
    expect(isNotFound(new ApiError('нет', 404))).toBe(true)
  })

  it('другие ошибки — нет', () => {
    expect(isNotFound(new ApiError('сервер', 500))).toBe(false)
    expect(isNotFound(new Error('сеть'))).toBe(false)
    expect(isNotFound(undefined)).toBe(false)
  })
})
