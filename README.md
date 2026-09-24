# Тропа памяти

Геоплатформа памяти о Великой Отечественной войне на материале Орловской области: семейные квест-маршруты,
штаб поисковых отрядов, «Выходные с поисковиком», карта «Последний бой» с уведомлениями подписчикам, народный архив.

| Часть | Папка | Стек |
| ----- | ----- | ---- |
| Фронтенд | [`frontend/`](frontend/README.md) | React 19, TypeScript, Vite, MapLibre |
| Бэкенд | [`backend/`](backend/README.md) | FastAPI, SQLAlchemy (async), Alembic, PostgreSQL |
| Контракт API | [`frontend/src/contract`](frontend/src/contract) → [`docs/openapi.json`](docs/openapi.json) | zod — единственный источник правды |

Как фронт и бэк связаны и почему именно так — [`docs/INTEGRATION.md`](docs/INTEGRATION.md).

## Запуск всего сайта

Нужен Docker.

```bash
cp .env.example .env
docker compose up -d --build
```

Сайт — http://localhost:8080, API — http://localhost:8080/api/v1, документация API — http://localhost:8080/api/v1/docs.
База создаётся миграциями и заполняется демо-данными при первом запуске.

## Разработка по частям

```bash
# Бэкенд (нужен Postgres — например, docker compose up -d db в backend/)
cd backend && pip install -r requirements-dev.txt && python start.py

# Фронтенд против локального бэкенда — запросы на /api уходят через прокси Vite
cd frontend && npm ci
VITE_API_MODE=live VITE_API_URL=/api/v1 npm run dev

# Фронтенд без бэкенда — на фикстурах
cd frontend && npm run dev
```

## Проверки

- `backend`: `ruff check`, `pytest`.
- `frontend`: `npm run verify`.
- Связка: `npm run contract:check -- http://127.0.0.1:8000/api/v1` во `frontend/` вызывает все эндпоинты живого сервера и сверяет ответы с контрактом.

Всё это CI запускает на каждый PR: [`.github/workflows/fullstack.yml`](.github/workflows/fullstack.yml).
