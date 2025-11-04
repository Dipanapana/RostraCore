"""Application configuration."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""

    # Database
    DATABASE_URL: str = "postgresql://rostracore_user:password@localhost:5432/rostracore"

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # Rostering Constraints
    MAX_HOURS_WEEK: int = 48
    MIN_REST_HOURS: int = 8
    OT_MULTIPLIER: float = 1.5
    MAX_DISTANCE_KM: float = 50.0

    # Rostering Algorithm Settings
    ROSTER_ALGORITHM: str = "auto"  # Options: "hungarian", "milp", "auto"
    FAIRNESS_WEIGHT: float = 0.2  # Weight for fairness in MILP objective (0-1)
    MILP_TIME_LIMIT: int = 180  # Maximum solver time in seconds

    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
