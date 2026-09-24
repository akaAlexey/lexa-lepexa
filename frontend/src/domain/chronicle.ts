/**
 * Хроника боёв за Орловщину (вкладка «История» из дизайна «Универсальный вариант»):
 * события по годам — 1941 оборона, 1942 оккупация, 1943 освобождение.
 */
import type { Battle } from '../contract/schemas.ts'

export const CHRONICLE_YEARS = ['1941', '1942', '1943'] as const
export type ChronicleYear = (typeof CHRONICLE_YEARS)[number]
export type YearFilter = ChronicleYear | 'all'

export const YEAR_NOTE: Record<ChronicleYear, string> = {
  '1941': 'оборона',
  '1942': 'оккупация',
  '1943': 'освобождение',
}

export interface ChronicleYearGroup {
  year: ChronicleYear
  note: string
  battles: Battle[]
}

/** События выбранных лет по порядку; год без событий остаётся в ленте — пустым. */
export function chronicleByYear(
  battles: readonly Battle[],
  filter: YearFilter,
): ChronicleYearGroup[] {
  const sorted = [...battles].sort((a, b) => a.date.localeCompare(b.date))
  return CHRONICLE_YEARS.filter((y) => filter === 'all' || y === filter).map((year) => ({
    year,
    note: YEAR_NOTE[year],
    battles: sorted.filter((b) => b.date.startsWith(year)),
  }))
}

const LONG_DATE = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** «3 октября 1941» — историческая дата без дня недели и «г.». */
export function formatHistoricDate(iso: string): string {
  return LONG_DATE.format(new Date(`${iso}T00:00:00Z`)).replace(/\s*г\.$/, '')
}
