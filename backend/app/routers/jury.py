from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models as m
from .. import serializers as out
from ..db import get_session
from ..timeutil import now

router = APIRouter(tags=["Данные жюри"])


@router.get("/graves", summary="Захоронения (данные жюри)")
async def list_graves(s: AsyncSession = Depends(get_session)):
    return [out.grave(x) for x in await s.scalars(select(m.Grave).order_by(m.Grave.id))]


@router.get("/battles", summary="Бои (данные жюри)")
async def list_battles(s: AsyncSession = Depends(get_session)):
    return [out.battle(x) for x in await s.scalars(select(m.Battle).order_by(m.Battle.date))]


@router.get("/teams", summary="Поисковые отряды (данные жюри)")
async def list_teams(s: AsyncSession = Depends(get_session)):
    return [out.team(x) for x in await s.scalars(select(m.Team).order_by(m.Team.id))]


@router.get("/stats/search", summary="Найдено бойцов за текущий месяц")
async def search_stats(s: AsyncSession = Depends(get_session)):
    total = await s.scalar(select(func.coalesce(func.sum(m.Team.found_this_month), 0)))
    return {"month": now().strftime("%Y-%m"), "foundThisMonth": int(total or 0)}
