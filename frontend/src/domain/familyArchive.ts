import { pluralRu } from './plural.ts'

/**
 * Семейный архив (A7): бойцы семьи, ссылки поиска в официальных базах и найденные записи.
 * Хранится на устройстве, как профиль: это не сущность API. Лежит в domain/, потому что
 * слот памяти в functions/core разбирает сохранённое этими же правилами.
 */

/** Найденный документ — ссылка на его страницу в официальной базе. */
export interface FoundRecord {
  id: string
  url: string
  title: string
}

export interface FamilyFighter {
  id: string
  lastName: string
  firstName: string
  middleName: string
  birthYear?: number
  /** Кем приходится: «прадед по маме». */
  relation: string
  /** Что известно в семье. */
  note: string
  records: FoundRecord[]
  createdAt: string
}

/** Значения формы бойца — строки, как в полях. */
export interface FighterValues {
  lastName: string
  firstName: string
  middleName: string
  birthYear: string
  relation: string
  note: string
}

export interface RecordValues {
  url: string
  title: string
}

export type Errors = Partial<Record<string, string>>

export type Made<T> = { ok: true; value: T } | { ok: false; errors: Errors }

export const BIRTH_YEAR_MIN = 1860
export const BIRTH_YEAR_MAX = 1935
export const NAME_MAX = 60
export const RELATION_MAX = 60
export const NOTE_MAX = 1000
export const RECORD_TITLE_MAX = 120

/** Официальные базы: записи принимаются только со ссылками на них. */
export const ARCHIVE_SOURCES = [
  { host: 'pamyat-naroda.ru', title: '«Память народа»' },
  { host: 'obd-memorial.ru', title: 'ОБД «Мемориал»' },
  { host: 'podvignaroda.ru', title: '«Подвиг народа»' },
] as const

export type ArchiveSource = (typeof ARCHIVE_SOURCES)[number]

const NAME = /^[\p{L}\s'’-]*$/u
const YEAR = /^\d{4}$/

/** Пробелы по краям убраны, двойные — схлопнуты. */
const clean = (value: string) => value.trim().replace(/\s+/g, ' ')

/** Для многострочного текста: переносы строк сохраняются, пробелы внутри строк схлопываются. */
const cleanText = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => clean(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

function nameError(value: string, required: boolean, what: string): string | undefined {
  if (!value) return required ? `Укажите ${what}` : undefined
  if (!NAME.test(value)) return 'Только буквы, пробел, дефис и апостроф'
  if (value.length < 2 || value.length > NAME_MAX) return `От 2 до ${NAME_MAX} символов`
  return undefined
}

function yearError(value: string): string | undefined {
  if (!value) return undefined
  const year = Number(value)
  if (!YEAR.test(value) || year < BIRTH_YEAR_MIN || year > BIRTH_YEAR_MAX)
    return `Год — 4 цифры, от ${BIRTH_YEAR_MIN} до ${BIRTH_YEAR_MAX}`
  return undefined
}

export function validateFighter(values: FighterValues): Errors {
  const errors: Record<string, string | undefined> = {
    lastName: nameError(clean(values.lastName), true, 'фамилию'),
    firstName: nameError(clean(values.firstName), false, 'имя'),
    middleName: nameError(clean(values.middleName), false, 'отчество'),
    birthYear: yearError(clean(values.birthYear)),
    relation:
      clean(values.relation).length > RELATION_MAX
        ? `Не длиннее ${RELATION_MAX} символов`
        : undefined,
    note: cleanText(values.note).length > NOTE_MAX ? `Не длиннее ${NOTE_MAX} символов` : undefined,
  }
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v !== undefined))
}

/**
 * Новый боец или правка. При правке (`previous`) записи и дата создания сохраняются.
 */
export function makeFighter(
  values: FighterValues,
  { id, createdAt, previous }: { id: string; createdAt: string; previous?: FamilyFighter },
): Made<FamilyFighter> {
  const errors = validateFighter(values)
  if (Object.keys(errors).length) return { ok: false, errors }
  const year = clean(values.birthYear)
  return {
    ok: true,
    value: {
      id: previous?.id ?? id,
      lastName: clean(values.lastName),
      firstName: clean(values.firstName),
      middleName: clean(values.middleName),
      ...(year ? { birthYear: Number(year) } : {}),
      relation: clean(values.relation),
      note: cleanText(values.note),
      records: previous?.records ?? [],
      createdAt: previous?.createdAt ?? createdAt,
    },
  }
}

/** Значения формы из сохранённого бойца (правка). */
export function fighterValues(fighter?: FamilyFighter): FighterValues {
  return {
    lastName: fighter?.lastName ?? '',
    firstName: fighter?.firstName ?? '',
    middleName: fighter?.middleName ?? '',
    birthYear: fighter?.birthYear ? String(fighter.birthYear) : '',
    relation: fighter?.relation ?? '',
    note: fighter?.note ?? '',
  }
}

