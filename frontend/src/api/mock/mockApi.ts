import { endpoints } from '../../contract/endpoints.ts'
import type { AppNotification, LatLon, Subscription } from '../../contract/schemas.ts'
import { distanceKm, isWithinRadius } from '../../domain/geo.ts'
import {
  NOTIFY_RADIUS_KM,
  canTransition,
  siteFoundNotificationText,
} from '../../domain/lastBattle.ts'
import { ApiError, type ApiClient } from '../client.ts'
import jury from '../fixtures/jury.generated.json'
import * as seed from '../fixtures/seed.ts'

export interface MockOptions {
  /** Искусственная задержка ответа, мс. */
  latencyMs?: number
  /** Доля запросов, которые падают с ошибкой 503 (0…1) — проверка состояний ошибок. */
  failRate?: number
  now?: () => Date
  random?: () => number
  /** Канал между вкладками для показа «командир → волонтёр» без бэкенда. */
  channelName?: string | null
}

type StoredSubscription = Required<Pick<Subscription, 'radiusKm'>> & LatLon

function createDb() {
  return structuredClone({
    graves: jury.graves,
    battles: jury.battles,
    teams: jury.teams,
    routes: seed.routes,
    requests: seed.requests,
    fundraisers: seed.fundraisers,
    trips: seed.trips,
    sites: seed.sites,
    subscriptions: [] as StoredSubscription[],
  })
}

/** Адаптер на фикстурах: in-memory «сервер» с задержками и ошибками. */
export function createMockApi(options: MockOptions = {}): ApiClient & { reset(): void } {
  const {
    latencyMs = 300,
    failRate = 0,
    now = () => new Date(),
    random = Math.random,
    channelName = 'tropa-pamyati-demo',
  } = options
  let db = createDb()
  let seq = 0
  const nextId = (prefix: string) => `${prefix}-${now().getTime().toString(36)}-${++seq}`

  const listeners = new Set<(n: AppNotification) => void>()
  const channel =
    channelName && typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(channelName)
      : null
  channel?.addEventListener('message', (e: MessageEvent<AppNotification>) =>
    listeners.forEach((l) => l(e.data)),
  )

  async function respond<T>(produce: () => T): Promise<T> {
    if (latencyMs > 0) await new Promise((r) => setTimeout(r, latencyMs))
    if (random() < failRate) throw new ApiError('Демо-сбой сервера (mock)', 503)
    return structuredClone(produce())
  }

  function find<T extends { id: string }>(items: T[], id: string, what: string): T {
    const item = items.find((i) => i.id === id)
    if (!item) throw new ApiError(`${what} ${id} не найден`, 404)
    return item
  }

  return {
    reset() {
      db = createDb()
    },
    listGraves: () => respond(() => db.graves),
    listBattles: () => respond(() => db.battles),
    listTeams: () => respond(() => db.teams),
    getSearchStats: () =>
      respond(() => ({
        month: now().toISOString().slice(0, 7),
        foundThisMonth: db.teams.reduce((sum, t) => sum + t.foundThisMonth, 0),
      })),
    listRoutes: () => respond(() => db.routes),
    getRoute: ({ id }) => respond(() => find(db.routes, id, 'Маршрут')),
    listRequests: () =>
      respond(() => [...db.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    createRequest: ({ body }) =>
      respond(() => {
        const input = endpoints.createRequest.body.parse(body)
        find(db.teams, input.teamId, 'Отряд')
        const created = {
          ...input,
          id: nextId('R'),
          joined: 0,
          createdAt: now().toISOString(),
          demo: true,
        }
        db.requests.push(created)
        return created
      }),
    joinRequest: ({ id }) =>
      respond(() => {
        const r = find(db.requests, id, 'Заявка')
        r.joined += 1
        return r
      }),
    listFundraisers: () => respond(() => db.fundraisers),
    donate: ({ body }) =>
      respond(() => {
        const input = endpoints.donate.body.parse(body)
        const f = find(db.fundraisers, input.fundraiserId, 'Сбор')
        f.collectedRub += input.amountRub
        return { paymentId: nextId('test-pay'), status: 'test_succeeded' as const, fundraiser: f }
      }),
    listTrips: () => respond(() => [...db.trips].sort((a, b) => a.date.localeCompare(b.date))),
    getTrip: ({ id }) => respond(() => find(db.trips, id, 'Выезд')),
    registerTrip: ({ id }) =>
      respond(() => {
        const t = find(db.trips, id, 'Выезд')
        if (t.spotsTaken >= t.spotsTotal) throw new ApiError('Мест нет', 409)
        t.spotsTaken += 1
        return t
      }),
    listSites: () => respond(() => db.sites),
    getSite: ({ id }) => respond(() => find(db.sites, id, 'Место')),
    createSite: ({ body }) =>
      respond(() => {
        const input = endpoints.createSite.body.parse(body)
        const site = {
          ...input,
          id: nextId('S'),
          status: 'found_needs_check' as const,
          volunteersReady: 0,
          createdAt: now().toISOString(),
          demo: true,
        }
        db.sites.push(site)

        const demoNotified = seed.demoSubscribers.filter((p) =>
          isWithinRadius(p, site, NOTIFY_RADIUS_KM),
        ).length
        const mine = db.subscriptions.filter((s) => isWithinRadius(s, site, s.radiusKm))
        for (const sub of mine) {
          const km = distanceKm(sub, site)
          const notification: AppNotification = {
            id: nextId('N'),
            kind: 'site_found',
            siteId: site.id,
            distanceKm: km,
            ...siteFoundNotificationText(km),
            createdAt: now().toISOString(),
          }
          listeners.forEach((l) => l(notification))
          channel?.postMessage(notification)
        }
        return { site, notifiedCount: demoNotified + mine.length }
      }),
    changeSiteStatus: ({ id, body }) =>
      respond(() => {
        const input = endpoints.changeSiteStatus.body.parse(body)
        const site = find(db.sites, id, 'Место')
        if (!canTransition(site.status, input.status)) {
          throw new ApiError(`Переход ${site.status} → ${input.status} запрещён`, 409)
        }
        site.status = input.status
        site.sources.push(input.source)
        return site
      }),
    volunteerForSite: ({ id }) =>
      respond(() => {
        const site = find(db.sites, id, 'Место')
        site.volunteersReady += 1
        return site
      }),
    subscribe: ({ body }) =>
      respond(() => {
        const input = endpoints.subscribe.body.parse(body)
        db.subscriptions.push({ lat: input.lat, lon: input.lon, radiusKm: input.radiusKm })
        return { id: nextId('SUB') }
      }),
    onNotification(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
