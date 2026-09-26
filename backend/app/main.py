"""Тропа памяти — API. Контракт: frontend/src/contract (docs/openapi.json), базовый путь /api/v1."""

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .routers import auth, family, jury, me, payments, reference, search_hq, sites, stories, trail, trips

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
        allow_credentials=True,
    )


UNSAFE = {"POST", "PATCH", "PUT", "DELETE"}


@app.middleware("http")
async def reject_cross_site_writes(request: Request, call_next):
    """Защита от CSRF. Cookie сессии — SameSite=None (сайт и API на разных адресах), поэтому изменяющий
    запрос с cookie принимаем только от разрешённых адресов сайта (Origin). Без cookie (вебхук ЮKassa,
    демо без входа) и без Origin (curl, серверные вызовы) — как раньше."""
    if request.method in UNSAFE and request.cookies.get(settings.auth_cookie_name):
        origin = request.headers.get("origin")
        if origin and origin not in settings.cors_origin_list:
            return JSONResponse(status_code=403, content={"detail": {"message": "Запрос с чужого сайта"}})
    return await call_next(request)


@app.get("/health", include_in_schema=False)
@app.get("/api/v1/health", summary="Проверка, что сервер жив")
async def health():
    return {"ok": True}


@app.get("/", include_in_schema=False)
async def root_health():
    return {"ok": True}


api = APIRouter(prefix="/api/v1")
for module in (auth, family, me, jury, trail, search_hq, payments, trips, stories, sites, reference):
    api.include_router(module.router)
app.include_router(api)
