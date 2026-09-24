# Тропа памяти — бэкенд

FastAPI + PostgreSQL. Реализует весь контракт фронта (`frontend/src/contract`, `docs/openapi.json`): 27 эндпоинтов
и поток уведомлений. Базовый путь — `/api/v1`, документация — `/api/v1/docs`.

PostGIS не нужен: координаты хранятся числами, радиус 20 км для уведомлений считается формулой гаверсинуса в Python.
Работает на любом Postgres, в том числе на управляемом у хостинга.

## Структура

```text
app/
  main.py            приложение, CORS, подключение роутеров
  config.py          настройки из окружения
  db.py              движок и сессии SQLAlchemy
  models.py          таблицы, с которыми работает API (слой совместимости с контрактом фронта)
  models_domain.py   целевая доменная схема (25 таблиц, миграция 0002)
  schemas.py         тела запросов — те же поля и ограничения, что в zod-схемах фронта
  serializers.py     строки базы → JSON контракта (camelCase, даты с Z, без null)
  identity.py        демо-пользователь: X-Demo-User / ?user= (до появления входа)
  routers/           jury, trail, search_hq, trips, stories, sites (+ поток уведомлений)
  seed.py            заливка демо-данных из seed_data.json (идемпотентно)
  seed_data.json     генерируется фронтом: npm run seed:backend
migrations/versions/
  0001_initial.py            данные жюри, «Последний бой», подписки, уведомления
  0002_full_domain_schema.py целевая доменная схема
  0003_contract_tables.py    тропа, штаб, сборы, выезды, коллективные заявки, архив
tests/               pytest на SQLite в памяти
```

## Локально

```bash
docker compose up -d db                 # Postgres из backend/docker-compose.yml
pip install -r requirements-dev.txt
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/memory_trail
python start.py                         # миграции → демо-данные → http://127.0.0.1:8000
pytest -q                               # тесты без Postgres
```

## Переменные окружения

| Переменная | По умолчанию | Что делает |
| ---------- | ------------ | ---------- |
| `DATABASE_URL` | — (обязательна) | `postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DB` |
| `CORS_ORIGINS` | localhost:5173 | Через запятую. Для GitHub Pages — `https://team-shpilit.github.io`. Пусто — CORS выключен (фронт на том же домене) |
| `SEED_DEMO` | `1` | Залить демо-данные в пустую базу при старте; существующие записи не трогаются |
| `SSE_POLL_SECONDS` | `2` | Как часто поток уведомлений проверяет новые записи |
| `HOST`, `PORT` | `0.0.0.0`, `8000` | Адрес Uvicorn |

## Демо-пользователь

Входа пока нет. Браузер присылает свой ключ в заголовке `X-Demo-User` (поток уведомлений — в `?user=`,
EventSource не умеет заголовки), отряд — в `X-Demo-Team-Id`. По ключу сервер адресует уведомления
и не оповещает автора о его же находке. Настоящая авторизация заменит `app/identity.py`, роутеры не изменятся.

Хостинг Deploy-F — [DEPLOY-F.md](DEPLOY-F.md).
