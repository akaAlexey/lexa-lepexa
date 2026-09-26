import re

from sqlalchemy import select

from app.db import Session
from app.models_domain import User
from app.seed import seed

ISO_Z = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$")

SITE = {
    "lat": 52.9651,
    "lon": 36.0785,
    "placeName": "Овраг у деревни",
    "fightersCount": 2,
    "fighters": [{"fullName": "Иванов И.И.", "rank": "красноармеец"}, {}],
    "unit": "283-я стрелковая дивизия",
    "dateText": "октябрь 1941",
    "circumstances": "Найдено при разведке",
    "sources": [{"kind": "archive", "title": "Отчёт отряда"}],
    "teamId": "T01",
}


def nulls(value, path=""):
    """Пути ко всем null в ответе: контракт фронта не принимает null вместо отсутствующего поля."""
    if value is None:
        return [path]
    if isinstance(value, dict):
        return [p for k, v in value.items() for p in nulls(v, f"{path}.{k}")]
    if isinstance(value, list):
        return [p for i, v in enumerate(value) for p in nulls(v, f"{path}[{i}]")]
    return []


async def test_server_registration_login_and_logout(api):
    password = "correct-horse-42"
    registered = await api.post(
        "/auth/register",
        json={
            "login": "anna@example.com",
            "password": password,
            "name": "Анна Иванова",
            "terms": True,
            "privacy": True,
        },
    )
    assert registered.status_code == 201
    account = registered.json()
    assert account["login"] == "anna@example.com"
    assert account["name"] == "Анна Иванова"
    assert ISO_Z.match(account["since"])

    me = await api.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["id"] == account["id"]

    async with Session() as s:
        stored = await s.scalar(select(User).where(User.id == account["id"]))
        assert stored is not None
        assert stored.password_hash != password
        assert password not in stored.password_hash

    duplicate = await api.post(
        "/auth/register",
        json={
            "login": "ANNA@example.com",
            "password": password,
            "name": "Другая Анна",
            "terms": True,
            "privacy": True,
        },
    )
    assert duplicate.status_code == 409

    await api.post("/auth/logout")
    assert (await api.get("/auth/me")).status_code == 401
    wrong = await api.post(
        "/auth/login",
        json={"login": "anna@example.com", "password": "wrong-password"},
    )
    assert wrong.status_code == 401

    logged_in = await api.post(
        "/auth/login",
        json={"login": "ANNA@example.com", "password": password},
    )
    assert logged_in.status_code == 200
    assert (await api.get("/auth/me")).json()["name"] == "Анна Иванова"


async def test_server_registration_by_phone(api):
    registered = await api.post(
        "/auth/register",
        json={
            "login": "8 (900) 123-45-67",
            "password": "example-password",
            "name": "Иван Иванов",
            "terms": True,
            "privacy": True,
        },
    )
    assert registered.status_code == 201
    assert registered.json()["login"] == "79001234567"
    await api.post("/auth/logout")
    assert (
        await api.post(
            "/auth/login",
            json={"login": "+7 900 123-45-67", "password": "example-password"},
        )
    ).status_code == 200


async def test_health(api):
    assert (await api.get("/health")).json() == {"ok": True}


async def test_every_list_is_seeded_and_has_no_nulls(api):
    for path in (
        "/graves",
        "/battles",
        "/teams",
        "/routes",
        "/requests",
        "/fundraisers",
        "/trips",
        "/group-applications",
        "/stories",
        "/sites",
        "/memorials",
        "/live-photos",
    ):
        res = await api.get(path)
        assert res.status_code == 200, path
        assert len(res.json()) > 0, path
        assert nulls(res.json()) == [], path


async def test_dates_are_utc_with_z(api):
    for path, field in (
        ("/sites", "createdAt"),
        ("/requests", "createdAt"),
        ("/stories", "createdAt"),
        ("/group-applications", "createdAt"),
    ):
        for item in (await api.get(path)).json():
            assert ISO_Z.match(item[field]), (path, item[field])


