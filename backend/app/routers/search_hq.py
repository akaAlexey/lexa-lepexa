from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models as m
from .. import schemas as sch
from .. import serializers as out
from ..db import get_session
from ..errors import found
from ..identity import ACCOUNT_PREFIX, user_key
from ..timeutil import gid

router = APIRouter(tags=["Поисковый штаб"])


@router.get("/requests", summary="Заявки на набор волонтёров, новые сверху")
async def list_requests(s: AsyncSession = Depends(get_session)):
    q = select(m.VolunteerRequest).order_by(m.VolunteerRequest.created_at.desc())
    return [out.volunteer_request(x) for x in await s.scalars(q)]


@router.post("/requests", summary="Создать заявку (командир)")
async def create_request(body: sch.NewVolunteerRequest, s: AsyncSession = Depends(get_session)):
    found(await s.get(m.Team, body.team_id), "Отряд")
    x = m.VolunteerRequest(
        id=gid("R"),
        team_id=body.team_id,
        title=body.title,
        date=body.date,
        place=body.place,
        roles=[r.model_dump() for r in body.roles],
        joined=0,
        demo=False,
    )
    s.add(x)
    await s.commit()
    await s.refresh(x)
    return out.volunteer_request(x)


@router.post("/requests/{id}/join", summary="«Стать частью команды»")
async def join_request(id: str, s: AsyncSession = Depends(get_session), user: str = Depends(user_key)):
    x = found(await s.get(m.VolunteerRequest, id), "Заявка")
    # Вошедший пользователь записывается один раз, с какого бы устройства ни нажал
    if user.startswith(ACCOUNT_PREFIX) and await s.scalar(
        select(m.VolunteerRequestJoin.id).where(
            m.VolunteerRequestJoin.request_id == id, m.VolunteerRequestJoin.user_key == user
        )
    ):
        return out.volunteer_request(x)
    x.joined += 1
    s.add(m.VolunteerRequestJoin(id=gid("RJ"), request_id=id, user_key=user))
    await s.commit()
    await s.refresh(x)
    return out.volunteer_request(x)


@router.get("/fundraisers", summary="Целевые сборы")
async def list_fundraisers(s: AsyncSession = Depends(get_session)):
    return [out.fundraiser(x) for x in await s.scalars(select(m.Fundraiser).order_by(m.Fundraiser.id))]


@router.post("/donations", summary="Пожертвование (только тестовый режим ЮKassa/CloudPayments)")
async def donate(body: sch.Donation, s: AsyncSession = Depends(get_session), user: str = Depends(user_key)):
    f = found(await s.get(m.Fundraiser, body.fundraiser_id), "Сбор")
    f.collected_rub += body.amount_rub
    payment = m.FundraiserDonation(
        id=gid("test-pay"),
        fundraiser_id=f.id,
        amount_rub=body.amount_rub,
        status="test_succeeded",
        user_key=user,
    )
    s.add(payment)
    await s.commit()
    await s.refresh(f)
    return {"paymentId": payment.id, "status": "test_succeeded", "fundraiser": out.fundraiser(f)}
