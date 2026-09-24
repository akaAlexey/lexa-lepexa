/**
 * Контракт данных фронтенда и бэкенда — единственный источник правды.
 * Из этих схем генерируется docs/openapi.json (npm run contract).
 * Импорты внутри src/contract — с расширением .ts: файлы читает и Node-скрипт.
 */
import { z } from 'zod'

export const registry = z.registry<{ id: string }>()
/** Описания сущностей для документации OpenAPI. */
export const descriptions: Record<string, string> = {}

function entity<T extends z.ZodType>(id: string, description: string, schema: T): T {
  registry.add(schema, { id })
  descriptions[id] = description
  return schema
}

const id = z.string().min(1)
const isoDate = z.iso.date().describe('Дата YYYY-MM-DD')
// Сервер отдаёт «…Z»; смещение «+00:00» тоже принимаем — так форматируют даты многие бэкенды.
const isoDateTime = z.iso.datetime({ offset: true }).describe('Дата и время ISO 8601, UTC')
const rub = z.number().int().nonnegative().describe('Сумма в рублях')
const lat = z.number().min(-90).max(90)
const lon = z.number().min(-180).max(180)

export const LatLon = entity('LatLon', 'Координаты WGS84', z.object({ lat, lon }))

export const SourceKind = entity(
  'SourceKind',
  'Тип источника факта',
  z.enum([
    'book_of_memory',
    'obd_memorial',
    'pamyat_naroda',
    'osm',
    'archive',
    'literature',
    'eyewitness',
    'demo',
  ]),
)

export const Source = entity(
  'Source',
  'Источник факта. У каждого факта в интерфейсе есть хотя бы один источник',
  z.object({
    kind: SourceKind,
    title: z.string().min(1),
    url: z.url().optional(),
  }),
)

const withSources = z.array(Source).min(1)
const demo = z.boolean().describe('true — демо-данные, вымышлены или не проверены')

/* ---------- Данные жюри ---------- */

export const Grave = entity(
  'Grave',
  'Захоронение (mock_graves.csv: ID, lat, lon, ФИО, № части)',
  z.object({ id, lat, lon, fullName: z.string().min(1), unit: z.string().min(1), demo }),
)

export const Battle = entity(
  'Battle',
  'Бой (mock_battles.json: дата боя, текст подвига, ссылка на архив)',
  z.object({
    id,
    date: isoDate,
    text: z.string().min(1),
    archiveUrl: z.url(),
    place: z.object({ name: z.string(), lat, lon }).optional(),
    demo,
  }),
)

export const Team = entity(
  'Team',
  'Поисковый отряд (mock_teams.json) с дефицитом бюджета',
  z.object({
    id,
    name: z.string().min(1),
    region: z.string(),
    budgetGoalRub: rub,
    budgetCollectedRub: rub,
    foundThisMonth: z.number().int().nonnegative(),
    demo,
  }),
)

/* ---------- Тропа ---------- */

export const PointKind = entity(
  'PointKind',
  'Тип точки маршрута: battle — Звезда (бой), trench — Шлем (окоп), hq — Книга (штаб)',
  z.enum(['battle', 'trench', 'hq']),
)

export const ChildTask = entity(
  'ChildTask',
  'Задание для ребёнка на точке маршрута',
  z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    answerIndex: z.number().int().nonnegative(),
    illustration: z.string().optional().describe('Путь к иллюстрации в ассетах фронта'),
    explanation: z.string().min(1).describe('Что сказать после ответа'),
  }),
)

export const RoutePoint = entity(
  'RoutePoint',
  'Интерактивная точка маршрута',
  z.object({
    id,
    kind: PointKind,
    title: z.string().min(1),
    lat,
    lon,
    story: z.string().min(1),
    task: ChildTask,
    sources: withSources,
  }),
)

export const Route = entity(
  'Route',
  'Семейный квест-маршрут. Точки упорядочены, path — линия маршрута',
  z.object({
    id,
    title: z.string().min(1),
    summary: z.string(),
    lengthM: z.number().int().positive(),
    durationMin: z.number().int().positive(),
    path: z.array(LatLon).min(2),
    points: z.array(RoutePoint).min(1),
    demo,
  }),
)

/* ---------- Поисковый штаб ---------- */

export const VolunteerRole = entity(
  'VolunteerRole',
  'Кого ищет отряд',
  z.enum(['digger', 'prober', 'cook', 'driver', 'medic', 'any']),
)

