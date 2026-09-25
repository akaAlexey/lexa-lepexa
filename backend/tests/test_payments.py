"""Платежи ЮKassa на подменённом транспорте httpx: в тестах и CI нет запросов к api.yookassa.ru."""

import json
import uuid

import httpx
import pytest

from app import yookassa
from app.config import settings

FUND = "F01"


class FakeYooKassa:
    """Минимальная ЮKassa: POST /payments создаёт платёж в pending, GET отдаёт его текущее состояние."""

    def __init__(self):
        self.payments: dict[str, dict] = {}
        self.requests: list[httpx.Request] = []
        self.down = False

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if self.down:
            raise httpx.ConnectTimeout("ЮKassa недоступна", request=request)
        if request.method == "POST" and request.url.path.endswith("/payments"):
            body = json.loads(request.content)
            pid = str(uuid.uuid4())
            self.payments[pid] = {
                "id": pid,
                "status": "pending",
                "test": True,
                "paid": False,
                "amount": body["amount"],
                "description": body["description"],
                "metadata": body["metadata"],
                "confirmation": {"type": "redirect", "confirmation_url": f"https://yoomoney.ru/checkout/{pid}"},
            }
            return httpx.Response(200, json=self.payments[pid])
        pid = request.url.path.rsplit("/", 1)[-1]
        if pid not in self.payments:
            return httpx.Response(404, json={"type": "error", "description": "not found"})
        return httpx.Response(200, json=self.payments[pid])

    def set_status(self, pid: str, status: str) -> None:
        self.payments[pid]["status"] = status


@pytest.fixture
def kassa(monkeypatch):
    fake = FakeYooKassa()
    monkeypatch.setattr(yookassa, "transport", httpx.MockTransport(fake.handler))
    monkeypatch.setattr(settings, "yookassa_shop_id", "123456")
    monkeypatch.setattr(settings, "yookassa_secret_key", "test_fake-key-for-tests")
    monkeypatch.setattr(settings, "yookassa_return_url", "https://example.test/payment")
    return fake


async def collected(api) -> int:
    fundraisers = (await api.get("/fundraisers")).json()
    return next(f["collectedRub"] for f in fundraisers if f["id"] == FUND)


async def start(api, amount: int = 500) -> dict:
    r = await api.post("/payments/yookassa", json={"fundraiserId": FUND, "amountRub": amount})
    assert r.status_code == 200, r.text
    return r.json()


def webhook_body(pid: str, event: str) -> dict:
    return {"type": "notification", "event": event, "object": {"id": pid, "status": "succeeded"}}


async def test_create_payment_sends_test_payment_to_yookassa(api, kassa):
    started = await start(api, 500)
    assert started["status"] == "pending"
    assert started["confirmationUrl"].startswith("https://yoomoney.ru/checkout/")

    request = kassa.requests[0]
    assert request.headers["Authorization"].startswith("Basic ")
    uuid.UUID(request.headers["Idempotence-Key"])
    body = json.loads(request.content)
    assert body["amount"] == {"value": "500.00", "currency": "RUB"}
    assert body["capture"] is True
    # Адрес возврата — только из настроек сервера
    assert body["confirmation"] == {"type": "redirect", "return_url": "https://example.test/payment"}
    assert len(body["description"]) <= 128
    assert body["metadata"] == {"fundraiser_id": FUND, "donation_id": started["paymentId"]}


async def test_client_return_url_is_ignored(api, kassa):
    await api.post(
        "/payments/yookassa",
        json={"fundraiserId": FUND, "amountRub": 100, "returnPath": "//evil.example", "returnUrl": "https://evil"},
    )
    body = json.loads(kassa.requests[0].content)
    assert body["confirmation"]["return_url"] == "https://example.test/payment"


async def test_succeeded_credits_fundraiser_once(api, kassa):
    before = await collected(api)
    started = await start(api, 500)
    [pid] = kassa.payments

    pending = (await api.get(f"/payments/yookassa/{started['paymentId']}")).json()
    assert pending["status"] == "pending"
    assert await collected(api) == before

    kassa.set_status(pid, "succeeded")
    for _ in range(3):
        state = (await api.get(f"/payments/yookassa/{started['paymentId']}")).json()
        assert state["status"] == "succeeded"
        assert state["amountRub"] == 500
    assert state["fundraiser"]["collectedRub"] == before + 500
    assert await collected(api) == before + 500


