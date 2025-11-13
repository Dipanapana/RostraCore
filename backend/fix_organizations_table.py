"""Add missing columns to organizations table."""

import psycopg2

conn_params = {
    "host": "localhost",
    "port": 5432,
    "database": "rostracore_db",
    "user": "postgres",
    "password": "Khum@l0!"
}

try:
    print("Fixing organizations table...")
    conn = psycopg2.connect(**conn_params)
    cur = conn.cursor()

    # Add approval workflow columns
    print("  - Adding approval workflow columns...")
    cur.execute("""
        ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending_approval',
        ADD COLUMN IF NOT EXISTS approved_by INTEGER,
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);
    """)

    # Add per-guard billing columns
    print("  - Adding per-guard billing columns...")
    cur.execute("""
        ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS active_guard_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS monthly_rate_per_guard NUMERIC(10, 2) DEFAULT 45.00,
        ADD COLUMN IF NOT EXISTS current_month_cost NUMERIC(10, 2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS last_billing_calculation TIMESTAMP WITH TIME ZONE;
    """)

    # Update existing records to approved
    print("  - Setting existing organizations to approved...")
    cur.execute("""
        UPDATE organizations
        SET approval_status = 'approved'
        WHERE approval_status = 'pending_approval';
    """)

    conn.commit()
    print("\nOrganizations table fixed successfully!")

    cur.close()
    conn.close()

except Exception as e:
    print(f"\nERROR: {str(e)}")
    import traceback
    traceback.print_exc()
