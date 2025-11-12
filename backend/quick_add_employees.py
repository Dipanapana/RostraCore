"""Quick script to add test employees."""
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="rostracore_db",
    user="postgres",
    password="Khum@l0!"
)

cur = conn.cursor()

sql = open("quick_add_employees.sql").read()
cur.execute(sql)
conn.commit()

print("Test employees added successfully!")
cur.close()
conn.close()