export const VolunteerRequest = entity(
  'VolunteerRequest',
  'Заявка отряда на набор волонтёров',
  z.object({
    id,
    teamId: id,
    title: z.string().min(1),
    date: isoDate,
    place: z.string().min(1),
    roles: z.array(z.object({ role: VolunteerRole, count: z.number().int().positive() })).min(1),
    joined: z.number().int().nonnegative(),
    fundraiserId: id.optional(),
    createdAt: isoDateTime,
    demo,
  }),
)

export const NewVolunteerRequest = entity(
  'NewVolunteerRequest',
  'Создание заявки командиром',
  VolunteerRequest.pick({ teamId: true, title: true, date: true, place: true, roles: true }),
)

export const FundraiserPurpose = entity(
  'FundraiserPurpose',
  'fuel — «Пожертвовать на бензин», raise_fighter — «Поднять бойца», equip — «Экипировать отряд»',
  z.enum(['fuel', 'raise_fighter', 'equip']),
)

export const Fundraiser = entity(
  'Fundraiser',
  'Целевой сбор отряда',
  z.object({
    id,
    teamId: id,
    purpose: FundraiserPurpose,
    title: z.string().min(1),
    goalRub: rub,
    collectedRub: rub,
    demo,
  }),
)

export const Donation = entity(
  'Donation',
  'Пожертвование. Только тестовый режим платёжного провайдера',
  z.object({ fundraiserId: id, amountRub: rub.min(1) }),
)

export const DonationResult = entity(
  'DonationResult',
  'Результат тестового платежа',
  z.object({ paymentId: id, status: z.literal('test_succeeded'), fundraiser: Fundraiser }),
)

export const SearchStats = entity(
  'SearchStats',
  'Счётчик «Найдено бойцов за месяц»',
  z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), foundThisMonth: z.number().int() }),
)

export const ChecklistItem = entity(
  'ChecklistItem',
  'Пункт чек-листа новичка',
  z.object({ id, label: z.string().min(1), url: z.url().optional() }),
)

export const Trip = entity(
  'Trip',
  'Выезд «Выходные с поисковиком»',
  z.object({
    id,
    teamId: id,
    date: isoDate,
    title: z.string().min(1),
    place: z.string().min(1),
    lat,
    lon,
    spotsTotal: z.number().int().positive(),
    spotsTaken: z.number().int().nonnegative(),
    checklist: z.array(ChecklistItem).min(1),
    demo,
  }),
)

export const GroupApplicationStatus = entity(
  'GroupApplicationStatus',
  'pending — «На рассмотрении», confirmed — «Подтверждена», clarify — «Нужно уточнение»',
  z.enum(['pending', 'confirmed', 'clarify']),
)

export const GroupApplication = entity(
  'GroupApplication',
  'Коллективная заявка на выезд: школа, клуб или семейная группа. Контакт видит только командир отряда',
  z.object({
    id,
    tripId: id,
    organization: z.string().min(1).describe('Школа, клуб или название группы'),
    contactName: z.string().min(2),
    contact: z.string().min(3).describe('Телефон или электронная почта ответственного'),
    peopleCount: z.number().int().min(2).max(100),
    comment: z.string(),
    status: GroupApplicationStatus,
    createdAt: isoDateTime,
    demo,
  }),
)

export const NewGroupApplication = entity(
  'NewGroupApplication',
  'Подать коллективную заявку. Статус на сервере всегда pending',
  GroupApplication.pick({
    tripId: true,
    organization: true,
    contactName: true,
    contact: true,
    peopleCount: true,
    comment: true,
  }),
)

export const GroupApplicationDecision = entity(
  'GroupApplicationDecision',
  'Решение командира по коллективной заявке',
  z.object({ status: z.enum(['confirmed', 'clarify']) }),
)

/* ---------- Истории людей (народный архив) ---------- */

export const ArchiveStatus = entity(
  'ArchiveStatus',
  'pending — «Ожидает проверки», clarify — «Нужно уточнение», verified — «Подтверждено», rejected — «Отклонено»',
  z.enum(['pending', 'clarify', 'verified', 'rejected']),
)

export const ArchiveStory = entity(
  'ArchiveStory',
  'История человека или места от пользователя. Всем видна только после проверки краеведом или отрядом',
  z.object({
    id,
    title: z.string().min(4),
    place: z.string().min(2),
    story: z.string().min(30),
    sourceText: z.string().describe('Источник словами автора: семейный архив, документ, книга'),
    author: z.string().min(2).describe('Подпись автора; контакты автора не публикуются'),
    status: ArchiveStatus,
    verifiedBy: z.string().optional(),
    reviewNote: z.string().optional().describe('Комментарий проверяющего автору'),
    createdAt: isoDateTime,
    demo,
  }),
)

export const NewArchiveStory = entity(
  'NewArchiveStory',
  'Отправить историю на проверку',
  ArchiveStory.pick({ title: true, place: true, story: true, sourceText: true, author: true }),
)

