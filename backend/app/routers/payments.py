"""Пожертвования через ЮKassa (тестовый магазин): платёж → страница оплаты ЮKassa → возврат на сайт.

Сумма сбора растёт только после того, как ЮKassa подтвердила оплату (status = succeeded):
при возврате пользователя (GET статуса) или по уведомлению ЮKassa (webhook). Статус всегда
перепроверяется запросом к API ЮKassa — телу уведомления не доверяем.
"""

import re

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models as m
from .. import schemas as sch
from .. import serializers as out
from .. import yookassa
from ..config import settings
from ..db import get_session
from ..errors import found
from ..identity import user_key

router = APIRouter(prefix="/payments/yookassa", tags=["Пожертвования"])

PAYMENT_ID = re.compile(r"^[0-9a-f-]{20,50}$")


def _require_enabled() -> None:
    if not settings.yookassa_enabled:
        raise HTTPException(503, "Платежи не настроены: задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY")


async def _settle(s: AsyncSession, payment: dict) -> m.FundraiserDonation | None:
    """Записать статус платежа; при первом «succeeded» — добавить сумму к сбору."""
    donation = await s.get(m.FundraiserDonation, payment["id"])
    if donation is None:
        return None
    status = payment.get("status", "pending")
    if status == "succeeded" and donation.status != "succeeded":
        f = await s.get(m.Fundraiser, donation.fundraiser_id)
        if f is not None:
            f.collected_rub += donation.amount_rub
    donation.status = status
    await s.commit()
    return donation


@router.post("", summary="Создать платёж ЮKassa и получить ссылку на оплату")
async def create(body: sch.YooKassaPayment, s: AsyncSession = Depends(get_session), user: str = Depends(user_key)):
    _require_enabled()
    f = found(await s.get(m.Fundraiser, body.fundraiser_id), "Сбор")
    # После оплаты ЮKassa вернёт сюда; id платежа сайт помнит сам (сохранил перед переходом)
    return_url = f"{settings.site_url.rstrip('/')}{body.return_path}"
    try:
        payment = await yookassa.create_payment(
            body.amount_rub,
            f"Пожертвование: {f.title}",
            return_url,
            {"fundraiserId": f.id},
        )
    except yookassa.YooKassaError as e:
        raise HTTPException(502, f"Не удалось создать платёж: {e}") from e
    s.add(
        m.FundraiserDonation(
            id=payment["id"],
            fundraiser_id=f.id,
            amount_rub=body.amount_rub,
            status=payment.get("status", "pending"),
            user_key=user,
        )
    )
    await s.commit()
    return {
        "paymentId": payment["id"],
        "status": payment.get("status", "pending"),
        "confirmationUrl": payment.get("confirmation", {}).get("confirmation_url"),
    }


@router.get("/{payment_id}", summary="Статус платежа (перепроверяется в ЮKassa)")
async def status(payment_id: str, s: AsyncSession = Depends(get_session)):
    _require_enabled()
    if not PAYMENT_ID.match(payment_id):
        raise HTTPException(404, "Платёж не найден")
    found(await s.get(m.FundraiserDonation, payment_id), "Платёж")
    try:
        payment = await yookassa.get_payment(payment_id)
    except yookassa.YooKassaError as e:
        raise HTTPException(502, f"Не удалось узнать статус: {e}") from e
    donation = await _settle(s, payment)
    f = await s.get(m.Fundraiser, donation.fundraiser_id) if donation else None
    return {
        "paymentId": payment_id,
        "status": payment.get("status", "pending"),
        "amountRub": donation.amount_rub if donation else None,
        "fundraiser": out.fundraiser(f) if f else None,
    }


@router.post("/webhook", summary="Уведомление ЮKassa о смене статуса", include_in_schema=False)
async def webhook(request: Request, s: AsyncSession = Depends(get_session)):
    _require_enabled()
    try:
        data = await request.json()
        payment_id = data["object"]["id"]
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, "Неверное уведомление") from e
    if not isinstance(payment_id, str) or not PAYMENT_ID.match(payment_id):
        raise HTTPException(400, "Неверное уведомление")
    try:
        payment = await yookassa.get_payment(payment_id)
    except yookassa.YooKassaError as e:
        raise HTTPException(502, str(e)) from e
    await _settle(s, payment)
    return {"ok": True}
