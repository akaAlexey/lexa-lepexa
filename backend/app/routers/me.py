"""Личное состояние аккаунта: то, что раньше жило только в браузере (профиль, записи в заявки и на
выезды, «Мои истории», прогресс тропы, подписка). Ключ — имя слота памяти фронта, значение — JSON.
Только для вошедшего пользователя; каждый видит только своё."""

import json
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models_domain import User, UserState
from ..timeutil import now
from .auth import current_user

router = APIRouter(prefix="/me", tags=["Личное состояние"])

# Имена слотов памяти фронта: «search.joinedRequests», «quest:park-3km»
KEY = re.compile(r"^[a-zA-Z][a-zA-Z0-9:._-]{0,99}$")
VALUE_MAX_BYTES = 64 * 1024
KEYS_MAX = 300


class StateChange(BaseModel):
    key: str
    value: object | None = None


@router.get("/state", summary="Личное состояние вошедшего пользователя: {ключ: значение}")
async def get_state(user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    rows = await s.scalars(select(UserState).where(UserState.user_id == user.id))
    return {r.key: r.value for r in rows}


@router.patch("/state", summary="Записать одно значение (null — удалить ключ)")
async def put_state(
    body: StateChange,
    user: User = Depends(current_user),
    s: AsyncSession = Depends(get_session),
):
    if not KEY.match(body.key):
        raise HTTPException(422, {"message": "Недопустимый ключ", "field": "key"})
    row = await s.get(UserState, (user.id, body.key))
    if body.value is None:
        if row is not None:
            await s.delete(row)
            await s.commit()
        return {"ok": True}
    if len(json.dumps(body.value, ensure_ascii=False).encode("utf-8")) > VALUE_MAX_BYTES:
        raise HTTPException(413, {"message": "Слишком большое значение", "field": "value"})
    if row is None:
        count = await s.scalar(select(func.count()).select_from(UserState).where(UserState.user_id == user.id))
        if count >= KEYS_MAX:
            raise HTTPException(409, {"message": f"Не больше {KEYS_MAX} записей", "field": "key"})
        s.add(UserState(user_id=user.id, key=body.key, value=body.value, updated_at=now()))
    else:
        row.value = body.value
        row.updated_at = now()
    await s.commit()
    return {"ok": True}
