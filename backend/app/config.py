from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки из переменных окружения (или backend/.env локально)."""

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/memory_trail"
    # Через запятую. При общем домене с фронтом (Caddy проксирует /api) CORS не нужен вовсе.
    # Боевые адреса сайта (Pages и свой домен) разрешены по умолчанию — перенесено из fix/backend-pages-cors.
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,"
        "https://team-shpilit.github.io,https://marshrutypobedy.ru,https://www.marshrutypobedy.ru"
    )
    # Залить демо-данные фронта при старте, если их ещё нет в базе (существующие записи не трогаются).
    seed_demo: bool = True
    # Как часто поток уведомлений проверяет новые записи, секунд.
    sse_poll_seconds: float = 2.0
    # ЮKassa (тестовый магазин). Только из окружения сервера: YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY.
    # Секретный ключ никогда не кладётся в репозиторий и не попадает во фронт.
    yookassa_shop_id: str = ""
    yookassa_secret_key: str = ""
    yookassa_api_url: str = "https://api.yookassa.ru/v3"
    # Куда ЮKassa вернёт пользователя после оплаты: страница результата на сайте. От клиента не принимается.
    yookassa_return_url: str = ""
    # Шлюз выплат (тестовый) — на будущее, кодом пока не используется.
    yookassa_payout_agent_id: str = ""
    yookassa_payout_secret_key: str = ""
    # Серверная сессия входа: HttpOnly-cookie, токен хранится в БД только в виде SHA-256.
    auth_cookie_name: str = "mp_session"
    auth_cookie_secure: bool = True
    auth_session_days: int = 30

    @property
    def yookassa_enabled(self) -> bool:
        return bool(self.yookassa_shop_id and self.yookassa_secret_key)

    @property
    def payment_return_url(self) -> str:
        return self.yookassa_return_url or "https://marshrutypobedy.ru/payment"

    @property
    def yookassa_test_key(self) -> bool:
        """Платежи — только в тестовом режиме: ключ боевого магазина не начинается с test_."""
        return self.yookassa_secret_key.startswith("test_")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
