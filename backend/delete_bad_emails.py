"""Delete employees with spaces in email addresses."""
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="rostracore_db",
    user="postgres",
    password="Khum@l0!"
)

cur = conn.cursor()

print("Deleting employees with spaces in email...")
cur.execute("DELETE FROM employees WHERE email LIKE '% %';")
rows_deleted = cur.rowcount
conn.commit()

print(f"Deleted {rows_deleted} employees with spaces in email")

cur.close()
conn.close()
