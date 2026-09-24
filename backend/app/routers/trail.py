from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models as m
from .. import serializers as out
from ..db import get_session
from ..errors import found

router = APIRouter(tags=["Семейная тропа"])


async def _points(s: AsyncSession, route_ids: list[str]) -> dict[str, list[m.TrailPoint]]:
    by_route: dict[str, list[m.TrailPoint]] = {rid: [] for rid in route_ids}
    if route_ids:
        for p in await s.scalars(select(m.TrailPoint).where(m.TrailPoint.route_id.in_(route_ids))):
            by_route[p.route_id].append(p)
    return by_route


@router.get("/routes", summary="Семейные маршруты")
async def list_routes(s: AsyncSession = Depends(get_session)):
    routes = list(await s.scalars(select(m.TrailRoute).order_by(m.TrailRoute.id)))
    points = await _points(s, [r.id for r in routes])
    return [out.route(r, points[r.id]) for r in routes]


@router.get("/routes/{id}", summary="Маршрут с точками")
async def get_route(id: str, s: AsyncSession = Depends(get_session)):
    route = found(await s.get(m.TrailRoute, id), "Маршрут")
    return out.route(route, (await _points(s, [id]))[id])
