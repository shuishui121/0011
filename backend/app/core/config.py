from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Any
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "墨家机关协作平台"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/mohist_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "your-secret-key-change-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: str | List[str] = "http://localhost:5173,http://localhost:3000"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
