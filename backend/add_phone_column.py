"""Add missing phone column to users table."""

import psycopg2

conn_params = {
    "host": "localhost",
    "port": 5432,
    "database": "rostracore_db",
    "user": "postgres",
    "password": "Khum@l0!"
}

try:
    print("Connecting to database...")
    conn = psycopg2.connect(**conn_params)
    cur = conn.cursor()

    # Add phone column if it doesn't exist
    print("Adding phone column to users table...")
    cur.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    """)

    conn.commit()
    print("Phone column added successfully!")

    cur.close()
    conn.close()

except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
