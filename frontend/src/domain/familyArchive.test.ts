// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  fighterSummary,
  fullName,
  makeFighter,
  makeRecord,
  parseFighters,
  recordSource,
  searchLinks,
  validateFighter,
  type FamilyFighter,
  type FighterValues,
} from './familyArchive.ts'

const values = (over: Partial<FighterValues> = {}): FighterValues => ({
  lastName: 'Иванов',
  firstName: 'Пётр',
  middleName: 'Сергеевич',
  birthYear: '1912',
  relation: 'прадед по маме',
  note: '',
  ...over,
})

const make = (over: Partial<FighterValues> = {}, previous?: FamilyFighter) => {
  const made = makeFighter(values(over), { id: 'F-1', createdAt: '2026-09-25T09:00:00Z', previous })
  if (!made.ok) throw new Error(JSON.stringify(made.errors))
  return made.value
}

describe('семейный архив: проверка бойца', () => {
  it('принимает полные и минимальные данные', () => {
    expect(validateFighter(values())).toEqual({})
    expect(
      validateFighter({
        lastName: 'Д’Артаньян-Ли',
        firstName: '',
        middleName: '',
        birthYear: '',
        relation: '',
        note: '',
      }),
    ).toEqual({})
  })

  it('фамилия обязательна, 2–60 символов, только буквы, пробел, дефис и апостроф', () => {
    expect(validateFighter(values({ lastName: '  ' })).lastName).toBe('Укажите фамилию')
    expect(validateFighter(values({ lastName: 'И' })).lastName).toMatch(/От 2/)
    expect(validateFighter(values({ lastName: 'Ы'.repeat(61) })).lastName).toMatch(/до 60/)
    expect(validateFighter(values({ lastName: 'Иванов1' })).lastName).toMatch(/Только буквы/)
    expect(validateFighter(values({ lastName: '<b>' })).lastName).toMatch(/Только буквы/)
  })

  it('имя и отчество необязательны, но проверяются теми же правилами', () => {
    expect(validateFighter(values({ firstName: 'П.' })).firstName).toMatch(/Только буквы/)
    expect(validateFighter(values({ middleName: 'С' })).middleName).toMatch(/От 2/)
  })

  it('год рождения — 4 цифры от 1860 до 1935', () => {
    expect(validateFighter(values({ birthYear: '1860' }))).toEqual({})
    expect(validateFighter(values({ birthYear: '1935' }))).toEqual({})
    for (const year of ['1859', '1936', '912', '19a2', '1912.5'])
      expect(validateFighter(values({ birthYear: year })).birthYear).toMatch(/4 цифры/)
  })

  it('«кем приходится» до 60 символов, заметка до 1000', () => {
    expect(validateFighter(values({ relation: 'а'.repeat(61) })).relation).toMatch(/60/)
    expect(validateFighter(values({ note: 'а'.repeat(1001) })).note).toMatch(/1000/)
    expect(validateFighter(values({ note: 'а'.repeat(1000) }))).toEqual({})
  })

  it('убирает пробелы по краям и двойные, переносы в заметке сохраняет', () => {
    const f = make({
      lastName: '  Иванов  ',
      firstName: ' Пётр',
      middleName: 'Сергеевич ',
      relation: 'прадед   по  маме',
      note: '  Ушёл на фронт   в 1941.\n\n\n\nПисал  письма. ',
      birthYear: ' 1912 ',
    })
    expect(f).toMatchObject({
      lastName: 'Иванов',
      firstName: 'Пётр',
      middleName: 'Сергеевич',
      relation: 'прадед по маме',
      note: 'Ушёл на фронт в 1941.\n\nПисал письма.',
      birthYear: 1912,
      records: [],
      createdAt: '2026-09-25T09:00:00Z',
    })
  })

  it('без года поле birthYear отсутствует', () => {
    expect(make({ birthYear: '' })).not.toHaveProperty('birthYear')
  })

  it('при правке записи и дата создания сохраняются', () => {
    const before = {
      ...make(),
      records: [{ id: 'R-1', url: 'https://pamyat-naroda.ru/x', title: 'Донесение' }],
    }
    const made = makeFighter(values({ firstName: 'Павел' }), {
      id: 'F-other',
      createdAt: '2030-01-01T00:00:00Z',
      previous: before,
    })
    expect(made).toEqual({
      ok: true,
      value: { ...before, firstName: 'Павел' },
    })
  })

  it('с ошибками возвращает ошибки по полям', () => {
    expect(makeFighter(values({ lastName: '' }), { id: 'F', createdAt: 'x' })).toEqual({
      ok: false,
      errors: { lastName: 'Укажите фамилию' },
    })
  })
})

describe('семейный архив: подписи', () => {
  it('полное имя без пустых частей', () => {
    expect(fullName(make())).toBe('Иванов Пётр Сергеевич')
    expect(fullName(make({ firstName: '', middleName: '' }))).toBe('Иванов')
  })

  it('подпись для списка со склонением записей', () => {
    const rec = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `R-${i}`,
        url: `https://obd-memorial.ru/${i}`,
        title: 't',
      }))
    expect(fighterSummary({ ...make(), records: rec(1) })).toBe(
      'прадед по маме · 1912 г. р. · 1 запись',
    )
    expect(fighterSummary({ ...make(), records: rec(2) })).toBe(
      'прадед по маме · 1912 г. р. · 2 записи',
    )
    expect(fighterSummary({ ...make(), records: rec(5) })).toBe(
      'прадед по маме · 1912 г. р. · 5 записей',
    )
    expect(fighterSummary(make({ relation: '', birthYear: '' }))).toBe('0 записей')
  })
})

