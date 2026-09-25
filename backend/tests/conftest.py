"""Тесты API на SQLite в памяти: схема из моделей, данные — те же seed_data.json, что и на сервере.
Миграции на настоящем Postgres проверяет CI (.github/workflows/fullstack.yml)."""

import os

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///file:tropa_test?mode=memory&cache=shared&uri=true"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["AUTH_COOKIE_SECURE"] = "0"

import httpx  # noqa: E402
import pytest  # noqa: E402

from app import models  # noqa: E402, F401
from app.db import Base, Session, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture(autouse=True)
async def fresh_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with Session() as s:
        await seed(s)
    yield


@pytest.fixture
async def api():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v1") as client:
        yield client
