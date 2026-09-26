"""Кто делает запрос. Вошёл через сервер (cookie сессии) — аккаунт: записи, подписки и уведомления
видны с любого устройства. Не вошёл — демо-ключ браузера из X-Demo-User (поток уведомлений — ?user=,
EventSource не умеет заголовки)."""

from fastapi import Header, Query, Request

from .routers.auth import signed_in_user_id

MAX_LEN = 100
ACCOUNT_PREFIX = "user:"


def _clean(value: str | None) -> str | None:
    value = (value or "").strip()
    return value[:MAX_LEN] or None


async def user_key(
    request: Request,
    x_demo_user: str | None = Header(default=None),
    user: str | None = Query(default=None, include_in_schema=False),
) -> str:
    account = await signed_in_user_id(request)
    if account:
        return ACCOUNT_PREFIX + account
    key = _clean(x_demo_user) or _clean(user) or "demo"
    # Демо-ключ не может выдать себя за аккаунт
    return key if not key.startswith(ACCOUNT_PREFIX) else "demo:" + key[len(ACCOUNT_PREFIX) :]


def team_id(
    x_demo_team_id: str | None = Header(default=None),
    team: str | None = Query(default=None, include_in_schema=False),
) -> str | None:
    return _clean(x_demo_team_id) or _clean(team)
