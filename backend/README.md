# Тропа памяти — backend (No PostGIS)

FastAPI + PostgreSQL backend for environments where PostGIS is unavailable.

## Геоданные

Эта ветка не требует PostGIS, GeoAlchemy2 или spatial SQL. Координаты хранятся в обычных числовых полях `lat` и `lon`.

Проверка радиуса подписки выполняется в приложении по формуле Haversine. Это сохраняет текущий API-контракт и поведение уведомлений для небольшого количества данных.

## Local development

```bash
docker compose up --build -d
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed
```

Swagger: `http://localhost:8000/docs`

API base path: `/api/v1`

## Database schema

Миграции находятся в `migrations/`.

Полная доменная модель содержит 25 целевых таблиц. Существующий P0-слой также сохраняется для совместимости с текущим frontend-контрактом.

## Deploy-F

Start command:

```text
python start.py
```

Required environment:

```text
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DATABASE
```

Swagger UI: `/docs`

Health check: `/health`
