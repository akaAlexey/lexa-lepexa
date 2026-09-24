import { region } from '../../config/region.ts'
import type { LatLon, NewLastBattleSite } from '../../contract/schemas.ts'
import { validateNewSite } from '../../domain/lastBattle.ts'
import type { FormSpec } from '../core/form.ts'

/** Шаблон экспедиции отряда «Высота»: три десантника 9-й бригады, октябрь 1941 (из кейса). */
export const EXPEDITION_TEMPLATE = {
  fightersCount: '3',
  unit: '9-я вдбр, 5-й ВДК',
  dateText: 'октябрь 1941',
  source: 'Полевой отчёт отряда «Высота»',
} as const

/** Значения формы «Отметить место гибели» — как в полях ввода, строками. */
export interface NewPlaceValues {
  placeName: string
  lat: string
  lon: string
  fightersCount: string
  unit: string
  dateText: string
  source: string
  circumstances: string
}

/** Координаты устройства при открытии формы; `null` — узнать не удалось, поля пустые. */
export type NewPlaceContext = LatLon | null

const toNumber = (value: string) => (value.trim() === '' ? NaN : Number(value.replace(',', '.')))

export const newPlaceForm: FormSpec<NewPlaceValues, NewLastBattleSite, NewPlaceContext> = {
  // Порядок полей на экране: координаты (ошибка — у широты) идут сразу после названия места.
  order: ['placeName', 'coords', 'fightersCount', 'unit', 'dateText', 'sources'],
  initial: (position) => ({
    placeName: '',
    lat: position ? String(position.lat) : '',
    lon: position ? String(position.lon) : '',
    fightersCount: EXPEDITION_TEMPLATE.fightersCount,
    unit: EXPEDITION_TEMPLATE.unit,
    dateText: EXPEDITION_TEMPLATE.dateText,
    source: EXPEDITION_TEMPLATE.source,
    circumstances: '',
  }),
  toRequest: (v) => {
    const count = toNumber(v.fightersCount)
    return {
      lat: toNumber(v.lat),
      lon: toNumber(v.lon),
      placeName: v.placeName.trim(),
      fightersCount: count,
      // Имена бойцов на месте находки не известны — их установит проверка по архивам.
      fighters:
        Number.isInteger(count) && count > 0 && count <= 1000
          ? Array.from({ length: count }, () => ({}))
          : [],
      unit: v.unit.trim(),
      dateText: v.dateText.trim(),
      circumstances: v.circumstances.trim(),
      // Полевой отчёт — наблюдение самих поисковиков на месте, а не архивный документ.
      sources: [{ kind: 'eyewitness', title: v.source.trim() }],
      teamId: region.demo.commanderTeamId,
    }
  },
  validate: (request) => validateNewSite(request),
}
