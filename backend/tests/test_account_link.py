"""Связка сайта с базой через аккаунт: действия вошедшего пользователя принадлежат аккаунту, а не браузеру,
личное состояние общее для всех его устройств, изменяющие запросы с чужих сайтов отклоняются."""

from contextlib import asynccontextmanager

import httpx
from sqlalchemy import select

from app import models as m
from app.db import Session
from app.main import app

PASSWORD = "correct-horse-42"


SITE = "http://localhost:5173"  # разрешённый адрес сайта в тестах (CORS_ORIGINS из conftest)


async def joined(c: httpx.AsyncClient, request_id: str) -> int:
    return next(r["joined"] for r in (await c.get("/requests")).json() if r["id"] == request_id)


def client() -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1")


@asynccontextmanager
async def device(login: str, *, register: bool = False, demo_key: str = "device"):
    """Отдельный браузер: свои cookie и свой демо-ключ X-Demo-User."""
    async with client() as c:
        c.headers["X-Demo-User"] = demo_key
        c.headers["Origin"] = SITE
        path = "/auth/register" if register else "/auth/login"
        body = {"login": login, "password": PASSWORD}
        if register:
            body |= {"name": "Анна", "terms": True, "privacy": True}
        res = await c.post(path, json=body)
        assert res.status_code in (200, 201), res.text
        yield c


async def test_cookie_is_cross_site_capable_in_production_settings():
    from app.config import Settings

    assert Settings(auth_cookie_secure=True).cookie_samesite == "none"
    # Локально по http без Secure браузер отверг бы SameSite=None — остаётся lax
    assert Settings(auth_cookie_secure=False).cookie_samesite == "lax"
    # Адреса сайта по умолчанию (в тестах CORS_ORIGINS переопределён) — и https, и пока http
    default = Settings.model_fields["cors_origins"].default
    assert "http://marshrutypobedy.ru" in default
    assert "https://marshrutypobedy.ru" in default


async def test_signed_in_actions_belong_to_the_account_on_every_device():
    async with device("anna@example.com", register=True, demo_key="phone") as phone:
        await phone.post("/requests/R01/join")
        first = await joined(phone, "R01")
        async with device("anna@example.com", demo_key="laptop") as laptop:
            # Со второго устройства — то же лицо: повторная запись не добавляет участника
            await laptop.post("/requests/R01/join")
            assert await joined(laptop, "R01") == first
            spots = (await laptop.get("/trips/W01")).json()["spotsTaken"]
            await phone.post("/trips/W01/register", json={})
            after_phone = (await phone.get("/trips/W01")).json()["spotsTaken"]
            await laptop.post("/trips/W01/register", json={})
            assert (await laptop.get("/trips/W01")).json()["spotsTaken"] == after_phone == spots + 1
    async with Session() as s:
        keys = set(await s.scalars(select(m.VolunteerRequestJoin.user_key)))
    assert any(k.startswith("user:USR") for k in keys)
    assert "phone" not in keys and "laptop" not in keys


async def test_guest_keeps_demo_key_and_cannot_pose_as_account():
    async with client() as guest:
        before = await joined(guest, "R01")
        await guest.post("/requests/R01/join", headers={"X-Demo-User": "user:USR-someone"})
        await guest.post("/requests/R01/join", headers={"X-Demo-User": "user:USR-someone"})
        assert await joined(guest, "R01") == before + 2
    async with Session() as s:
        keys = set(await s.scalars(select(m.VolunteerRequestJoin.user_key)))
    assert "user:USR-someone" not in keys
    assert "demo:USR-someone" in keys


async def test_personal_state_is_shared_between_devices_and_private():
    async with device("anna@example.com", register=True, demo_key="phone") as phone:
        assert (await phone.get("/me/state")).json() == {}
        profile = {"name": "Анна", "city": "Орёл", "bio": "", "since": "2026-09-26T10:00:00Z"}
        assert (await phone.patch("/me/state", json={"key": "profile", "value": profile})).json() == {"ok": True}
        await phone.patch("/me/state", json={"key": "search.joinedRequests", "value": ["R01"]})
        await phone.patch("/me/state", json={"key": "quest:park-3km", "value": {"visited": ["rubezh"]}})
        async with device("anna@example.com", demo_key="laptop") as laptop:
            state = (await laptop.get("/me/state")).json()
            assert state["profile"]["city"] == "Орёл"
            assert state["search.joinedRequests"] == ["R01"]
            await laptop.patch("/me/state", json={"key": "search.joinedRequests", "value": None})
        assert "search.joinedRequests" not in (await phone.get("/me/state")).json()

        bad = await phone.patch("/me/state", json={"key": "../etc", "value": 1})
        assert bad.status_code == 422
        big = await phone.patch("/me/state", json={"key": "notes", "value": "я" * 40000})
        assert big.status_code == 413

    async with device("boris@example.com", register=True) as boris:
        assert (await boris.get("/me/state")).json() == {}
    async with client() as guest:
        assert (await guest.get("/me/state")).status_code == 401
        assert (await guest.patch("/me/state", json={"key": "role", "value": "x"})).status_code == 401


async def test_writes_with_session_from_foreign_sites_are_rejected():
    async with device("anna@example.com", register=True) as anna:
        evil = await anna.post(
            "/family/fighters",
            json={"lastName": "Иванов", "firstName": "", "middleName": "", "relation": "", "note": ""},
            headers={"Origin": "https://evil.example"},
        )
        assert evil.status_code == 403
        ours = await anna.post(
            "/family/fighters",
            json={"lastName": "Иванов", "firstName": "", "middleName": "", "relation": "", "note": ""},
            headers={"Origin": SITE},
        )
        assert ours.status_code == 201
        # Чтение и запросы без Origin (curl, сервер) — как раньше
        assert (await anna.get("/family/fighters", headers={"Origin": "https://evil.example"})).status_code == 200
    async with client() as webhook:
        # Без cookie (вебхук ЮKassa, гость) Origin не проверяется
        res = await webhook.post("/requests/R01/join", headers={"Origin": "https://evil.example"})
        assert res.status_code == 200
