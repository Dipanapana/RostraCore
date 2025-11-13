"""Fix users table to match current model."""

import psycopg2

conn_params = {
    "host": "localhost",
    "port": 5432,
    "database": "rostracore_db",
    "user": "postgres",
    "password": "Khum@l0!"
}

try:
    print("Fixing users table...")
    conn = psycopg2.connect(**conn_params)
    cur = conn.cursor()

    # Add org_id column (org_id should already exist from fresh rebuild)
    print("  - Ensuring org_id column exists...")
    cur.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS org_id INTEGER
        REFERENCES organizations(org_id);
    """)

    # Add missing security columns
    print("  - Adding security verification columns...")
    cur.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS phone_verification_code VARCHAR(10),
        ADD COLUMN IF NOT EXISTS phone_verification_sent_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS password_reset_sent_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP WITH TIME ZONE;
    """)

    conn.commit()
    print("\nUsers table fixed successfully!")

    cur.close()
    conn.close()

except Exception as e:
    print(f"\nERROR: {str(e)}")
    import traceback
    traceback.print_exc()
