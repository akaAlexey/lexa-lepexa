"""Клиент ЮKassa API v3: создать платёж и узнать его статус.

Ключи — только из окружения (settings.yookassa_shop_id / yookassa_secret_key). Без внешних зависимостей:
urllib в отдельном потоке, чтобы не блокировать event loop.
"""

import asyncio
import base64
import json
import urllib.error
import urllib.request
import uuid

from .config import settings


class YooKassaError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def _auth() -> str:
    raw = f"{settings.yookassa_shop_id}:{settings.yookassa_secret_key}".encode()
    return "Basic " + base64.b64encode(raw).decode()


def _request(method: str, path: str, body: dict | None = None, idempotence_key: str | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(settings.yookassa_api_url + path, data=data, method=method)
    req.add_header("Authorization", _auth())
    req.add_header("Content-Type", "application/json")
    if idempotence_key:
        req.add_header("Idempotence-Key", idempotence_key)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read().decode()).get("description", "")
        except Exception:  # noqa: BLE001 — тело ошибки может быть не JSON
            detail = ""
        raise YooKassaError(e.code, detail or f"ЮKassa ответила {e.code}") from e
    except urllib.error.URLError as e:
        raise YooKassaError(502, "ЮKassa недоступна") from e


async def create_payment(amount_rub: int, description: str, return_url: str, metadata: dict) -> dict:
    body = {
        "amount": {"value": f"{amount_rub}.00", "currency": "RUB"},
        "capture": True,
        "confirmation": {"type": "redirect", "return_url": return_url},
        "description": description[:128],
        "metadata": metadata,
    }
    return await asyncio.to_thread(_request, "POST", "/payments", body, str(uuid.uuid4()))


async def get_payment(payment_id: str) -> dict:
    return await asyncio.to_thread(_request, "GET", f"/payments/{payment_id}")
