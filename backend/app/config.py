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
    MAX_HOURS_WEEK: int = 60  # Relaxed from 48 for testing (BCEA: 48)
    MIN_REST_HOURS: int = 6   # Relaxed from 8 for testing (BCEA: 8)
    OT_MULTIPLIER: float = 1.5
    MAX_DISTANCE_KM: float = 100.0  # Relaxed from 50km for testing

    # Rostering Algorithm Settings
    ROSTER_ALGORITHM: str = "auto"  # Options: "hungarian", "milp", "auto"
    FAIRNESS_WEIGHT: float = 0.15  # Relaxed from 0.2 to prioritize fill rate
    MILP_TIME_LIMIT: int = 180  # Maximum solver time in seconds

    # Testing Mode - Relaxed Constraints
    TESTING_MODE: bool = True  # Set to False for production BCEA-compliant mode
    SKIP_CERTIFICATION_CHECK: bool = True  # Skip PSIRA cert validation for testing
    SKIP_SKILL_MATCHING: bool = False  # Still match skills but more flexible

    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
