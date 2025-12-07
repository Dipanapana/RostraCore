"""Alembic migration environment."""

from logging.config import fileConfig
from sqlalchemy import engine_from_config, create_engine
from sqlalchemy import pool
from alembic import context
import os
import sys

# Add parent directory to path FIRST
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Try to load .env file (only works locally, ignored on Railway)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not required on Railway

# Get DATABASE_URL from environment - try multiple variable names
# Railway might use different naming conventions
db_url = (
    os.environ.get("DATABASE_URL") or
    os.environ.get("DATABASE_PUBLIC_URL") or
    os.environ.get("POSTGRES_URL") or
    os.environ.get("RAILWAY_DATABASE_URL")
)

# Handle Railway's postgres:// vs postgresql:// URL format
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Debug output for Railway logs
print(f"[Alembic] DATABASE_URL found: {bool(db_url)}")
if db_url:
    # Only show host for security
    try:
        from urllib.parse import urlparse
        parsed = urlparse(db_url)
        print(f"[Alembic] Database host: {parsed.hostname}:{parsed.port}")
    except:
        print("[Alembic] Database URL is set")

# Import app modules AFTER environment setup
from app.database import Base
# Import all models for migration detection
from app.models import *

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the database URL in alembic config - REQUIRED for Railway
if db_url:
    # Double % for ConfigParser interpolation
    db_url_escaped = db_url.replace('%', '%%')
    config.set_main_option("sqlalchemy.url", db_url_escaped)
else:
    # Check if we're in production without a database URL
    env = os.environ.get("ENVIRONMENT", "development")
    if env in ("production", "staging"):
        raise RuntimeError(
            "DATABASE_URL environment variable is required in production. "
            "Please set DATABASE_URL in Railway Variables."
        )
    # In development, use alembic.ini default (localhost)
    print("[Alembic] Using default database URL from alembic.ini")

# add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Use the database URL directly if available, bypassing alembic.ini
    if db_url:
        connectable = create_engine(db_url, poolclass=pool.NullPool)
    else:
        connectable = engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
