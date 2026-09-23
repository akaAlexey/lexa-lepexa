/**
 * Конфиг региона и темы. Чтобы сделать аналог для другого региона —
 * замените этот файл, фикстуры (fixtures/) и при желании токены темы (src/theme/tokens.ts).
 */
import type { LatLon, Source } from '../contract/schemas.ts'

export const region = {
  id: 'orel',
  appTitle: 'Тропа памяти',
  appSubtitle: 'Последний бой',
  regionName: 'Орловская область',
  mapCenter: { lat: 52.9651, lon: 36.0785 } satisfies LatLon,
  mapZoom: 9,
  /** Точка «я здесь» по умолчанию в демо-режиме — у начала семейного маршрута. */
  demoPosition: { lat: 52.97, lon: 36.07 } satisfies LatLon,
  /** Источники, на которые ссылается интерфейс. */
  sources: [
    {
      kind: 'book_of_memory',
      title: 'Книга Памяти. Российская Федерация, Орловская область. Т. 1–13 (1995–2015)',
      url: 'http://library.gu-unpk.ru/9_mai_2010/kniga_pamyati.php',
    },
    {
      kind: 'obd_memorial',
      title: 'ОБД «Мемориал» Министерства обороны РФ',
      url: 'https://obd-memorial.ru/',
    },
    { kind: 'pamyat_naroda', title: '«Память народа»', url: 'https://pamyat-naroda.ru/' },
    {
      kind: 'osm',
      title: 'OpenStreetMap',
      url: 'https://www.openstreetmap.org/copyright',
    },
  ] satisfies Source[],
} as const
