"""Семейный архив (A7): бойцы семьи и найденные записи вошедшего пользователя.

Правила — как в frontend/src/domain/familyArchive.ts: сервер проверяет всё заново,
чужие ссылки (не «Память народа», ОБД «Мемориал», «Подвиг народа») не принимает.
Архив виден только владельцу: чужой боец для него — 404, а не 403.
"""

import re
from urllib.parse import urlsplit, urlunsplit

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models_domain import FamilyFighter, FamilyRecord, User
from ..timeutil import gid, iso_z, now
from .auth import current_user

router = APIRouter(prefix="/family", tags=["Семейный архив"])

BIRTH_YEAR_MIN = 1860
BIRTH_YEAR_MAX = 1935
NAME_MAX = 60
RELATION_MAX = 60
NOTE_MAX = 1000
RECORD_TITLE_MAX = 120
FIGHTERS_MAX = 200
RECORDS_MAX = 50

SOURCES = {
    "pamyat-naroda.ru": "«Память народа»",
    "obd-memorial.ru": "ОБД «Мемориал»",
    "podvignaroda.ru": "«Подвиг народа»",
}

# Как NAME во фронте (/^[\p{L}\s'’-]*$/u): буквы любого алфавита, пробел, дефис, апостроф
NAME = re.compile(r"^(?:[^\W\d_]|[\s'’-])*$")
URL_MAX = 500


class FighterIn(BaseModel):
    lastName: str
    firstName: str = ""
    middleName: str = ""
    birthYear: int | None = None
    relation: str = ""
    note: str = ""


class RecordIn(BaseModel):
    url: str
    title: str = ""


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def clean_text(value: str) -> str:
    lines = [clean(line) for line in re.split(r"\r?\n", value)]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def invalid(field: str, message: str) -> HTTPException:
    return HTTPException(422, {"message": message, "field": field})


def check_name(value: str, field: str, required: bool, what: str) -> str:
    value = clean(value)
    if not value:
        if required:
            raise invalid(field, f"Укажите {what}")
        return ""
    if not NAME.match(value):
        raise invalid(field, "Только буквы, пробел, дефис и апостроф")
    if not 2 <= len(value) <= NAME_MAX:
        raise invalid(field, f"От 2 до {NAME_MAX} символов")
    return value


def checked(body: FighterIn) -> dict:
    if body.birthYear is not None and not BIRTH_YEAR_MIN <= body.birthYear <= BIRTH_YEAR_MAX:
        raise invalid("birthYear", f"Год — 4 цифры, от {BIRTH_YEAR_MIN} до {BIRTH_YEAR_MAX}")
    relation = clean(body.relation)
    if len(relation) > RELATION_MAX:
        raise invalid("relation", f"Не длиннее {RELATION_MAX} символов")
    note = clean_text(body.note)
    if len(note) > NOTE_MAX:
        raise invalid("note", f"Не длиннее {NOTE_MAX} символов")
    return {
        "last_name": check_name(body.lastName, "lastName", True, "фамилию"),
        "first_name": check_name(body.firstName, "firstName", False, "имя"),
        "middle_name": check_name(body.middleName, "middleName", False, "отчество"),
        "birth_year": body.birthYear,
        "relation": relation,
        "note": note,
    }


def record_source(url: str) -> tuple[str, str] | None:
    """Ссылка → (нормализованный адрес, название базы). Проверка по hostname, а не подстрокой."""
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return None
    if parts.scheme not in ("http", "https") or not parts.hostname:
        return None
    host = parts.hostname.lower()
    for base, title in SOURCES.items():
        if host == base or host.endswith("." + base):
            # Как new URL(url).href во фронте: хост строчными, пустой путь — «/»
            path = parts.path or "/"
            return urlunsplit((parts.scheme, parts.netloc.lower(), path, parts.query, parts.fragment)), title
    return None


def record_out(r: FamilyRecord) -> dict:
    return {"id": r.id, "url": r.url, "title": r.title}


def fighter_out(f: FamilyFighter, records: list[FamilyRecord]) -> dict:
    out = {
        "id": f.id,
        "lastName": f.last_name,
        "firstName": f.first_name,
        "middleName": f.middle_name,
        "relation": f.relation,
        "note": f.note,
        "records": [record_out(r) for r in records],
        "createdAt": iso_z(f.created_at),
    }
    if f.birth_year is not None:
        out["birthYear"] = f.birth_year
    return out


async def records_of(s: AsyncSession, fighter_ids: list[str]) -> dict[str, list[FamilyRecord]]:
    by: dict[str, list[FamilyRecord]] = {i: [] for i in fighter_ids}
    if fighter_ids:
        rows = await s.scalars(
            select(FamilyRecord)
            .where(FamilyRecord.fighter_id.in_(fighter_ids))
            .order_by(FamilyRecord.created_at, FamilyRecord.id)
        )
        for r in rows:
            by[r.fighter_id].append(r)
    return by


