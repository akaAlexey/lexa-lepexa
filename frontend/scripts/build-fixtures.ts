/**
 * Конвертирует данные в формате жюри (fixtures/jury) в src/api/fixtures/jury.generated.json.
 * Metro/Vite не должны парсить CSV в рантайме, а данные — проверяться схемой до сборки.
 * Запуск: npm run fixtures
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { Battle, Grave, Team } from '../src/contract/schemas.ts'

const dir = new URL('../fixtures/jury/', import.meta.url)
const out = new URL('../src/api/fixtures/jury.generated.json', import.meta.url)

/** Минимальный парсер CSV (RFC 4180): кавычки, запятые и "" внутри поля. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') endField()
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      endRow()
    } else field += ch
  }
  if (field || row.length) endRow()
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const read = (name: string) => readFileSync(new URL(name, dir), 'utf8')

const [header, ...rows] = parseCsv(read('mock_graves.csv'))
const expected = ['ID', 'lat', 'lon', 'ФИО', '№ части']
if (header?.join() !== expected.join()) {
  throw new Error(
    `mock_graves.csv: ожидались колонки ${expected.join(', ')}, получено ${header?.join(', ')}`,
  )
}

const graves = z.array(Grave).parse(
  rows.map(([id, lat, lon, fullName, unit]) => ({
    id,
    lat: Number(lat),
    lon: Number(lon),
    fullName,
    unit,
    demo: true,
  })),
)
const withDemo = (items: unknown) =>
  (items as Record<string, unknown>[]).map((item) => ({ ...item, demo: true }))
const battles = z.array(Battle).parse(withDemo(JSON.parse(read('mock_battles.json'))))
const teams = z.array(Team).parse(withDemo(JSON.parse(read('mock_teams.json'))))

writeFileSync(out, JSON.stringify({ graves, battles, teams }, null, 2) + '\n')
console.log(
  `OK: ${graves.length} захоронений, ${battles.length} боёв, ${teams.length} отрядов → ${out.pathname}`,
)
