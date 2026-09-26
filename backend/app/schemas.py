"""Тела запросов по контракту фронта (frontend/src/contract/schemas.ts): те же поля в camelCase и те же ограничения."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

SourceKind = Literal[
    "book_of_memory", "obd_memorial", "pamyat_naroda", "osm", "archive", "literature", "eyewitness", "demo", "test"
]
VolunteerRole = Literal["digger", "prober", "cook", "driver", "medic", "any"]
SiteStatus = Literal["found_needs_check", "archive_confirmed", "remains_raised"]

Lat = Field(ge=-90, le=90)
Lon = Field(ge=-180, le=180)


class In(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


class Source(In):
    kind: SourceKind
    title: str = Field(min_length=1)
    url: str | None = Field(default=None, pattern=r"^https?://")

    def stored(self) -> dict:
        """Без пустых полей: контракт ждёт отсутствующий url, а не null."""
        return self.model_dump(exclude_none=True)


class RoleCount(In):
    role: VolunteerRole
    count: int = Field(gt=0)


class NewVolunteerRequest(In):
    team_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    date: date
    place: str = Field(min_length=1)
    roles: list[RoleCount] = Field(min_length=1)


class Donation(In):
    fundraiser_id: str = Field(min_length=1)
    amount_rub: int = Field(ge=1)


class PaymentStart(In):
    # Куда вернуть после оплаты, решает сервер (YOOKASSA_RETURN_URL) — от клиента адрес не принимается.
    fundraiser_id: str = Field(min_length=1)
    amount_rub: int = Field(ge=1, le=100_000)


class NewGroupApplication(In):
    trip_id: str = Field(min_length=1)
    organization: str = Field(min_length=1)
    contact_name: str = Field(min_length=2)
    contact: str = Field(min_length=3)
    people_count: int = Field(ge=2, le=100)
    comment: str = ""


class GroupApplicationDecision(In):
    status: Literal["confirmed", "clarify"]


class NewArchiveStory(In):
    title: str = Field(min_length=4)
    place: str = Field(min_length=2)
    story: str = Field(min_length=30)
    source_text: str = ""
    author: str = Field(min_length=2)


class ArchiveReview(In):
    decision: Literal["verified", "clarify"]
    reviewer: str = Field(min_length=1)
    note: str = ""


class Fighter(In):
    full_name: str | None = None
    rank: str | None = None

    def stored(self) -> dict:
        return self.model_dump(by_alias=True, exclude_none=True)


class NewSite(In):
    lat: float = Lat
    lon: float = Lon
    place_name: str = Field(min_length=1)
    fighters_count: int = Field(gt=0)
    fighters: list[Fighter]
    unit: str = Field(min_length=1)
    date_text: str = Field(min_length=1)
    circumstances: str = ""
    sources: list[Source] = Field(min_length=1)
    team_id: str | None = None


class SiteStatusChange(In):
    status: SiteStatus
    source: Source


class SubscriptionIn(In):
    lat: float = Lat
    lon: float = Lon
    radius_km: float = Field(default=20, gt=0, le=200)
    topics: list[Literal["search"]] = Field(min_length=1)
