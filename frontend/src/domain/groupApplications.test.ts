// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { peopleText, validateGroupApplication, type GroupDraft } from './groupApplications.ts'

const ok: GroupDraft = {
  organization: 'Школа № 1',
  contactName: 'Анна Сергеевна',
  contact: '+7 900 123-45-67',
  peopleCount: 12,
}

describe('коллективные заявки', () => {
  it('заполненная заявка проходит проверку; контакт — телефон или почта', () => {
    expect(validateGroupApplication(ok)).toEqual({})
    expect(validateGroupApplication({ ...ok, contact: 'school1@example.ru' })).toEqual({})
  })

  it('группа от 2 до 100 человек', () => {
    expect(validateGroupApplication({ ...ok, peopleCount: 1 }).peopleCount).toMatch(/2/)
    expect(validateGroupApplication({ ...ok, peopleCount: 101 }).peopleCount).toMatch(/100/)
    expect(validateGroupApplication({ ...ok, peopleCount: 2.5 }).peopleCount).toBeDefined()
    expect(validateGroupApplication({ ...ok, peopleCount: 100 })).toEqual({})
  })

  it('без организации, ответственного и контакта — ошибки по-русски', () => {
    expect(
      validateGroupApplication({
        organization: ' ',
        contactName: '',
        contact: '123',
        peopleCount: 5,
      }),
    ).toEqual({
      organization: expect.any(String),
      contactName: expect.any(String),
      contact: expect.stringMatching(/телефон/),
    })
  })

  it('«2 человека», «12 человек», «21 человек»', () => {
    expect(peopleText(2)).toBe('2 человека')
    expect(peopleText(12)).toBe('12 человек')
    expect(peopleText(21)).toBe('21 человек')
  })
})
