# =============================================================================
# Kairos One — Application Configuration
# Pydantic Settings with environment variable loading.
# Every field has a safe default — the backend runs without a .env file.
# =============================================================================

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

GOOGLE_OAUTH_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar",
]


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # -------------------------------------------------------------------------
    # Google AI Studio / Gemini
    # -------------------------------------------------------------------------
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # -------------------------------------------------------------------------
    # Google Calendar OAuth
    # -------------------------------------------------------------------------
    google_client_id: str = ""
    google_client_secret: str = ""

    # -------------------------------------------------------------------------
    # Firebase / Firestore
    # -------------------------------------------------------------------------
    firebase_project_id: str = ""
    firebase_credentials: str = ""
    firebase_credentials_path: str = ""

    # -------------------------------------------------------------------------
    # Server
    # -------------------------------------------------------------------------
    api_port: int = 8000
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # -------------------------------------------------------------------------
    # CORS
    # -------------------------------------------------------------------------
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # -------------------------------------------------------------------------
    # Timezone
    # -------------------------------------------------------------------------
    timezone: str = "UTC"

    # -------------------------------------------------------------------------
    # Computed properties
    # -------------------------------------------------------------------------
    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def firebase_configured(self) -> bool:
        return bool(self.firebase_project_id and (self.firebase_credentials or self.firebase_credentials_path))

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings instance — created once per process."""
    return Settings()

