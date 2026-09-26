# Выкладка на Deploy-F

Выкладываем бэкенд из `main`: CI `fullstack.yml` проверяет его против схем фронта (31 из 31).
Адреса: приложение Deploy-F — `https://a49782-3772.q.d-f.pw` (служебный), свой домен — `https://api.marshrutypobedy.ru`
(DNS → 62.109.7.48). Состояние и откат — в [`docs/ops/STATUS.md`](../docs/ops/STATUS.md).

## 0. Сайт работает только с этим сервером

С этой версии сайт (GitHub Pages) всегда собирается в живом режиме с API `https://api.marshrutypobedy.ru/api/v1`
(другой адрес — переменная репозитория `API_URL`). Перед выкладкой сайта `deploy.yml` проверяет: `/health`,
CORS с адреса сайта и `contract:check --read-only`. Если API недоступен или отстал от контракта — выкладка сайта
останавливается, на домене остаётся прежняя версия. Порядок релиза: **сначала бэкенд (этот документ), потом
push в `main`** (или «Re-run» упавшей выкладки Pages после подъёма API).

Что хранится на сервере: всё общее (заявки, сборы, выезды, истории, места, уведомления) и всё личное вошедшего
пользователя — аккаунт и сессии, семейный архив (`family_*`), личное состояние (`user_state`: профиль, роль,
записи в заявки и на выезды, «Мои истории», прогресс тропы, подписка). Действия вошедшего пользователя
привязаны к аккаунту (`user:<id>`), а не к браузеру.

## 1. Код

Тип проекта — Python, папка `backend/`, команда запуска:

```text
python start.py
```

- Если Deploy-F берёт код из GitHub — репозиторий `team-shpilit/lexa-lepexa`, ветка `main`, папка `backend/`.
- Иначе — zip папки `backend/` без `Dockerfile`, `docker-compose.yml`, `__pycache__`, `tests/`:

  ```bash
  cd backend && zip -r ../backend-deploy-f.zip . -x 'Dockerfile' 'docker-compose.yml' '*__pycache__*' 'tests/*' '.env'
  ```

`start.py`: миграции (`alembic upgrade head`) → [разовая очистка, если `CLEANUP_TEST_RECORDS=1`] → демо-сид → Uvicorn на `PORT`.

## 2. Переменные окружения

```text
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DATABASE   # уже задана — не трогать
CORS_ORIGINS=https://team-shpilit.github.io,https://marshrutypobedy.ru,https://www.marshrutypobedy.ru
SEED_DEMO=1
PORT=<порт, который требует Deploy-F>
```

Эти origin (и `http://marshrutypobedy.ru`, `http://www.marshrutypobedy.ru` — пока у домена на Pages нет
сертификата) разрешены и по умолчанию (`app/config.py`), переменная нужна только чтобы добавить новые.

Cookie входа: `AUTH_COOKIE_SECURE=1` (по умолчанию) и `AUTH_COOKIE_SAMESITE=none` (по умолчанию) — сайт и API на
разных адресах, иначе браузер не пришлёт сессию. Защита от CSRF — сервер отклоняет изменяющие запросы с cookie,
если заголовок Origin не из списка CORS. Мобильное приложение (Capacitor) — добавить его origin в `CORS_ORIGINS`:
`https://localhost` (Android) и `capacitor://localhost` (iOS).
Пароль базы в git не кладём.

Платежи ЮKassa (только тестовый магазин) — добавить в переменные приложения, значения передаются владельцу лично:

```text
YOOKASSA_SHOP_ID=<shopId тестового магазина>
YOOKASSA_SECRET_KEY=<секретный ключ тестового магазина, test_…>
YOOKASSA_RETURN_URL=https://marshrutypobedy.ru/payment
YOOKASSA_PAYOUT_AGENT_ID=<agentId тестового шлюза выплат>        # на будущее, кодом не используется
YOOKASSA_PAYOUT_SECRET_KEY=<ключ тестового шлюза выплат, test_…>  # на будущее, кодом не используется
```

- Ключ не с `test_` — сервер отказывается создавать платёж (503). Без ключей сайт работает, платёж отвечает 503.
- `YOOKASSA_RETURN_URL` — страница результата на сайте. Пока на домене нет HTTPS, ставьте
  `http://marshrutypobedy.ru/payment`; если сайт снова на `team-shpilit.github.io` —
  `https://team-shpilit.github.io/lexa-lepexa/payment`. Прямой заход открывает страницу через `404.html` (SPA).
