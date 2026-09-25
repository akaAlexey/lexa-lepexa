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
    # Куда ЮKassa вернёт пользователя после оплаты (адрес сайта).
    site_url: str = "https://marshrutypobedy.ru"

    @property
    def yookassa_enabled(self) -> bool:
        return bool(self.yookassa_shop_id and self.yookassa_secret_key)

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
