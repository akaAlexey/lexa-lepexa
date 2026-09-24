"""Справочные данные только для чтения: памятники войны (OpenStreetMap) и «живые фото».

Лежат в seed_data.json (выгружает фронт: `npm run seed:backend`), в базу не пишутся:
их никто не редактирует, а обновляются они вместе с выгрузкой.
"""

import json
from functools import cache

from fastapi import APIRouter

from ..errors import fail
from ..seed import DATA

router = APIRouter(tags=["Справочник"])


@cache
def _data() -> dict:
    return json.loads(DATA.read_text(encoding="utf-8"))


@router.get("/memorials", summary="Памятники войны в регионе (OpenStreetMap)")
async def list_memorials():
    return _data()["memorials"]


@router.get("/live-photos", summary="«Живые фото»: снимки с QR-кодом и ролики-реконструкции")
async def list_live_photos():
    return _data()["livePhotos"]


@router.get("/live-photos/{id}", summary="Одно «живое фото»")
async def get_live_photo(id: str):
    for photo in _data()["livePhotos"]:
        if photo["id"] == id:
            return photo
    fail(404, "«Живое фото» не найдено")
