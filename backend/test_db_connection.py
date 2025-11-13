"""Test PostgreSQL connection with different passwords."""

import sys
from sqlalchemy import create_engine, text

def test_connection(password):
    """Test database connection with given password."""
    db_url = f"postgresql://postgres:{password}@localhost:5432/rostracore_db"

    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✓ SUCCESS! Password '{password}' works!")
            print(f"  PostgreSQL version: {version[:50]}...")
            return True
    except Exception as e:
        print(f"✗ Failed with password '{password}': {str(e)[:80]}")
        return False

if __name__ == "__main__":
    # Test common passwords
    passwords_to_test = [
        "postgres",
        "admin",
        "password",
        "root",
        "12345",
        ""  # Empty password
    ]

    print("Testing PostgreSQL connection with common passwords...\n")

    for pwd in passwords_to_test:
        if test_connection(pwd):
            print(f"\n{'='*60}")
            print(f"FOUND WORKING PASSWORD: '{pwd}'")
            print(f"{'='*60}")
            print(f"\nUpdate your .env file with:")
            print(f"DATABASE_URL=postgresql://postgres:{pwd}@localhost:5432/rostracore_db")
            sys.exit(0)

    print("\n" + "="*60)
    print("No common passwords worked.")
    print("="*60)
    print("\nPlease follow the password reset instructions in:")
    print("POSTGRESQL_PASSWORD_SETUP.md")
    print("\nMethod 2: Reset Password Using Trust Authentication")