async def test_webhook_rechecks_payment_and_is_idempotent(api, kassa):
    before = await collected(api)
    started = await start(api, 300)
    [pid] = kassa.payments

    # Тело уведомления говорит succeeded, а в ЮKassa платёж ещё pending — не зачисляем
    r = await api.post("/payments/yookassa/webhook", json=webhook_body(pid, "payment.succeeded"))
    assert r.status_code == 200
    assert await collected(api) == before

    kassa.set_status(pid, "succeeded")
    for _ in range(2):  # ЮKassa может прислать уведомление повторно
        r = await api.post("/payments/yookassa/webhook", json=webhook_body(pid, "payment.succeeded"))
        assert r.status_code == 200
    state = (await api.get(f"/payments/yookassa/{started['paymentId']}")).json()
    assert state["status"] == "succeeded"
    assert await collected(api) == before + 300


async def test_canceled_does_not_credit(api, kassa):
    before = await collected(api)
    started = await start(api, 1000)
    [pid] = kassa.payments
    kassa.set_status(pid, "canceled")

    r = await api.post("/payments/yookassa/webhook", json=webhook_body(pid, "payment.canceled"))
    assert r.status_code == 200
    state = (await api.get(f"/payments/yookassa/{started['paymentId']}")).json()
    assert state["status"] == "canceled"
    assert await collected(api) == before


async def test_webhook_ignores_unknown_and_garbage(api, kassa):
    unknown = str(uuid.uuid4())
    assert (
        await api.post("/payments/yookassa/webhook", json=webhook_body(unknown, "payment.succeeded"))
    ).status_code == 200
    assert (await api.post("/payments/yookassa/webhook", content=b"not json")).status_code == 200
    assert kassa.requests == []


async def test_foreign_payment_is_not_credited(api, kassa):
    """ЮKassa вернула платёж с другой суммой — не зачисляем."""
    before = await collected(api)
    started = await start(api, 500)
    [pid] = kassa.payments
    kassa.payments[pid].update(status="succeeded", amount={"value": "50000.00", "currency": "RUB"})
    r = await api.get(f"/payments/yookassa/{started['paymentId']}")
    assert r.status_code == 502
    await api.post("/payments/yookassa/webhook", json=webhook_body(pid, "payment.succeeded"))
    assert await collected(api) == before


async def test_yookassa_down_gives_clear_error(api, kassa, monkeypatch):
    monkeypatch.setattr(yookassa, "ATTEMPTS", 1)
    kassa.down = True
    r = await api.post("/payments/yookassa", json={"fundraiserId": FUND, "amountRub": 500})
    assert r.status_code == 502
    assert "ЮKassa" in r.json()["detail"]


async def test_missing_keys_refuse_payment(api, kassa, monkeypatch):
    monkeypatch.setattr(settings, "yookassa_secret_key", "")
    r = await api.post("/payments/yookassa", json={"fundraiserId": FUND, "amountRub": 500})
    assert r.status_code == 503
    assert kassa.requests == []


async def test_non_test_key_refuses_payment(api, kassa, monkeypatch):
    monkeypatch.setattr(settings, "yookassa_secret_key", "live_fake-key")
    r = await api.post("/payments/yookassa", json={"fundraiserId": FUND, "amountRub": 500})
    assert r.status_code == 503
    assert "test_" in r.json()["detail"]
    assert kassa.requests == []


@pytest.mark.parametrize("amount", [0, -5, 100_001])
async def test_amount_is_checked_on_server(api, kassa, amount):
    r = await api.post("/payments/yookassa", json={"fundraiserId": FUND, "amountRub": amount})
    assert r.status_code == 422
    assert kassa.requests == []


async def test_unknown_payment_id(api, kassa):
    assert (await api.get(f"/payments/yookassa/{uuid.uuid4()}")).status_code == 404
    assert (await api.get("/payments/yookassa/not-an-id")).status_code == 404


async def test_concurrent_settle_credits_once(api, kassa):
    """Вебхук и опрос статуса пришли одновременно: оба прочитали запись до зачисления."""
    from app import models as m
    from app.db import Session
    from app.routers.payments import _settle

    before = await collected(api)
    started = await start(api, 700)
    [pid] = kassa.payments
    kassa.set_status(pid, "succeeded")
    async with Session() as s1, Session() as s2:
        p1 = await s1.get(m.YooKassaPayment, started["paymentId"])
        p2 = await s2.get(m.YooKassaPayment, started["paymentId"])
        assert p1.status == p2.status == "pending"
        await _settle(s1, p1, kassa.payments[pid])
        await _settle(s2, p2, kassa.payments[pid])
    assert await collected(api) == before + 700
