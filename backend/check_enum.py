"""Check the userrole enum values."""

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

    # Get enum values
    cur.execute("""
        SELECT enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'userrole'
        ORDER BY e.enumsortorder;
    """)

    values = cur.fetchall()

    print("Current userrole enum values:")
    print("=" * 50)
    for val in values:
        print(f"  - '{val[0]}'")

    cur.close()
    conn.close()

except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
