import asyncio
import json
import time

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models as m
from .. import schemas as sch
from .. import serializers as out
from ..config import settings
from ..db import Session, get_session
from ..errors import fail, found
from ..geo import distance_km
from ..identity import team_id, user_key
from ..timeutil import gid, now

router = APIRouter(tags=["Последний бой"])

# Статус меняется только вперёд, по одному шагу (как canTransition во фронте).
STATUS_ORDER = ["found_needs_check", "archive_confirmed", "remains_raised"]
KEEPALIVE_SECONDS = 15


def notification_text(km: float) -> tuple[str, str]:
    """Текст из кейса, как siteFoundNotificationText во фронте."""
    shown = max(1, round(km))
    return "Последний бой", f"В {shown} км от вас обнаружено место гибели бойца. Требуется помощь в идентификации"


@router.get("/sites", summary="Места гибели «Последний бой»")
async def list_sites(s: AsyncSession = Depends(get_session)):
    return [out.site(x) for x in await s.scalars(select(m.Site).order_by(m.Site.created_at.desc()))]


@router.get("/sites/{id}", summary="Место гибели")
async def get_site(id: str, s: AsyncSession = Depends(get_session)):
    return out.site(found(await s.get(m.Site, id), "Место"))


@router.post(
    "/sites",
    summary="Добавить место гибели; сервер рассылает уведомления подписчикам в радиусе 20 км",
)
async def create_site(
    body: sch.NewSite,
    s: AsyncSession = Depends(get_session),
    user: str = Depends(user_key),
):
    if body.team_id is not None:
        found(await s.get(m.Team, body.team_id), "Отряд")
    site = m.Site(
        id=gid("SITE"),
        lat=body.lat,
        lon=body.lon,
        place_name=body.place_name,
        fighters_count=body.fighters_count,
        fighters=[f.stored() for f in body.fighters],
        unit=body.unit,
        date_text=body.date_text,
        circumstances=body.circumstances,
        status="found_needs_check",
        sources=[src.stored() for src in body.sources],
        team_id=body.team_id,
        volunteers_ready=0,
        demo=False,
    )
    s.add(site)
    await s.flush()

    notified = 0
    for sub in await s.scalars(select(m.Subscription)):
        # Отряд не оповещает сам себя, автор точки — тоже.
        if (body.team_id and sub.team_id == body.team_id) or sub.user_key == user:
            continue
        km = distance_km(sub.lat, sub.lon, body.lat, body.lon)
        if km > sub.radius_km:
            continue
        title, text = notification_text(km)
        s.add(
            m.Notification(
                id=gid("NTF"),
                kind="site_found",
                site_id=site.id,
                user_key=sub.user_key,
                distance_km=round(km, 1),
                title=title,
                body=text,
            )
        )
        notified += 1

    await s.commit()
    await s.refresh(site)
    return {"site": out.site(site), "notifiedCount": notified}


@router.patch("/sites/{id}/status", summary="Сменить статус (только вперёд)")
async def change_site_status(id: str, body: sch.SiteStatusChange, s: AsyncSession = Depends(get_session)):
    site = found(await s.get(m.Site, id), "Место")
    if STATUS_ORDER.index(body.status) != STATUS_ORDER.index(site.status) + 1:
        fail(409, f"Переход {site.status} → {body.status} запрещён")
    site.status = body.status
    # JSON-колонку нужно переприсвоить, иначе SQLAlchemy не заметит изменение списка.
    site.sources = [*site.sources, body.source.stored()]
    await s.commit()
    await s.refresh(site)
    return out.site(site)


@router.post("/sites/{id}/volunteer", summary="«Я готов помочь в подъёме»")
async def volunteer_for_site(id: str, s: AsyncSession = Depends(get_session)):
    site = found(await s.get(m.Site, id), "Место")
    site.volunteers_ready += 1
    await s.commit()
    await s.refresh(site)
    return out.site(site)


@router.post("/subscriptions", summary="Подписка на поисковую деятельность в радиусе")
async def subscribe(
    body: sch.SubscriptionIn,
    s: AsyncSession = Depends(get_session),
    user: str = Depends(user_key),
    team: str | None = Depends(team_id),
):
    sub = m.Subscription(
        id=gid("SUB"),
        lat=body.lat,
        lon=body.lon,
        radius_km=body.radius_km,
        topics=list(body.topics),
        team_id=team,
        user_key=user,
    )
    s.add(sub)
    await s.commit()
    return {"id": sub.id}


@router.delete("/subscriptions/{id}", summary="Отписаться")
async def unsubscribe(id: str, s: AsyncSession = Depends(get_session)):
    sub = found(await s.get(m.Subscription, id), "Подписка")
    await s.delete(sub)
    await s.commit()
    return {"ok": True}


@router.get(
    "/notifications/stream",
    summary="Поток уведомлений (text/event-stream, каждое событие — AppNotification в data)",
)
async def notification_stream(
    request: Request,
    user: str = Depends(user_key),
    last_event_id: str | None = Header(default=None),
):
    async def events():
        # Только новые уведомления; после обрыва браузер сам присылает Last-Event-ID — продолжаем с него.
        since = now()
        if last_event_id:
            async with Session() as s:
                last = await s.get(m.Notification, last_event_id)
                if last is not None:
                    since = last.created_at
        seen: set[str] = {last_event_id} if last_event_id else set()
        yield "retry: 3000\n\n"
        idle_since = time.monotonic()
        while not await request.is_disconnected():
            async with Session() as s:
                q = (
                    select(m.Notification)
                    .where(m.Notification.user_key == user, m.Notification.created_at >= since)
                    .order_by(m.Notification.created_at)
                )
                for n in await s.scalars(q):
                    if n.id in seen:
                        continue
                    seen.add(n.id)
                    idle_since = time.monotonic()
                    yield f"id: {n.id}\ndata: {json.dumps(out.notification(n), ensure_ascii=False)}\n\n"
            if time.monotonic() - idle_since > KEEPALIVE_SECONDS:
                idle_since = time.monotonic()
                yield ": ping\n\n"  # комментарий SSE: прокси не рвут «тихое» соединение
            await asyncio.sleep(settings.sse_poll_seconds)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
