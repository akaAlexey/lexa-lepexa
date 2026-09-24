import os
import subprocess
import sys

def main() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)

    host = os.getenv("HOST", "0.0.0.0")
    port = os.getenv("PORT", "8000")
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", host, "--port", port],
        check=True,
    )

if __name__ == "__main__":
    main()
