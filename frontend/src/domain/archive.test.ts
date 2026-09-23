// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  canVerify,
  hasConfirmedBadge,
  notesToCheckNear,
  reviewNote,
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
