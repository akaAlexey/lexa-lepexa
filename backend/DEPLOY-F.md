# Deploy-F deployment

## Project type

Deploy this directory as a **Python web application**.

Do not use the local Docker Compose database for the hosted deployment. Deploy-F should provide a separate PostgreSQL database.

## Hosted files

- `app/`
- `migrations/`
- `alembic.ini`
- `pyproject.toml`
- `requirements.txt`
- `start.py`

`Dockerfile` and `docker-compose.yml` are retained for local development.

## Start command

Use:

```text
python start.py
```

The startup script requires `DATABASE_URL`, runs `alembic upgrade head`, then starts FastAPI with Uvicorn. It reads `PORT` when the platform provides it and otherwise uses 8000.

## Environment variables

Required:

```text
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DATABASE
```

Optional:

```text
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=https://<frontend-domain>
```

Do not commit the real database password to Git.

## Database

The hosted database must support PostgreSQL + PostGIS.

After the PostgreSQL service is created and `DATABASE_URL` is set, the first application start automatically runs `alembic upgrade head`.

## Health check

```text
GET /health
```

Expected response:

```json
{"ok": true}
```

## API docs

OpenAPI: `/api/v1/openapi.json`

Swagger UI: `/docs`

The frontend API base path remains `/api/v1`.
