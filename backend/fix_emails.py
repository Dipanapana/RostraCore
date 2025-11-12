"""Fix employee email addresses by removing spaces."""
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="rostracore_db",
    user="postgres",
    password="Khum@l0!"
)

cur = conn.cursor()

print("Cleaning ALL employee email addresses...")
print("  - Removing spaces from all emails")
cur.execute("UPDATE employees SET email = REPLACE(email, ' ', '');")
rows_updated = cur.rowcount
conn.commit()

print(f"Updated {rows_updated} email addresses")
print("All email addresses are now space-free")

cur.close()
conn.close()
