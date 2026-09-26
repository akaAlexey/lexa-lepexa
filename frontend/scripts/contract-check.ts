/**
 * Сверка живого сервера с контрактом фронта: вызывает все эндпоинты из src/contract/endpoints.ts
 * и проверяет каждый ответ той же zod-схемой, что и live-адаптер. Плюс поток уведомлений (SSE):
 * подписка → новое место от другого пользователя → событие в потоке.
 *
 *   npm run contract:check -- http://127.0.0.1:8000/api/v1
 *
 * Меняет данные на сервере (создаёт заявки, места, истории) — запускайте на тестовой базе.
 * Для боевой базы — только чтение (вызываются одни GET, поток уведомлений лишь открывается):
 *
 *   npm run contract:check -- https://api.marshrutypobedy.ru/api/v1 --read-only
 *
 * Код выхода 1, если хоть одна проверка не прошла.
 */
import { endpoints, notificationStream, type EndpointName } from '../src/contract/endpoints.ts'

const cliArgs = process.argv.slice(2)
const READ_ONLY = cliArgs.includes('--read-only')
const BASE = (
  cliArgs.find((a) => !a.startsWith('--')) ??
  process.env.API_URL ??
  'http://127.0.0.1:8000/api/v1'
).replace(/\/$/, '')
const run = Date.now().toString(36)

type Row = { ok: boolean; line: string }
const rows: Row[] = []
const pass = (line: string) => rows.push({ ok: true, line: `OK      ${line}` })
const failRow = (line: string) => rows.push({ ok: false, line: `FAIL    ${line}` })

async function call(
  name: EndpointName,
  args: { id?: string; recordId?: string; body?: unknown } = {},
  user = `cc-${run}`,
  /** Cookie сессии — для разделов, которые требуют входа (семейный архив). */
  cookie?: string,
) {
  const e = endpoints[name]
  const path = e.path
    .replace('{id}', encodeURIComponent(args.id ?? ''))
    .replace('{recordId}', encodeURIComponent(args.recordId ?? ''))
  if (READ_ONLY && e.method !== 'GET') {
    return undefined
  }
  const res = await fetch(BASE + path, {
    method: e.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Demo-User': user,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: args.body === undefined ? undefined : JSON.stringify(args.body),
  })
  const label = `${e.method.padEnd(5)} ${e.path}`
  if (!res.ok) {
    failRow(`${label} → HTTP ${res.status} ${(await res.text()).slice(0, 160)}`)
    return undefined
  }
  const parsed = e.response.safeParse(await res.json())
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    failRow(`${label} → не по контракту: ${issues}`)
    return undefined
  }
  pass(label)
  return parsed.data as Record<string, unknown> & { id: string }
}

/**
 * Вызов сервиса, который включается ключами на сервере (ЮKassa). Без ключей сервер честно
 * отвечает 503 «не настроено» — это ожидаемо (в CI ключей нет), вызов считается проверенным.
 * С ключами ответ сверяется с контрактом, как обычно.
 */
async function callOptional(name: EndpointName, args: { id?: string; body?: unknown }) {
  const e = endpoints[name]
  if (READ_ONLY && e.method !== 'GET') return undefined
  const path = e.path.replace('{id}', encodeURIComponent(args.id ?? ''))
  const probe = await fetch(BASE + path, {
    method: e.method,
    headers: { 'Content-Type': 'application/json', 'X-Demo-User': `cc-${run}` },
    body: args.body === undefined ? undefined : JSON.stringify(args.body),
  })
  if (probe.status === 503) {
    pass(
      `${e.method.padEnd(5)} ${e.path} (не настроено на сервере — 503, как и ожидается без ключей)`,
    )
    return undefined
  }
  return call(name, args)
}

/** Запись после окна с условиями: 18+ подтверждён — согласие родителя не нужно. */
const SIGNUP = { termsAccepted: true, adultVerified: true, age: 30 } as const

async function first(name: EndpointName) {
  const list = (await call(name)) as unknown as { id: string }[] | undefined
  return list?.[0]
}

