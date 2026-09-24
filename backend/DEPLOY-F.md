# Deploy-F deployment (No PostGIS)

Эта ветка рассчитана на обычный PostgreSQL без расширения PostGIS.

## Files

- `app/`
- `migrations/`
- `alembic.ini`
- `pyproject.toml`
- `requirements.txt`
- `start.py`

## Start command

```text
python start.py
```

`start.py` запускает `alembic upgrade head`, затем Uvicorn.

## Environment

```text
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DATABASE
PORT=8000
HOST=0.0.0.0
```

## Geography

PostGIS не требуется. Координаты — `lat` / `lon`; расстояние для уведомлений считается через Haversine в Python.

Не добавляйте реальные пароли в Git.
