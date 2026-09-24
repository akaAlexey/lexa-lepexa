from datetime import UTC, datetime
from uuid import uuid4


def now() -> datetime:
    return datetime.now(UTC)


def iso_z(value: datetime) -> str:
    """ISO 8601 в UTC с «Z» — ровно тот формат, который принимает контракт фронта (z.iso.datetime())."""
    if value.tzinfo is None:  # SQLite теряет часовой пояс; в базе всегда UTC
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def gid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"
