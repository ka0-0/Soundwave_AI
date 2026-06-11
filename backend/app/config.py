from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "SOUNDWAVE AI API"
    ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:5000,http://localhost:5173,http://127.0.0.1:5000,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,*"

    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "soundwave_ai"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = "soundwave-dev-secret-key-2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    FRONTEND_URL: str = "https://a11dc832-df27-4b2c-8245-a4a331c6c283-00-t27fzofh3fly.pike.replit.dev"


@lru_cache
def get_settings() -> Settings:
    return Settings()
