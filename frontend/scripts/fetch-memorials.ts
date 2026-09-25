/**
 * Памятники Великой Отечественной и музеи Орловской области из OpenStreetMap → src/api/fixtures/memorials.osm.json.
 * Настоящие данные с источником (OSM), не выдуманные. Запуск: npm run memorials
 *
 * Берём historic=memorial|monument в границах RU-ORL и оставляем относящиеся к войне:
 * тип war_memorial / вечный огонь / техника или слова «воин», «погибш», «братская», «1941–1945» в названии.
 * Плюс все музеи (tourism=museum) с названием: к безликому «Краеведческому музею» дописываем
 * ближайший город или село, а точку и контур здания одного музея склеиваем.
 * Основной сервер Overpass бывает перегружен — пробуем зеркала по очереди (или OVERPASS_URL).
 */
import { writeFileSync } from 'node:fs'

const QUERY = `[out:json][timeout:180];
area["ISO3166-2"="RU-ORL"]->.a;
(nwr["historic"="memorial"](area.a);nwr["historic"="monument"](area.a);nwr["tourism"="museum"](area.a);
node["place"~"^(city|town|village|hamlet)$"](area.a););
out center tags;`

const SERVERS = [
  process.env.OVERPASS_URL,
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
].filter((u): u is string => Boolean(u))

const WAR_WORDS =
  /войн|воин|погибш|павш|велик|отечеств|побед|освобо|танк|солдат|герой|братск|десант|партизан|нормандия|моряк|катюш|орудие|самол[её]т|194[1-5]|гуртьев|жуков|горбатов|лётчик|летчик|фронт|красноармеец|ополчен|неизвестн|вечный огонь|блиндаж|жертвам фашизма/i
/** Не о Великой Отечественной, хотя слова похожи. */
const NOT_WW2 = /локальных войн|афганистан|чеченск|су-9|т-80|кукша/i
const WAR_TYPES = new Set(['war_memorial', 'eternal_flame', 'tank', 'vehicle'])
/** Название музея без места: по нему не понять, в каком он городе. */
const GENERIC_MUSEUM = /^(краеведческий|историко-краеведческий|народный|школьный)?\s*музей$/i

interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags: Record<string, string>
}

type Kind = 'grave' | 'flame' | 'vehicle' | 'monument' | 'museum'

interface Place {
  id: string
  lat: number
  lon: number
  name: string
  kind: Kind
  osmUrl: string
}

function kindOf(tags: Record<string, string>, name: string): Kind {
  if (tags.tourism === 'museum') return 'museum'
  if (/братск|захоронен|могил/i.test(name)) return 'grave'
  if (tags.memorial === 'eternal_flame' || /вечный огонь/i.test(name)) return 'flame'
  if (['tank', 'vehicle'].includes(tags.memorial ?? '') || /танк|катюш|самол|поезд/i.test(name))
    return 'vehicle'
  return 'monument'
}

/** Расстояние в км (равнопромежуточная проекция — на десятках километров точности хватает). */
function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const x = (b.lon - a.lon) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))
  return Math.hypot(x, b.lat - a.lat) * 111.2
}

async function overpass() {
  for (const url of SERVERS) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'tropa-pamyati-hackathon/1.0',
      },
      body: new URLSearchParams({ data: QUERY }),
    }).catch(() => undefined)
    if (res?.ok && res.headers.get('content-type')?.includes('json')) {
      return (await res.json()) as {
        elements: OsmElement[]
        osm3s: { timestamp_osm_base: string }
      }
    }
    console.warn(`Overpass ${url} не ответил (${res?.status ?? 'нет связи'}), пробуем следующий`)
  }
  throw new Error('Ни один сервер Overpass не ответил')
}

const { elements, osm3s } = await overpass()

const settlements = elements.flatMap((e) =>
  e.tags.place && e.tags.name && e.lat !== undefined && e.lon !== undefined
    ? [{ name: e.tags.name, lat: e.lat, lon: e.lon, small: e.tags.place === 'hamlet' }]
    : [],
)
/** Ближайший населённый пункт: город или село в пределах 3 км, иначе просто ближайший. */
function nearestSettlement(p: { lat: number; lon: number }) {
  const byDist = settlements.map((x) => ({ ...x, d: km(p, x) })).sort((a, b) => a.d - b.d)
  return (byDist.find((x) => !x.small && x.d < 3) ?? byDist[0])?.name
}

const all = elements.flatMap((e): Place[] => {
  if (e.tags.place) return []
  const name = e.tags.name?.trim()
  const lat = e.lat ?? e.center?.lat
  const lon = e.lon ?? e.center?.lon
  if (!name || lat === undefined || lon === undefined) return []
  const kind = kindOf(e.tags, name)
  if (kind !== 'museum') {
    const text = [name, e.tags.inscription, e.tags.description].filter(Boolean).join(' ')
    const war = WAR_TYPES.has(e.tags.memorial ?? '') || WAR_WORDS.test(text)
    if (!war || NOT_WW2.test(text)) return []
  }
  const where =
    kind === 'museum' && GENERIC_MUSEUM.test(name) ? nearestSettlement({ lat, lon }) : ''
  const full = where ? `${name} (${where})` : name
  return [
    {
      id: `osm-${e.type}-${e.id}`,
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      name: full[0]!.toUpperCase() + full.slice(1),
      kind,
      osmUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
    },
  ]
})

// Один музей бывает в OSM дважды — точкой и контуром здания рядом, с похожим названием.
// Оставляем контур, при равенстве — более полное название. Соседние музеи с разными
// названиями (музейный квартал Орла) не склеиваем.
const words = (m: Place) =>
  new Set(
    m.name
      .toLowerCase()
      .match(/[а-яё-]{5,}/g)
      ?.filter((w) => !w.startsWith('музе')) ?? [],
  )
const same = (a: Place, b: Place) => km(a, b) < 0.15 && [...words(a)].some((w) => words(b).has(w))
const rank = (m: Place) => [m.id.startsWith('osm-node') ? 0 : 1, m.name.length, m.id] as const
const better = (a: Place, b: Place) => {
  const [x, y] = [rank(a), rank(b)]
  return x[0] !== y[0] ? x[0] > y[0] : x[1] !== y[1] ? x[1] > y[1] : x[2] > y[2]
}
const museums = all.filter((m) => m.kind === 'museum')
const memorials = all
  .filter((m) => m.kind !== 'museum' || !museums.some((b) => b !== m && same(m, b) && better(b, m)))
  .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

const out = new URL('../src/api/fixtures/memorials.osm.json', import.meta.url)
writeFileSync(out, JSON.stringify({ osmBase: osm3s.timestamp_osm_base, memorials }, null, 2) + '\n')
const count = memorials.filter((m) => m.kind === 'museum').length
console.log(`OK: ${memorials.length} мест, из них музеев ${count} → ${out.pathname}`)
