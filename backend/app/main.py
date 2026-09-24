"""Тропа памяти — API. Контракт: frontend/src/contract (docs/openapi.json), базовый путь /api/v1."""

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import jury, reference, search_hq, sites, stories, trail, trips

app = FastAPI(
    title="Тропа памяти — API",
    version="0.2.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
)

if settings.cors_origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )


@app.get("/health", include_in_schema=False)
@app.get("/api/v1/health", summary="Проверка, что сервер жив")
async def health():
    return {"ok": True}


api = APIRouter(prefix="/api/v1")
for module in (jury, trail, search_hq, trips, stories, sites, reference):
    api.include_router(module.router)
app.include_router(api)
