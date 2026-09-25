// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { ShareService } from '../../platform/types.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import { shareLink } from './share.ts'

describe('поделиться ссылкой', () => {
  it('передаёт платформе заголовок, текст и адрес и возвращает её результат', async () => {
    const share = vi.fn<ShareService['share']>(async () => 'shared')
    const deps = createTestDeps({ platform: { share: { share } } })
    const item = { title: 'Точка', text: 'Окоп', url: 'https://x/trail' }
    expect(await shareLink(deps, item)).toBe('shared')
    expect(share).toHaveBeenCalledWith(item)
  })

  it('платформа не умеет делиться — результат unsupported', async () => {
    const deps = createTestDeps({ platform: { share: { share: async () => 'unsupported' } } })
    expect(await shareLink(deps, { title: 'Т', url: 'u' })).toBe('unsupported')
  })
})
