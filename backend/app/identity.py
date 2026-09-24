"""Демо-личность без входа: браузер присылает свой ключ в X-Demo-User (поток уведомлений — в ?user=,
EventSource не умеет заголовки). Настоящая авторизация заменит эту зависимость, не трогая роутеры."""

from fastapi import Header, Query

MAX_LEN = 100


def _clean(value: str | None) -> str | None:
    value = (value or "").strip()
    return value[:MAX_LEN] or None


def user_key(
    x_demo_user: str | None = Header(default=None),
    user: str | None = Query(default=None, include_in_schema=False),
) -> str:
    return _clean(x_demo_user) or _clean(user) or "demo"


def team_id(
    x_demo_team_id: str | None = Header(default=None),
    team: str | None = Query(default=None, include_in_schema=False),
) -> str | None:
    return _clean(x_demo_team_id) or _clean(team)
