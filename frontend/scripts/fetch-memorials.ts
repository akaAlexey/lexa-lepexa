/**
 * Памятники Великой Отечественной в Орловской области из OpenStreetMap → src/api/fixtures/memorials.osm.json.
 * Настоящие данные с источником (OSM), не выдуманные. Запуск: npm run memorials
 *
 * Берём historic=memorial|monument в границах RU-ORL и оставляем относящиеся к войне:
 * тип war_memorial / вечный огонь / техника или слова «воин», «погибш», «братская», «1941–1945» в названии.
 */
import { writeFileSync } from 'node:fs'

const QUERY = `[out:json][timeout:120];
area["ISO3166-2"="RU-ORL"]->.a;
(nwr["historic"="memorial"](area.a);nwr["historic"="monument"](area.a););
out center tags;`

const WAR_WORDS =
  /войн|воин|погибш|павш|велик|отечеств|побед|освобо|танк|солдат|герой|братск|десант|партизан|нормандия|моряк|катюш|орудие|самол[её]т|194[1-5]|гуртьев|жуков|горбатов|лётчик|летчик|фронт|красноармеец|ополчен|неизвестн|вечный огонь|блиндаж|жертвам фашизма/i
/** Не о Великой Отечественной, хотя слова похожи. */
const NOT_WW2 = /локальных войн|афганистан|чеченск|су-9|т-80|кукша/i
const WAR_TYPES = new Set(['war_memorial', 'eternal_flame', 'tank', 'vehicle'])

interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags: Record<string, string>
}

type Kind = 'grave' | 'flame' | 'vehicle' | 'monument'

function kindOf(tags: Record<string, string>, name: string): Kind {
  if (/братск|захоронен|могил/i.test(name)) return 'grave'
  if (tags.memorial === 'eternal_flame' || /вечный огонь/i.test(name)) return 'flame'
  if (['tank', 'vehicle'].includes(tags.memorial ?? '') || /танк|катюш|самол|поезд/i.test(name))
    return 'vehicle'
  return 'monument'
}

const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'tropa-pamyati-hackathon/1.0',
  },
  body: new URLSearchParams({ data: QUERY }),
})
if (!res.ok) throw new Error(`Overpass ответил ${res.status}`)
const { elements, osm3s } = (await res.json()) as {
  elements: OsmElement[]
  osm3s: { timestamp_osm_base: string }
}

const memorials = elements
  .flatMap((e) => {
    const name = e.tags.name?.trim()
    const lat = e.lat ?? e.center?.lat
    const lon = e.lon ?? e.center?.lon
    if (!name || lat === undefined || lon === undefined) return []
    const text = [name, e.tags.inscription, e.tags.description].filter(Boolean).join(' ')
    const war = WAR_TYPES.has(e.tags.memorial ?? '') || WAR_WORDS.test(text)
    if (!war || NOT_WW2.test(text)) return []
    return [
      {
        id: `osm-${e.type}-${e.id}`,
        lat: Math.round(lat * 1e5) / 1e5,
        lon: Math.round(lon * 1e5) / 1e5,
        name: name[0]!.toUpperCase() + name.slice(1),
        kind: kindOf(e.tags, name),
        osmUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
      },
    ]
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

const out = new URL('../src/api/fixtures/memorials.osm.json', import.meta.url)
writeFileSync(out, JSON.stringify({ osmBase: osm3s.timestamp_osm_base, memorials }, null, 2) + '\n')
console.log(`OK: ${memorials.length} памятников → ${out.pathname}`)