async def own_fighter(s: AsyncSession, user: User, fighter_id: str) -> FamilyFighter:
    fighter = await s.get(FamilyFighter, fighter_id)
    if fighter is None or fighter.user_id != user.id:
        raise HTTPException(404, "Боец не найден в архиве")
    return fighter


async def one(s: AsyncSession, fighter: FamilyFighter) -> dict:
    return fighter_out(fighter, (await records_of(s, [fighter.id]))[fighter.id])


@router.get("/fighters", summary="Бойцы семьи вошедшего пользователя")
async def list_fighters(user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    fighters = list(
        await s.scalars(
            select(FamilyFighter)
            .where(FamilyFighter.user_id == user.id)
            .order_by(FamilyFighter.created_at, FamilyFighter.id)
        )
    )
    by = await records_of(s, [f.id for f in fighters])
    return [fighter_out(f, by[f.id]) for f in fighters]


@router.post("/fighters", status_code=201, summary="Добавить бойца в семейный архив")
async def create_fighter(
    body: FighterIn,
    user: User = Depends(current_user),
    s: AsyncSession = Depends(get_session),
):
    values = checked(body)
    count = await s.scalar(select(func.count()).select_from(FamilyFighter).where(FamilyFighter.user_id == user.id))
    if count >= FIGHTERS_MAX:
        raise HTTPException(409, f"В архиве уже {FIGHTERS_MAX} бойцов")
    at = now()
    fighter = FamilyFighter(id=gid("FF"), user_id=user.id, created_at=at, updated_at=at, **values)
    s.add(fighter)
    await s.commit()
    return fighter_out(fighter, [])


@router.patch("/fighters/{fighter_id}", summary="Исправить сведения о бойце")
async def update_fighter(
    fighter_id: str,
    body: FighterIn,
    user: User = Depends(current_user),
    s: AsyncSession = Depends(get_session),
):
    fighter = await own_fighter(s, user, fighter_id)
    for key, value in checked(body).items():
        setattr(fighter, key, value)
    fighter.updated_at = now()
    await s.commit()
    return await one(s, fighter)


@router.post("/fighters/{fighter_id}/delete", summary="Удалить бойца вместе с его записями")
async def delete_fighter(
    fighter_id: str,
    user: User = Depends(current_user),
    s: AsyncSession = Depends(get_session),
):
    fighter = await own_fighter(s, user, fighter_id)
    for r in (await records_of(s, [fighter.id]))[fighter.id]:
        await s.delete(r)
    await s.delete(fighter)
    await s.commit()
    return {"ok": True}


@router.post("/fighters/{fighter_id}/records", status_code=201, summary="Добавить найденную запись")
async def add_record(
    fighter_id: str,
    body: RecordIn,
    user: User = Depends(current_user),
    s: AsyncSession = Depends(get_session),
):
    fighter = await own_fighter(s, user, fighter_id)
    if not body.url.strip():
        raise invalid("url", "Вставьте ссылку на страницу документа")
    if len(body.url.strip()) > URL_MAX:
        raise invalid("url", f"Ссылка длиннее {URL_MAX} символов")
    source = record_source(body.url)
    if source is None:
        raise invalid("url", "Нужна ссылка на «Память народа», ОБД «Мемориал» или «Подвиг народа»")
    url, base = source
    title = clean(body.title)
    if len(title) > RECORD_TITLE_MAX:
        raise invalid("title", f"Не длиннее {RECORD_TITLE_MAX} символов")
    existing = (await records_of(s, [fighter.id]))[fighter.id]
    if any(r.url == url for r in existing):
        raise HTTPException(409, {"message": "Эта запись уже добавлена", "field": "url"})
    if len(existing) >= RECORDS_MAX:
        raise HTTPException(409, f"У бойца уже {RECORDS_MAX} записей")
    s.add(FamilyRecord(id=gid("FR"), fighter_id=fighter.id, url=url, title=title or base, created_at=now()))
    fighter.updated_at = now()
    await s.commit()
    return await one(s, fighter)


@router.post("/fighters/{fighter_id}/records/{record_id}/delete", summary="Удалить найденную запись")
async def delete_record(
    fighter_id: str,
    record_id: str,
    user: User = Depends(current_user),
    s: AsyncSession = Depends(get_session),
):
    fighter = await own_fighter(s, user, fighter_id)
    record = await s.get(FamilyRecord, record_id)
    if record is None or record.fighter_id != fighter.id:
        raise HTTPException(404, "Запись не найдена")
    await s.delete(record)
    fighter.updated_at = now()
    await s.commit()
    return await one(s, fighter)


@router.get("/fighters/{fighter_id}", summary="Боец семейного архива")
async def get_fighter(
    fighter_id: str,
    user: User = Depends(current_user),
    s: AsyncSession = Depends(get_session),
):
    return await one(s, await own_fighter(s, user, fighter_id))