async def test_seed_is_idempotent():
    async with Session() as s:
        assert await seed(s) == 0


async def test_route_points_keep_order(api):
    route = (await api.get("/routes")).json()[0]
    same = (await api.get(f"/routes/{route['id']}")).json()
    assert [p["id"] for p in same["points"]] == [p["id"] for p in route["points"]]
    assert (await api.get("/routes/nope")).status_code == 404


async def test_stats_sum_found_this_month(api):
    teams = (await api.get("/teams")).json()
    stats = (await api.get("/stats/search")).json()
    assert stats["foundThisMonth"] == sum(t["foundThisMonth"] for t in teams)
    assert re.match(r"^\d{4}-\d{2}$", stats["month"])


async def test_create_request_and_join(api):
    body = {
        "teamId": "T01",
        "title": "Нужны копатели",
        "date": "2026-10-10",
        "place": "Мценский район",
        "roles": [{"role": "digger", "count": 10}],
    }
    created = (await api.post("/requests", json=body)).json()
    assert created["joined"] == 0 and ISO_Z.match(created["createdAt"])
    assert (await api.get("/requests")).json()[0]["id"] == created["id"], "новые сверху"
    joined = (await api.post(f"/requests/{created['id']}/join", headers={"X-Demo-User": "v1"})).json()
    assert joined["joined"] == 1
    assert (await api.post("/requests", json={**body, "teamId": "NOPE"})).status_code == 404
    assert (await api.post("/requests", json={**body, "roles": []})).status_code == 422


async def test_donation_adds_to_fundraiser(api):
    f = (await api.get("/fundraisers")).json()[0]
    res = (await api.post("/donations", json={"fundraiserId": f["id"], "amountRub": 500})).json()
    assert res["status"] == "test_succeeded"
    assert res["fundraiser"]["collectedRub"] == f["collectedRub"] + 500
    assert (await api.post("/donations", json={"fundraiserId": f["id"], "amountRub": 0})).status_code == 422


async def test_trip_registration_stops_when_full(api):
    trip = (await api.get("/trips")).json()[0]
    free = trip["spotsTotal"] - trip["spotsTaken"]
    for _ in range(free):
        assert (await api.post(f"/trips/{trip['id']}/register")).status_code == 200
    res = await api.post(f"/trips/{trip['id']}/register")
    assert res.status_code == 409


async def test_group_application_flow(api):
    trip = (await api.get("/trips")).json()[0]
    body = {
        "tripId": trip["id"],
        "organization": "Школа № 5",
        "contactName": "Анна Петровна",
        "contact": "+7 900 000-00-00",
        "peopleCount": 12,
        "comment": "",
    }
    created = (await api.post("/group-applications", json=body)).json()
    assert created["status"] == "pending"
    decided = (await api.patch(f"/group-applications/{created['id']}", json={"status": "confirmed"})).json()
    assert decided["status"] == "confirmed"
    assert (await api.post("/group-applications", json={**body, "peopleCount": 1})).status_code == 422


async def test_story_review_rules(api):
    body = {
        "title": "Дед на Курской дуге",
        "place": "Поныри",
        "story": "Мой дед воевал под Понырями летом 1943 года, был ранен и награждён медалью.",
        "sourceText": "",
        "author": "Внук",
    }
    no_source = (await api.post("/stories", json=body)).json()
    review = {"decision": "verified", "reviewer": "Краевед", "note": ""}
    assert (await api.post(f"/stories/{no_source['id']}/review", json=review)).status_code == 422

    with_source = (await api.post("/stories", json={**body, "sourceText": "Наградной лист"})).json()
    verified = (await api.post(f"/stories/{with_source['id']}/review", json=review)).json()
    assert verified["status"] == "verified" and verified["verifiedBy"] == "Краевед"
    assert "reviewNote" not in verified
    assert (await api.post(f"/stories/{with_source['id']}/review", json=review)).status_code == 409


