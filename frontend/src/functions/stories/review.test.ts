// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createTestDeps } from '../../test/testDeps.ts'
import { REVIEW_FAILED, reviewStory, toggleCheck, type ReviewInput } from './review.ts'

const ALL = ['datePlace', 'source', 'archive'] as const

const input = (over: Partial<ReviewInput> = {}): ReviewInput => ({
  story: { id: 'ST02', sourceText: 'Рассказ местного жителя (демо)' },
  decision: 'verified',
  checks: ALL,
  note: '',
  reviewer: 'Краевед',
  ...over,
})

describe('проверка истории краеведом', () => {
  it('все пункты и источник — история подтверждена, проверяющий записан', async () => {
    const result = await reviewStory(createTestDeps(), input())
    expect(result.ok && result.story).toMatchObject({ status: 'verified', verifiedBy: 'Краевед' })
  })

  it('не все пункты чек-листа — отказ без запроса', async () => {
    const deps = createTestDeps()
    const call = vi.spyOn(deps.api, 'reviewStory')
    const result = await reviewStory(deps, input({ checks: ['source'] }))
    expect(result).toEqual({ ok: false, reason: 'Отметьте все пункты проверки' })
    expect(call).not.toHaveBeenCalled()
  })

  it('без источника подтвердить нельзя', async () => {
    const result = await reviewStory(
      createTestDeps(),
      input({ story: { id: 'ST03', sourceText: ' ' } }),
    )
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toMatch(/Без источника/)
  })

  it('уточнение — только с комментарием; комментарий уходит автору без пробелов', async () => {
    const deps = createTestDeps()
    const empty = await reviewStory(deps, input({ decision: 'clarify', checks: [], note: ' ' }))
    expect(empty).toEqual({ ok: false, reason: 'Напишите автору, что нужно уточнить' })

    const result = await reviewStory(
      deps,
      input({ decision: 'clarify', checks: [], note: ' Нужен номер полевой почты ' }),
    )
    expect(result.ok && result.story).toMatchObject({
      status: 'clarify',
      reviewNote: 'Нужен номер полевой почты',
    })
  })

  it('сбой связи или отказ сервера — понятная причина', async () => {
    const deps = createTestDeps()
    vi.spyOn(deps.api, 'reviewStory').mockRejectedValue(new Error('сеть'))
    expect(await reviewStory(deps, input())).toEqual({ ok: false, reason: REVIEW_FAILED })
  })

  it('уже рассмотренную историю повторно не подтвердить', async () => {
    const result = await reviewStory(
      createTestDeps(),
      input({ story: { id: 'ST01', sourceText: 'Кейс' } }),
    )
    expect(result).toEqual({ ok: false, reason: REVIEW_FAILED })
  })

  it('пункт чек-листа отмечается и снимается', () => {
    expect(toggleCheck([], 'source')).toEqual(['source'])
    expect(toggleCheck(['source', 'archive'], 'source')).toEqual(['archive'])
  })
})

it('не отправляет неподписанный комментарий, сохраняет имя без крайних пробелов', async () => {
  const deps = createTestDeps()
  const call = vi.spyOn(deps.api, 'reviewStory')
  const result = await reviewStory(deps, input({ reviewer: '  ' }))
  expect(result.ok).toBe(false)
  expect(call).not.toHaveBeenCalled()
  const signed = await reviewStory(deps, input({ reviewer: '  Ирина Иванова  ' }))
  expect(signed.ok && signed.story.verifiedBy).toBe('Ирина Иванова')
})
