"""Check what tables exist in the database."""

import psycopg2

conn_params = {
    "host": "localhost",
    "port": 5432,
    "database": "rostracore_db",
    "user": "postgres",
    "password": "Khum@l0!"
}

try:
    conn = psycopg2.connect(**conn_params)
    cur = conn.cursor()

    # Get all tables
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)

    tables = cur.fetchall()

    print("Tables in database:")
    print("=" * 50)
    for table in tables:
        print(f"  - {table[0]}")

    print(f"\nTotal: {len(tables)} tables")

    # Check users table columns
    if any(t[0] == 'users' for t in tables):
        print("\nUsers table columns:")
        print("=" * 50)
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        """)
        columns = cur.fetchall()
        for col in columns:
            print(f"  - {col[0]:30s} {col[1]}")

    cur.close()
    conn.close()

except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
