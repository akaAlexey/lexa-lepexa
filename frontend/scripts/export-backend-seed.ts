/**
 * Выгружает демо-данные фронта (данные жюри + seed.ts) в backend/app/seed_data.json.
 * Бэкенд заливает их в базу при первом запуске, поэтому сайт на настоящей базе выглядит так же, как демо.
 * Перед записью каждая запись проверяется схемой контракта.
 * Запуск: npm run seed:backend (после правок фикстур; CI проверяет, что файл актуален)
 */
import { writeFileSync } from 'node:fs'
import { z } from 'zod'
import jury from '../src/api/fixtures/jury.generated.json' with { type: 'json' }
import osm from '../src/api/fixtures/memorials.osm.json' with { type: 'json' }
import * as seed from '../src/api/fixtures/seed.ts'
import * as s from '../src/contract/schemas.ts'

const out = new URL('../../backend/app/seed_data.json', import.meta.url)

const data = {
  graves: z.array(s.Grave).parse(jury.graves),
  battles: z.array(s.Battle).parse([...jury.battles, ...seed.extraBattles]),
  teams: z.array(s.Team).parse([...jury.teams, ...seed.extraTeams]),
  routes: z.array(s.Route).parse(seed.routes),
  requests: z.array(s.VolunteerRequest).parse(seed.requests),
  fundraisers: z.array(s.Fundraiser).parse(seed.fundraisers),
  trips: z.array(s.Trip).parse(seed.trips),
  groupApplications: z.array(s.GroupApplication).parse(seed.groupApplications),
  stories: z.array(s.ArchiveStory).parse(seed.stories),
  sites: z.array(s.LastBattleSite).parse(seed.sites),
  demoSubscribers: z.array(s.LatLon).parse(seed.demoSubscribers),
  // Только чтение: бэкенд отдаёт их как есть, в базу не пишет
  memorials: z.array(s.Memorial).parse(osm.memorials),
  livePhotos: z.array(s.LivePhoto).parse(seed.livePhotos),
}

writeFileSync(out, JSON.stringify(data, null, 2) + '\n')
console.log(
  `backend/app/seed_data.json: ${Object.entries(data)
    .map(([k, v]) => `${k} ${v.length}`)
    .join(', ')}`,
)
