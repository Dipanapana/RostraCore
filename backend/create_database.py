"""Create rostracore_db database."""

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Database connection parameters
DB_USER = "postgres"
DB_PASSWORD = "Khum@l0!"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "rostracore_db"

def create_database():
    """Create the rostracore_db database if it doesn't exist."""

    # Connect to PostgreSQL server (to postgres database)
    try:
        print(f"Connecting to PostgreSQL server...")
        conn = psycopg2.connect(
            dbname="postgres",  # Connect to default postgres database
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )

        # Set autocommit mode for CREATE DATABASE
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (DB_NAME,)
        )

        if cursor.fetchone():
            print(f"✓ Database '{DB_NAME}' already exists")
        else:
            # Create database
            print(f"Creating database '{DB_NAME}'...")
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(DB_NAME)
                )
            )
            print(f"✓ Database '{DB_NAME}' created successfully")

        cursor.close()
        conn.close()

        # Test connection to new database
        print(f"\nTesting connection to '{DB_NAME}'...")
        test_conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        test_cursor = test_conn.cursor()
        test_cursor.execute("SELECT version();")
        version = test_cursor.fetchone()[0]
        print(f"✓ Connection successful!")
        print(f"  PostgreSQL version: {version[:60]}...")
        test_cursor.close()
        test_conn.close()

        print("\n" + "="*60)
        print("SUCCESS! Database is ready.")
        print("="*60)
        print("\nNext step: Run migrations")
        print("  cd backend")
        print("  alembic upgrade head")

        return True

    except psycopg2.Error as e:
        print(f"\n✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("RostraCore Database Setup")
    print("="*60)
    print()

    success = create_database()

    if not success:
        print("\nPlease check:")
        print("  - PostgreSQL is running")
        print("  - Password is correct")
        print("  - User has permission to create databases")
