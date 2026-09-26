from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models as m
from .. import schemas as sch
from .. import serializers as out
from ..db import get_session
from ..errors import fail, found
from ..identity import ACCOUNT_PREFIX, user_key
from ..timeutil import gid

router = APIRouter(tags=["Выходные с поисковиком"])


@router.get("/trips", summary="Выезды «Выходные с поисковиком» по дате")
async def list_trips(s: AsyncSession = Depends(get_session)):
    return [out.trip(x) for x in await s.scalars(select(m.Trip).order_by(m.Trip.date))]


@router.get("/trips/{id}", summary="Выезд")
async def get_trip(id: str, s: AsyncSession = Depends(get_session)):
    return out.trip(found(await s.get(m.Trip, id), "Выезд"))


@router.post("/trips/{id}/register", summary="Записаться на выезд")
async def register_trip(id: str, s: AsyncSession = Depends(get_session), user: str = Depends(user_key)):
    # Блокировка строки: два одновременных запроса не займут последнее место дважды (в Postgres).
    trip = found(await s.get(m.Trip, id, with_for_update=True), "Выезд")
    # Вошедший пользователь занимает одно место, с какого бы устройства ни записался
    if user.startswith(ACCOUNT_PREFIX) and await s.scalar(
        select(m.TripRegistration.id).where(m.TripRegistration.trip_id == id, m.TripRegistration.user_key == user)
    ):
        return out.trip(trip)
    if trip.spots_taken >= trip.spots_total:
        fail(409, "Мест нет")
    trip.spots_taken += 1
    s.add(m.TripRegistration(id=gid("TR"), trip_id=id, user_key=user))
    await s.commit()
    await s.refresh(trip)
    return out.trip(trip)


@router.get(
    "/group-applications",
    summary="Коллективные заявки на выезды (командиру — заявки на выезды его отряда)",
)
async def list_group_applications(s: AsyncSession = Depends(get_session)):
    q = select(m.GroupApplication).order_by(m.GroupApplication.created_at.desc())
    return [out.group_application(x) for x in await s.scalars(q)]


@router.post(
    "/group-applications",
    summary="Подать коллективную заявку на выезд (школа, клуб, семейная группа)",
)
async def create_group_application(body: sch.NewGroupApplication, s: AsyncSession = Depends(get_session)):
    found(await s.get(m.Trip, body.trip_id), "Выезд")
    x = m.GroupApplication(
        id=gid("G"),
        trip_id=body.trip_id,
        organization=body.organization,
        contact_name=body.contact_name,
        contact=body.contact,
        people_count=body.people_count,
        comment=body.comment,
        status="pending",
        demo=False,
    )
    s.add(x)
    await s.commit()
    await s.refresh(x)
    return out.group_application(x)


@router.patch("/group-applications/{id}", summary="Решение командира: подтвердить или попросить уточнить")
async def decide_group_application(id: str, body: sch.GroupApplicationDecision, s: AsyncSession = Depends(get_session)):
    x = found(await s.get(m.GroupApplication, id), "Заявка")
    x.status = body.status
    await s.commit()
    await s.refresh(x)
    return out.group_application(x)
