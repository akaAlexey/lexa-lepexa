// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { withBase } from './notify.ts'

describe('адрес из системного уведомления', () => {
  it('учитывает базовый путь сборки: Pages в подпапке и свой домен в корне', () => {
    expect(withBase('/last-battle/S01', '/lexa-lepexa/')).toBe('/lexa-lepexa/last-battle/S01')
    expect(withBase('/last-battle/S01', '/')).toBe('/last-battle/S01')
    expect(withBase('https://example.ru/x', '/lexa-lepexa/')).toBe('https://example.ru/x')
  })
})
