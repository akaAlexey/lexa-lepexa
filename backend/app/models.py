"""Таблицы, с которыми работает API фронта (слой совместимости с контрактом frontend/src/contract).

Первые шесть таблиц созданы миграцией 0001 (и расширены в 0002), остальные — миграцией 0003.
Вложенные структуры, которые фронт всегда получает целиком (линия маршрута, задание на точке,
чек-лист выезда, источники), хранятся в JSON-колонках.
"""

from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from . import models_domain  # noqa: F401 — регистрирует users и остальную целевую схему в метаданных
from .db import Base
from .timeutil import now

# ---------- Данные жюри (0001) ----------


class Team(Base):
    __tablename__ = "teams"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    region: Mapped[str] = mapped_column(String(255))
    budget_goal_rub: Mapped[int] = mapped_column(Integer)
    budget_collected_rub: Mapped[int] = mapped_column(Integer)
    found_this_month: Mapped[int] = mapped_column(Integer)
    demo: Mapped[bool] = mapped_column(Boolean)


class Grave(Base):
    __tablename__ = "graves"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    full_name: Mapped[str] = mapped_column(String(255))
    unit: Mapped[str] = mapped_column(String(255))
    demo: Mapped[bool] = mapped_column(Boolean)


class Battle(Base):
    __tablename__ = "battles"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    date: Mapped[date] = mapped_column(Date)
    text: Mapped[str] = mapped_column(Text)
    archive_url: Mapped[str] = mapped_column(Text)
    place_name: Mapped[str | None] = mapped_column(String(255))
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    demo: Mapped[bool] = mapped_column(Boolean)


# ---------- Последний бой (0001, 0002) ----------


class Site(Base):
    __tablename__ = "last_battle_sites"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    place_name: Mapped[str] = mapped_column(String(255))
    fighters_count: Mapped[int] = mapped_column(Integer)
    fighters: Mapped[list] = mapped_column(JSON)
    unit: Mapped[str] = mapped_column(String(255))
    date_text: Mapped[str] = mapped_column(String(255))
    circumstances: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50))
    sources: Mapped[list] = mapped_column(JSON)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"))
    volunteers_ready: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    demo: Mapped[bool] = mapped_column(Boolean)


class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    radius_km: Mapped[float] = mapped_column(Float)
    topics: Mapped[list] = mapped_column(JSON)
    team_id: Mapped[str | None] = mapped_column(String(50))
    user_key: Mapped[str] = mapped_column(String(255))


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    kind: Mapped[str] = mapped_column(String(50))
    site_id: Mapped[str] = mapped_column(ForeignKey("last_battle_sites.id"))
    user_key: Mapped[str] = mapped_column(String(255))
    distance_km: Mapped[float] = mapped_column(Float)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    # Поля целевой схемы (0002); API фронта их пока не использует.
    user_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.id"))
    type: Mapped[str | None] = mapped_column(String(50))
    message: Mapped[str | None] = mapped_column(Text)
    data: Mapped[dict | None] = mapped_column(JSON)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------- Семейная тропа (0003) ----------


class TrailRoute(Base):
    __tablename__ = "trail_routes"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    length_m: Mapped[int] = mapped_column(Integer)
    duration_min: Mapped[int] = mapped_column(Integer)
    path: Mapped[list] = mapped_column(JSON)
    demo: Mapped[bool] = mapped_column(Boolean)


class TrailPoint(Base):
    __tablename__ = "trail_points"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    route_id: Mapped[str] = mapped_column(ForeignKey("trail_routes.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(255))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    story: Mapped[str] = mapped_column(Text)
    task: Mapped[dict] = mapped_column(JSON)
    sources: Mapped[list] = mapped_column(JSON)


# ---------- Поисковый штаб (0003) ----------


class VolunteerRequest(Base):
    __tablename__ = "volunteer_requests"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    date: Mapped[date] = mapped_column(Date)
    place: Mapped[str] = mapped_column(String(255))
    roles: Mapped[list] = mapped_column(JSON)
    joined: Mapped[int] = mapped_column(Integer, default=0)
    fundraiser_id: Mapped[str | None] = mapped_column(String(50))
    # Где нужны люди — метка на карте потребностей (0004)
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    demo: Mapped[bool] = mapped_column(Boolean)


class VolunteerRequestJoin(Base):
    """Кто нажал «Стать частью команды» — счётчик joined считается и хранится в заявке."""

    __tablename__ = "volunteer_request_joins"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    request_id: Mapped[str] = mapped_column(ForeignKey("volunteer_requests.id", ondelete="CASCADE"), index=True)
    user_key: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Fundraiser(Base):
    __tablename__ = "fundraisers"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    purpose: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(255))
    goal_rub: Mapped[int] = mapped_column(Integer)
    collected_rub: Mapped[int] = mapped_column(Integer, default=0)
    # Куда пойдут деньги — метка на карте потребностей (0004)
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    demo: Mapped[bool] = mapped_column(Boolean)


class FundraiserDonation(Base):
    """Тестовый платёж (реальных платежей нет — только тестовый режим провайдера)."""

    __tablename__ = "fundraiser_donations"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    fundraiser_id: Mapped[str] = mapped_column(ForeignKey("fundraisers.id", ondelete="CASCADE"), index=True)
    amount_rub: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30))
    user_key: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class YooKassaPayment(Base):
    """Платёж ЮKassa (тестовый магазин) в сбор. Сумма зачисляется в сбор один раз — при первом succeeded (0006)."""

    __tablename__ = "yookassa_payments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # наш id (uuid4), он же Idempotence-Key
    yookassa_id: Mapped[str | None] = mapped_column(String(50), unique=True)
    fundraiser_id: Mapped[str] = mapped_column(ForeignKey("fundraisers.id", ondelete="CASCADE"), index=True)
    amount_rub: Mapped[int] = mapped_column(Integer)
    # new → pending → succeeded | canceled; failed — ЮKassa не создала платёж
    status: Mapped[str] = mapped_column(String(30))
    credited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_key: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


# ---------- Выходные с поисковиком (0003) ----------


class Trip(Base):
    __tablename__ = "trips"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    title: Mapped[str] = mapped_column(String(255))
    place: Mapped[str] = mapped_column(String(255))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    spots_total: Mapped[int] = mapped_column(Integer)
    spots_taken: Mapped[int] = mapped_column(Integer, default=0)
    checklist: Mapped[list] = mapped_column(JSON)
    demo: Mapped[bool] = mapped_column(Boolean)


class TripRegistration(Base):
    __tablename__ = "trip_registrations"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    trip_id: Mapped[str] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    user_key: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class GroupApplication(Base):
    __tablename__ = "group_applications"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    trip_id: Mapped[str] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    organization: Mapped[str] = mapped_column(String(255))
    contact_name: Mapped[str] = mapped_column(String(255))
    contact: Mapped[str] = mapped_column(String(255))
    people_count: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    demo: Mapped[bool] = mapped_column(Boolean)


# ---------- Народный архив (0003) ----------


class ArchiveStory(Base):
    __tablename__ = "archive_stories"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    place: Mapped[str] = mapped_column(String(255))
    story: Mapped[str] = mapped_column(Text)
    source_text: Mapped[str] = mapped_column(Text, default="")
    author: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20))
    verified_by: Mapped[str | None] = mapped_column(String(255))
    review_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    demo: Mapped[bool] = mapped_column(Boolean)
