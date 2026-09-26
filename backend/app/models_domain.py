"""Целевая доменная схема (25 таблиц) из ветки бэка команды.

Эндпоинты P0 работают со слоем совместимости с фронтом (app/models.py); эти модели
описывают целевую нормализованную схему и создаются миграцией 0002. Перенесены из
main.py без изменений, чтобы метаданные Alembic совпадали с базой.
"""

from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base
from .timeutil import now


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(30), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class FamilyFighter(Base):
    """Боец семьи в личном архиве пользователя (A7). Виден только владельцу."""

    __tablename__ = "family_fighters"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    last_name: Mapped[str] = mapped_column(String(60))
    first_name: Mapped[str] = mapped_column(String(60), default="")
    middle_name: Mapped[str] = mapped_column(String(60), default="")
    birth_year: Mapped[int | None] = mapped_column(Integer)
    relation: Mapped[str] = mapped_column(String(60), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class FamilyRecord(Base):
    """Найденный документ бойца — ссылка на «Память народа», ОБД «Мемориал» или «Подвиг народа»."""

    __tablename__ = "family_records"
    __table_args__ = (UniqueConstraint("fighter_id", "url", name="uq_family_records_fighter_url"),)
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    fighter_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("family_fighters.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(String(500))
    title: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class UserState(Base):
    """Личное состояние аккаунта (профиль, «мои» записи, прогресс): одно на все устройства пользователя."""

    __tablename__ = "user_state"
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[str | None] = mapped_column(Text)


class UserRole(Base):
    __tablename__ = "user_roles"
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"), primary_key=True)
    role_id: Mapped[str] = mapped_column(String(50), ForeignKey("roles.id"), primary_key=True)


class HistoricalPoint(Base):
    __tablename__ = "historical_points"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    event_date: Mapped[date | None] = mapped_column(Date)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50), default="PENDING")
    created_by: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class HistoricalSource(Base):
    __tablename__ = "historical_sources"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    source_type: Mapped[str] = mapped_column(String(100))
    author: Mapped[str | None] = mapped_column(String(255))
    publication_date: Mapped[date | None] = mapped_column(Date)
    url: Mapped[str | None] = mapped_column(Text)
    archive_name: Mapped[str | None] = mapped_column(String(255))
    document_number: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class HistoricalPointSource(Base):
    __tablename__ = "historical_point_sources"
    historical_point_id: Mapped[str] = mapped_column(String(50), ForeignKey("historical_points.id"), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(50), ForeignKey("historical_sources.id"), primary_key=True)


class HistoricalSubmission(Base):
    __tablename__ = "historical_submissions"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    submitted_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    event_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SubmissionReview(Base):
    __tablename__ = "submission_reviews"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    submission_id: Mapped[str] = mapped_column(String(50), ForeignKey("historical_submissions.id"))
    reviewer_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(50))
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Soldier(Base):
    __tablename__ = "soldiers"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[str | None] = mapped_column(String(100))
    birth_date: Mapped[date | None] = mapped_column(Date)
    birth_place: Mapped[str | None] = mapped_column(Text)
    military_unit: Mapped[str | None] = mapped_column(String(255))
    rank: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str | None] = mapped_column(String(100))
    external_id: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class LastBattleCase(Base):
    __tablename__ = "last_battle_cases"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50))
    source_description: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    verified_by: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.id"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class LastBattleSoldier(Base):
    __tablename__ = "last_battle_soldiers"
    last_battle_case_id: Mapped[str] = mapped_column(String(50), ForeignKey("last_battle_cases.id"), primary_key=True)
    soldier_id: Mapped[str] = mapped_column(String(50), ForeignKey("soldiers.id"), primary_key=True)


class LastBattleStatusHistory(Base):
    __tablename__ = "last_battle_status_history"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(50), ForeignKey("last_battle_cases.id"))
    old_status: Mapped[str | None] = mapped_column(String(50))
    new_status: Mapped[str] = mapped_column(String(50))
    changed_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SearchTeam(Base):
    __tablename__ = "search_teams"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    region: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(30))
    website: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SearchTeamMember(Base):
    __tablename__ = "search_team_members"
    team_id: Mapped[str] = mapped_column(String(50), ForeignKey("search_teams.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"), primary_key=True)
    role: Mapped[str | None] = mapped_column(String(100))
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class TeamNeed(Base):
    __tablename__ = "team_needs"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    team_id: Mapped[str] = mapped_column(String(50), ForeignKey("search_teams.id"))
    type: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[int | None] = mapped_column(Integer)
    amount_required: Mapped[float | None] = mapped_column(Float)
    amount_collected: Mapped[float | None] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(50), default="OPEN")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Route(Base):
    __tablename__ = "routes"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    region: Mapped[str | None] = mapped_column(String(255))
    distance_km: Mapped[float | None] = mapped_column(Float)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    difficulty: Mapped[str | None] = mapped_column(String(50))
    created_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class RoutePoint(Base):
    __tablename__ = "route_points"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    route_id: Mapped[str] = mapped_column(String(50), ForeignKey("routes.id"))
    historical_point_id: Mapped[str] = mapped_column(String(50), ForeignKey("historical_points.id"))
    order_index: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    quest_text: Mapped[str | None] = mapped_column(Text)
    audio_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class UserRouteProgress(Base):
    __tablename__ = "user_route_progress"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    route_id: Mapped[str] = mapped_column(String(50), ForeignKey("routes.id"))
    route_point_id: Mapped[str] = mapped_column(String(50), ForeignKey("route_points.id"))
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class VolunteerEvent(Base):
    __tablename__ = "volunteer_events"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    team_id: Mapped[str] = mapped_column(String(50), ForeignKey("search_teams.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    max_participants: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class VolunteerEventParticipant(Base):
    __tablename__ = "volunteer_event_participants"
    event_id: Mapped[str] = mapped_column(String(50), ForeignKey("volunteer_events.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"), primary_key=True)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    status: Mapped[str] = mapped_column(String(50), default="REGISTERED")


class FundraisingCampaign(Base):
    __tablename__ = "fundraising_campaigns"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    team_id: Mapped[str] = mapped_column(String(50), ForeignKey("search_teams.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    target_amount: Mapped[float] = mapped_column(Float)
    collected_amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(50), default="OPEN")
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Donation(Base):
    __tablename__ = "donations"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    campaign_id: Mapped[str] = mapped_column(String(50), ForeignKey("fundraising_campaigns.id"))
    user_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.id"))
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="RUB")
    payment_provider: Mapped[str | None] = mapped_column(String(50))
    payment_id: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Media(Base):
    __tablename__ = "media"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    uploaded_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    file_url: Mapped[str] = mapped_column(Text)
    file_type: Mapped[str | None] = mapped_column(String(50))
    mime_type: Mapped[str | None] = mapped_column(String(100))
    title: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[str] = mapped_column(String(50))
    old_values: Mapped[dict | None] = mapped_column(JSON)
    new_values: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
