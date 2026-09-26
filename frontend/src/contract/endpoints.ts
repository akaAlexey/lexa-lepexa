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
  listMemorials: endpoint({
    method: 'GET',
    path: '/memorials',
    summary: 'Памятники войны и музеи региона (OpenStreetMap, npm run memorials)',
    response: z.array(s.Memorial),
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
    summary: 'Записаться в заявку отряда (после окна с условиями; до 18+ — с согласием родителя)',
    body: s.SignupRequest,
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
  startPayment: endpoint({
    method: 'POST',
    path: '/payments/yookassa',
    summary: 'Создать платёж ЮKassa (тестовый магазин) и получить ссылку на оплату',
    body: s.PaymentStart,
    response: s.PaymentStarted,
  }),
  paymentStatus: endpoint({
    method: 'GET',
    path: '/payments/yookassa/{id}',
    summary: 'Статус платежа ЮKassa; при succeeded сумма добавляется к сбору',
    response: s.PaymentState,
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
    summary: 'Записаться на выезд (после окна с условиями; до 18+ — с согласием родителя)',
    body: s.SignupRequest,
    response: s.Trip,
  }),
  listGroupApplications: endpoint({
    method: 'GET',
    path: '/group-applications',
    summary: 'Коллективные заявки на выезды (командиру — заявки на выезды его отряда)',
    response: z.array(s.GroupApplication),
  }),
  createGroupApplication: endpoint({
    method: 'POST',
    path: '/group-applications',
    summary: 'Подать коллективную заявку на выезд (школа, клуб, семейная группа)',
    body: s.NewGroupApplication,
    response: s.GroupApplication,
  }),
  decideGroupApplication: endpoint({
    method: 'PATCH',
    path: '/group-applications/{id}',
    summary: 'Решение командира: подтвердить или попросить уточнить',
    body: s.GroupApplicationDecision,
    response: s.GroupApplication,
  }),
  listStories: endpoint({
    method: 'GET',
    path: '/stories',
    summary: 'Истории людей и мест. Всем — подтверждённые; автору — его; проверяющим — очередь',
    response: z.array(s.ArchiveStory),
  }),
  getStory: endpoint({
    method: 'GET',
    path: '/stories/{id}',
    summary: 'История',
    response: s.ArchiveStory,
  }),
  createStory: endpoint({
    method: 'POST',
    path: '/stories',
    summary: 'Отправить историю на проверку',
    body: s.NewArchiveStory,
    response: s.ArchiveStory,
  }),
  reviewStory: endpoint({
    method: 'POST',
    path: '/stories/{id}/review',
    summary: 'Решение краеведа или отряда по истории',
    body: s.ArchiveReview,
    response: s.ArchiveStory,
  }),
  listLivePhotos: endpoint({
    method: 'GET',
    path: '/live-photos',
    summary: '«Живые фото» — снимки с QR-кодом и ролики-реконструкции',
    response: z.array(s.LivePhoto),
  }),
  getLivePhoto: endpoint({
    method: 'GET',
    path: '/live-photos/{id}',
    summary: '«Живое фото» по QR-коду',
    response: s.LivePhoto,
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

  // Личное состояние: только для вошедшего пользователя (cookie сессии), иначе 401
  getMyState: endpoint({
    method: 'GET',
    path: '/me/state',
    summary: 'Личное состояние вошедшего пользователя (профиль, записи, «мои» истории, прогресс)',
    response: s.MyState,
  }),
  putMyState: endpoint({
    method: 'PATCH',
    path: '/me/state',
    summary: 'Записать одно значение личного состояния (null — удалить)',
    body: s.MyStateChange,
    response: s.Ack,
  }),

  // Семейный архив (A7): только для вошедшего пользователя (cookie сессии), иначе 401.
  // Чужой боец — 404. Удаление — POST …/delete: в контракте нет DELETE.
  listFamilyFighters: endpoint({
    method: 'GET',
    path: '/family/fighters',
    summary: 'Бойцы семьи вошедшего пользователя',
    response: z.array(s.FamilyFighter),
  }),
  createFamilyFighter: endpoint({
    method: 'POST',
    path: '/family/fighters',
    summary: 'Добавить бойца в семейный архив',
    body: s.FamilyFighterInput,
    response: s.FamilyFighter,
  }),
  updateFamilyFighter: endpoint({
    method: 'PATCH',
    path: '/family/fighters/{id}',
    summary: 'Исправить сведения о бойце (записи не меняются)',
    body: s.FamilyFighterInput,
    response: s.FamilyFighter,
  }),
  deleteFamilyFighter: endpoint({
    method: 'POST',
    path: '/family/fighters/{id}/delete',
    summary: 'Удалить бойца вместе с найденными записями',
    response: s.Ack,
  }),
  addFamilyRecord: endpoint({
    method: 'POST',
    path: '/family/fighters/{id}/records',
    summary: 'Добавить найденную запись: только ссылки на официальные базы, без повторов',
    body: s.FoundRecordInput,
    response: s.FamilyFighter,
  }),
  deleteFamilyRecord: endpoint({
    method: 'POST',
    path: '/family/fighters/{id}/records/{recordId}/delete',
    summary: 'Удалить найденную запись',
    response: s.FamilyFighter,
  }),
}

export type Endpoints = typeof endpoints
export type EndpointName = keyof Endpoints

/** Поток уведомлений: text/event-stream, каждое событие — AppNotification в data. */
export const notificationStream = { path: '/notifications/stream', event: s.AppNotification }