- Ключи — только здесь и в локальном `.env`. Не в `VITE_*`, не в переменных GitHub Actions: сборка Pages публичная.

## 3. База: создать, дополнить, пересоздать

Перед любым изменением — экспорт/бэкап базы в панели Deploy-F.

| Задача | Как |
|---|---|
| **Создать** (пустая база) | задать `DATABASE_URL`, перезапустить: миграции создадут таблицы, сид зальёт демо |
| **Дополнить** демо | во `frontend/`: `npm run seed:backend` → коммит `backend/app/seed_data.json` → выкладка → перезапуск. Сид добавляет только отсутствующие id, изменённые пользователями записи не трогает |
| **Памятники** | `npm run memorials` (OpenStreetMap, атрибуция «© участники OpenStreetMap», ODbL) → `npm run seed:backend` → перезапуск |
| **Данные жюри** | положить в `frontend/fixtures/jury/` → `npm run fixtures` → `npm run seed:backend` → перезапуск |
| **Пересоздать** | бэкап → в SQL-консоли `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` → перезапуск |

Каждая запись сида несёт `demo=true` и источник из фикстур фронта. Если данных для показа мало — синтетика только
скриптом с фиксированным зерном и пометкой «демо»; выдуманные имена бойцов под видом реальных — нельзя.

Повторный старт не дублирует: в логе `seed: добавлено записей — 0`, счётчики `docs/ops/smoke.sh` до и после совпадают.

### Тестовые записи сверки контракта

Полный `npm run contract:check` создаёт записи (пользователи `cc-*`, «Проверка контракта …»). На боевой базе:

1. SQL-консоль Deploy-F: выполнить блок «ПРОСМОТР» из [`app/test_records.sql`](app/test_records.sql) → проверить список.
2. После согласования — блок «УДАЛЕНИЕ» (в транзакции; возвращает счётчики демо-сборов и выездов).

Нет SQL-консоли — переменная `CLEANUP_TEST_RECORDS=1`, перезапуск (в логе список `cleanup: найдено …`), затем
переменную снять и перезапустить ещё раз.

## 4. Проверка после выкладки (только чтение)

```bash
bash docs/ops/smoke.sh https://api.marshrutypobedy.ru          # /health, счётчики GET, SSE 5 c, CORS
cd frontend && npm run contract:check -- https://api.marshrutypobedy.ru/api/v1 --read-only
```

Ожидаемо на демо-сиде: маршрут 1 (4 точки), отрядов 5, мест ≥ 3, сборов 5 (в фикстурах фронта их 5), выездов 2,
историй 3, памятников 84, «живых фото» 2. Полную сверку (с записью) — только на копии базы.

### Платежи ЮKassa после выкладки

При старте `alembic upgrade head` накатит `0006_yookassa_payments` (новая таблица `yookassa_payments`,
существующие данные не трогает). Проверка:

1. `curl -X POST https://api.marshrutypobedy.ru/api/v1/payments/yookassa -H 'Content-Type: application/json'
   -d '{"fundraiserId":"F01","amountRub":100}'` → 200 и `confirmationUrl` (503 — ключи не заданы или не `test_`).
2. Кабинет тестового магазина ЮKassa → Интеграция → HTTP-уведомления: URL
   `https://api.marshrutypobedy.ru/api/v1/payments/yookassa/webhook`, события `payment.succeeded` и
   `payment.canceled`. Сохранить.
3. С телефона: сайт → «Мероприятия» → сбор → «Пожертвовать» → тестовая карта (см. `docs/DEMO.md`) →
   возврат на `/payment` → «Спасибо! Тестовый платёж прошёл», сумма сбора выросла.
4. В журнале приложения: `yookassa: вебхук payment.succeeded для …` и `yookassa: платёж … зачислен в сбор …`.
   В кабинете ЮKassa платёж — «Успешный» (succeeded).

Откат: снять `YOOKASSA_*` — кнопка оплаты ответит понятной ошибкой, остальной сайт работает.

## 5. Свой домен для API

Deploy-F → приложение → Домены: `api.marshrutypobedy.ru` → порт приложения (`PORT`) → выпустить сертификат.
Проверка: `curl https://api.marshrutypobedy.ru/health` → `{"ok":true}`.