async def test_site_status_moves_only_forward(api):
    site = (await api.post("/sites", json=SITE)).json()["site"]
    source = {"kind": "obd_memorial", "title": "ОБД «Мемориал»"}
    skip = await api.patch(f"/sites/{site['id']}/status", json={"status": "remains_raised", "source": source})
    assert skip.status_code == 409
    ok = (await api.patch(f"/sites/{site['id']}/status", json={"status": "archive_confirmed", "source": source})).json()
    assert ok["status"] == "archive_confirmed" and len(ok["sources"]) == 2
    assert nulls(ok) == []
    vol = (await api.post(f"/sites/{site['id']}/volunteer")).json()
    assert vol["volunteersReady"] == 1


async def test_new_site_notifies_subscribers_in_radius(api):
    near = {"lat": 52.97, "lon": 36.08, "radiusKm": 20, "topics": ["search"]}
    far = {"lat": 54.5, "lon": 36.2, "radiusKm": 20, "topics": ["search"]}
    await api.post("/subscriptions", json=near, headers={"X-Demo-User": "near"})
    await api.post("/subscriptions", json=far, headers={"X-Demo-User": "far"})
    await api.post("/subscriptions", json=near, headers={"X-Demo-User": "same-team", "X-Demo-Team-Id": "T01"})

    res = (await api.post("/sites", json=SITE, headers={"X-Demo-User": "commander"})).json()
    # Демо-подписчики вокруг Орла + «near»; «far» дальше 20 км, «same-team» — сам отряд.
    from app import models as m

    async with Session() as s:
        from sqlalchemy import select

        users = set(await s.scalars(select(m.Notification.user_key)))
    assert "near" in users
    assert "far" not in users and "same-team" not in users and "commander" not in users
    assert res["notifiedCount"] == len(users)


async def test_cors_allows_configured_origin(api):
    res = await api.options(
        "/teams",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"


async def test_needs_map_coordinates(api):
    """Карта потребностей: у демо-заявки и сборов есть координаты, «Поднять бойца» — у Крупышино."""
    request = next(r for r in (await api.get("/requests")).json() if r["id"] == "R01")
    assert (request["lat"], request["lon"]) == (53.28, 36.57)
    raise_fighter = next(f for f in (await api.get("/fundraisers")).json() if f["id"] == "F03")
    assert raise_fighter["purpose"] == "raise_fighter"
    assert (raise_fighter["lat"], raise_fighter["lon"]) == (52.74, 35.84)


async def test_memorials_and_live_photos(api):
    memorials = (await api.get("/memorials")).json()
    assert any("Тихоокеанского флота" in m["name"] for m in memorials)
    assert all(m["osmUrl"].startswith("https://www.openstreetmap.org/") for m in memorials)
    photo = (await api.get("/live-photos")).json()[0]
    assert (await api.get(f"/live-photos/{photo['id']}")).json() == photo
    assert (await api.get("/live-photos/nope")).status_code == 404


async def test_story_photos_come_with_source_and_license(api):
    story = (await api.get("/stories/ST19")).json()
    assert story["photos"][0]["src"] == "archive-photos/bolkhov-1943.jpg"
    assert story["photos"][0]["sourceUrl"].startswith("https://commons.wikimedia.org/")
    assert story["photos"][0]["license"] == "Общественное достояние"
    # у истории без снимков поля нет, а не null
    assert "photos" not in (await api.get("/stories/ST01")).json()


async def test_demo_accounts_are_seeded_without_working_passwords():
    from sqlalchemy import func, select

    from app import models_domain as md

    async with Session() as s:
        assert await s.scalar(select(func.count()).select_from(md.User)) == 15
        assert await s.scalar(select(func.count()).select_from(md.Role)) == 4
        assert await s.scalar(select(func.count()).select_from(md.UserRole)) == 15
        hashes = set((await s.scalars(select(md.User.password_hash))).all())
        assert hashes == {"!"}
        # повторный запуск ничего не дублирует
        assert await seed(s) == 0
