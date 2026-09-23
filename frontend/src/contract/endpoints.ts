/**
 * Таблица эндпоинтов REST API. По ней:
 *  - типизируется ApiClient (оба адаптера реализуют одно и то же);
 *  - live-адаптер строит запросы и проверяет ответы;
 *  - генерируется docs/openapi.json.
 * Все пути — относительно VITE_API_URL, например https://example.ru/api/v1
 */
import { z } from 'zod'
import * as s from './schemas.ts'

type Method = 'GET' | 'POST' | 'PATCH'

export interface Endpoint {
  method: Method
  path: string
  summary: string
  body?: z.ZodType
  response: z.ZodType
}

function endpoint<const E extends Endpoint>(e: E): E {
  return e
}

export const endpoints = {
  listGraves: endpoint({
    method: 'GET',
    path: '/graves',
    summary: 'Захоронения (данные жюри)',
    response: z.array(s.Grave),
  }),
  listBattles: endpoint({
    method: 'GET',
    path: '/battles',
    summary: 'Бои (данные жюри)',
    response: z.array(s.Battle),
  }),
  listTeams: endpoint({
    method: 'GET',
    path: '/teams',
    summary: 'Поисковые отряды (данные жюри)',
    response: z.array(s.Team),
  }),
  getSearchStats: endpoint({
    method: 'GET',
    path: '/stats/search',
    summary: 'Найдено бойцов за текущий месяц',
    response: s.SearchStats,
  }),
  listRoutes: endpoint({
    method: 'GET',
    path: '/routes',
    summary: 'Семейные маршруты',
    response: z.array(s.Route),
  }),
  getRoute: endpoint({
    method: 'GET',
    path: '/routes/{id}',
    summary: 'Маршрут с точками',
    response: s.Route,
  }),
  listRequests: endpoint({
    method: 'GET',
    path: '/requests',
    summary: 'Заявки на набор волонтёров, новые сверху',
    response: z.array(s.VolunteerRequest),
  }),
  createRequest: endpoint({
    method: 'POST',
    path: '/requests',
    summary: 'Создать заявку (командир)',
    body: s.NewVolunteerRequest,
    response: s.VolunteerRequest,
  }),
  joinRequest: endpoint({
    method: 'POST',
    path: '/requests/{id}/join',
    summary: '«Стать частью команды»',
    response: s.VolunteerRequest,
  }),
  listFundraisers: endpoint({
    method: 'GET',
    path: '/fundraisers',
    summary: 'Целевые сборы',
    response: z.array(s.Fundraiser),
  }),
  donate: endpoint({
    method: 'POST',
    path: '/donations',
    summary: 'Пожертвование (только тестовый режим ЮKassa/CloudPayments)',
    body: s.Donation,
    response: s.DonationResult,
  }),
  listTrips: endpoint({
    method: 'GET',
    path: '/trips',
    summary: 'Выезды «Выходные с поисковиком» по дате',
    response: z.array(s.Trip),
  }),
  getTrip: endpoint({
    method: 'GET',
    path: '/trips/{id}',
    summary: 'Выезд',
    response: s.Trip,
  }),
  registerTrip: endpoint({
    method: 'POST',
    path: '/trips/{id}/register',
    summary: 'Записаться на выезд',
    response: s.Trip,
  }),
  listSites: endpoint({
    method: 'GET',
    path: '/sites',
    summary: 'Места гибели «Последний бой»',
    response: z.array(s.LastBattleSite),
  }),
  getSite: endpoint({
    method: 'GET',
    path: '/sites/{id}',
    summary: 'Место гибели',
    response: s.LastBattleSite,
  }),
  createSite: endpoint({
    method: 'POST',
    path: '/sites',
    summary: 'Добавить место гибели; сервер рассылает уведомления подписчикам в радиусе 20 км',
    body: s.NewLastBattleSite,
    response: s.CreateSiteResult,
  }),
  changeSiteStatus: endpoint({
    method: 'PATCH',
    path: '/sites/{id}/status',
    summary: 'Сменить статус (только вперёд)',
    body: s.SiteStatusChange,
    response: s.LastBattleSite,
  }),
  volunteerForSite: endpoint({
    method: 'POST',
    path: '/sites/{id}/volunteer',
    summary: '«Я готов помочь в подъёме»',
    response: s.LastBattleSite,
  }),
  subscribe: endpoint({
    method: 'POST',
    path: '/subscriptions',
    summary: 'Подписка на поисковую деятельность в радиусе',
    body: s.Subscription,
    response: s.SubscriptionResult,
  }),
}

export type Endpoints = typeof endpoints
export type EndpointName = keyof Endpoints

/** Поток уведомлений: text/event-stream, каждое событие — AppNotification в data. */
export const notificationStream = { path: '/notifications/stream', event: s.AppNotification }
