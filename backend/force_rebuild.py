"""Force rebuild by dropping schema and recreating."""
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="rostracore_db",
    user="postgres",
    password="Khum@l0!"
)

cur = conn.cursor()

print("Dropping schema public CASCADE...")
cur.execute("DROP SCHEMA public CASCADE")
cur.execute("CREATE SCHEMA public")
cur.execute("GRANT ALL ON SCHEMA public TO postgres")
cur.execute("GRANT ALL ON SCHEMA public TO public")
conn.commit()

print("Schema recreated! Now run: python rebuild_database.py")

cur.close()
conn.close()
