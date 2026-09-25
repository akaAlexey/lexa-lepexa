"""Клиент ЮKassa API v3 (только тестовый магазин): создать платёж и узнать его статус.

Ключи — только из окружения (settings.yookassa_shop_id / yookassa_secret_key), во фронт не попадают.
Сетевые сбои и 5xx повторяются с тем же Idempotence-Key — ЮKassa не создаст второй платёж.
"""

import asyncio

import httpx

from .config import settings

TIMEOUT = httpx.Timeout(15.0, connect=5.0)
ATTEMPTS = 3
# Тесты подставляют сюда httpx.MockTransport — в CI нет запросов к ЮKassa.
transport: httpx.AsyncBaseTransport | None = None


class YooKassaError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


async def _request(method: str, path: str, body: dict | None = None, idempotence_key: str | None = None) -> dict:
    headers = {"Idempotence-Key": idempotence_key} if idempotence_key else {}
    async with httpx.AsyncClient(
        base_url=settings.yookassa_api_url,
        auth=(settings.yookassa_shop_id, settings.yookassa_secret_key),
        timeout=TIMEOUT,
        transport=transport,
    ) as client:
        for attempt in range(1, ATTEMPTS + 1):
            try:
                resp = await client.request(method, path, json=body, headers=headers)
            except httpx.TransportError as e:
                if attempt == ATTEMPTS:
                    raise YooKassaError(502, "ЮKassa недоступна") from e
            else:
                if resp.status_code < 500 or attempt == ATTEMPTS:
                    break
            await asyncio.sleep(0.5 * attempt)
    if resp.is_success:
        return resp.json()
    try:
        detail = resp.json().get("description", "")
    except ValueError:  # тело ошибки может быть не JSON
        detail = ""
    raise YooKassaError(resp.status_code, detail or f"ЮKassa ответила {resp.status_code}")


async def create_payment(
    amount_rub: int, description: str, return_url: str, metadata: dict, idempotence_key: str
) -> dict:
    body = {
        "amount": {"value": f"{amount_rub}.00", "currency": "RUB"},
        "capture": True,
        "confirmation": {"type": "redirect", "return_url": return_url},
        "description": description[:128],
        "metadata": metadata,
    }
    return await _request("POST", "/payments", body, idempotence_key)


async def get_payment(payment_id: str) -> dict:
    return await _request("GET", f"/payments/{payment_id}")
