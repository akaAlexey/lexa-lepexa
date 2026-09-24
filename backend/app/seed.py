"""Заливает демо-данные фронта (app/seed_data.json) в базу.

Безопасно запускать при каждом старте: добавляет только записи, которых ещё нет (по id),
и никогда не перезаписывает изменённые пользователями данные.
Файл seed_data.json генерирует фронт: `npm run seed:backend` в frontend/.

    python -m app.seed
"""

import asyncio
import json
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from . import models as m
from .db import Session, engine
from .geo import NOTIFY_RADIUS_KM

DATA = Path(__file__).with_name("seed_data.json")


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _d(value: str) -> date:
    return date.fromisoformat(value)


def rows(data: dict) -> list:
    """Все строки для вставки в порядке зависимостей (отряды раньше заявок и т. д.)."""
    out: list = []
    out += [
        m.Team(
            id=t["id"],
            name=t["name"],
            region=t["region"],
            budget_goal_rub=t["budgetGoalRub"],
            budget_collected_rub=t["budgetCollectedRub"],
            found_this_month=t["foundThisMonth"],
            demo=t["demo"],
        )
        for t in data["teams"]
    ]
    out += [
        m.Grave(id=g["id"], lat=g["lat"], lon=g["lon"], full_name=g["fullName"], unit=g["unit"], demo=g["demo"])
        for g in data["graves"]
    ]
    for b in data["battles"]:
        place = b.get("place") or {}
        out.append(
            m.Battle(
                id=b["id"],
                date=_d(b["date"]),
                text=b["text"],
                archive_url=b["archiveUrl"],
                place_name=place.get("name"),
                lat=place.get("lat"),
                lon=place.get("lon"),
                demo=b["demo"],
            )
        )
    for r in data["routes"]:
        out.append(
            m.TrailRoute(
                id=r["id"],
                title=r["title"],
                summary=r["summary"],
                length_m=r["lengthM"],
                duration_min=r["durationMin"],
                path=r["path"],
                demo=r["demo"],
            )
        )
        out += [
            m.TrailPoint(
                id=p["id"],
                route_id=r["id"],
                position=i,
                kind=p["kind"],
                title=p["title"],
                lat=p["lat"],
                lon=p["lon"],
                story=p["story"],
                task=p["task"],
                sources=p["sources"],
            )
            for i, p in enumerate(r["points"])
        ]
    out += [
        m.Fundraiser(
            id=f["id"],
            team_id=f["teamId"],
            purpose=f["purpose"],
            title=f["title"],
            goal_rub=f["goalRub"],
            collected_rub=f["collectedRub"],
            demo=f["demo"],
        )
        for f in data["fundraisers"]
    ]
    out += [
        m.VolunteerRequest(
            id=r["id"],
            team_id=r["teamId"],
            title=r["title"],
            date=_d(r["date"]),
            place=r["place"],
            roles=r["roles"],
            joined=r["joined"],
            fundraiser_id=r.get("fundraiserId"),
            created_at=_dt(r["createdAt"]),
            demo=r["demo"],
        )
        for r in data["requests"]
    ]
    out += [
        m.Trip(
            id=t["id"],
            team_id=t["teamId"],
            date=_d(t["date"]),
            title=t["title"],
            place=t["place"],
            lat=t["lat"],
            lon=t["lon"],
            spots_total=t["spotsTotal"],
            spots_taken=t["spotsTaken"],
            checklist=t["checklist"],
            demo=t["demo"],
        )
        for t in data["trips"]
    ]
    out += [
        m.GroupApplication(
            id=g["id"],
            trip_id=g["tripId"],
            organization=g["organization"],
            contact_name=g["contactName"],
            contact=g["contact"],
            people_count=g["peopleCount"],
            comment=g["comment"],
            status=g["status"],
            created_at=_dt(g["createdAt"]),
            demo=g["demo"],
        )
        for g in data["groupApplications"]
    ]
    out += [
        m.ArchiveStory(
            id=s["id"],
            title=s["title"],
            place=s["place"],
            story=s["story"],
            source_text=s["sourceText"],
            author=s["author"],
            status=s["status"],
            verified_by=s.get("verifiedBy"),
            review_note=s.get("reviewNote"),
            created_at=_dt(s["createdAt"]),
            demo=s["demo"],
        )
        for s in data["stories"]
    ]
    out += [
        m.Site(
            id=x["id"],
            lat=x["lat"],
            lon=x["lon"],
            place_name=x["placeName"],
            fighters_count=x["fightersCount"],
            fighters=x["fighters"],
            unit=x["unit"],
            date_text=x["dateText"],
            circumstances=x["circumstances"],
            status=x["status"],
            sources=x["sources"],
            team_id=x.get("teamId"),
            volunteers_ready=x["volunteersReady"],
            created_at=_dt(x["createdAt"]),
            demo=x["demo"],
        )
        for x in data["sites"]
    ]
    # Демо-подписчики вокруг Орла — как seed.demoSubscribers во фронте: им уходят уведомления о новых местах.
    out += [
        m.Subscription(
            id=f"SUB-DEMO-{i + 1}",
            lat=p["lat"],
            lon=p["lon"],
            radius_km=NOTIFY_RADIUS_KM,
            topics=["search"],
            team_id=None,
            user_key=f"demo-subscriber-{i + 1}",
        )
        for i, p in enumerate(data["demoSubscribers"])
    ]
    return out


async def seed(session: AsyncSession, data: dict | None = None) -> int:
    """Вставляет недостающие записи. Возвращает, сколько добавлено."""
    data = data if data is not None else json.loads(DATA.read_text(encoding="utf-8"))
    added = 0
    for row in rows(data):
        model = type(row)
        exists = await session.scalar(select(model.id).where(model.id == row.id))
        if exists is None:
            session.add(row)
            added += 1
            await session.flush()
    await session.commit()
    return added


async def main() -> None:
    async with Session() as session:
        added = await seed(session)
    await engine.dispose()
    print(f"seed: добавлено записей — {added}")


if __name__ == "__main__":
    asyncio.run(main())
