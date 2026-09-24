# Тропа памяти — backend

FastAPI + PostgreSQL/PostGIS backend aligned with frontend/docs/API_CONTRACT.md and BACKEND_REQUESTS.md.

Run:
docker compose up --build
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed

Swagger: http://localhost:8000/docs
API: /api/v1
Demo identity: X-Demo-User and X-Demo-Team-Id.
