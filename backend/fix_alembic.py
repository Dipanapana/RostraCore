"""Fix alembic version to match current migrations."""

import psycopg2

# Connection parameters
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

    # Check current version
    cur.execute("SELECT version_num FROM alembic_version")
    result = cur.fetchone()

    if result:
        current_version = result[0]
        print(f"Current alembic version: {current_version}")

        # Update to the head revision
        head_revision = "fcb825be69c0"  # add_per_guard_billing_fields

        print(f"Updating to head revision: {head_revision}")
        cur.execute("UPDATE alembic_version SET version_num = %s", (head_revision,))
        conn.commit()

        print(f"✓ Updated alembic version to {head_revision}")
    else:
        print("No alembic version found. Creating...")
        cur.execute("INSERT INTO alembic_version (version_num) VALUES ('fcb825be69c0')")
        conn.commit()
        print("✓ Created alembic version")

    cur.close()
    conn.close()
    print("\nSuccess! You can now run: python init_test_data.py")

except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
