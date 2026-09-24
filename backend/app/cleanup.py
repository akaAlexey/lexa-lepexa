"""Разовая очистка тестовых записей сверки контракта (см. app/test_records.sql).

Без флага — только печатает список найденных записей. Удаляет при --apply
(start.py передаёт его, если задана переменная CLEANUP_TEST_RECORDS=1; после очистки её нужно снять).

    python -m app.cleanup            # просмотр
    python -m app.cleanup --apply    # удаление
"""

import asyncio
import sys
from pathlib import Path

from .db import engine

SQL = Path(__file__).with_name("test_records.sql").read_text(encoding="utf-8")
PREVIEW, CLEANUP = SQL.split("-- @cleanup", 1)


def statements(block: str) -> list[str]:
    lines = [ln for ln in block.splitlines() if not ln.lstrip().startswith("--")]
    parts = [p.strip() for p in "\n".join(lines).split(";")]
    return [p for p in parts if p and p.upper() not in ("BEGIN", "COMMIT")]


async def main(apply: bool) -> None:
    async with engine.begin() as conn:
        rows = (await conn.exec_driver_sql(statements(PREVIEW)[0])).all()
        for r in rows:
            print("cleanup: найдено", " | ".join(str(x) for x in r[:3]))
        print(f"cleanup: тестовых записей — {len(rows)}")
        if apply and rows:
            for st in statements(CLEANUP):
                await conn.exec_driver_sql(st)
            print("cleanup: удалено, счётчики демо-сборов и выездов возвращены")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main("--apply" in sys.argv))
