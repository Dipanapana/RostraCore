"""Application configuration.

Last deployment trigger: 2025-12-09 16:20 UTC
"""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Union
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings."""

    # Application Branding
    APP_NAME: str = "GuardianOS"
    APP_TAGLINE: str = "AI-Powered Security Workforce Management"
    COMPANY_NAME: str = "GuardianOS (Pty) Ltd"

    # Database
    DATABASE_URL: str = "postgresql://rostracore_user:password@localhost:5432/rostracore"

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    ENVIRONMENT: str = "development"  # development, staging, production
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours - extended for better UX

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: Union[list[str], str] = "http://localhost:3000,http://localhost:3001,https://rostra-core.vercel.app,https://rostracore.com,https://www.rostracore.com"

    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse ALLOWED_ORIGINS from string or list."""
        if isinstance(v, str):
            # Split comma-separated string and strip whitespace
            return [origin.strip() for origin in v.split(',')]
        return v

    # Rostering Constraints (BCEA Compliance - Basic Conditions of Employment Act)
    # BCEA allows: 45 ordinary hours/week, up to 48 with overtime agreement
    MAX_HOURS_WEEK: int = 48  # BCEA compliant (45 ordinary + 3 overtime allowed)
    MIN_REST_HOURS: int = 8   # BCEA requires 12h daily rest; 8h is minimum safe period
    MAX_CONSECUTIVE_DAYS: int = 6  # Maximum consecutive working days (BCEA: at least 1 rest day per week)
    MAX_CONSECUTIVE_NIGHTS: int = 4  # Maximum consecutive night shifts (safety & fatigue management)
    OT_MULTIPLIER: float = 1.5  # BCEA overtime rate
    MAX_DISTANCE_KM: float = 50.0  # Reasonable commute distance for assignment

    # Rostering Algorithm Settings
    ROSTER_ALGORITHM: str = "production"  # Options: "production", "milp", "auto"
    FAIRNESS_WEIGHT: float = 0.2  # Weight for equitable hours distribution
    MILP_TIME_LIMIT: int = 180  # Maximum solver time in seconds

    # Testing Mode - Set to True to relax constraints for development/testing
    TESTING_MODE: bool = False  # False = BCEA-compliant production mode
    SKIP_CERTIFICATION_CHECK: bool = False  # Skip PSIRA cert validation for testing
    SKIP_SKILL_MATCHING: bool = False  # Skip skill matching for testing
    SKIP_AVAILABILITY_CHECK: bool = False  # Skip availability checks for testing

    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 100

    # Monitoring & Error Tracking
    SENTRY_DSN: Optional[str] = None  # Set in .env for production
    SENTRY_ENVIRONMENT: str = "development"  # development, staging, production
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1  # 10% of transactions for performance monitoring
    SENTRY_PROFILES_SAMPLE_RATE: float = 0.1  # 10% for profiling

    # Redis & Caching
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Email Configuration (SendGrid)
    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "noreply@rostracore.com"
    FROM_NAME: str = "RostraCore"
    REPLY_TO_EMAIL: str = "support@rostracore.com"

    # SMTP Configuration (Alternative to SendGrid - Gmail supported)
    SMTP_HOST: Optional[str] = None  # e.g., "smtp.gmail.com" for Gmail
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None  # e.g., "yourname@gmail.com"
    SMTP_PASSWORD: Optional[str] = None  # Gmail App Password (not regular password)
    SMTP_TLS: bool = True

    # MVP Feature Flags (Option B Security)
    ENABLE_EMAIL_VERIFICATION: bool = False  # Disabled for initial deployment
    ENABLE_ORGANIZATION_APPROVAL: bool = True
    ENABLE_RATE_LIMITING: bool = True

    # Non-MVP Features (Disabled for MVP Launch)
    ENABLE_MARKETPLACE: bool = False
    ENABLE_CV_GENERATION: bool = False
    ENABLE_GUARD_RATINGS: bool = False
    ENABLE_ADVANCED_ANALYTICS: bool = False
    ENABLE_BULK_HIRING: bool = False
    ENABLE_PREMIUM_JOBS: bool = False

    # MVP Pricing Model
    MVP_MONTHLY_RATE_PER_GUARD: float = 29.00  # R29/guard/month
    MVP_CURRENCY: str = "ZAR"
    FREE_TRIAL_DAYS: int = 14  # Standard trial period (extended for pilots)

    # PayFast Payment Gateway (South African) - Legacy/Backup
    PAYFAST_MERCHANT_ID: str = ""  # Set in .env
    PAYFAST_MERCHANT_KEY: str = ""  # Set in .env
    PAYFAST_PASSPHRASE: str = ""  # Set in .env (optional but recommended)
    PAYFAST_SANDBOX: bool = True  # True for testing, False for production
    BACKEND_URL: str = "http://localhost:8000"  # For webhooks

    # Yoco Payment Gateway (Primary - South African)
    # Note: Yoco does NOT support native subscriptions - uses monthly one-time payments
    YOCO_SECRET_KEY: str = ""  # Set in .env (sk_test_... or sk_live_...)
    YOCO_PUBLIC_KEY: str = ""  # Set in .env (pk_test_... or pk_live_...)
    YOCO_WEBHOOK_SECRET: str = ""  # Set in .env for webhook signature verification
    YOCO_SANDBOX: bool = True  # True for testing, False for production

    # Security Settings
    PASSWORD_MIN_LENGTH: int = 8
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_DURATION_MINUTES: int = 30
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    # SuperAdmin Settings (Phase 5)
    SUPERADMIN_SECRET_TOKEN: Optional[str] = None  # Set in .env for superadmin registration

    # pydantic-settings v2 configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignore extra environment variables
    )


# Get DATABASE_URL from environment first if available (for Railway/production)
_db_url_from_env = os.environ.get("DATABASE_URL")
settings = Settings()

# Override DATABASE_URL if set in environment (ensures Railway variable is used)
if _db_url_from_env:
    # Handle Railway's postgres:// vs postgresql:// URL format
    if _db_url_from_env.startswith("postgres://"):
        _db_url_from_env = _db_url_from_env.replace("postgres://", "postgresql://", 1)
    settings = Settings(DATABASE_URL=_db_url_from_env)
