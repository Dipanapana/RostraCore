"""Rebuild database from scratch using Alembic."""

from app.database import Base, engine
from alembic import command
from alembic.config import Config
import os

# Import all models so they're registered with Base
import app.models

print("="*70)
print("REBUILDING DATABASE FROM SCRATCH")
print("="*70)

try:
    print("\n[1/3] Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("      All tables dropped successfully!")

    print("\n[2/3] Creating fresh tables from models...")
    Base.metadata.create_all(bind=engine)
    print("      All tables created successfully!")

    print("\n[3/3] Stamping alembic version...")
    alembic_cfg = Config("alembic.ini")
    command.stamp(alembic_cfg, "head")
    print("      Alembic version stamped to head!")

    print("\n" + "="*70)
    print("DATABASE REBUILT SUCCESSFULLY!")
    print("="*70)
    print("\nNext step: Run 'python init_test_data.py' to create test data")

except Exception as e:
    print(f"\nERROR: {str(e)}")
    import traceback
    traceback.print_exc()
