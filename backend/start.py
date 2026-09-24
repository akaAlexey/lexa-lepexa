from pathlib import Path
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parent


def main() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    # Deploy-F may start the process from a generated working directory.
    # Always execute migrations and the app from the project root instead.
    os.chdir(ROOT)

    subprocess.run(
        [
            sys.executable,
            "-m",
            "alembic",
            "-c",
            str(ROOT / "alembic.ini"),
            "upgrade",
            "head",
        ],
        check=True,
    )

    # Load the demo records required by the live hackathon MVP.
    # seed.py is idempotent, so restarting the service does not create
    # duplicate rows or fail on existing demo data.
    subprocess.run(
        [sys.executable, str(ROOT / "app" / "seed.py")],
        check=True,
    )

    host = os.getenv("HOST", "0.0.0.0")
    port = os.getenv("PORT", "8000")

    subprocess.run(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            host,
            "--port",
            port,
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