/** Ссылка → официальная база. Проверка по hostname, а не подстрокой. */
export function recordSource(url: string): ArchiveSource | undefined {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return undefined
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined
  const host = parsed.hostname.toLowerCase()
  return ARCHIVE_SOURCES.find((s) => host === s.host || host.endsWith(`.${s.host}`))
}

const normalizeUrl = (url: string) => new URL(url.trim()).href

export function makeRecord(
  values: RecordValues,
  { id, existing }: { id: string; existing: readonly FoundRecord[] },
): Made<FoundRecord> {
  const title = clean(values.title)
  const source = recordSource(values.url)
  const errors: Record<string, string> = {}
  if (!values.url.trim()) errors.url = 'Вставьте ссылку на страницу документа'
  else if (!source)
    errors.url = 'Нужна ссылка на «Память народа», ОБД «Мемориал» или «Подвиг народа»'
  else if (existing.some((r) => r.url === normalizeUrl(values.url)))
    errors.url = 'Эта запись уже добавлена'
  if (title.length > RECORD_TITLE_MAX) errors.title = `Не длиннее ${RECORD_TITLE_MAX} символов`
  if (!source || Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, value: { id, url: normalizeUrl(values.url), title: title || source.title } }
}

/** «Иванов Пётр Сергеевич» — пустые части пропускаются. */
export function fullName(f: Pick<FamilyFighter, 'lastName' | 'firstName' | 'middleName'>) {
  return [f.lastName, f.firstName, f.middleName].filter(Boolean).join(' ')
}

/** «прадед по маме · 1912 г. р.» — кем приходится и год. */
export function fighterRelationLine(f: Pick<FamilyFighter, 'relation' | 'birthYear'>) {
  return [f.relation, f.birthYear ? `${f.birthYear} г. р.` : ''].filter(Boolean).join(' · ')
}

/** Подпись в списке: «прадед по маме · 1912 г. р. · 2 записи». */
export function fighterSummary(f: FamilyFighter) {
  return [fighterRelationLine(f), pluralRu(f.records.length, ['запись', 'записи', 'записей'])]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Готовые ссылки поиска с подставленными ФИО и годом. Формат сверен с сайтами баз.
 * encodeURIComponent, а не URLSearchParams: тот превратил бы «~» в %7E.
 */
export function searchLinks(f: FamilyFighter): { pamyat: string; obd: string } {
  const q = (pairs: [string, string | undefined][]) =>
    pairs
      .filter((p): p is [string, string] => Boolean(p[1]))
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
  const enc = (v: string) => (v ? encodeURIComponent(v) : undefined)
  const year = f.birthYear ? String(f.birthYear) : undefined
  const pamyat = q([
    ['adv_search', 'y'],
    ['last_name', enc(f.lastName)],
    ['first_name', enc(f.firstName)],
    ['middle_name', enc(f.middleName)],
    ['date_birth_from', year],
    ['group', 'all'],
  ])
  const obd = q([
    ['f', f.lastName && `P~${encodeURIComponent(f.lastName)}`],
    ['n', f.firstName && `P~${encodeURIComponent(f.firstName)}`],
    ['s', f.middleName && `P~${encodeURIComponent(f.middleName)}`],
    ['bd', year && `P~${year}`],
  ])
  return {
    pamyat: `https://pamyat-naroda.ru/heroes/?${pamyat}`,
    obd: `https://obd-memorial.ru/html/search.htm?${obd}`,
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

function parseRecord(raw: unknown): FoundRecord | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.url !== 'string') return undefined
  const source = recordSource(r.url)
  if (!source) return undefined
  const title = clean(str(r.title)).slice(0, RECORD_TITLE_MAX)
  return { id: r.id, url: normalizeUrl(r.url), title: title || source.title }
}

function parseFighter(raw: unknown): FamilyFighter | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const f = raw as Record<string, unknown>
  if (typeof f.id !== 'string' || typeof f.createdAt !== 'string') return undefined
  const made = makeFighter(
    {
      lastName: str(f.lastName),
      firstName: str(f.firstName),
      middleName: str(f.middleName),
      birthYear: typeof f.birthYear === 'number' ? String(f.birthYear) : '',
      relation: str(f.relation),
      note: str(f.note),
    },
    { id: f.id, createdAt: f.createdAt },
  )
  if (!made.ok) return undefined
  const records = Array.isArray(f.records)
    ? f.records.map(parseRecord).filter((r): r is FoundRecord => r !== undefined)
    : []
  return { ...made.value, records }
}

/** Сохранённый архив → бойцы; испорченное (в том числе чужие ссылки) отбрасывается. */
export function parseFighters(raw: unknown): FamilyFighter[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw.map(parseFighter).filter((f): f is FamilyFighter => f !== undefined)
}
