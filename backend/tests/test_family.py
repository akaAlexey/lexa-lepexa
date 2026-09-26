"""Семейный архив (A7): бойцы и найденные записи живут в базе и видны только владельцу."""

from contextlib import asynccontextmanager

import httpx
import pytest
from sqlalchemy import select

from app.db import Session
from app.main import app
from app.models_domain import FamilyFighter, FamilyRecord

PAMYAT = "https://pamyat-naroda.ru/heroes/memorial-chelovek_donesenie51613591/"
OBD = "https://obd-memorial.ru/html/info.htm?id=51613591"


@asynccontextmanager
async def signed_in(login: str):
    """Клиент с cookie сессии: зарегистрирован и вошёл."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v1") as client:
        res = await client.post(
            "/auth/register",
            json={"login": login, "password": "correct-horse-42", "name": "Анна", "terms": True, "privacy": True},
        )
        assert res.status_code == 201
        yield client


FIGHTER = {
    "lastName": "  Иванов ",
    "firstName": "Пётр",
    "middleName": "Сергеевич",
    "birthYear": 1912,
    "relation": "прадед  по маме",
    "note": "Ушёл на фронт из Мценска.\n\n\n\nПисьма хранятся у бабушки.",
}


async def test_family_archive_needs_sign_in(api):
    assert (await api.get("/family/fighters")).status_code == 401
    assert (await api.post("/family/fighters", json=FIGHTER)).status_code == 401


async def test_fighter_lifecycle_with_records():
    async with signed_in("anna@example.com") as anna:
        assert (await anna.get("/family/fighters")).json() == []

        created = await anna.post("/family/fighters", json=FIGHTER)
        assert created.status_code == 201
        fighter = created.json()
        assert fighter["lastName"] == "Иванов"
        assert fighter["relation"] == "прадед по маме"
        assert fighter["note"] == "Ушёл на фронт из Мценска.\n\nПисьма хранятся у бабушки."
        assert fighter["records"] == []
        assert fighter["createdAt"].endswith("Z")
        fid = fighter["id"]

        added = await anna.post(f"/family/fighters/{fid}/records", json={"url": PAMYAT, "title": ""})
        assert added.status_code == 201
        records = added.json()["records"]
        assert records == [{"id": records[0]["id"], "url": PAMYAT, "title": "«Память народа»"}]

        # тот же адрес с хостом заглавными — повтор (хост нормализуется, как new URL().href)
        upper = PAMYAT.replace("pamyat-naroda.ru", "PAMYAT-NARODA.RU")
        again = await anna.post(f"/family/fighters/{fid}/records", json={"url": upper, "title": ""})
        assert again.status_code == 409
        dup = await anna.post(f"/family/fighters/{fid}/records", json={"url": PAMYAT, "title": "Донесение"})
        assert dup.status_code == 409
        assert dup.json()["detail"]["message"] == "Эта запись уже добавлена"

        obd = await anna.post(f"/family/fighters/{fid}/records", json={"url": OBD, "title": "Донесение о потерях"})
        assert [r["title"] for r in obd.json()["records"]][-1] == "Донесение о потерях"

        # правка не трогает записи и дату создания
        edited = await anna.patch(f"/family/fighters/{fid}", json={**FIGHTER, "birthYear": None, "relation": "прадед"})
        assert edited.status_code == 200
        body = edited.json()
        assert "birthYear" not in body
        assert body["relation"] == "прадед"
        assert body["createdAt"] == fighter["createdAt"]
        assert len(body["records"]) >= 2

        rid = body["records"][0]["id"]
        left = await anna.post(f"/family/fighters/{fid}/records/{rid}/delete")
        assert rid not in [r["id"] for r in left.json()["records"]]

        assert (await anna.post(f"/family/fighters/{fid}/delete")).json() == {"ok": True}
        assert (await anna.get("/family/fighters")).json() == []
    async with Session() as s:
        assert (await s.scalars(select(FamilyRecord))).all() == []
        assert (await s.scalars(select(FamilyFighter))).all() == []


async def test_archive_is_private_to_its_owner():
    async with signed_in("anna@example.com") as anna, signed_in("boris@example.com") as boris:
        fid = (await anna.post("/family/fighters", json=FIGHTER)).json()["id"]
        assert (await boris.get("/family/fighters")).json() == []
        assert (await boris.get(f"/family/fighters/{fid}")).status_code == 404
        assert (await boris.patch(f"/family/fighters/{fid}", json=FIGHTER)).status_code == 404
        assert (
            await boris.post(f"/family/fighters/{fid}/records", json={"url": PAMYAT, "title": ""})
        ).status_code == 404
        assert (await boris.post(f"/family/fighters/{fid}/delete")).status_code == 404
        assert len((await anna.get("/family/fighters")).json()) == 1


@pytest.mark.parametrize(
    ("patch", "field"),
    [
        ({"lastName": " "}, "lastName"),
        ({"lastName": "Иванов2"}, "lastName"),
        ({"firstName": "П"}, "firstName"),
        ({"birthYear": 1950}, "birthYear"),
        ({"relation": "я" * 61}, "relation"),
        ({"note": "я" * 1001}, "note"),
    ],
)
async def test_fighter_rules_match_the_form(patch, field):
    async with signed_in("anna@example.com") as anna:
        res = await anna.post("/family/fighters", json={**FIGHTER, **patch})
        assert res.status_code == 422
        assert res.json()["detail"]["field"] == field


@pytest.mark.parametrize(
    "url",
    [
        "https://pamyat-naroda.ru.evil.example/heroes/",
        "https://evil.example/?u=pamyat-naroda.ru",
        "javascript:alert(1)//obd-memorial.ru",
        "ftp://obd-memorial.ru/file",
        "https://obd-memorial.ru/" + "a" * 500,
    ],
)
async def test_records_only_from_official_bases(url):
    async with signed_in("anna@example.com") as anna:
        fid = (await anna.post("/family/fighters", json=FIGHTER)).json()["id"]
        res = await anna.post(f"/family/fighters/{fid}/records", json={"url": url, "title": ""})
        assert res.status_code == 422
        assert res.json()["detail"]["field"] == "url"
        sub = await anna.post(
            f"/family/fighters/{fid}/records", json={"url": "https://www.podvignaroda.ru/?#id=1", "title": ""}
        )
        assert sub.status_code == 201
