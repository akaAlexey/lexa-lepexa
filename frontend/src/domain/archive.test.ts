// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  canVerify,
  hasConfirmedBadge,
  notesToCheckNear,
  reviewBlocker,
  reviewNote,
  validateStory,
  type ArchiveNote,
} from './archive.ts'

const note: ArchiveNote = {
  id: 'A1',
  title: 'Землянка у оврага (демо)',
  lat: 52.9722,
  lon: 36.0674,
  status: 'pending',
}

describe('народный архив: верификация', () => {
  it('подтверждать могут краевед и поисковый отряд, семья и волонтёр — нет', () => {
    expect(canVerify('verifier')).toBe(true)
    expect(canVerify('commander')).toBe(true)
    expect(canVerify('family')).toBe(false)
    expect(canVerify('volunteer')).toBe(false)
  })

  it('краевед подтверждает — появляется значок «Подтверждено»', () => {
    expect(hasConfirmedBadge(note)).toBe(false)
    const verified = reviewNote(note, 'verifier', 'verified', 'Краевед (демо)')
    expect(verified).toMatchObject({ status: 'verified', verifiedBy: 'Краевед (демо)' })
    expect(hasConfirmedBadge(verified)).toBe(true)
    expect(note.status).toBe('pending')
  })

  it('без прав и повторно рассмотреть нельзя', () => {
    expect(() => reviewNote(note, 'family', 'verified', 'Мама')).toThrow(/прав/)
    const rejected = reviewNote(note, 'commander', 'rejected', 'Отряд «Высота»')
    expect(hasConfirmedBadge(rejected)).toBe(false)
    expect(() => reviewNote(rejected, 'verifier', 'verified', 'Краевед')).toThrow(/рассмотр/)
  })

  it('«помоги проверить»: только непроверенные рядом с точкой, ближние первыми', () => {
    const point = { lat: 52.97221, lon: 36.06741 }
    const notes: ArchiveNote[] = [
      { ...note, id: 'far', lat: 52.99 },
      { ...note, id: 'near-verified', status: 'verified' },
      { ...note, id: 'near-2', lat: 52.9735 },
      { ...note, id: 'near-1', lat: 52.9723 },
    ]
    expect(notesToCheckNear(point, notes).map((n) => n.id)).toEqual(['near-1', 'near-2'])
  })
})

describe('истории людей: проверка', () => {
  it('«нужно уточнение» возвращает историю в очередь: её можно рассмотреть снова', () => {
    const clarify = reviewNote(note, 'verifier', 'clarify', 'Краевед')
    expect(clarify.status).toBe('clarify')
    expect(reviewNote(clarify, 'commander', 'verified', 'Отряд «Высота»').status).toBe('verified')
  })

  it('подтвердить — только с источником и всеми пунктами чек-листа', () => {
    const all = ['datePlace', 'source', 'archive'] as const
    expect(reviewBlocker('verified', { source: '', checks: all, note: '' })).toMatch(/источник/)
    expect(
      reviewBlocker('verified', { source: 'Письмо', checks: ['datePlace'], note: '' }),
    ).toMatch(/все пункты/)
    expect(reviewBlocker('verified', { source: 'Письмо', checks: all, note: '' })).toBeUndefined()
  })

  it('попросить уточнение — только с комментарием автору', () => {
    expect(reviewBlocker('clarify', { source: '', checks: [], note: '  ' })).toMatch(/уточнить/)
    expect(
      reviewBlocker('clarify', { source: '', checks: [], note: 'Фото письма' }),
    ).toBeUndefined()
  })

  it('форма истории: название, место, подпись и рассказ не короче 30 символов', () => {
    expect(validateStory({ title: '', place: '', story: 'коротко', author: '' })).toEqual({
      title: expect.any(String),
      place: expect.any(String),
      story: expect.stringMatching(/30/),
      author: expect.any(String),
    })
    expect(
      validateStory({
        title: 'Письмо деда',
        place: 'Орёл',
        story: 'Дед писал домой летом 1943 года перед наступлением.',
        author: 'Внук',
      }),
    ).toEqual({})
  })
})
