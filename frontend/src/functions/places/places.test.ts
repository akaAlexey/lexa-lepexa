// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { AppNotification, NewLastBattleSite } from '../../contract/schemas.ts'
import { region } from '../../config/region.ts'
import { createTestDeps } from '../../test/testDeps.ts'
import { checkForm } from '../core/form.ts'
import { isNotFound } from '../core/errors.ts'
import { listenNearby, subscribeNearby } from '../nearbyAlerts/index.ts'
import { newPlaceForm } from './newPlaceForm.ts'
import {
  getPlace,
  helpRaise,
  listGraves,
  listPlaces,
  needsRaising,
  publishPlace,
  readNotified,
} from './places.ts'

const newSite = (lat: number, lon: number): NewLastBattleSite => ({
  lat,
  lon,
  placeName: 'Опушка (тест)',
  fightersCount: 3,
  fighters: [{}, {}, {}],
  unit: '9-я вдбр, 5-й ВДК',
  dateText: 'октябрь 1941',
  circumstances: '',
  sources: [{ kind: 'eyewitness', title: 'Полевой отчёт' }],
})

describe('места и захоронения', () => {
  it('список мест и захоронений из API', async () => {
    const deps = createTestDeps()
    const sites = await listPlaces(deps)
    expect(sites.map((s) => s.id)).toContain('S01')
    expect((await listGraves(deps)).length).toBeGreaterThan(0)
  })

  it('место по id; нет такого — 404', async () => {
    const deps = createTestDeps()
    expect((await getPlace(deps, 'S01')).placeName).toBe('Овраг у д. Крупышино')
    const error = await getPlace(deps, 'нет-такого').catch((e: unknown) => e)
    expect(isNotFound(error)).toBe(true)
  })

  it('подъём нужен, пока останки не подняты', () => {
    expect(needsRaising({ status: 'found_needs_check' })).toBe(true)
    expect(needsRaising({ status: 'archive_confirmed' })).toBe(true)
    expect(needsRaising({ status: 'remains_raised' })).toBe(false)
  })
})

describe('«Я готов помочь в подъёме»', () => {
  it('счётчик готовых помочь растёт, сервер возвращает место', async () => {
    const deps = createTestDeps()
    const before = (await getPlace(deps, 'S01')).volunteersReady
    const updated = await helpRaise(deps, 'S01')
    expect(updated.id).toBe('S01')
    expect(updated.volunteersReady).toBe(before + 1)
  })

  it('ошибка сервера доходит до вызывающего', async () => {
    const deps = createTestDeps()
    const error = await helpRaise(deps, 'нет-такого').catch((e: unknown) => e)
    expect(isNotFound(error)).toBe(true)
  })
})

describe('публикация места', () => {
  it('место со статусом «требуется проверка» и числом уведомлённых подписчиков', async () => {
    const deps = createTestDeps()
    await subscribeNearby(deps)
    const { site, notifiedCount } = await publishPlace(deps, newSite(53.05, 36.1))
    expect(site.status).toBe('found_needs_check')
    expect(notifiedCount).toBeGreaterThan(0)
    expect((await listPlaces(deps)).map((s) => s.id)).toContain(site.id)
  })

  it('автор своё уведомление не получает (публикация — собственное действие)', async () => {
    const deps = createTestDeps()
    await subscribeNearby(deps)
    const onAlert = vi.fn<(n: AppNotification) => void>()
    const stop = listenNearby(deps, onAlert)
    await publishPlace(deps, newSite(53.05, 36.1))
    expect(onAlert).not.toHaveBeenCalled()
    stop()
  })

  it('ошибка сети — публикации нет, ошибка доходит до формы', async () => {
    const deps = createTestDeps()
    vi.spyOn(deps.api, 'createSite').mockRejectedValue(new Error('сеть'))
    await expect(publishPlace(deps, newSite(53.05, 36.1))).rejects.toThrow('сеть')
    expect(deps.own.active()).toBe(false)
  })

  it('число уведомлённых читается только из своего состояния навигации', () => {
    expect(readNotified({ notifiedCount: 2 })).toBe(2)
    expect(readNotified({ notifiedCount: '2' })).toBeUndefined()
    expect(readNotified(null)).toBeUndefined()
  })
})

describe('форма «Отметить место гибели»', () => {
  const position = { lat: 52.97, lon: 36.07 }

  it('шаблон экспедиции и координаты устройства', () => {
    expect(newPlaceForm.initial(position)).toEqual({
      placeName: '',
      lat: '52.97',
      lon: '36.07',
      fightersCount: '3',
      unit: '9-я вдбр, 5-й ВДК',
      dateText: 'октябрь 1941',
      source: 'Полевой отчёт отряда «Высота»',
      circumstances: '',
    })
    expect(newPlaceForm.initial(null)).toMatchObject({ lat: '', lon: '' })
  })

  it('верная форма → запрос: обрезка пробелов, запятая в числе, безымянные бойцы, отряд', () => {
    const values = {
      ...newPlaceForm.initial(null),
      placeName: '  Опушка у р. Оптуха ',
      lat: '52,97',
      lon: '36.07',
    }
    const check = checkForm(newPlaceForm, values, null)
    expect(check.ok).toBe(true)
    if (!check.ok) return
    expect(check.request).toMatchObject({
      lat: 52.97,
      lon: 36.07,
      placeName: 'Опушка у р. Оптуха',
      fightersCount: 3,
      fighters: [{}, {}, {}],
      sources: [{ kind: 'eyewitness', title: 'Полевой отчёт отряда «Высота»' }],
      teamId: region.demo.commanderTeamId,
    })
  })

  it('ошибки по полям; первое поле с ошибкой — как на экране (место, затем координаты)', () => {
    const empty = { ...newPlaceForm.initial(null), fightersCount: '0', source: ' ' }
    const check = checkForm(newPlaceForm, empty, null)
    expect(check.ok).toBe(false)
    if (check.ok) return
    expect(Object.keys(check.errors).sort()).toEqual(
      ['coords', 'fightersCount', 'placeName', 'sources'].sort(),
    )
    expect(check.firstInvalid).toBe('placeName')

    const noCoords = { ...newPlaceForm.initial(null), placeName: 'Овраг', fightersCount: '' }
    const second = checkForm(newPlaceForm, noCoords, null)
    expect(second.ok === false && second.firstInvalid).toBe('coords')
  })
})
