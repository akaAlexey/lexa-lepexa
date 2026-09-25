"""Пожертвования через ЮKassa (только тестовый магазин): платёж → страница оплаты ЮKassa → возврат на сайт.

Сумма сбора растёт только после того, как ЮKassa подтвердила оплату (status = succeeded):
при возврате пользователя (GET статуса) или по уведомлению ЮKassa (webhook). Статус всегда
перепроверяется запросом к API ЮKassa — телу уведомления не доверяем. Зачисление — один атомарный
UPDATE по credited_at IS NULL, поэтому одновременные вебхук и опрос не добавят сумму дважды.
"""

import logging
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models as m
from .. import schemas as sch
from .. import serializers as out
from .. import yookassa
from ..config import settings
from ..db import get_session
from ..errors import found
from ..identity import user_key
from ..timeutil import now

router = APIRouter(prefix="/payments/yookassa", tags=["Пожертвования"])
# Логгер Uvicorn уже выводит INFO в журнал хостинга — там видно пришедшие вебхуки и зачисления
log = logging.getLogger("uvicorn.error")

PAYMENT_ID = re.compile(r"^[0-9a-f-]{36}$")
YOOKASSA_ID = re.compile(r"^[0-9a-f-]{20,50}$")
FINAL = ("succeeded", "canceled")


def _require_enabled() -> None:
    if not settings.yookassa_enabled:
        raise HTTPException(503, "Платежи не настроены: задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY")
    if not settings.yookassa_test_key:
        raise HTTPException(503, "Разрешён только тестовый режим ЮKassa: ключ должен начинаться с test_")


def _matches(p: m.YooKassaPayment, payment: dict) -> bool:
    """Ответ ЮKassa относится именно к этой записи: тот же id, тестовый режим, та же сумма."""
    amount = payment.get("amount") or {}
    return (
        payment.get("id") == p.yookassa_id
        and payment.get("test") is True
        and amount.get("value") == f"{p.amount_rub}.00"
        and amount.get("currency") == "RUB"
        and (payment.get("metadata") or {}).get("donation_id") == p.id
    )


async def _settle(s: AsyncSession, p: m.YooKassaPayment, payment: dict) -> None:
    """Записать статус из ответа ЮKassa; при succeeded — добавить сумму к сбору ровно один раз."""
    status = payment.get("status", "pending")
    await s.execute(
        update(m.YooKassaPayment)
        .where(m.YooKassaPayment.id == p.id, m.YooKassaPayment.status.not_in(FINAL))
        .values(status=status, updated_at=now())
    )
    if status == "succeeded":
        credited = await s.execute(
            update(m.YooKassaPayment)
            .where(m.YooKassaPayment.id == p.id, m.YooKassaPayment.credited_at.is_(None))
            .values(credited_at=now())
        )
        if credited.rowcount == 1:
            await s.execute(
                update(m.Fundraiser)
                .where(m.Fundraiser.id == p.fundraiser_id)
                .values(collected_rub=m.Fundraiser.collected_rub + p.amount_rub)
            )
            log.info("yookassa: платёж %s зачислен в сбор %s (+%s ₽)", p.id, p.fundraiser_id, p.amount_rub)
    await s.commit()
    await s.refresh(p)


@router.post("", summary="Создать тестовый платёж ЮKassa и получить ссылку на оплату")
async def create(body: sch.PaymentStart, s: AsyncSession = Depends(get_session), user: str = Depends(user_key)):
    _require_enabled()
    f = found(await s.get(m.Fundraiser, body.fundraiser_id), "Сбор")
    p = m.YooKassaPayment(
        id=str(uuid.uuid4()), fundraiser_id=f.id, amount_rub=body.amount_rub, status="new", user_key=user
    )
    s.add(p)
    await s.commit()
    try:
        # Наш id — он же Idempotence-Key: повтор запроса не создаст в ЮKassa второй платёж
        payment = await yookassa.create_payment(
            body.amount_rub,
            f"Пожертвование: {f.title}",
            settings.payment_return_url,
            {"fundraiser_id": f.id, "donation_id": p.id},
            idempotence_key=p.id,
        )
    except yookassa.YooKassaError as e:
        p.status, p.updated_at = "failed", now()
        await s.commit()
        log.warning("yookassa: платёж не создан (%s): %s", e.status, e)
        raise HTTPException(502, "Не удалось создать платёж в ЮKassa. Попробуйте позже.") from e
    p.yookassa_id = payment.get("id")
    p.status, p.updated_at = payment.get("status", "pending"), now()
    await s.commit()
    return {
        "paymentId": p.id,
        "status": p.status,
        "confirmationUrl": (payment.get("confirmation") or {}).get("confirmation_url"),
    }


@router.get("/{payment_id}", summary="Статус платежа (перепроверяется в ЮKassa)")
async def status(payment_id: str, s: AsyncSession = Depends(get_session)):
    _require_enabled()
    p = await s.get(m.YooKassaPayment, payment_id) if PAYMENT_ID.match(payment_id) else None
    if p is None or p.yookassa_id is None:
        raise HTTPException(404, "Платёж не найден")
    if p.status not in FINAL:
        try:
            payment = await yookassa.get_payment(p.yookassa_id)
        except yookassa.YooKassaError as e:
            raise HTTPException(502, "Не удалось узнать статус в ЮKassa. Попробуйте позже.") from e
        if not _matches(p, payment):
            raise HTTPException(502, "ЮKassa вернула чужой платёж")
        await _settle(s, p, payment)
    f = await s.get(m.Fundraiser, p.fundraiser_id)
    return {
        "paymentId": p.id,
        "status": p.status,
        "amountRub": p.amount_rub,
        "fundraiser": out.fundraiser(f) if f else None,
    }


@router.post("/webhook", summary="Уведомление ЮKassa о смене статуса", include_in_schema=False)
async def webhook(request: Request, s: AsyncSession = Depends(get_session)):
    """200 — уведомление обработано или не наше. 5xx — ЮKassa недоступна: она повторит уведомление."""
    _require_enabled()
    try:
        data = await request.json()
        event, yookassa_id = data.get("event"), data["object"]["id"]
    except Exception:  # noqa: BLE001 — мусор в теле: принимать нечего, повтор не поможет
        return {"ok": True}
    log.info("yookassa: вебхук %s для %s", event, yookassa_id)
    if not isinstance(yookassa_id, str) or not YOOKASSA_ID.match(yookassa_id):
        return {"ok": True}
    p = await s.scalar(select(m.YooKassaPayment).where(m.YooKassaPayment.yookassa_id == yookassa_id))
    if p is None or p.status in FINAL:
        return {"ok": True}
    try:
        payment = await yookassa.get_payment(yookassa_id)
    except yookassa.YooKassaError as e:
        raise HTTPException(502, "ЮKassa недоступна") from e
    if _matches(p, payment):
        await _settle(s, p, payment)
    return {"ok": True}
