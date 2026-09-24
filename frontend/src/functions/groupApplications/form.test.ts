// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkForm } from '../core/form.ts'
import { groupApplicationForm, type GroupFormValues } from './form.ts'

const ctx = { tripId: 'W01' }
const filled: GroupFormValues = {
  organization: '  Школа № 5 ',
  contactName: ' Мария Петровна ',
  contact: ' +7 900 555-44-33 ',
  count: '12',
  comment: ' нужен гид ',
}

describe('форма заявки группы', () => {
  it('по умолчанию группа из 10 человек, остальные поля пустые', () => {
    expect(groupApplicationForm.initial(ctx)).toEqual({
      organization: '',
      contactName: '',
      contact: '',
      count: '10',
      comment: '',
    })
  })

  it('верная форма — запрос на выезд: пробелы обрезаны, число из строки', () => {
    expect(checkForm(groupApplicationForm, filled, ctx)).toEqual({
      ok: true,
      request: {
        tripId: 'W01',
        organization: 'Школа № 5',
        contactName: 'Мария Петровна',
        contact: '+7 900 555-44-33',
        peopleCount: 12,
        comment: 'нужен гид',
      },
    })
  })

  it('почта вместо телефона подходит', () => {
    expect(checkForm(groupApplicationForm, { ...filled, contact: 'school5@mail.ru' }, ctx).ok).toBe(
      true,
    )
  })

  it('пустая форма — ошибки всех полей, фокус на первом по порядку экрана', () => {
    const empty = { ...groupApplicationForm.initial(ctx), count: '' }
    const check = checkForm(groupApplicationForm, empty, ctx)
    expect(check).toEqual({
      ok: false,
      errors: {
        organization: 'Укажите школу, клуб или группу',
        contactName: 'Кто отвечает за группу?',
        contact: 'Нужен телефон или электронная почта',
        peopleCount: 'В группе хотя бы 2 человека',
      },
      firstInvalid: 'organization',
    })
  })

  it('первое поле с ошибкой идёт по порядку экрана, а не по порядку правил', () => {
    const check = checkForm(groupApplicationForm, { ...filled, contact: '12', count: '1' }, ctx)
    expect(!check.ok && check.firstInvalid).toBe('contact')
  })

  it('больше 100 человек — ошибка числа людей', () => {
    const check = checkForm(groupApplicationForm, { ...filled, count: '150' }, ctx)
    expect(check).toMatchObject({
      ok: false,
      errors: { peopleCount: 'Не больше 100 человек — разделите группу на несколько заявок' },
      firstInvalid: 'peopleCount',
    })
  })

  it('дробное число людей не принимается', () => {
    expect(checkForm(groupApplicationForm, { ...filled, count: '2.5' }, ctx).ok).toBe(false)
  })
})
