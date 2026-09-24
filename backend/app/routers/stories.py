from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models as m
from .. import schemas as sch
from .. import serializers as out
from ..db import get_session
from ..errors import fail, found
from ..timeutil import gid

router = APIRouter(tags=["Народный архив"])

AWAITING_REVIEW = {"pending", "clarify"}


@router.get(
    "/stories",
    summary="Истории людей и мест. Всем — подтверждённые; автору — его; проверяющим — очередь",
)
async def list_stories(s: AsyncSession = Depends(get_session)):
    # Как и мок фронта, отдаёт все истории: кому что показывать, решает экран по роли.
    # С настоящим входом фильтр переедет сюда.
    q = select(m.ArchiveStory).order_by(m.ArchiveStory.created_at.desc())
    return [out.story(x) for x in await s.scalars(q)]


@router.get("/stories/{id}", summary="История")
async def get_story(id: str, s: AsyncSession = Depends(get_session)):
    return out.story(found(await s.get(m.ArchiveStory, id), "История"))


@router.post("/stories", summary="Отправить историю на проверку")
async def create_story(body: sch.NewArchiveStory, s: AsyncSession = Depends(get_session)):
    x = m.ArchiveStory(
        id=gid("ST"),
        title=body.title,
        place=body.place,
        story=body.story,
        source_text=body.source_text,
        author=body.author,
        status="pending",
        demo=False,
    )
    s.add(x)
    await s.commit()
    await s.refresh(x)
    return out.story(x)


@router.post("/stories/{id}/review", summary="Решение краеведа или отряда по истории")
async def review_story(id: str, body: sch.ArchiveReview, s: AsyncSession = Depends(get_session)):
    x = found(await s.get(m.ArchiveStory, id), "История")
    if x.status not in AWAITING_REVIEW:
        fail(409, "История уже рассмотрена")
    if body.decision == "verified" and not x.source_text.strip():
        fail(422, "Без источника подтвердить нельзя")
    x.status = body.decision
    x.verified_by = body.reviewer
    if body.note.strip():
        x.review_note = body.note.strip()
    await s.commit()
    await s.refresh(x)
    return out.story(x)
