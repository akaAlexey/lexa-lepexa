// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Team, VolunteerRequest } from '../../contract/schemas.ts'
import { checkForm } from '../core/form.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import {
  isPublishedState,
  publishedState,
  publishRequest,
  requestDates,
  requestForm,
  withPublished,
  type RequestFormContext,
} from './publishRequest.ts'

const team = { id: 'T01', name: 'Высота' } as Team
const last = { place: 'д. Семенково', title: 'Вахта Памяти' } as VolunteerRequest
const ctx: RequestFormContext = { team, last, today: '2026-10-02', tomorrow: '2026-10-03' }

describe('даты заявки по Москве', () => {
  it('«завтра» по Москве, а не по UTC', () => {
    expect(requestDates(new Date('2026-10-02T09:00:00Z'))).toEqual({
      today: '2026-10-02',
      tomorrow: '2026-10-03',
    })
    // 22:30 UTC — в Москве уже 3 октября
    expect(requestDates(new Date('2026-10-02T22:30:00Z'))).toEqual({
      today: '2026-10-03',
      tomorrow: '2026-10-04',
    })
  })
})

describe('форма заявки командира', () => {
  it('заполнена заранее: завтра, 5 волонтёров 16+, место и название из прошлой заявки', () => {
    expect(requestForm.initial(ctx)).toEqual({
      date: '2026-10-03',
      count: '5',
      minAge: 16,
      place: 'д. Семенково',
      title: 'Вахта Памяти',
    })
  })

  it('без прошлой заявки — название по отряду, место пустое', () => {
    expect(requestForm.initial({ ...ctx, last: undefined })).toMatchObject({
      place: '',
      title: 'Набор волонтёров — отряд «Высота»',
    })
  })

  it('10 человек → готовый запрос: пробелы обрезаны, число из строки', () => {
    const values = { ...requestForm.initial(ctx), count: '10', place: '  д. Семенково ' }
    expect(checkForm(requestForm, values, ctx)).toEqual({
      ok: true,
      request: {
        teamId: 'T01',
        title: 'Вахта Памяти',
        date: '2026-10-03',
        place: 'д. Семенково',
        roles: [{ role: 'any', count: 10 }],
        minAge: 16,
      },
    })
  })

  it('ошибки по правилам domain/requests, первое поле с ошибкой — по порядку экрана', () => {
    const values = { ...requestForm.initial(ctx), date: '2026-10-01', count: '', place: ' ' }
    const check = checkForm(requestForm, values, ctx)
    expect(check).toEqual({
      ok: false,
      errors: {
        date: 'Эта дата в прошлом — выберите сегодня или позже',
        count: 'Нужен хотя бы один человек',
        place: 'Укажите место сбора',
      },
      firstInvalid: 'date',
    })
  })

  it('без места — ошибка только у места', () => {
    const check = checkForm(requestForm, { ...requestForm.initial(ctx), place: '' }, ctx)
    expect(check).toEqual({
      ok: false,
      errors: { place: 'Укажите место сбора' },
      firstInvalid: 'place',
    })
  })
})

describe('публикация заявки', () => {
  it('заявка уходит на сервер и первой появляется в ленте', async () => {
    const deps = createTestDeps()
    const check = checkForm(requestForm, { ...requestForm.initial(ctx), count: '10' }, ctx)
    if (!check.ok) throw new Error('форма должна быть верной')
    const created = await publishRequest(deps, check.request)
    expect(created).toMatchObject({
      teamId: 'T01',
      roles: [{ role: 'any', count: 10 }],
      minAge: 16,
    })
    const [first] = await deps.api.listRequests()
    expect(first?.id).toBe(created.id)
  })

  it('ошибка сети — ошибка наружу, заявки не прибавилось', async () => {
    const deps = createTestDeps()
    const before = (await deps.api.listRequests()).length
    vi.spyOn(deps.api, 'createRequest').mockRejectedValue(new Error('сеть'))
    await expect(
      publishRequest(deps, {
        teamId: 'T01',
        title: 'x',
        date: '2026-10-03',
        place: 'y',
        roles: [{ role: 'any', count: 1 }],
      }),
    ).rejects.toThrow('сеть')
    expect(await deps.api.listRequests()).toHaveLength(before)
  })

  it('кэш ленты: новая заявка первой и без дубля', () => {
    const a = { id: 'A' } as VolunteerRequest
    const b = { id: 'B' } as VolunteerRequest
    expect(withPublished([a, b], b).map((r) => r.id)).toEqual(['B', 'A'])
    expect(withPublished(undefined, a)).toEqual([a])
  })

  it('возврат на ленту с признаком публикации', () => {
    expect(isPublishedState(publishedState('R99'))).toBe(true)
    expect(isPublishedState(null)).toBe(false)
    expect(isPublishedState({ other: 1 })).toBe(false)
  })
})