/** Ждёт первое событие в потоке уведомлений пользователя, не дольше timeoutMs. */
async function nextEvent(user: string, timeoutMs: number, trigger: () => Promise<void>) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${notificationStream.path}?user=${encodeURIComponent(user)}`, {
      signal: ctrl.signal,
      headers: { Accept: 'text/event-stream' },
    })
    if (!res.ok || !res.body) return { error: `HTTP ${res.status}` }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    let triggered = false
    for (;;) {
      if (!triggered) {
        triggered = true
        void trigger()
      }
      const { value, done } = await reader.read()
      if (done) return { error: 'поток закрылся' }
      buffer += value
      // События разделяются пустой строкой — ровно так их режет EventSource в браузере.
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const block of events) {
        const data = block
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n')
        if (data) return { data }
      }
    }
  } catch (e) {
    return { error: ctrl.signal.aborted ? `нет события за ${timeoutMs / 1000} с` : String(e) }
  } finally {
    clearTimeout(timer)
    ctrl.abort()
  }
}

// ---------- Данные жюри и списки ----------
await call('listGraves')
await call('listBattles')
await call('listMemorials')
const livePhoto = await first('listLivePhotos')
if (livePhoto) await call('getLivePhoto', { id: livePhoto.id })
const teams = (await call('listTeams')) as unknown as { id: string }[] | undefined
await call('getSearchStats')
const route = await first('listRoutes')
if (route) await call('getRoute', { id: route.id })

// ---------- Поисковый штаб ----------
const teamId = teams?.[0]?.id ?? 'T01'
const request = await call('createRequest', {
  body: {
    teamId,
    title: `Проверка контракта ${run}`,
    date: '2026-10-10',
    place: 'Орловская обл.',
    roles: [{ role: 'digger', count: 2 }],
  },
})
await call('listRequests')
if (request) await call('joinRequest', { id: request.id, body: SIGNUP })
const fundraiser = await first('listFundraisers')
if (fundraiser) {
  await call('donate', { body: { fundraiserId: fundraiser.id, amountRub: 100 } })
  const started = (await callOptional('startPayment', {
    body: { fundraiserId: fundraiser.id, amountRub: 100 },
  })) as { paymentId?: string } | undefined
  // без ключей платежа нет — статус проверяем на правильном по форме id, сервер ответит 503
  await callOptional('paymentStatus', {
    id: started?.paymentId ?? '00000000-0000-0000-0000-000000000000',
  })
}

// ---------- Выезды ----------
const trips = (await call('listTrips')) as unknown as
  { id: string; spotsTaken: number; spotsTotal: number }[] | undefined
const trip = trips?.[0]
if (trip) {
  await call('getTrip', { id: trip.id })
  const free = trips?.find((t) => t.spotsTaken < t.spotsTotal)
  if (free) await call('registerTrip', { id: free.id, body: SIGNUP })
  const application = await call('createGroupApplication', {
    body: {
      tripId: trip.id,
      organization: 'Школа (проверка контракта)',
      contactName: 'Ответственный',
      contact: '+7 900 000-00-00',
      peopleCount: 10,
      comment: '',
    },
  })
  await call('listGroupApplications')
  if (application)
    await call('decideGroupApplication', { id: application.id, body: { status: 'clarify' } })
}

// ---------- Народный архив ----------
const story = await call('createStory', {
  body: {
    title: `Проверка ${run}`,
    place: 'Орёл',
    story: 'Текст истории для проверки контракта: не короче тридцати символов.',
    sourceText: 'Семейный архив',
    author: 'Проверка',
  },
})
await call('listStories')
if (story) {
  await call('getStory', { id: story.id })
  await call('reviewStory', {
    id: story.id,
    body: { decision: 'verified', reviewer: 'Краевед', note: '' },
  })
}

// ---------- Последний бой и уведомления ----------
const point = { lat: 52.9651, lon: 36.0785 }
if (READ_ONLY) {
  // Только открываем поток: 200 и text/event-stream, ничего не создаём.
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const res = await fetch(`${BASE}${notificationStream.path}?user=cc-readonly`, {
      signal: ctrl.signal,
      headers: { Accept: 'text/event-stream' },
    })
    const type = res.headers.get('content-type') ?? ''
    if (res.ok && type.includes('text/event-stream'))
      pass(`SSE   ${notificationStream.path} (открыт)`)
    else failRow(`SSE   ${notificationStream.path} → HTTP ${res.status} ${type}`)
  } catch (e) {
    failRow(`SSE   ${notificationStream.path} → ${String(e)}`)
  } finally {
    clearTimeout(timer)
    ctrl.abort()
  }
  const site = await first('listSites')
  if (site) await call('getSite', { id: site.id })
  const readStory = await first('listStories')
  if (readStory) await call('getStory', { id: readStory.id })
} else {
  const subscriber = `cc-sub-${run}`
  await call('subscribe', { body: { ...point, radiusKm: 20, topics: ['search'] } }, subscriber)
  const newSite = {
    ...point,
    placeName: `Проверка контракта ${run}`,
    fightersCount: 1,
    fighters: [{}],
    unit: 'Неизвестно',
    dateText: 'октябрь 1941',
    circumstances: '',
    sources: [{ kind: 'archive' as const, title: 'Отчёт отряда' }],
    teamId,
  }
  let createdSiteId: string | undefined
  const event = await nextEvent(subscriber, 15_000, async () => {
    const created = (await call('createSite', { body: newSite }, `cc-cmd-${run}`)) as
      { site: { id: string } } | undefined
    createdSiteId = created?.site.id
  })
  if ('data' in event && event.data) {
    const parsed = notificationStream.event.safeParse(JSON.parse(event.data))
    if (parsed.success && parsed.data.siteId === createdSiteId)
      pass(`SSE   ${notificationStream.path}`)
    else
      failRow(
        `SSE   ${notificationStream.path} → событие не по контракту: ${event.data.slice(0, 160)}`,
      )
  } else {
    failRow(`SSE   ${notificationStream.path} → ${event.error}`)
  }
  await call('listSites')
  if (createdSiteId) {
    await call('getSite', { id: createdSiteId })
    await call('changeSiteStatus', {
      id: createdSiteId,
      body: {
        status: 'archive_confirmed',
        source: { kind: 'obd_memorial', title: 'ОБД «Мемориал»' },
      },
    })
    await call('volunteerForSite', { id: createdSiteId })
  }
}

// ---------- Личное (семейный архив, состояние аккаунта): только после входа ----------
if (READ_ONLY) {
  // На боевой базе не регистрируемся: проверяем, что без входа архив закрыт
  for (const path of ['/family/fighters', '/me/state']) {
    const res = await fetch(`${BASE}${path}`)
    if (res.status === 401) pass(`GET   ${path} (без входа — 401, как и ожидается)`)
    else failRow(`GET   ${path} → без входа HTTP ${res.status}, ожидался 401`)
  }
} else {
  const registered = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: `cc-${run}@example.com`,
      password: `cc-${run}-password`,
      name: 'Проверка контракта',
      terms: true,
      privacy: true,
    }),
  })
  // Cookie сессии: только «имя=значение», без атрибутов
  const cookie = registered.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  if (!registered.ok || !cookie) failRow(`POST  /auth/register → HTTP ${registered.status}`)
  else {
    const who = `cc-family-${run}`
    await call(
      'putMyState',
      { body: { key: 'search.joinedRequests', value: ['R01'] } },
      who,
      cookie,
    )
    await call('getMyState', {}, who, cookie)
    const fighter = (await call(
      'createFamilyFighter',
      {
        body: {
          lastName: 'Проверкин',
          firstName: 'Пётр',
          middleName: '',
          birthYear: 1912,
          relation: 'прадед',
          note: '',
        },
      },
      who,
      cookie,
    )) as { id: string } | undefined
    await call('listFamilyFighters', {}, who, cookie)
    if (fighter) {
      await call(
        'updateFamilyFighter',
        {
          id: fighter.id,
          body: {
            lastName: 'Проверкин',
            firstName: 'Павел',
            middleName: '',
            relation: '',
            note: '',
          },
        },
        who,
        cookie,
      )
      const withRecord = (await call(
        'addFamilyRecord',
        { id: fighter.id, body: { url: `https://pamyat-naroda.ru/heroes/cc-${run}/`, title: '' } },
        who,
        cookie,
      )) as { records?: { id: string }[] } | undefined
      const recordId = withRecord?.records?.[0]?.id
      if (recordId) await call('deleteFamilyRecord', { id: fighter.id, recordId }, who, cookie)
      await call('deleteFamilyFighter', { id: fighter.id }, who, cookie)
    }
  }
}

// ---------- Итог ----------
const tested = new Set(rows.map((r) => r.line.split(/\s+/).slice(1, 3).join(' ')))
const missing = (Object.keys(endpoints) as EndpointName[])
  .filter((n) => !(READ_ONLY && endpoints[n].method !== 'GET'))
  .map((n) => `${endpoints[n].method} ${endpoints[n].path}`)
  .filter((k) => !tested.has(k))
for (const k of missing) failRow(`${k} → не проверен (нет данных для вызова)`)

console.log(`Сверка ${BASE} с контрактом фронта${READ_ONLY ? ' (только чтение)' : ''}\n`)
console.log(rows.map((r) => r.line).join('\n'))
const failed = rows.filter((r) => !r.ok).length
console.log(`\n${rows.length - failed} из ${rows.length} проверок прошли`)
if (READ_ONLY) console.log('Изменяющие вызовы (POST/PATCH) пропущены: --read-only')
process.exit(failed ? 1 : 0)
