# Контракт API (предложение фронтенда)

> Статус: **черновик от фронтенда**, ждёт подтверждения бэкендера. Бэкенда в репозитории пока нет.
> Машиночитаемая версия — [`openapi.json`](openapi.json) (OpenAPI 3.0.3).
> Источник правды — zod-схемы `frontend/src/contract/`; `openapi.json` генерируется командой `cd frontend && npm run contract`, тест фронтенда падает, если файл отстал.
> Если бэкенд заведёт свой OpenAPI (например, FastAPI `/openapi.json`) — договоримся, и фронт будет генерировать схемы из него.

## Общие правила
- Базовый путь: `/api/v1` на том же домене, что и фронт (прокси), либо отдельный HTTPS-домен с CORS.
- JSON, поля в **camelCase**, даты `YYYY-MM-DD`, время ISO 8601 в UTC (`2026-09-23T09:00:00Z`), координаты WGS84 (`lat`, `lon`), деньги — целые рубли.
- Ошибки: HTTP 4xx/5xx и тело `{ "message": "текст для человека" }`.
- Поле `demo: true` у записей, которые вымышлены или не проверены. Интерфейс помечает их плашкой.
- У каждого факта — массив `sources` (минимум один источник: `kind`, `title`, необязательный `url`).

## Сущности (кратко)
| Сущность | Главные поля |
|---|---|
| `Grave` (mock_graves.csv) | `id, lat, lon, fullName, unit, demo` |
| `Battle` (mock_battles.json) | `id, date, text, archiveUrl, place?{name, lat, lon}, demo` |
| `Team` (mock_teams.json) | `id, name, region, budgetGoalRub, budgetCollectedRub, foundThisMonth, demo` |
| `Route` | `id, title, summary, lengthM, durationMin, path: LatLon[], points: RoutePoint[], demo` |
| `RoutePoint` | `id, kind: battle\|trench\|hq, title, lat, lon, story, task: ChildTask, sources[]` |
| `VolunteerRequest` | `id, teamId, title, date, place, roles[{role, count}], joined, fundraiserId?, createdAt, demo` |
| `Fundraiser` | `id, teamId, purpose: fuel\|raise_fighter\|equip, title, goalRub, collectedRub, demo` |
| `Trip` | `id, teamId, date, title, place, lat, lon, spotsTotal, spotsTaken, checklist[], demo` |
| `LastBattleSite` | `id, lat, lon, placeName, fightersCount, fighters[], unit, dateText, circumstances, status, sources[], teamId?, volunteersReady, createdAt, demo` |
| `SiteStatus` | `found_needs_check` → `archive_confirmed` → `remains_raised`, только вперёд по одному шагу |
| `AppNotification` | `id, kind: site_found, siteId, distanceKm, title, body, createdAt` |

## Эндпоинты
| Метод и путь | Назначение |
|---|---|
| `GET /graves` | захоронения |
| `GET /battles` | бои |
| `GET /teams` | отряды |
| `GET /stats/search` | «Найдено бойцов за месяц» |
| `GET /routes`, `GET /routes/{id}` | семейные маршруты |
| `GET /requests`, `POST /requests` | заявки на набор волонтёров (новые сверху) / создать (командир) |
| `POST /requests/{id}/join` | «Стать частью команды» |
| `GET /fundraisers`, `POST /donations` | сборы / пожертвование (**только тестовый режим** ЮKassa/CloudPayments) |
| `GET /trips`, `GET /trips/{id}`, `POST /trips/{id}/register` | «Выходные с поисковиком» |
| `GET /sites`, `GET /sites/{id}`, `POST /sites` | «Последний бой»; `POST` возвращает `{ site, notifiedCount }` |
| `PATCH /sites/{id}/status` | смена статуса `{ status, source }`, недопустимый переход — 409 |
| `POST /sites/{id}/volunteer` | «Я готов помочь в подъёме» |
| `POST /subscriptions` | подписка `{ lat, lon, radiusKm = 20, topics: ["search"] }` |
| `GET /notifications/stream` | SSE, `data` каждого события — `AppNotification` |

## Ключевой сценарий: новое место гибели (user story 3)
1. Командир отправляет `POST /sites` (статус не передаётся — сервер ставит `found_needs_check`).
2. Сервер находит подписчиков, у которых точка в пределах `radiusKm` (по умолчанию 20 км, расстояние по большой окружности; PostGIS `ST_DWithin` на geography подходит).
3. Каждому шлёт `AppNotification` с `body = "В {N} км от вас обнаружено место гибели бойца. Требуется помощь в идентификации"`, где N — расстояние, округлённое до целых км (минимум 1).
4. Ответ содержит `notifiedCount` — число получателей.
