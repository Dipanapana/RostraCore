"""Add missing values to userrole enum."""

import psycopg2

conn_params = {
    "host": "localhost",
    "port": 5432,
    "database": "rostracore_db",
    "user": "postgres",
    "password": "Khum@l0!"
}

try:
    print("Fixing userrole enum...")
    conn = psycopg2.connect(**conn_params)
    cur = conn.cursor()

    # Add company_admin value
    print("  - Adding 'company_admin' value...")
    try:
        cur.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'company_admin'")
        conn.commit()
    except Exception as e:
        print(f"    Note: {e}")
        conn.rollback()

    # Add superadmin value
    print("  - Adding 'superadmin' value...")
    try:
        cur.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'superadmin'")
        conn.commit()
    except Exception as e:
        print(f"    Note: {e}")
        conn.rollback()

    print("\nUserrole enum fixed successfully!")

    cur.close()
    conn.close()

except Exception as e:
    print(f"\nERROR: {str(e)}")
    import traceback
    traceback.print_exc()
