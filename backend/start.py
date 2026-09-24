"""Запуск на хостинге: миграции → демо-данные (если их нет) → Uvicorn.

Команда: python start.py. Нужна переменная DATABASE_URL; PORT и HOST — по желанию.
SEED_DEMO=0 отключает заливку демо-данных.
CLEANUP_TEST_RECORDS=1 — разовая очистка записей сверки контракта (app/test_records.sql); потом снять.
"""

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def run(*args: str) -> None:
    subprocess.run([sys.executable, *args], check=True)


def main() -> None:
    if not os.getenv("DATABASE_URL"):
        raise RuntimeError("DATABASE_URL is required")

    # Хостинг может запускать процесс из другой папки — работаем всегда из корня бэка.
    os.chdir(ROOT)

    run("-m", "alembic", "-c", str(ROOT / "alembic.ini"), "upgrade", "head")
    if os.getenv("CLEANUP_TEST_RECORDS", "0").lower() in ("1", "true", "yes"):
        run("-m", "app.cleanup", "--apply")
    if os.getenv("SEED_DEMO", "1").lower() not in ("0", "false", "no"):
        run("-m", "app.seed")

    run(
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        os.getenv("HOST", "0.0.0.0"),
        "--port",
        os.getenv("PORT", "8000"),
        "--proxy-headers",
        "--forwarded-allow-ips",
        "*",
    )


if __name__ == "__main__":
    main()