describe('семейный архив: ссылки поиска', () => {
  it('«Память народа» — ФИО и год в параметрах расширенного поиска', () => {
    const url = new URL(searchLinks(make()).pamyat)
    expect(url.origin + url.pathname).toBe('https://pamyat-naroda.ru/heroes/')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      adv_search: 'y',
      last_name: 'Иванов',
      first_name: 'Пётр',
      middle_name: 'Сергеевич',
      date_birth_from: '1912',
      group: 'all',
    })
  })

  it('ОБД «Мемориал» — поля с префиксом P~, тильда не кодируется', () => {
    const link = searchLinks(make()).obd
    expect(link).toContain('f=P~%D0%98')
    expect(link).not.toContain('%7E')
    const url = new URL(link)
    expect(url.origin + url.pathname).toBe('https://obd-memorial.ru/html/search.htm')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      f: 'P~Иванов',
      n: 'P~Пётр',
      s: 'P~Сергеевич',
      bd: 'P~1912',
    })
  })

  it('пустые поля в ссылку не попадают', () => {
    const f = make({ firstName: '', middleName: '', birthYear: '' })
    const pamyat = new URL(searchLinks(f).pamyat).searchParams
    expect([...pamyat.keys()]).toEqual(['adv_search', 'last_name', 'group'])
    const obd = new URL(searchLinks(f).obd).searchParams
    expect([...obd.keys()]).toEqual(['f'])
  })

  it('апостроф и пробел кодируются', () => {
    const f = make({ lastName: 'Д’Арт Ли' })
    expect(new URL(searchLinks(f).pamyat).searchParams.get('last_name')).toBe('Д’Арт Ли')
    expect(searchLinks(f).pamyat).not.toContain(' ')
  })
})

describe('семейный архив: найденные записи', () => {
  const add = (url: string, title = '', existing: FamilyFighter['records'] = []) =>
    makeRecord({ url, title }, { id: 'R-1', existing })

  it('принимает ссылки на три базы и их поддомены', () => {
    expect(
      recordSource('https://pamyat-naroda.ru/heroes/memorial-chelovek_donesenie123/')?.host,
    ).toBe('pamyat-naroda.ru')
    expect(recordSource('http://obd-memorial.ru/html/info.htm?id=1')?.host).toBe('obd-memorial.ru')
    expect(recordSource('https://www.podvignaroda.ru/?#id=1')?.host).toBe('podvignaroda.ru')
  })

  it('отказывает чужим сайтам, javascript: и подделкам по подстроке', () => {
    for (const url of [
      'https://example.com/pamyat-naroda.ru',
      'javascript:alert(1)//pamyat-naroda.ru',
      'https://pamyat-naroda.ru.evil.com/x',
      'https://evilpamyat-naroda.ru/x',
      'ftp://pamyat-naroda.ru/x',
      'pamyat-naroda.ru/x',
    ]) {
      expect(recordSource(url)).toBeUndefined()
      expect(add(url)).toMatchObject({
        ok: false,
        errors: { url: expect.stringMatching(/Нужна ссылка/) },
      })
    }
    expect(add('  ')).toMatchObject({
      ok: false,
      errors: { url: expect.stringMatching(/Вставьте/) },
    })
  })

  it('пустая подпись — название базы, подпись до 120 символов', () => {
    expect(add('https://obd-memorial.ru/html/info.htm?id=5')).toEqual({
      ok: true,
      value: {
        id: 'R-1',
        url: 'https://obd-memorial.ru/html/info.htm?id=5',
        title: 'ОБД «Мемориал»',
      },
    })
    expect(add('https://pamyat-naroda.ru/x', '  Донесение   о потерях ')).toMatchObject({
      ok: true,
      value: { title: 'Донесение о потерях' },
    })
    expect(add('https://pamyat-naroda.ru/x', 'а'.repeat(121))).toMatchObject({
      ok: false,
      errors: { title: expect.stringMatching(/120/) },
    })
  })

  it('дубли не принимаются', () => {
    const first = add('https://pamyat-naroda.ru/x')
    if (!first.ok) throw new Error('ожидалась запись')
    expect(add(' https://PAMYAT-NARODA.ru/x ', '', [first.value])).toMatchObject({
      ok: false,
      errors: { url: 'Эта запись уже добавлена' },
    })
  })
})

describe('семейный архив: чтение из хранилища', () => {
  it('не массив — значение по умолчанию', () => {
    expect(parseFighters({})).toBeUndefined()
    expect(parseFighters('x')).toBeUndefined()
  })

  it('отбрасывает испорченных бойцов и записи с чужими ссылками', () => {
    const good = {
      ...make(),
      records: [
        { id: 'R-1', url: 'https://pamyat-naroda.ru/x', title: 'Донесение' },
        { id: 'R-2', url: 'javascript:alert(1)', title: 'x' },
        { id: 'R-3', url: 'https://example.com/', title: 'x' },
        { id: 'R-4', url: 'https://pamyat-naroda.ru.evil.com/', title: 'x' },
        { id: 'R-5', url: 'https://obd-memorial.ru/y' },
        null,
      ],
    }
    const parsed = parseFighters([
      good,
      null,
      { id: 'F-2' },
      { ...make(), id: 'F-3', lastName: '<script>' },
      { ...make(), id: 'F-4', birthYear: 3000 },
    ])
    expect(parsed).toEqual([
      {
        ...make(),
        records: [
          { id: 'R-1', url: 'https://pamyat-naroda.ru/x', title: 'Донесение' },
          { id: 'R-5', url: 'https://obd-memorial.ru/y', title: 'ОБД «Мемориал»' },
        ],
      },
    ])
  })
})
