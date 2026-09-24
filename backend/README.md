# Тропа памяти — backend

FastAPI + PostgreSQL/PostGIS backend aligned with the frontend API contract.

## Local development

```bash
docker compose up --build -d
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed
```

Swagger: `http://localhost:8000/docs`

API base path: `/api/v1`

Demo identity headers: `X-Demo-User` and `X-Demo-Team-Id`.

## Database schema

Alembic migrations build the P0 schema and the full domain schema.

```text
alembic/versions/0001_initial.py
alembic/versions/0002_full_domain_schema.py
```

The full domain design contains 25 target tables. The current P0 implementation also keeps the legacy frontend tables, so the physical PostgreSQL database contains 30 tables until that compatibility layer is consolidated.

## Deploy-F

Deploy this directory as a **Python web application**.

Hosted start command:

```text
python start.py
```

The startup script applies `alembic upgrade head` and then starts Uvicorn. Set `DATABASE_URL` to the Deploy-F PostgreSQL/PostGIS connection string. See [DEPLOY-F.md](DEPLOY-F.md) for the deployment checklist.

The `Dockerfile` and `docker-compose.yml` remain for local development or Docker hosting.