export const ArchiveReview = entity(
  'ArchiveReview',
  'Решение проверяющего. Подтвердить — только с источником; «уточнить» — только с комментарием',
  z.object({
    decision: z.enum(['verified', 'clarify']),
    reviewer: z.string().min(1),
    note: z.string(),
  }),
)

/* ---------- Последний бой ---------- */

export const SiteStatus = entity(
  'SiteStatus',
  'found_needs_check — «Обнаружено место (требуется проверка)», archive_confirmed — «Подтверждено архивом», remains_raised — «Останки подняты». Переходы только вперёд',
  z.enum(['found_needs_check', 'archive_confirmed', 'remains_raised']),
)

export const Fighter = entity(
  'Fighter',
  'Боец. Имя может быть неизвестно',
  z.object({ fullName: z.string().optional(), rank: z.string().optional() }),
)

export const LastBattleSite = entity(
  'LastBattleSite',
  'Место гибели бойцов на карте «Последний бой»',
  z.object({
    id,
    lat,
    lon,
    placeName: z.string().min(1),
    fightersCount: z.number().int().positive(),
    fighters: z.array(Fighter),
    unit: z.string().min(1),
    dateText: z.string().min(1).describe('Датировка как в источнике, например «октябрь 1941»'),
    circumstances: z.string(),
    status: SiteStatus,
    sources: withSources,
    teamId: id.optional(),
    volunteersReady: z.number().int().nonnegative(),
    createdAt: isoDateTime,
    demo,
  }),
)

export const NewLastBattleSite = entity(
  'NewLastBattleSite',
  'Новая точка от отряда. Статус на сервере всегда found_needs_check',
  LastBattleSite.pick({
    lat: true,
    lon: true,
    placeName: true,
    fightersCount: true,
    fighters: true,
    unit: true,
    dateText: true,
    circumstances: true,
    sources: true,
    teamId: true,
  }),
)

export const CreateSiteResult = entity(
  'CreateSiteResult',
  'Созданная точка и число подписчиков в радиусе 20 км, которым ушло уведомление',
  z.object({ site: LastBattleSite, notifiedCount: z.number().int().nonnegative() }),
)

export const SiteStatusChange = entity(
  'SiteStatusChange',
  'Смена статуса точки (краевед или отряд)',
  z.object({ status: SiteStatus, source: Source }),
)

export const Subscription = entity(
  'Subscription',
  'Подписка на поисковую деятельность рядом с точкой',
  z.object({
    lat,
    lon,
    radiusKm: z.number().positive().max(200).default(20),
    topics: z.array(z.literal('search')).min(1),
  }),
)

export const SubscriptionResult = entity(
  'SubscriptionResult',
  'Созданная подписка',
  z.object({ id }),
)

export const AppNotification = entity(
  'AppNotification',
  'Уведомление пользователю (SSE /notifications/stream, в будущем Web Push)',
  z.object({
    id,
    kind: z.literal('site_found'),
    siteId: id,
    distanceKm: z.number().nonnegative(),
    title: z.string(),
    body: z.string(),
    createdAt: isoDateTime,
  }),
)

export const Ack = entity('Ack', 'Подтверждение действия', z.object({ ok: z.literal(true) }))

export type LatLon = z.infer<typeof LatLon>
export type Source = z.infer<typeof Source>
export type Grave = z.infer<typeof Grave>
export type Battle = z.infer<typeof Battle>
export type Team = z.infer<typeof Team>
export type PointKind = z.infer<typeof PointKind>
export type RoutePoint = z.infer<typeof RoutePoint>
export type Route = z.infer<typeof Route>
export type VolunteerRole = z.infer<typeof VolunteerRole>
export type VolunteerRequest = z.infer<typeof VolunteerRequest>
export type NewVolunteerRequest = z.infer<typeof NewVolunteerRequest>
export type Fundraiser = z.infer<typeof Fundraiser>
export type Trip = z.infer<typeof Trip>
export type GroupApplicationStatus = z.infer<typeof GroupApplicationStatus>
export type GroupApplication = z.infer<typeof GroupApplication>
export type NewGroupApplication = z.infer<typeof NewGroupApplication>
export type ArchiveStory = z.infer<typeof ArchiveStory>
export type NewArchiveStory = z.infer<typeof NewArchiveStory>
export type SiteStatus = z.infer<typeof SiteStatus>
export type LastBattleSite = z.infer<typeof LastBattleSite>
export type NewLastBattleSite = z.infer<typeof NewLastBattleSite>
export type Subscription = z.input<typeof Subscription>
export type AppNotification = z.infer<typeof AppNotification>
