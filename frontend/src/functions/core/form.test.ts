// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkForm, type FormSpec } from './form.ts'

interface Values {
  place: string
  count: string
}
interface Req {
  place: string
  count: number
}

const spec: FormSpec<Values, Req, { min: number }> = {
  order: ['count', 'place'],
  initial: () => ({ place: '', count: '5' }),
  toRequest: (v) => ({ place: v.place.trim(), count: Number(v.count) }),
  validate: (req, _v, ctx) => ({
    ...(req.count < ctx.min ? { count: `Не меньше ${ctx.min}` } : {}),
    ...(req.place ? {} : { place: 'Укажите место' }),
  }),
}

describe('модель формы', () => {
  it('верные значения дают готовый запрос: пробелы обрезаны, число из строки', () => {
    expect(checkForm(spec, { place: '  Семенково ', count: '10' }, { min: 1 })).toEqual({
      ok: true,
      request: { place: 'Семенково', count: 10 },
    })
  })

  it('ошибки по полям и первое поле с ошибкой в порядке экрана', () => {
    const check = checkForm(spec, { place: ' ', count: '0' }, { min: 1 })
    expect(check).toEqual({
      ok: false,
      errors: { count: 'Не меньше 1', place: 'Укажите место' },
      firstInvalid: 'count',
    })
  })

  it('правила получают контекст (сегодняшняя дата, шаблон)', () => {
    const check = checkForm(spec, { place: 'Орёл', count: '5' }, { min: 10 })
    expect(check.ok).toBe(false)
    expect(!check.ok && check.firstInvalid).toBe('count')
  })

  it('поле вне порядка экрана всё равно найдено', () => {
    const odd: FormSpec<Values, Req, { min: number }> = {
      ...spec,
      order: [],
      validate: () => ({ extra: 'Ошибка' }),
    }
    expect(checkForm(odd, { place: 'x', count: '1' }, { min: 1 })).toMatchObject({
      firstInvalid: 'extra',
    })
  })
})
