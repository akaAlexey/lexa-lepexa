# Выкладка на Deploy-F

Выкладываем бэкенд из `main`: CI `fullstack.yml` проверяет его против схем фронта (31 из 31).
Адреса: приложение Deploy-F — `https://a49782-3772.q.d-f.pw` (служебный), свой домен — `https://api.marshrutypobedy.ru`
(DNS → 62.109.7.48). Состояние и откат — в [`docs/ops/STATUS.md`](../docs/ops/STATUS.md).

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

Эти три origin разрешены и по умолчанию (`app/config.py`), переменная нужна только чтобы добавить новые.
Пароль базы в git не кладём.

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

## 5. Свой домен для API

Deploy-F → приложение → Домены: `api.marshrutypobedy.ru` → порт приложения (`PORT`) → выпустить сертификат.
Проверка: `curl https://api.marshrutypobedy.ru/health` → `{"ok":true}`.
